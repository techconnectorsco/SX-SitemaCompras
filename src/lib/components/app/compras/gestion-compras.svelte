<script lang="ts">
	/**
	 * Gestión de Compras - Componente Principal
	 * ✅ ACTUALIZADO: Dark mode corregido
	 */
	import { onMount, onDestroy } from 'svelte';
	import {
		ShoppingCart,
		Save,
		ChevronDown,
		ChevronUp,
		LoaderCircle,
		CircleAlert,
		Pencil,
		Lock,
		TriangleAlert,
		X,
		History,
		Clock,
		RefreshCw,
		Download,
		FileSpreadsheet,
		TrendingUp,
		TrendingDown,
		Minus
	} from 'lucide-svelte';
	import { Input } from '$lib/components/ui/input';
	import { toast } from 'svelte-sonner';

	let { data = $bindable(), user = $bindable() } = $props();

	// ===== TYPES =====
	interface ProcesamientoDisponible {
		codigo: string;
		fecha: string;
		usuario: string;
		totalSKUs: number;
	}

	// ===== STATE =====
	let cargando = $state(true);
	let datos = $state<any[]>([]);
	let total = $state(0);
	let filtros = $state<any>({});
	let metadata = $state<{ codigo: string | null; fecha: string | null; usuario: string }>({
		codigo: null,
		fecha: null,
		usuario: ''
	});

	// ✅ NUEVO: Procesamientos disponibles y selector
	let procesamientosDisponibles = $state<ProcesamientoDisponible[]>([]);
	let procesamientoSeleccionado = $state('');
	let mostrarSelectorProcesamiento = $state(false);

	// Filtros
	let search = $state('');
	let abcFilter = $state('');
	let marcaFilter = $state('');
	let lineaFilter = $state('');
	let categoriaFilter = $state('');
	let soloPedido = $state(false);
	let rotacionFilter = $state('');
	let solo8020 = $state(false);
	let ordenamiento = $state('codigo_asc');
	let soloConValoresGuardados = $state(false);

	// Scroll infinito
	let offset = $state(0);
	let limit = $state(100);
	let cargandoMas = $state(false);
	let todosCargados = $state(false);

	// ✅ CAMBIO: Referencias para cleanup
	let scrollContainer: HTMLElement | null = $state(null);
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

	// Edición
	let cambiosPendientes = $state(new Map<number, any>());
	let filasEnEdicion = $state(new Set<number>());
	let filaExpandida = $state<number | null>(null);
	let datosHistoricoCompleto = $state<Record<number, Record<string, Record<string, number>>>>({});
	let cargandoHistorico = $state<Record<number, boolean>>({});

	// Modal de confirmación para cambios pendientes
	let mostrarModalCambios = $state(false);
	let guardandoDesdeModal = $state(false);
	let accionPendiente = $state<'filtro' | 'procesamiento' | null>(null);
	let procesamientoPendiente = $state('');
	let exportandoHusqvarna = $state(false);
	let exportandoOtros = $state(false);

	// Derivados
	let hayCambios = $derived(cambiosPendientes.size > 0);

	// NUEVO: Calcular costo total de los cambios pendientes
	let totalEstimadoCambios = $derived(
		Array.from(cambiosPendientes.entries()).reduce((acc, [id, cambios]) => {
			const sku = datos.find((d) => d.id === id);
			if (!sku) return acc;

			// Determinar costo (prioridad local, luego dolar)
			const costo =
				sku.costo_prom_dol || sku.costo_ult_dol || sku.costo_prom_loc || sku.costo_ult_loc || 0;

			// Obtener valores (si está en cambiosPendientes usa ese, sino el original, sino 0)
			const urg = cambios.sugerido_analista_urgente ?? sku.sugerido_analista_urgente ?? 0;
			const aer = cambios.sugerido_analista_aereo ?? sku.sugerido_analista_aereo ?? 0;
			const mar = cambios.sugerido_analista_maritimo ?? sku.sugerido_analista_maritimo ?? 0;

			const cantidadTotal = urg + aer + mar;
			return acc + cantidadTotal * costo;
		}, 0)
	);

	// ===== FUNCIONES DE BLOQUEO =====
	function tieneValoresGuardados(sku: any): boolean {
		const urgente = sku.sugerido_analista_urgente || 0;
		const aereo = sku.sugerido_analista_aereo || 0;
		const comentario = sku.comentario_analista || '';
		return urgente > 0 || aereo > 0 || comentario.trim() !== '';
	}

	function campoBloqueado(skuId: number, sku: any): boolean {
		if (filasEnEdicion.has(skuId)) return false;
		return tieneValoresGuardados(sku);
	}

	function habilitarEdicion(skuId: number) {
		filasEnEdicion.add(skuId);
		filasEnEdicion = new Set(filasEnEdicion);
	}

	// ===== FUNCIONES DE FILTRADO CON VERIFICACIÓN =====
	function intentarAplicarFiltros() {
		if (hayCambios) {
			accionPendiente = 'filtro';
			mostrarModalCambios = true;
		} else {
			ejecutarFiltros();
		}
	}

	function ejecutarFiltros() {
		cambiosPendientes = new Map();
		filasEnEdicion = new Set();
		mostrarModalCambios = false;
		accionPendiente = null;
		cargarDatos(true);
	}

	// ✅ NUEVO: Intentar cambiar procesamiento
	function intentarCambiarProcesamiento(codigo: string) {
		if (hayCambios) {
			accionPendiente = 'procesamiento';
			procesamientoPendiente = codigo;
			mostrarModalCambios = true;
		} else {
			cambiarProcesamiento(codigo);
		}
	}

	// ✅ NUEVO: Cambiar procesamiento
	function cambiarProcesamiento(codigo: string) {
		procesamientoSeleccionado = codigo;
		mostrarSelectorProcesamiento = false;
		cambiosPendientes = new Map();
		filasEnEdicion = new Set();
		mostrarModalCambios = false;
		accionPendiente = null;
		cargarDatos(true);
	}

	async function guardarYContinuar() {
		guardandoDesdeModal = true;
		try {
			const cambiosArray = Array.from(cambiosPendientes.entries()).map(([id, cambios]) => ({
				id,
				...cambios
			}));

			const res = await fetch('/api/compras/guardar-cambios', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					cambios: cambiosArray,
					codigoProcesamiento: procesamientoSeleccionado
				})
			});

			if (!res.ok) {
				throw new Error('Error al guardar');
			}

			const resultado = await res.json();
			toast.success(resultado.message || 'Cambios guardados');

			// Ejecutar acción pendiente
			if (accionPendiente === 'procesamiento' && procesamientoPendiente) {
				cambiarProcesamiento(procesamientoPendiente);
			} else {
				ejecutarFiltros();
			}
		} catch (error) {
			console.error('Error:', error);
			toast.error('Error al guardar cambios');
		} finally {
			guardandoDesdeModal = false;
		}
	}

	function descartarYContinuar() {
		toast.info('Cambios descartados');
		if (accionPendiente === 'procesamiento' && procesamientoPendiente) {
			cambiarProcesamiento(procesamientoPendiente);
		} else {
			ejecutarFiltros();
		}
	}

	function cancelarModal() {
		mostrarModalCambios = false;
		accionPendiente = null;
		procesamientoPendiente = '';
	}

	// ===== CARGAR DATOS =====
	async function cargarDatos(reset = false) {
		if (reset) {
			datos = [];
			offset = 0;
			todosCargados = false;
			filasEnEdicion = new Set();
		}

		cargando = reset;
		if (!reset) cargandoMas = true;

		try {
			const params = new URLSearchParams({
				limit: limit.toString(),
				offset: offset.toString(),
				search,
				abc: abcFilter,
				rotacion: rotacionFilter,
				marca: marcaFilter,
				linea: lineaFilter,
				categoria: categoriaFilter,
				sort: ordenamiento,
				solo_pedido: soloPedido.toString(),
				solo_8020: solo8020.toString()
			});

			// ✅ NUEVO: Agregar procesamiento si está seleccionado
			if (procesamientoSeleccionado) {
				params.set('procesamiento', procesamientoSeleccionado);
			}

			const res = await fetch(`/api/compras/procesados?${params}`);

			if (!res.ok) {
				throw new Error('Error al cargar datos');
			}

			const response = await res.json();

			if (response.sinDatos) {
				toast.warning(response.mensaje || 'No hay datos de procesamiento');
				return;
			}

			if (reset) {
				datos = response.datos;
				metadata = response.metadata || { codigo: null, fecha: null, usuario: '' };
				procesamientosDisponibles = response.procesamientosDisponibles || [];

				// Establecer procesamiento seleccionado
				if (metadata.codigo && !procesamientoSeleccionado) {
					procesamientoSeleccionado = metadata.codigo;
				}
			} else {
				datos = [...datos, ...response.datos];
			}

			total = response.total;
			filtros = response.filtros;

			if (response.datos.length < limit) {
				todosCargados = true;
			}
		} catch (error) {
			console.error('Error:', error);
			toast.error('Error al cargar datos');
		} finally {
			cargando = false;
			cargandoMas = false;
		}
	}

	// ✅ CAMBIO: Scroll infinito con throttling y cleanup
	function handleScroll(event: Event) {
		if (todosCargados || cargandoMas) return;

		// Throttling para evitar demasiadas llamadas
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}

		scrollTimeout = setTimeout(() => {
			const target = event.target as HTMLElement;
			const scrollPercentage = (target.scrollTop + target.clientHeight) / target.scrollHeight;

			if (scrollPercentage > 0.8) {
				offset += limit;
				cargarDatos(false);
			}
		}, 200);
	}

	// Expandir/contraer histórico
	async function toggleHistorico(id: number, codigo: string) {
		if (filaExpandida === id) {
			filaExpandida = null;
		} else {
			filaExpandida = id;
			if (!datosHistoricoCompleto[id]) {
				await cargarHistoricoCompleto(id, codigo);
			}
		}
	}

	const AÑO_BASE = 2020;

	function getAñosVisualizacion() {
		const añoActual = new Date().getFullYear();
		const años = [];
		for (let i = añoActual; i >= AÑO_BASE; i--) {
			años.push(i);
		}
		return años;
	}

	function calcularTotalAño(datosAño: Record<string, number>): number {
		return Object.values(datosAño).reduce((sum, val) => sum + (val || 0), 0);
	}

	// Calcular variación porcentual respecto al año anterior
	function calcularVariacion(
		totalActual: number,
		totalAnterior: number
	): { porcentaje: number; tipo: 'subio' | 'bajo' | 'igual' } {
		if (totalAnterior === 0 && totalActual === 0) {
			return { porcentaje: 0, tipo: 'igual' };
		}
		if (totalAnterior === 0) {
			return { porcentaje: 100, tipo: 'subio' };
		}
		const porcentaje = ((totalActual - totalAnterior) / totalAnterior) * 100;
		if (porcentaje > 0) {
			return { porcentaje, tipo: 'subio' };
		} else if (porcentaje < 0) {
			return { porcentaje: Math.abs(porcentaje), tipo: 'bajo' };
		}
		return { porcentaje: 0, tipo: 'igual' };
	}

	async function cargarHistoricoCompleto(id: number, codigo: string) {
		cargandoHistorico[id] = true;
		try {
			function calcularTotalAño(datosAño: Record<string, number>): number {
				return Object.values(datosAño).reduce((sum, val) => sum + (val || 0), 0);
			}

			// Calcular variación porcentual respecto al año anterior
			function calcularVariacion(
				totalActual: number,
				totalAnterior: number
			): { porcentaje: number; tipo: 'subio' | 'bajo' | 'igual' } {
				if (totalAnterior === 0 && totalActual === 0) {
					return { porcentaje: 0, tipo: 'igual' };
				}
				if (totalAnterior === 0) {
					return { porcentaje: 100, tipo: 'subio' };
				}
				const porcentaje = ((totalActual - totalAnterior) / totalAnterior) * 100;
				if (porcentaje > 0) {
					return { porcentaje, tipo: 'subio' };
				} else if (porcentaje < 0) {
					return { porcentaje: Math.abs(porcentaje), tipo: 'bajo' };
				}
				return { porcentaje: 0, tipo: 'igual' };
			}

			const res = await fetch(`/api/compras/historico-ventas?codigo=${codigo}`);
			if (!res.ok) throw new Error('Error al cargar histórico');

			const response = await res.json();

			const porAño: Record<string, Record<string, number>> = {};

			getAñosVisualizacion().forEach((año) => {
				porAño[año] = {};
			});

			if (response.ventas) {
				Object.entries(response.ventas).forEach(([mesAño, cantidad]: [string, any]) => {
					const [año, mes] = mesAño.split('-');
					if (parseInt(año) >= AÑO_BASE) {
						if (!porAño[año]) porAño[año] = {};
						porAño[año][mes] = cantidad;
					}
				});
			}

			datosHistoricoCompleto[id] = porAño;
			datosHistoricoCompleto = { ...datosHistoricoCompleto };
		} catch (error) {
			console.error('Error cargando histórico:', error);
			toast.error('Error al cargar histórico de ventas');
		} finally {
			cargandoHistorico[id] = false;
		}
	}

	// Registrar cambio
	function registrarCambio(
		id: number,
		campo:
			| 'sugerido_analista_urgente'
			| 'sugerido_analista_aereo'
			| 'sugerido_analista_maritimo'
			| 'comentario_analista',
		valor: number | string
	) {
		const cambios = cambiosPendientes.get(id) || {};
		cambios[campo] = valor;
		cambiosPendientes.set(id, cambios);
		cambiosPendientes = new Map(cambiosPendientes); // Forzar reactividad
	}

	// Guardar cambios
	async function guardarCambios() {
		if (!hayCambios) return;

		try {
			const cambiosArray = Array.from(cambiosPendientes.entries()).map(([id, cambios]) => ({
				id,
				...cambios
			}));

			const res = await fetch('/api/compras/guardar-cambios', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					cambios: cambiosArray,
					codigoProcesamiento: procesamientoSeleccionado
				})
			});

			if (!res.ok) {
				throw new Error('Error al guardar');
			}

			const resultado = await res.json();

			toast.success(resultado.message || 'Cambios guardados exitosamente');

			cambiosPendientes = new Map();
			filasEnEdicion = new Set();
			cargarDatos(true);
		} catch (error) {
			console.error('Error:', error);
			toast.error('Error al guardar cambios');
		}
	}

	// Formatear fecha corta
	function formatFechaCorta(fechaISO: string): string {
		return new Date(fechaISO).toLocaleString('es-CR', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function exportarPedidos(tipo: 'husqvarna' | 'otros') {
		if (!procesamientoSeleccionado) {
			toast.error('No hay procesamiento seleccionado');
			return;
		}

		if (tipo === 'husqvarna') {
			exportandoHusqvarna = true;
		} else {
			exportandoOtros = true;
		}

		try {
			const response = await fetch(
				`/api/compras/exportar-pedidos?procesamiento=${procesamientoSeleccionado}&tipo=${tipo}`
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.mensaje || errorData.error || 'Error al exportar');
			}

			// Descargar el archivo ZIP
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download =
				response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') ||
				`pedidos_${tipo}_${new Date().toISOString().split('T')[0]}.zip`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			toast.success(
				`Pedidos ${tipo === 'husqvarna' ? 'Husqvarna' : 'otras líneas'} exportados correctamente`
			);
		} catch (error) {
			console.error('Error exportando:', error);
			toast.error(error instanceof Error ? error.message : 'Error al exportar pedidos');
		} finally {
			if (tipo === 'husqvarna') {
				exportandoHusqvarna = false;
			} else {
				exportandoOtros = false;
			}
		}
	}

	// Cargar al montar
	onMount(() => {
		cargarDatos(true);
	});

	// ✅ CAMBIO: Limpiar recursos al desmontar
	onDestroy(() => {
		// Limpiar timeout de scroll
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
			scrollTimeout = null;
		}

		// Limpiar event listener (por seguridad)
		if (scrollContainer) {
			scrollContainer.removeEventListener('scroll', handleScroll);
		}

		// Limpiar estructuras CACHE (NO datos principales)
		datosHistoricoCompleto = {};
		cargandoHistorico = {};
		cambiosPendientes = new Map();
		filasEnEdicion = new Set();

		console.log('[gestion-compras] ✅ Recursos liberados');
	});

	let datosFiltrados = $derived(
		soloConValoresGuardados ? datos.filter((d) => tieneValoresGuardados(d)) : datos
	);

	// Detectar si hay filtros activos
	let hayFiltrosActivos = $derived(
		search !== '' ||
			abcFilter !== '' ||
			rotacionFilter !== '' ||
			marcaFilter !== '' ||
			lineaFilter !== '' ||
			categoriaFilter !== '' ||
			soloPedido ||
			solo8020 ||
			soloConValoresGuardados ||
			ordenamiento !== 'codigo_asc'
	);

	// Función para limpiar todos los filtros
	function limpiarFiltros() {
		if (hayCambios) {
			accionPendiente = 'filtro';
			mostrarModalCambios = true;
			return;
		}

		search = '';
		abcFilter = '';
		rotacionFilter = '';
		marcaFilter = '';
		lineaFilter = '';
		categoriaFilter = '';
		soloPedido = false;
		solo8020 = false;
		soloConValoresGuardados = false;
		ordenamiento = 'codigo_asc';
		cargarDatos(true);
	}

	// ===== LÓGICA DRAG-TO-SCROLL (ARRASTRAR TABLA) =====
	let isDown = false;
	let startX = 0;
	let scrollLeftPos = 0;
	let isDragging = $state(false); // Para cambiar el cursor visualmente

	function onMouseDown(e: MouseEvent) {
		// Evitamos arrastrar si se hace clic en botones o inputs
		if ((e.target as HTMLElement).closest('button, input, select, [role="button"]')) return;

		if (!scrollContainer) return;
		isDown = true;
		isDragging = true;
		startX = e.pageX - scrollContainer.offsetLeft;
		scrollLeftPos = scrollContainer.scrollLeft;
	}

	function onMouseLeave() {
		isDown = false;
		isDragging = false;
	}

	function onMouseUp() {
		isDown = false;
		isDragging = false;
	}

	function onMouseMove(e: MouseEvent) {
		if (!isDown || !scrollContainer) return;
		e.preventDefault();
		const x = e.pageX - scrollContainer.offsetLeft;
		const walk = (x - startX) * 2; // El multiplicador *2 es la velocidad del arrastre
		scrollContainer.scrollLeft = scrollLeftPos - walk;
	}
</script>

<!-- MODAL DE CONFIRMACIÓN PARA CAMBIOS PENDIENTES -->
{#if mostrarModalCambios}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="fixed inset-0 z-100 flex items-center justify-center">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick={cancelarModal}></div>

		<div
			class="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
		>
			<div
				class="flex items-center gap-3 px-6 py-4 bg-orange-50 dark:bg-orange-950/30 border-b border-orange-100 dark:border-orange-900/50"
			>
				<div
					class="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50"
				>
					<TriangleAlert class="h-5 w-5 text-[#1A73C2] dark:text-[#1A73C2]" />
				</div>
				<div>
					<h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
						Cambios sin guardar
					</h3>
					<p class="text-sm text-slate-500 dark:text-slate-400">
						{accionPendiente === 'procesamiento'
							? 'Quieres cambiar de procesamiento'
							: 'Quieres aplicar filtros'}
					</p>
				</div>
				<button
					onclick={cancelarModal}
					class="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
				>
					<X class="h-5 w-5 text-slate-400" />
				</button>
			</div>

			<div class="px-6 py-5">
				<p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
					Has realizado <strong class="text-[#1A73C2] dark:text-[#1A73C2]"
						>{cambiosPendientes.size} cambio(s)</strong
					>
					que aún no se han guardado.
					{#if accionPendiente === 'procesamiento'}
						Si cambias de procesamiento, <strong class="text-red-600 dark:text-red-400"
							>perderás estos cambios</strong
						>.
					{:else}
						Si aplicas un nuevo filtro, <strong class="text-red-600 dark:text-red-400"
							>perderás estos cambios</strong
						>.
					{/if}
				</p>

				<div
					class="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
				>
					<p
						class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2"
					>
						SKUs modificados:
					</p>
					<div class="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
						{#each Array.from(cambiosPendientes.keys()).slice(0, 10) as skuId}
							{@const sku = datos.find((d) => d.id === skuId)}
							{#if sku}
								<span
									class="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-mono rounded"
								>
									{sku.codigo_sku}
								</span>
							{/if}
						{/each}
						{#if cambiosPendientes.size > 10}
							<span
								class="inline-block px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] rounded"
							>
								+{cambiosPendientes.size - 10} más
							</span>
						{/if}
					</div>
				</div>
			</div>

			<div
				class="flex flex-col sm:flex-row gap-2 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700"
			>
				<button
					onclick={guardarYContinuar}
					disabled={guardandoDesdeModal}
					class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
                 bg-green-600 hover:bg-green-700 text-white
                 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors shadow-sm"
				>
					{#if guardandoDesdeModal}
						<LoaderCircle class="h-4 w-4 animate-spin" />
						Guardando...
					{:else}
						<Save class="h-4 w-4" />
						Guardar y continuar
					{/if}
				</button>

				<button
					onclick={descartarYContinuar}
					disabled={guardandoDesdeModal}
					class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
                 bg-red-100 hover:bg-red-200 text-red-700
                 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400
                 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors"
				>
					<TriangleAlert class="h-4 w-4" />
					Descartar
				</button>

				<button
					onclick={cancelarModal}
					disabled={guardandoDesdeModal}
					class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
                 bg-slate-200 hover:bg-slate-300 text-slate-700
                 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300
                 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors"
				>
					Seguir editando
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="flex flex-1 flex-col h-screen">
	<!-- Header -->
	<div class="flex items-center justify-between px-6 py-5 border-b bg-white dark:bg-slate-950">
		<div class="flex flex-col gap-1">
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
					Gestión de Compras
				</h1>
			</div>

			<!-- ✅ NUEVO: Info del procesamiento con selector -->
			<div
				class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2"
			>
				<!-- Selector de procesamiento -->
				<div class="relative">
					<button
						onclick={() => (mostrarSelectorProcesamiento = !mostrarSelectorProcesamiento)}
						class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors font-medium"
					>
						<History class="h-3.5 w-3.5" />
						<span class="font-mono text-xs">{metadata.codigo || 'Sin procesamiento'}</span>
						<ChevronDown
							class="h-3.5 w-3.5 {mostrarSelectorProcesamiento
								? 'rotate-180'
								: ''} transition-transform"
						/>
					</button>

					<!-- Dropdown de procesamientos -->
					{#if mostrarSelectorProcesamiento && procesamientosDisponibles.length > 0}
						<div
							class="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto"
						>
							<div
								class="p-2 border-b dark:border-slate-700 bg-muted/50 dark:bg-slate-800/50 sticky top-0"
							>
								<p class="text-xs font-semibold text-muted-foreground dark:text-slate-400">
									Seleccionar procesamiento
								</p>
							</div>
							{#each procesamientosDisponibles as proc}
								<button
									onclick={() => intentarCambiarProcesamiento(proc.codigo)}
									class="w-full px-3 py-2.5 text-left hover:bg-muted/50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-2 {proc.codigo ===
									procesamientoSeleccionado
										? 'bg-blue-50 dark:bg-blue-950/30'
										: ''}"
								>
									<div class="flex flex-col">
										<span
											class="font-mono text-xs font-semibold {proc.codigo ===
											procesamientoSeleccionado
												? 'text-blue-600 dark:text-blue-400'
												: 'dark:text-slate-200'}"
										>
											{proc.codigo}
										</span>
										<span class="text-[10px] text-muted-foreground dark:text-slate-500">
											{formatFechaCorta(proc.fecha)} · {proc.usuario.split('@')[0]}
										</span>
									</div>
									<span
										class="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded"
									>
										{proc.totalSKUs.toLocaleString()} SKUs
									</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<div class="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>

				<div class="flex items-center gap-1.5">
					<Clock class="h-3.5 w-3.5" />
					<span class="font-semibold text-slate-700 dark:text-slate-300">Fecha:</span>
					{#if metadata.fecha}
						{new Date(metadata.fecha).toLocaleString('es-CR', {
							year: 'numeric',
							month: 'short',
							day: 'numeric',
							hour: '2-digit',
							minute: '2-digit'
						})}
					{:else}
						--
					{/if}
				</div>

				<div class="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>

				<div class="flex items-center gap-1.5">
					<span class="font-semibold text-slate-700 dark:text-slate-300">Por:</span>
					{metadata.usuario || 'Sistema'}
				</div>

				<div class="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>

				<div class="flex items-center gap-1.5">
					<span class="font-semibold text-slate-700 dark:text-slate-300">Total SKUs:</span>
					{total.toLocaleString()}
				</div>

				{#if procesamientosDisponibles.length > 1}
					<div class="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
					<span class="text-[10px] text-muted-foreground">
						{procesamientosDisponibles.length} procesamientos disponibles
					</span>
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-3">
			<button
				onclick={() => cargarDatos(true)}
				class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border dark:border-slate-700 hover:bg-accent dark:hover:bg-slate-800 transition-colors dark:text-slate-200"
			>
				<RefreshCw class="h-4 w-4" />
				Actualizar
			</button>

			<!-- Botones de Exportación -->
			<div class="flex items-center gap-2">
				<button
					onclick={() => exportarPedidos('husqvarna')}
					disabled={exportandoHusqvarna || !procesamientoSeleccionado}
					class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg
                 bg-[#1A73C2] hover:bg-[#1A73C2] text-white
                 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors shadow-sm"
				>
					{#if exportandoHusqvarna}
						<LoaderCircle class="h-4 w-4 animate-spin" />
					{:else}
						<FileSpreadsheet class="h-4 w-4" />
					{/if}
					Husqvarna
					<Download class="h-3.5 w-3.5" />
				</button>

				<button
					onclick={() => exportarPedidos('otros')}
					disabled={exportandoOtros || !procesamientoSeleccionado}
					class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg
                 bg-slate-600 hover:bg-slate-700 text-white
                 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors shadow-sm"
				>
					{#if exportandoOtros}
						<LoaderCircle class="h-4 w-4 animate-spin" />
					{:else}
						<FileSpreadsheet class="h-4 w-4" />
					{/if}
					Otros
					<Download class="h-3.5 w-3.5" />
				</button>
			</div>
			<!-- <div class="bg-blue-50 dark:bg-slate-900 p-3 rounded-full">
        <ShoppingCart class="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div> -->
		</div>
	</div>

	<!-- Filtros -->
	<div class="p-4 border-b dark:border-slate-800 bg-muted/30 dark:bg-slate-900/50">
		<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
			<div class="md:col-span-2">
				<Input
					type="text"
					placeholder="Buscar código o descripción..."
					bind:value={search}
					onkeyup={(e) => e.key === 'Enter' && intentarAplicarFiltros()}
					class="h-9 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
				/>
			</div>

			<!-- <select 
      bind:value={abcFilter}
      onchange={intentarAplicarFiltros}
      class="h-9 rounded-md border border-input dark:border-slate-700 bg-background dark:bg-slate-800 px-3 text-sm md:col-span-1 dark:text-slate-200"
    >
      <option value="">ABC</option>
      {#each filtros.abcs || [] as abc}
        <option value={abc}>{abc}</option>
      {/each}
    </select> -->

			<select
				bind:value={rotacionFilter}
				onchange={intentarAplicarFiltros}
				class="h-9 rounded-md border border-input dark:border-slate-700 bg-background dark:bg-slate-800 px-3 text-sm md:col-span-1 dark:text-slate-200"
			>
				<option value="">Rotación</option>
				<option value="A">A - Frecuente</option>
				<option value="B">B - Intermedio</option>
				<option value="C">C - Esporádico</option>
				<option value="D">D - Raro</option>
				<option value="E">E - Muy raro</option>
			</select>

			<select
				bind:value={categoriaFilter}
				onchange={intentarAplicarFiltros}
				class="h-9 rounded-md border border-input dark:border-slate-700 bg-background dark:bg-slate-800 px-3 text-sm md:col-span-1 dark:text-slate-200"
			>
				<option value="">Categoría</option>
				{#each filtros.categorias || [] as cat}
					<option value={cat}>{cat}</option>
				{/each}
			</select>

			<select
				bind:value={lineaFilter}
				onchange={intentarAplicarFiltros}
				class="h-9 rounded-md border border-input dark:border-slate-700 bg-background dark:bg-slate-800 px-3 text-sm md:col-span-1 dark:text-slate-200"
			>
				<option value="">Línea</option>
				{#each filtros.lineas || [] as linea}
					<option value={linea}>{linea}</option>
				{/each}
			</select>

			<select
				bind:value={marcaFilter}
				onchange={intentarAplicarFiltros}
				class="h-9 rounded-md border border-input dark:border-slate-700 bg-background dark:bg-slate-800 px-3 text-sm md:col-span-1 dark:text-slate-200"
			>
				<option value="">Marca</option>
				{#each filtros.marcas || [] as marca}
					<option value={marca}>{marca}</option>
				{/each}
			</select>

			<div class="relative md:col-span-2">
				<select
					bind:value={ordenamiento}
					onchange={intentarAplicarFiltros}
					class="h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2 outline-none font-medium text-slate-600 dark:text-slate-300"
				>
					<optgroup label="General">
						<option value="codigo_asc">🔤 Código (A-Z)</option>
					</optgroup>
					<optgroup label="Existencias (Stock)">
						<option value="existencia_desc">⬇️ Mayor Stock</option>
						<option value="existencia_asc">⬆️ Menor Stock</option>
					</optgroup>
					<optgroup label="Ventas (Importancia)">
						<option value="ventas_desc">💰 Más Vendidos</option>
						<option value="ventas_asc">💤 Menos Vendidos</option>
					</optgroup>
				</select>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-4 mt-3 pb-2">
			<label class="relative inline-flex items-center cursor-pointer group">
				<input
					type="checkbox"
					bind:checked={soloPedido}
					onchange={intentarAplicarFiltros}
					class="sr-only peer"
				/>
				<div
					class="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
				></div>
				<span class="ms-3 text-sm font-medium text-slate-600 dark:text-slate-300"
					>Solo con Pedido</span
				>
			</label>

			<div class="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

			<label class="relative inline-flex items-center cursor-pointer group">
				<input
					type="checkbox"
					bind:checked={solo8020}
					onchange={intentarAplicarFiltros}
					class="sr-only peer"
				/>
				<div
					class="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"
				></div>
				<span
					class="ms-3 text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1"
				>
					<span>📊</span> Vista 80/20 (Pareto)
				</span>
			</label>

			<!-- ✅ NUEVO: Switch para filtrar SKUs editados y guardados -->
			<label class="relative inline-flex items-center cursor-pointer group">
				<input type="checkbox" bind:checked={soloConValoresGuardados} class="sr-only peer" />
				<div
					class="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"
				></div>
				<span
					class="ms-3 text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1"
				>
					<span>🔒</span> Solo Editados
				</span>
			</label>

			<div class="flex-1"></div>

			<div class="flex items-center gap-4 text-xs">
				{#if hayFiltrosActivos}
					<button
						onclick={limpiarFiltros}
						class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400
                 hover:bg-red-200 dark:hover:bg-red-900/50
                 border border-red-200 dark:border-red-800
                 transition-colors"
					>
						<X class="h-3.5 w-3.5" />
						Limpiar filtros
					</button>
				{/if}

				<span class="text-muted-foreground dark:text-slate-400">
					Mostrando <strong class="text-foreground dark:text-slate-200">{datos.length}</strong> de {total.toLocaleString()}
				</span>

				{#if hayCambios}
					<div
						class="flex items-center gap-2 text-[#1A73C2] dark:text-[#1A73C2] bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full border border-orange-200 dark:border-orange-800 animate-pulse shadow-sm"
					>
						<CircleAlert class="h-3.5 w-3.5" />
						<span class="font-bold">{cambiosPendientes.size} cambios pendientes</span>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- ✅ CAMBIO: Tabla con scroll y bind:this para cleanup -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="flex-1 overflow-auto transition-colors select-none {isDragging
			? 'cursor-grabbing'
			: 'cursor-grab'}"
		bind:this={scrollContainer}
		onscroll={handleScroll}
		onmousedown={onMouseDown}
		onmouseleave={onMouseLeave}
		onmouseup={onMouseUp}
		onmousemove={onMouseMove}
		role="region"
		aria-label="Tabla de datos desplazable"
	>
		{#if cargando}
			<div class="flex items-center justify-center py-20">
				<LoaderCircle class="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		{:else if datos.length === 0}
			<div class="flex items-center justify-center py-20">
				<p class="text-muted-foreground dark:text-slate-400">No se encontraron resultados</p>
			</div>
		{:else if datosFiltrados.length === 0}
			<div class="flex items-center justify-center py-20">
				<p class="text-muted-foreground dark:text-slate-400">No hay SKUs editados y guardados</p>
			</div>
		{:else}
			<table class="w-full text-xs">
				<thead class="sticky top-0 bg-muted/90 dark:bg-slate-900/95 backdrop-blur z-40">
					<tr class="border-b dark:border-slate-700">
						<th
							class="px-3 py-2 text-left font-medium sticky left-0 z-50 bg-muted dark:bg-slate-900 w-24 border-r border-border/50 dark:border-slate-700 dark:text-slate-300"
							>Código</th
						>
						<th
							class="px-3 py-2 text-left font-medium sticky left-24 z-50 bg-muted dark:bg-slate-900 w-20 border-r border-border/50 dark:border-slate-700 dark:text-slate-300"
							>Proveedor</th
						>
						<th
							class="px-3 py-2 text-left font-medium sticky left-44 z-50 bg-muted dark:bg-slate-900 min-w-[220px] max-w-[220px] border-r border-border dark:border-slate-700 shadow-[4px_0_4px_-2px_rgba(0,0,0,0.1)] dark:text-slate-300"
							>Descripción</th
						>
						<th
							class="px-3 py-2 text-left font-medium w-24 min-w-24 dark:border-slate-700 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-300"
							>Categoría</th
						>
						<th class="px-3 py-2 text-left font-medium w-32 min-w-32 dark:text-slate-300">Línea</th>
						<th class="px-3 py-2 text-left font-medium w-32 min-w-32 dark:text-slate-300">Marca</th>
						<!-- <th class="px-3 py-2 text-center font-medium w-12 dark:text-slate-300">ABC</th> -->
						<th class="px-3 py-2 text-center font-medium w-16 dark:text-slate-300">Rotación</th>
						<th class="px-3 py-2 text-center font-medium w-16 dark:text-slate-300">Activo</th>
						<th class="px-3 py-2 text-right font-medium w-20 dark:text-slate-300">Exist.</th>
						<th class="px-3 py-2 text-right font-medium w-20 dark:text-slate-300">Tránsito</th>
						<th
							class="px-3 py-2 text-center font-medium w-20 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300"
							>Freq (12M)</th
						>
						<th
							class="px-3 py-2 text-right font-medium w-24 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300"
							>Vta 12m</th
						>
						<th
							class="px-3 py-2 text-right font-medium w-24 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300"
							>Prom 12m</th
						>
						<th
							class="px-3 py-2 text-right font-medium w-24 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300"
							>Prom 6m</th
						>
						<th
							class="px-3 py-2 text-right font-medium w-24 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300"
							>Prom Ajust</th
						>
						<th
							class="px-3 py-2 text-right font-medium w-20 bg-green-50 dark:bg-green-950/40 dark:text-green-300"
							>Desv Est</th
						>
						<th
							class="px-3 py-2 text-right font-medium w-16 bg-green-50 dark:bg-green-950/40 dark:text-green-300"
							>C.V.</th
						>
						<th
							class="px-3 py-2 text-right font-medium w-16 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-300"
							>F.Seg</th
						>
						<th
							class="px-3 py-2 text-right font-medium w-20 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-300"
							>St.Seg</th
						>
						<th class="px-3 py-2 text-right font-medium w-24 dark:text-slate-300">Ref Cou</th>
						<th class="px-3 py-2 text-right font-medium w-24 dark:text-slate-300">Ref Aér</th>
						<th class="px-3 py-2 text-right font-medium w-24 dark:text-slate-300">Ref Mar</th>
						<th
							class="px-3 py-2 text-center font-medium border-l-2 border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/40 dark:text-orange-300"
							colspan="3">COURIER</th
						>
						<th
							class="px-3 py-2 text-center font-medium border-l-2 border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/40 dark:text-purple-300"
							colspan="3">AÉREO</th
						>
						<th
							class="px-3 py-2 text-center font-medium border-l-2 border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/40 dark:text-teal-300"
							colspan="2">MARÍTIMO</th
						>
						<th
							class="px-3 py-2 text-center font-medium w-28 min-w-28 bg-amber-50 dark:bg-amber-950/40 border-l-2 border-amber-300 dark:border-amber-700 dark:text-amber-300"
							>Costo Prom. DOL</th
						>
						<th
							class="px-3 py-2 text-center font-medium w-28 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300"
							>✏️ Sug Courier</th
						>
						<th
							class="px-3 py-2 text-center font-medium w-28 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300"
							>✏️ Sug Aéreo</th
						>
						<th
							class="px-3 py-2 text-center font-medium w-28 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300"
							>✏️ Sug Maritimo</th
						>
						<th class="px-3 py-2 text-center font-medium w-20 dark:text-slate-300">Hist</th>
						<th
							class="px-3 py-2 text-center font-medium w-48 min-w-48 bg-yellow-50 dark:bg-yellow-950/40 dark:text-yellow-300"
							>💬 Comentario</th
						>
						<th
							class="px-3 py-2 text-right font-medium w-32 bg-emerald-100 dark:bg-emerald-950/40 border-l-2 border-emerald-400 dark:border-emerald-700 dark:text-emerald-300"
							>Inversión</th
						>
						<th
							class="px-3 py-2 text-center font-medium w-20 bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
							>Acción</th
						>
					</tr>
				</thead>
				<tbody>
					{#each datos as sku (sku.id)}
						{@const estaBloqueado = campoBloqueado(sku.id, sku)}
						{@const tieneValores = tieneValoresGuardados(sku)}

						{@const costoUnit = sku.costo_prom_dol || sku.costo_ult_dol || 0}
						{@const sugUrgente =
							cambiosPendientes.get(sku.id)?.sugerido_analista_urgente ??
							sku.sugerido_analista_urgente ??
							0}
						{@const sugAereo =
							cambiosPendientes.get(sku.id)?.sugerido_analista_aereo ??
							sku.sugerido_analista_aereo ??
							0}
						{@const sugMaritimo =
							cambiosPendientes.get(sku.id)?.sugerido_analista_maritimo ??
							sku.sugerido_analista_maritimo ??
							0}
						{@const totalSug = sugUrgente + sugAereo + sugMaritimo}
						{@const totalInversion = totalSug * costoUnit}

						{#if !soloConValoresGuardados || tieneValores}
							<tr
								class="border-b dark:border-slate-800 hover:bg-muted/20 dark:hover:bg-slate-800/50 transition-colors {tieneValores &&
								estaBloqueado
									? 'bg-green-50/30 dark:bg-green-950/10'
									: ''}"
							>
								<td
									class="px-3 py-2 font-mono sticky left-0 bg-background dark:bg-slate-950 z-10 dark:text-slate-200"
									>{sku.codigo_sku}</td
								>
								<td
									class="px-3 py-2 sticky left-24 bg-background dark:bg-slate-950 z-10 text-[11px] dark:text-slate-300"
									>{sku.codigo_proveedor || '-'}</td
								>
								<td
									class="px-3 py-2 sticky left-44 bg-background dark:bg-slate-950 z-10 text-[11px] dark:text-slate-300"
									>{sku.descripcion}</td
								>
								<td
									class="px-3 py-2 text-[11px] w-24 min-w-24 bg-cyan-50/30 dark:bg-cyan-950/20 dark:text-cyan-300 font-medium"
									>{sku.categoria || '-'}</td
								>
								<td class="px-3 py-2 text-[11px] w-32 min-w-32 dark:text-slate-300"
									>{sku.linea || '-'}</td
								>
								<td class="px-3 py-2 text-[11px] w-32 min-w-32 dark:text-slate-300"
									>{sku.marca || '-'}</td
								>
								<!--  <td class="px-3 py-2 text-center">
                <span class={`inline-block px-1.5 py-0.5 rounded font-semibold text-[10px]
                  ${sku.abc === 'A' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' : ''}
                  ${sku.abc === 'B' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300' : ''}
                  ${sku.abc === 'C' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300' : ''}
                  ${sku.abc === 'D' || sku.abc === 'E' ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300' : ''}
                  ${sku.abc === 'N/D' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' : ''}`}>
                  {sku.abc}
                </span>
              </td> -->
								<td class="px-3 py-2 text-center text-[10px] dark:text-slate-300"
									>{sku.abc_rotacion_frecuencia}</td
								>
								<td class="px-3 py-2 text-center text-[10px] dark:text-slate-300"
									>{sku.activo ? 'Sí' : 'No'}</td
								>
								<td class="px-3 py-2 text-right dark:text-slate-200">{sku.existencia.toFixed(0)}</td
								>
								<td class="px-3 py-2 text-right dark:text-slate-200">{sku.transito.toFixed(0)}</td>
								<td
									class="px-3 py-2 text-center font-semibold text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/20"
									>{sku.frecuencia_ventas_12m}/12</td
								>
								<td
									class="px-3 py-2 text-right font-medium bg-purple-50/30 dark:bg-purple-950/20 dark:text-purple-300"
									>{sku.venta_ultimos_12m.toFixed(0)}</td
								>
								<td
									class="px-3 py-2 text-right bg-blue-50/30 dark:bg-blue-950/20 dark:text-blue-300"
									>{sku.promedio_12m.toFixed(2)}</td
								>
								<td
									class="px-3 py-2 text-right bg-blue-50/30 dark:bg-blue-950/20 dark:text-blue-300"
									>{sku.promedio_6m.toFixed(2)}</td
								>
								<td
									class="px-3 py-2 text-right font-medium bg-blue-50/30 dark:bg-blue-950/20 dark:text-blue-300"
									>{sku.promedio_ajustado.toFixed(2)}</td
								>
								<td
									class="px-3 py-2 text-right bg-green-50/30 dark:bg-green-950/20 dark:text-green-300"
									>{sku.desviacion_estandar.toFixed(2)}</td
								>
								<td
									class="px-3 py-2 text-right bg-green-50/30 dark:bg-green-950/20 dark:text-green-300"
									>{sku.coeficiente_variacion.toFixed(2)}</td
								>
								<td
									class="px-3 py-2 text-right bg-orange-50/30 dark:bg-orange-950/20 dark:text-orange-300"
									>{sku.factor_seguridad.toFixed(2)}</td
								>
								<td
									class="px-3 py-2 text-right font-medium bg-orange-50/30 dark:bg-orange-950/20 dark:text-orange-300"
									>{sku.stock_seguridad.toFixed(0)}</td
								>
								<td class="px-3 py-2 text-right dark:text-slate-200"
									>{sku.referencia_pedido_courier.toFixed(0)}</td
								>
								<td class="px-3 py-2 text-right dark:text-slate-200"
									>{sku.referencia_pedido_aereo.toFixed(0)}</td
								>
								<td class="px-3 py-2 text-right dark:text-slate-200"
									>{sku.referencia_pedido_maritimo.toFixed(0)}</td
								>
								<td
									class="px-3 py-2 text-right border-l-2 border-orange-300/30 dark:border-orange-700/50 bg-orange-50/30 dark:bg-orange-950/20 font-medium dark:text-orange-300"
								>
									{#if sku.mensaje_courier === 'PEDIR COURIER'}
										{Math.abs(sku.cantidad_courier || 0).toFixed(2)}
									{:else}
										{sku.cantidad_courier.toFixed(2)}
									{/if}
								</td>
								<td class="px-3 py-2 text-center bg-orange-50/30 dark:bg-orange-950/20">
									{#if sku.mensaje_courier}
										<span
											class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300"
											>{sku.mensaje_courier}</span
										>
									{/if}
								</td>
								<td
									class="px-3 py-2 text-right bg-orange-50/30 dark:bg-orange-950/20 dark:text-orange-300"
								>
									{#if sku.mensaje_courier === 'PEDIR COURIER'}
										{Math.abs(sku.cantidad_final_courier || 0).toFixed(2)}
									{:else}
										{sku.cantidad_final_courier.toFixed(2)}
									{/if}
								</td>
								<td
									class="px-3 py-2 text-right border-l-2 border-purple-300/30 dark:border-purple-700/50 bg-purple-50/30 dark:bg-purple-950/20 font-medium dark:text-purple-300"
								>
									{#if sku.mensaje_aereo === 'PEDIR AEREO'}
										{Math.abs(sku.cantidad_aereo || 0).toFixed(2)}
									{:else}
										{sku.cantidad_aereo.toFixed(2)}
									{/if}
								</td>
								<td class="px-3 py-2 text-center bg-purple-50/30 dark:bg-purple-950/20">
									{#if sku.mensaje_aereo}
										<span
											class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300"
											>{sku.mensaje_aereo}</span
										>
									{/if}
								</td>
								<td
									class="px-3 py-2 text-right bg-purple-50/30 dark:bg-purple-950/20 dark:text-purple-300"
								>
									{#if sku.mensaje_aereo === 'PEDIR AEREO'}
										{Math.abs(sku.cantidad_final_aereo || 0).toFixed(2)}
									{:else}
										{sku.cantidad_final_aereo.toFixed(2)}
									{/if}
								</td>
								<!-- ✅ NUEVO: Columnas MARÍTIMO -->

								<td
									class="px-3 py-2 text-right border-l-2 border-teal-300/30 dark:border-teal-700/50 bg-teal-50/30 dark:bg-teal-950/20 font-medium dark:text-teal-300"
								>
									{#if sku.mensaje_maritimo === 'PEDIR MARITIMO'}
										{Math.abs(sku.cantidad_maritimo || 0).toFixed(2)}
									{:else}
										{sku.cantidad_maritimo?.toFixed(2) || '0.00'}
									{/if}
								</td>
								<td class="px-3 py-2 text-center bg-teal-50/30 dark:bg-teal-950/20">
									{#if sku.mensaje_maritimo}
										<span
											class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300"
											>{sku.mensaje_maritimo}</span
										>
									{/if}
								</td>
								<!-- ✅ NUEVO: Columna de Costo (Último) -->
								<td
									class="px-3 py-2 text-center w-28 min-w-28 bg-amber-50/30 dark:bg-amber-950/20 border-l-2 border-amber-300 dark:border-amber-700 font-medium"
								>
									{#if sku.costo_prom_dol && sku.costo_prom_dol > 0}
										<div class="flex flex-col items-center leading-none">
											<span class="text-blue-700 dark:text-blue-400 font-bold text-center">
												${sku.costo_prom_dol.toLocaleString('en-US', {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2
												})}
											</span>
											<span class="text-[9px] text-blue-500/70 dark:text-blue-400/50 uppercase"
												>Prom</span
											>
										</div>
									{:else if sku.costo_ult_dol && sku.costo_ult_dol > 0}
										<div class="flex flex-col items-center leading-none">
											<span class="text-blue-600 dark:text-blue-500 font-semibold text-center">
												${sku.costo_ult_dol.toLocaleString('en-US', {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2
												})}
											</span>
											<span class="text-[9px] text-blue-500/70 dark:text-blue-400/50 uppercase"
												>Últ</span
											>
										</div>
									{:else if sku.costo_prom_loc && sku.costo_prom_loc > 0}
										<span
											class="text-amber-700 dark:text-amber-300 font-semibold text-[10px] text-center"
										>
											₡{sku.costo_prom_loc.toLocaleString('es-CR', {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2
											})}
										</span>
									{:else if sku.costo_ult_loc && sku.costo_ult_loc > 0}
										<span
											class="text-amber-700 dark:text-amber-300 font-semibold text-[10px] text-center"
										>
											₡{sku.costo_ult_loc.toLocaleString('es-CR', {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2
											})}
										</span>
									{:else}
										<span class="text-slate-300 dark:text-slate-600 text-xs">-</span>
									{/if}
								</td>

								<td class="px-2 py-2 bg-blue-50/50 dark:bg-blue-950/30 w-32 min-w-32">
									{#if estaBloqueado}
										<div
											class="flex items-center justify-center gap-2 h-8 px-2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
										>
											<Lock class="h-3 w-3 text-slate-400 dark:text-slate-500" />
											<span class="text-xs font-bold text-green-600 dark:text-green-400"
												>{sku.sugerido_analista_urgente || 0}</span
											>
										</div>
									{:else}
										<div class="flex items-center gap-1">
											<button
												class="h-8 w-8 flex items-center justify-center rounded border bg-white dark:bg-slate-800 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
												onclick={() => {
													const val =
														cambiosPendientes.get(sku.id)?.sugerido_analista_urgente ??
														sku.sugerido_analista_urgente;
													registrarCambio(
														sku.id,
														'sugerido_analista_urgente',
														Math.max(0, (val || 0) - 1)
													);
												}}>-</button
											>
											<input
												type="number"
												value={cambiosPendientes.get(sku.id)?.sugerido_analista_urgente ??
													sku.sugerido_analista_urgente}
												oninput={(e) =>
													registrarCambio(
														sku.id,
														'sugerido_analista_urgente',
														parseFloat(e.currentTarget.value) || 0
													)}
												class="h-8 w-full text-center border rounded text-xs font-bold bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500 appearance-none dark:text-slate-100"
												min="0"
											/>
											<button
												class="h-8 w-8 flex items-center justify-center rounded border bg-white dark:bg-slate-800 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
												onclick={() => {
													const val =
														cambiosPendientes.get(sku.id)?.sugerido_analista_urgente ??
														sku.sugerido_analista_urgente;
													registrarCambio(sku.id, 'sugerido_analista_urgente', (val || 0) + 1);
												}}>+</button
											>
										</div>
									{/if}
								</td>

								<td class="px-2 py-2 bg-blue-50/50 dark:bg-blue-950/30 w-32 min-w-32">
									{#if estaBloqueado}
										<div
											class="flex items-center justify-center gap-2 h-8 px-2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
										>
											<Lock class="h-3 w-3 text-slate-400 dark:text-slate-500" />
											<span class="text-xs font-bold text-green-600 dark:text-green-400"
												>{sku.sugerido_analista_aereo || 0}</span
											>
										</div>
									{:else}
										<div class="flex items-center gap-1">
											<button
												class="h-8 w-8 flex items-center justify-center rounded border bg-white dark:bg-slate-800 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
												onclick={() => {
													const val =
														cambiosPendientes.get(sku.id)?.sugerido_analista_aereo ??
														sku.sugerido_analista_aereo;
													registrarCambio(
														sku.id,
														'sugerido_analista_aereo',
														Math.max(0, (val || 0) - 1)
													);
												}}>-</button
											>
											<input
												type="number"
												value={cambiosPendientes.get(sku.id)?.sugerido_analista_aereo ??
													sku.sugerido_analista_aereo}
												oninput={(e) =>
													registrarCambio(
														sku.id,
														'sugerido_analista_aereo',
														parseFloat(e.currentTarget.value) || 0
													)}
												class="h-8 w-full text-center border rounded text-xs font-bold bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500 appearance-none dark:text-slate-100"
												min="0"
											/>
											<button
												class="h-8 w-8 flex items-center justify-center rounded border bg-white dark:bg-slate-800 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
												onclick={() => {
													const val =
														cambiosPendientes.get(sku.id)?.sugerido_analista_aereo ??
														sku.sugerido_analista_aereo;
													registrarCambio(sku.id, 'sugerido_analista_aereo', (val || 0) + 1);
												}}>+</button
											>
										</div>
									{/if}
								</td>

								<td class="px-2 py-2 bg-teal-50/50 dark:bg-teal-950/30 w-32 min-w-32">
									{#if estaBloqueado}
										<div
											class="flex items-center justify-center gap-2 h-8 px-2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
										>
											<Lock class="h-3 w-3 text-slate-400 dark:text-slate-500" />
											<span class="text-xs font-bold text-teal-700 dark:text-teal-400"
												>{sku.sugerido_analista_maritimo || 0}</span
											>
										</div>
									{:else}
										<div class="flex items-center gap-1">
											<button
												class="h-8 w-8 flex items-center justify-center rounded border bg-white dark:bg-slate-800 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
												onclick={() => {
													const val =
														cambiosPendientes.get(sku.id)?.sugerido_analista_maritimo ??
														sku.sugerido_analista_maritimo;
													registrarCambio(
														sku.id,
														'sugerido_analista_maritimo',
														Math.max(0, (val || 0) - 1)
													);
												}}>-</button
											>
											<input
												type="number"
												value={cambiosPendientes.get(sku.id)?.sugerido_analista_maritimo ??
													sku.sugerido_analista_maritimo}
												oninput={(e) =>
													registrarCambio(
														sku.id,
														'sugerido_analista_maritimo',
														parseFloat(e.currentTarget.value) || 0
													)}
												class="h-8 w-full text-center border rounded text-xs font-bold bg-white dark:bg-slate-800 border-teal-300 dark:border-teal-700 focus:ring-2 focus:ring-teal-500 appearance-none select-text dark:text-slate-100"
												min="0"
											/>
											<button
												class="h-8 w-8 flex items-center justify-center rounded border bg-white dark:bg-slate-800 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
												onclick={() => {
													const val =
														cambiosPendientes.get(sku.id)?.sugerido_analista_maritimo ??
														sku.sugerido_analista_maritimo;
													registrarCambio(sku.id, 'sugerido_analista_maritimo', (val || 0) + 1);
												}}>+</button
											>
										</div>
									{/if}
								</td>

								<td class="px-3 py-2 text-center">
									<button
										onclick={() => toggleHistorico(sku.id, sku.codigo_sku)}
										class="p-1 hover:bg-muted dark:hover:bg-slate-800 rounded dark:text-slate-300"
									>
										{#if filaExpandida === sku.id}
											<ChevronUp class="h-4 w-4" />
										{:else}
											<ChevronDown class="h-4 w-4" />
										{/if}
									</button>
								</td>

								<!-- ✅ NUEVO: Comentario del analista -->
								<td class="px-2 py-2 bg-yellow-50/30 dark:bg-yellow-950/20 w-48 min-w-48">
									{#if estaBloqueado && sku.comentario_analista}
										<div
											class="flex items-center gap-2 h-8 px-2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden"
										>
											<Lock class="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
											<span
												class="text-xs text-slate-600 dark:text-slate-400 truncate"
												title={sku.comentario_analista}>{sku.comentario_analista}</span
											>
										</div>
									{:else}
										<input
											type="text"
											value={cambiosPendientes.get(sku.id)?.comentario_analista ??
												sku.comentario_analista ??
												''}
											oninput={(e) =>
												registrarCambio(sku.id, 'comentario_analista', e.currentTarget.value)}
											placeholder="Agregar comentario..."
											class="h-8 w-full px-2 border rounded text-xs bg-white dark:bg-slate-800 dark:border-yellow-700 focus:ring-2 focus:ring-yellow-500 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
										/>
									{/if}
								</td>

								<td
									class="px-3 py-2 text-right bg-emerald-50/50 dark:bg-emerald-950/20 border-l-2 border-emerald-200 dark:border-emerald-800"
								>
									{#if totalSug > 0}
										<div class="flex flex-col items-end">
											<span class="font-bold text-emerald-700 dark:text-emerald-400">
												$ {totalInversion.toLocaleString('en-US', {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2
												})}
											</span>
										</div>
									{:else}
										<span class="text-slate-300 dark:text-slate-600">-</span>
									{/if}
								</td>

								<td class="px-2 py-2 text-center bg-slate-50 dark:bg-slate-900">
									{#if tieneValores && estaBloqueado}
										<button
											onclick={() => habilitarEdicion(sku.id)}
											class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 transition-colors border border-blue-200 dark:border-blue-800"
										>
											<Pencil class="h-3 w-3" />
											Editar
										</button>
									{:else if filasEnEdicion.has(sku.id)}
										<span
											class="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-[#1A73C2] dark:text-[#1A73C2] bg-orange-50 dark:bg-orange-900/30"
										>
											<Pencil class="h-3 w-3 animate-pulse" />
											Editando...
										</span>
									{:else}
										<span class="text-slate-300 dark:text-slate-600">--</span>
									{/if}
								</td>
							</tr>

							{#if filaExpandida === sku.id}
								<tr class="bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800">
									<td colspan="36" class="p-0 border-0">
										<div class="sticky left-0 w-[94vw] flex justify-center items-start py-6 px-4">
											{#if cargandoHistorico[sku.id]}
												<div
													class="flex flex-col items-center justify-center py-6 text-slate-400 gap-2 w-full max-w-5xl bg-white/50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600"
												>
													<LoaderCircle
														class="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400"
													/>
													<span class="text-xs font-medium dark:text-slate-300"
														>Consultando historial...</span
													>
												</div>
											{:else}
												<div
													class="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden"
												>
													<div
														class="grid grid-cols-[80px_repeat(12,1fr)_70px_90px] bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"
													>
														<div
															class="py-2.5 px-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase text-left border-r border-slate-200 dark:border-slate-700"
														>
															Año
														</div>
														{#each ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as mes}
															<div
																class="py-2.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center uppercase border-r border-slate-100 dark:border-slate-700"
															>
																{mes}
															</div>
														{/each}
														<div
															class="py-2.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center uppercase border-l border-slate-200 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-700/50"
														>
															Total
														</div>
														<div
															class="py-2.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center uppercase border-l border-slate-200 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-700/50"
														>
															Var %
														</div>
													</div>
													<div
														class="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto"
													>
														{#each getAñosVisualizacion() as año, añoIndex}
															{@const datosAño = datosHistoricoCompleto[sku.id]?.[año] || {}}
															{@const totalAño = calcularTotalAño(datosAño)}
															{@const añoAnterior = año - 1}
															{@const datosAñoAnterior =
																datosHistoricoCompleto[sku.id]?.[añoAnterior] || {}}
															{@const totalAñoAnterior = calcularTotalAño(datosAñoAnterior)}
															{@const variacion = calcularVariacion(totalAño, totalAñoAnterior)}
															<div
																class="grid grid-cols-[80px_repeat(12,1fr)_70px_90px] hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors group"
															>
																<div
																	class="py-3 px-3 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700"
																>
																	{año}
																</div>
																{#each Array(12) as _, i}
																	{@const mes = i + 1}
																	{@const mesPadded = mes.toString().padStart(2, '0')}
																	{@const valor = datosAño[mesPadded] || 0}
																	<div
																		class="relative py-3 flex items-center justify-center border-r border-slate-50 dark:border-slate-800"
																	>
																		{#if valor > 0}
																			<span
																				class="text-xs font-bold text-blue-700 dark:text-blue-400 tabular-nums"
																				>{valor}</span
																			>
																		{:else if valor < 0}
																			<span
																				class="text-xs font-bold text-red-600 dark:text-red-400 tabular-nums"
																				>{valor}</span
																			>
																		{:else}
																			<span class="text-[10px] text-slate-200 dark:text-slate-700"
																				>-</span
																			>
																		{/if}
																	</div>
																{/each}
																<!-- Total del año -->
																<div
																	class="py-3 flex items-center justify-center border-l border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
																>
																	<span
																		class="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums"
																		>{totalAño}</span
																	>
																</div>
																<!-- Variación vs año anterior -->
																<div
																	class="py-3 flex items-center justify-center gap-1 border-l border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
																>
																	{#if año === AÑO_BASE}
																		<span class="text-[10px] text-slate-400 dark:text-slate-600"
																			>—</span
																		>
																	{:else if variacion.tipo === 'subio'}
																		<TrendingUp
																			class="h-3.5 w-3.5 text-green-600 dark:text-green-400"
																		/>
																		<span
																			class="text-xs font-bold text-green-600 dark:text-green-400 tabular-nums"
																			>+{variacion.porcentaje.toFixed(0)}%</span
																		>
																	{:else if variacion.tipo === 'bajo'}
																		<TrendingDown
																			class="h-3.5 w-3.5 text-red-600 dark:text-red-400"
																		/>
																		<span
																			class="text-xs font-bold text-red-600 dark:text-red-400 tabular-nums"
																			>-{variacion.porcentaje.toFixed(0)}%</span
																		>
																	{:else}
																		<Minus class="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
																		<span class="text-xs text-slate-400 dark:text-slate-500"
																			>0%</span
																		>
																	{/if}
																</div>
															</div>
														{/each}
													</div>
													<div
														class="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center"
													>
														<div class="text-[10px] text-slate-400 dark:text-slate-500 italic">
															* Datos desde {AÑO_BASE}
														</div>
														<button
															onclick={() => toggleHistorico(sku.id, sku.codigo_sku)}
															class="text-[10px] text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium uppercase tracking-wider"
															>Cerrar</button
														>
													</div>
												</div>
											{/if}
										</div>
									</td>
								</tr>
							{/if}
						{/if}
					{/each}
				</tbody>
			</table>

			{#if cargandoMas}
				<div class="flex items-center justify-center py-4">
					<LoaderCircle class="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			{/if}
		{/if}
	</div>

	{#if hayCambios}
		<div
			class="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2 animate-in slide-in-from-bottom-5 duration-300"
		>
			<div
				class="bg-slate-900 dark:bg-slate-800 text-white px-4 py-2 rounded-lg shadow-xl border border-slate-700 dark:border-slate-600 flex items-center gap-3 mb-1"
			>
				<div class="flex flex-col items-end">
					<span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider"
						>Inversión Estimada</span
					>
					<span class="text-lg font-bold text-emerald-400">
						{totalEstimadoCambios.toLocaleString('en-US', {
							style: 'currency',
							currency: 'USD',
							minimumFractionDigits: 2
						})}
						<span class="text-xs text-slate-500 font-normal ml-1">aprox.</span>
					</span>
				</div>
			</div>

			<button
				onclick={guardarCambios}
				class="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-all hover:scale-105 font-medium"
			>
				<Save class="h-5 w-5" />
				Guardar {cambiosPendientes.size} Cambio(s)
			</button>
		</div>
	{/if}
</div>

{#if mostrarSelectorProcesamiento}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-40" onclick={() => (mostrarSelectorProcesamiento = false)}></div>
{/if}

<style>
	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
</style>
