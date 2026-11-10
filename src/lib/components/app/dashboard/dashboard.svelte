<script lang="ts">
	/**
	 * @module Dashboard
	 * @description Dashboard principal con datos reales del procesamiento de forecast
	 * Muestra código de procesamiento y permite seleccionar históricos
	 */

	import { onMount, onDestroy } from 'svelte'; // ✅ CAMBIO: Agregar onDestroy
	import {
		TrendingUp,
		Package,
		AlertCircle,
		ShoppingCart,
		Clock,
		BarChart3,
		Activity,
		XCircle,
		AlertTriangle,
		Plane,
		Truck,
		CheckCircle2,
		RefreshCw,
		ArrowRight,
		History,
		ChevronDown
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	// ===== TYPES =====
	interface ProcesamientoDisponible {
		codigo: string;
		fecha: string;
		usuario: string;
		totalSKUs: number;
	}

	interface DashboardStats {
		ultimoProcesamiento: {
			codigo: string | null;
			fecha: string | null;
			usuario: string;
		};
		procesamientosDisponibles: ProcesamientoDisponible[];
		totalSKUs: number;
		skusActivos: number;
		skusInactivos: number;
		stockCritico: number;
		stockBajo: number;
		sinStock: number;
		requierenPedidoCourier: number;
		requierenPedidoAereo: number;
		totalRequierenPedido: number;
		skusConPedido: number;
		conSugeridoUrgente: number;
		conSugeridoAereo: number;
		totalConSugerido: number;
		distribucionABC: {
			A: number;
			B: number;
			C: number;
			D: number;
			E: number;
			'N/D': number;
		};
		distribucionRotacion: {
			A: number;
			B: number;
			C: number;
			D: number;
			E: number;
		};
		topLineas: Array<{ linea: string; cantidad: number }>;
		topMarcas: Array<{ marca: string; cantidad: number }>;
		filtrosActivos?: {
			categoria: string;
			soloPedido: boolean;
			solo8020: boolean;
		};
		categoriasDisponibles?: string[];
	}

	interface Alerta {
		id: number;
		tipo: 'critico' | 'advertencia' | 'info';
		sku: string;
		descripcion: string;
		mensaje: string;
		abc: string;
		existencia: number;
		stockSeguridad: number;
	}

	interface ResumenPedidos {
		cantidadCourier: number;
		cantidadAereo: number;
		sugeridoUrgente: number;
		sugeridoAereo: number;
	}

	// ===== PROPS =====
	let { data = $bindable(), user = $bindable() } = $props();

	// ===== STATE =====
	let loading = $state(true);
	let sinDatos = $state(false);
	let stats = $state<DashboardStats | null>(null);
	let alertas = $state<Alerta[]>([]);
	let resumenPedidos = $state<ResumenPedidos>({
		cantidadCourier: 0,
		cantidadAereo: 0,
		sugeridoUrgente: 0,
		sugeridoAereo: 0
	});

	// Contadores de alertas por tipo
	let alertasCriticas = $derived(alertas.filter((a) => a.tipo === 'critico').length);
	let alertasAdvertencias = $derived(alertas.filter((a) => a.tipo === 'advertencia').length);
	let alertasInfo = $derived(alertas.filter((a) => a.tipo === 'info').length);

	// Selector de procesamiento
	let procesamientoSeleccionado = $state('');
	let mostrarSelectorProcesamiento = $state(false);
	let categoriaFilter = $state('');
	let soloPedido = $state(false);
	let solo8020 = $state(false);

	// ===== FUNCIONES =====
	async function cargarDatos(codigoProcesamiento?: string) {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (codigoProcesamiento) {
				params.set('procesamiento', codigoProcesamiento);
			}
			// ✅ NUEVO: enviar filtros activos
			if (categoriaFilter) {
				params.set('categoria', categoriaFilter);
			}
			if (soloPedido) {
				params.set('solo_pedido', 'true');
			}
			if (solo8020) {
				params.set('solo_8020', 'true');
			}

			const res = await fetch(`/api/dashboard/stats?${params}`);

			if (!res.ok) {
				throw new Error('Error al cargar datos');
			}

			const data = await res.json();

			if (data.sinDatos) {
				sinDatos = true;
				return;
			}

			stats = data.stats;
			alertas = data.alertas || [];
			resumenPedidos = data.resumenPedidos || {
				cantidadCourier: 0,
				cantidadAereo: 0,
				sugeridoUrgente: 0,
				sugeridoAereo: 0
			};

			// Actualizar procesamiento seleccionado
			if (stats?.ultimoProcesamiento?.codigo) {
				procesamientoSeleccionado = stats.ultimoProcesamiento.codigo;
			}
		} catch (error) {
			console.error('Error cargando datos del dashboard:', error);
			toast.error('Error al cargar datos del dashboard');
		} finally {
			loading = false;
		}
	}

	function cambiarProcesamiento(codigo: string) {
		procesamientoSeleccionado = codigo;
		mostrarSelectorProcesamiento = false;
		cargarDatos(codigo);
	}

	// detectar filtros activos
	let hayFiltrosActivos = $derived(categoriaFilter !== '' || soloPedido || solo8020);

	let contadorFiltros = $derived(
		(categoriaFilter ? 1 : 0) + (soloPedido ? 1 : 0) + (solo8020 ? 1 : 0)
	);

	//  aplicar filtros (re-fetch al cambiar)
	function aplicarFiltros() {
		cargarDatos(procesamientoSeleccionado);
	}

	// limpiar todos los filtros
	function limpiarFiltros() {
		categoriaFilter = '';
		soloPedido = false;
		solo8020 = false;
		cargarDatos(procesamientoSeleccionado);
	}

	function formatNumber(num: number): string {
		return new Intl.NumberFormat('es-CR').format(num);
	}

	function formatFechaCorta(fechaISO: string): string {
		return new Date(fechaISO).toLocaleString('es-CR', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getAlertColor(tipo: Alerta['tipo']): string {
		const colors = {
			critico:
				'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
			advertencia:
				'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800',
			info: 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
		};
		return colors[tipo];
	}

	function getAlertIcon(tipo: Alerta['tipo']) {
		const icons = {
			critico: XCircle,
			advertencia: AlertTriangle,
			info: AlertCircle
		};
		return icons[tipo];
	}

	function getABCColor(abc: string): string {
		const colors: Record<string, string> = {
			A: 'bg-green-500',
			B: 'bg-blue-500',
			C: 'bg-yellow-500',
			D: 'bg-orange-500',
			E: 'bg-red-500',
			'N/D': 'bg-gray-400'
		};
		return colors[abc] || 'bg-gray-400';
	}

	function getRotacionLabel(rot: string): string {
		const labels: Record<string, string> = {
			A: 'Frecuente',
			B: 'Intermedio',
			C: 'Esporádico',
			D: 'Raro',
			E: 'Muy raro'
		};
		return labels[rot] || rot;
	}

	// ===== LIFECYCLE =====
	onMount(() => {
		cargarDatos();
	});

	// ✅ CAMBIO: Limpiar recursos al desmontar
	onDestroy(() => {
		// Limpiar datos grandes al desmontar
		stats = null;
		alertas = [];
		resumenPedidos = {
			cantidadCourier: 0,
			cantidadAereo: 0,
			sugeridoUrgente: 0,
			sugeridoAereo: 0
		};

		console.log('[dashboard] ✅ Recursos liberados');
	});
</script>

{#if loading}
	<div class="flex flex-1 items-center justify-center p-8">
		<div class="flex flex-col items-center gap-4">
			<div
				class="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
			></div>
			<p class="text-sm text-muted-foreground">Cargando datos del sistema...</p>
		</div>
	</div>
{:else if sinDatos}
	<div class="flex flex-1 items-center justify-center p-8">
		<div class="flex flex-col items-center gap-4 text-center max-w-md">
			<div
				class="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center"
			>
				<AlertTriangle class="h-8 w-8 text-amber-600 dark:text-amber-400" />
			</div>
			<h2 class="text-xl font-bold">Sin datos de procesamiento</h2>
			<p class="text-muted-foreground">
				No hay datos de forecast procesados. Ejecute un procesamiento desde el módulo de
				administración para ver las estadísticas.
			</p>
			<a
				href="/admin/procesar"
				class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
			>
				Ir a Procesamiento
				<ArrowRight class="h-4 w-4" />
			</a>
		</div>
	</div>
{:else if stats}
	<main class="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
		<!-- Header -->
		<div class="flex flex-col gap-2">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0D1E3D]">
						<Activity class="h-6 w-6 text-white" />
					</div>
					<div>
						<h1 class="text-2xl font-bold tracking-tight">Dashboard de Compras</h1>
						<p class="text-sm text-muted-foreground">
							Sistema de Forecast y Análisis - SoporteXperto
						</p>
					</div>
				</div>

				<button
					onclick={() => cargarDatos(procesamientoSeleccionado)}
					class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border hover:bg-accent transition-colors"
				>
					<RefreshCw class="h-4 w-4" />
					Actualizar
				</button>
			</div>

			<!-- Info del procesamiento con selector -->
			{#if stats.ultimoProcesamiento.fecha}
				<div
					class="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2 p-3 bg-muted/50 rounded-lg"
				>
					<!-- Código de procesamiento con selector -->
					<div class="relative">
						<button
							onclick={() => (mostrarSelectorProcesamiento = !mostrarSelectorProcesamiento)}
							class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors font-medium"
						>
							<History class="h-3.5 w-3.5" />
							<span class="font-mono">{stats.ultimoProcesamiento.codigo}</span>
							<ChevronDown
								class="h-3.5 w-3.5 {mostrarSelectorProcesamiento
									? 'rotate-180'
									: ''} transition-transform"
							/>
						</button>

						<!-- Dropdown de procesamientos -->
						{#if mostrarSelectorProcesamiento && stats.procesamientosDisponibles.length > 1}
							<div
								class="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-slate-900 border rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto"
							>
								<div class="p-2 border-b bg-muted/50">
									<p class="text-xs font-semibold text-muted-foreground">
										Seleccionar procesamiento
									</p>
								</div>
								{#each stats.procesamientosDisponibles as proc}
									<button
										onclick={() => cambiarProcesamiento(proc.codigo)}
										class="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center justify-between gap-2 {proc.codigo ===
										procesamientoSeleccionado
											? 'bg-blue-50 dark:bg-blue-950/30'
											: ''}"
									>
										<div class="flex flex-col">
											<span
												class="font-mono text-xs font-semibold {proc.codigo ===
												procesamientoSeleccionado
													? 'text-blue-600 dark:text-blue-400'
													: ''}"
											>
												{proc.codigo}
											</span>
											<span class="text-[10px] text-muted-foreground">
												{formatFechaCorta(proc.fecha)} · {proc.usuario.split('@')[0]}
											</span>
										</div>
										<span
											class="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
										>
											{formatNumber(proc.totalSKUs)} SKUs
										</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>

					<div class="h-4 w-px bg-border"></div>

					<div class="flex items-center gap-1.5">
						<Clock class="h-3.5 w-3.5" />
						<span class="font-medium">Fecha:</span>
						{new Date(stats.ultimoProcesamiento.fecha).toLocaleString('es-CR', {
							year: 'numeric',
							month: 'short',
							day: 'numeric',
							hour: '2-digit',
							minute: '2-digit'
						})}
					</div>

					<div class="h-4 w-px bg-border"></div>

					<div class="flex items-center gap-1.5">
						<span class="font-medium">Por:</span>
						{stats.ultimoProcesamiento.usuario}
					</div>

					{#if stats.procesamientosDisponibles.length > 1}
						<div class="h-4 w-px bg-border"></div>
						<span class="text-[10px] text-muted-foreground">
							{stats.procesamientosDisponibles.length} procesamientos disponibles
						</span>
					{/if}
				</div>
			{/if}
		</div>

		<!--  Barra de filtros dinámicos -->
		<div
			class="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border dark:border-slate-800"
		>
			<!-- Fila 1: controles -->
			<div class="flex flex-wrap items-center gap-3">
				<span
					class="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide"
				>
					Filtros del análisis:
				</span>

				<!-- Selector de Categoría -->
				<select
					bind:value={categoriaFilter}
					onchange={aplicarFiltros}
					class="h-9 rounded-md border border-input dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm dark:text-slate-200"
				>
					<option value="">Todas las categorías</option>
					{#each stats.categoriasDisponibles || [] as cat}
						<option value={cat}>{cat}</option>
					{/each}
				</select>

				<!-- Switch Solo con Pedido -->
				<label class="relative inline-flex items-center cursor-pointer">
					<input
						type="checkbox"
						bind:checked={soloPedido}
						onchange={aplicarFiltros}
						class="sr-only peer"
					/>
					<div
						class="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
					></div>
					<span class="ms-2 text-sm font-medium text-slate-600 dark:text-slate-300"
						>Solo con pedido</span
					>
				</label>

				<!-- Switch 80/20 -->
				<label class="relative inline-flex items-center cursor-pointer">
					<input
						type="checkbox"
						bind:checked={solo8020}
						onchange={aplicarFiltros}
						class="sr-only peer"
					/>
					<div
						class="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"
					></div>
					<span class="ms-2 text-sm font-medium text-slate-600 dark:text-slate-300"
						>📊 Vista 80/20</span
					>
				</label>

				{#if hayFiltrosActivos}
					<div class="flex-1"></div>
					<button
						onclick={limpiarFiltros}
						class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 transition-colors"
					>
						<XCircle class="h-3.5 w-3.5" />
						Limpiar filtros
					</button>
				{/if}
			</div>

			<!-- Fila 2: chips visibles de filtros activos -->
			{#if hayFiltrosActivos}
				<div
					class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800"
				>
					<span
						class="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide"
					>
						⚠️ Datos filtrados ({contadorFiltros}):
					</span>

					{#if categoriaFilter}
						<span
							class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
						>
							Categoría: <strong>{categoriaFilter}</strong>
						</span>
					{/if}

					{#if soloPedido}
						<span
							class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
						>
							Solo con pedido
						</span>
					{/if}

					{#if solo8020}
						<span
							class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
						>
							Vista 80/20
						</span>
					{/if}

					<span class="text-xs text-slate-500 dark:text-slate-500 italic">
						Los indicadores y alertas reflejan únicamente los SKUs que cumplen los filtros.
					</span>
				</div>
			{/if}
		</div>

		<!-- KPIs Principales -->
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
			<!-- Total SKUs -->
			<div class="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-1">
						<p class="text-sm font-medium text-muted-foreground">Total SKUs</p>
						<p class="text-3xl font-bold">{formatNumber(stats.totalSKUs)}</p>
						<p class="text-xs text-muted-foreground">{formatNumber(stats.skusActivos)} activos</p>
					</div>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950"
					>
						<Package class="h-6 w-6 text-blue-600 dark:text-blue-400" />
					</div>
				</div>
			</div>

			<!-- Stock Crítico -->
			<div
				class="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow {stats.stockCritico >
				0
					? 'border-red-200 dark:border-red-800'
					: ''}"
			>
				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-1">
						<p class="text-sm font-medium text-muted-foreground">Stock Crítico</p>
						<p
							class="text-3xl font-bold {stats.stockCritico > 0
								? 'text-red-600'
								: 'text-green-600'}"
						>
							{stats.stockCritico}
						</p>
						<p class="text-xs text-muted-foreground">SKUs ABC A/B sin stock</p>
					</div>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full {stats.stockCritico > 0
							? 'bg-red-100 dark:bg-red-950'
							: 'bg-green-100 dark:bg-green-950'}"
					>
						{#if stats.stockCritico > 0}
							<XCircle class="h-6 w-6 text-red-600 dark:text-red-400" />
						{:else}
							<CheckCircle2 class="h-6 w-6 text-green-600 dark:text-green-400" />
						{/if}
					</div>
				</div>
			</div>

			<!-- Stock Bajo -->
			<div class="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-1">
						<p class="text-sm font-medium text-muted-foreground">Stock Bajo</p>
						<p class="text-3xl font-bold text-amber-600">{stats.stockBajo}</p>
						<p class="text-xs text-muted-foreground">SKUs bajo mínimo</p>
					</div>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950"
					>
						<AlertTriangle class="h-6 w-6 text-amber-600 dark:text-amber-400" />
					</div>
				</div>
			</div>

			<!-- SKUs con Pedido -->
			<div
				class="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow border-indigo-200 dark:border-indigo-800"
			>
				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-1">
						<p class="text-sm font-medium text-muted-foreground">SKUs con Pedido</p>
						<p class="text-3xl font-bold text-indigo-600">{formatNumber(stats.skusConPedido)}</p>
						<p class="text-xs text-muted-foreground">Líneas</p>
					</div>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950"
					>
						<ShoppingCart class="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
					</div>
				</div>
			</div>

			<!-- Requieren Pedido -->
			<div class="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-1">
						<p class="text-sm font-medium text-muted-foreground">Sugeridos a Pedir</p>
						<p class="text-3xl font-bold text-purple-600">
							{formatNumber(Math.round(stats.requierenPedidoCourier + stats.requierenPedidoAereo))}
						</p>
						<p class="text-xs text-muted-foreground">
							{formatNumber(Math.round(stats.requierenPedidoCourier))} courier · {formatNumber(
								Math.round(stats.requierenPedidoAereo)
							)} aéreo
						</p>
					</div>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950"
					>
						<ShoppingCart class="h-6 w-6 text-purple-600 dark:text-purple-400" />
					</div>
				</div>
			</div>

			<!-- Con Sugerido Analista -->
			<div class="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-1">
						<p class="text-sm font-medium text-muted-foreground">Sugeridos Analista</p>
						<p class="text-3xl font-bold text-green-600">{stats.totalConSugerido}</p>
						<p class="text-xs text-muted-foreground">
							{stats.conSugeridoUrgente} urgente · {stats.conSugeridoAereo} aéreo
						</p>
					</div>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950"
					>
						<CheckCircle2 class="h-6 w-6 text-green-600 dark:text-green-400" />
					</div>
				</div>
			</div>

			<!-- Sin Stock Total -->
			<div class="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-1">
						<p class="text-sm font-medium text-muted-foreground">Sin Stock</p>
						<p class="text-3xl font-bold">{stats.sinStock}</p>
						<p class="text-xs text-muted-foreground">SKUs con existencia 0</p>
					</div>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
					>
						<Package class="h-6 w-6 text-slate-600 dark:text-slate-400" />
					</div>
				</div>
			</div>
		</div>

		<!-- Segunda fila: Distribuciones y Alertas -->
		<div class="grid gap-4 md:gap-6 lg:grid-cols-2">
			<!-- Distribución ABC 
      <div class="rounded-xl border bg-card shadow-sm">
        <div class="border-b p-5">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold">Distribución ABC</h3>
              <p class="text-sm text-muted-foreground">Clasificación por valor</p>
            </div>
            <BarChart3 class="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        <div class="p-5 space-y-3">
          {#each Object.entries(stats.distribucionABC) as [abc, cantidad]}
            {@const porcentaje = stats.totalSKUs > 0 ? (cantidad / stats.totalSKUs) * 100 : 0}
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center justify-center w-6 h-6 rounded font-bold text-xs text-white {getABCColor(abc)}">
                    {abc}
                  </span>
                  <span class="font-medium">{formatNumber(cantidad)}</span>
                </div>
                <span class="text-muted-foreground">{porcentaje.toFixed(1)}%</span>
              </div>
              <div class="h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  class="h-full rounded-full {getABCColor(abc)} transition-all duration-500"
                  style="width: {porcentaje}%"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      </div> -->

			<!-- Distribución por Rotación (Frecuencia de Ventas) -->
			<div class="rounded-xl border bg-card shadow-sm">
				<div class="border-b p-5">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-lg font-semibold">Rotación por Frecuencia</h3>
							<p class="text-sm text-muted-foreground">
								Clasificación dinámica según ventas últimos 12 meses
							</p>
						</div>
						<TrendingUp class="h-5 w-5 text-muted-foreground" />
					</div>
				</div>
				<div class="p-5 space-y-3">
					{#each Object.entries(stats.distribucionRotacion) as [rot, cantidad]}
						{@const porcentaje = stats.totalSKUs > 0 ? (cantidad / stats.totalSKUs) * 100 : 0}
						<div class="space-y-1.5">
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-2">
									<span
										class="inline-flex items-center justify-center w-6 h-6 rounded font-bold text-xs text-white {getABCColor(
											rot
										)}"
									>
										{rot}
									</span>
									<span class="text-muted-foreground text-xs">{getRotacionLabel(rot)}</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="font-bold">{formatNumber(cantidad)}</span>
									<span class="text-xs text-muted-foreground">SKUs</span>
									<!-- <span class="text-xs text-muted-foreground">({porcentaje.toFixed(1)}%)</span> -->
								</div>
							</div>
							<div class="h-2 rounded-full bg-muted overflow-hidden">
								<div
									class="h-full rounded-full {getABCColor(rot)} transition-all duration-500"
									style="width: {porcentaje}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
				<!-- Leyenda explicativa -->
				<!-- <div class="px-5 pb-4">
          <div class="text-[10px] text-muted-foreground bg-muted/50 rounded-lg p-2 space-y-0.5">
            <p><strong>A:</strong> ≥6 meses con ventas | <strong>B:</strong> 4-5 meses | <strong>C:</strong> 3 meses</p>
            <p><strong>D:</strong> 2 meses | <strong>E:</strong> 0-1 meses con ventas</p>
          </div>
        </div> -->
			</div>

			<!-- Alertas Recientes -->
			<!-- Alertas Recientes -->
			<div class="rounded-xl border bg-card shadow-sm">
				<div class="border-b p-5">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-lg font-semibold">Alertas</h3>
							<p class="text-sm text-muted-foreground">Muestra de SKUs que requieren atención</p>
						</div>
						<AlertCircle class="h-5 w-5 text-muted-foreground" />
					</div>
				</div>
				<div class="p-4 max-h-[250px] overflow-y-auto">
					{#if alertas.length === 0}
						<div class="flex flex-col items-center justify-center py-8 text-center">
							<CheckCircle2 class="h-10 w-10 text-green-500 mb-2" />
							<p class="text-sm text-muted-foreground">Sin alertas</p>
						</div>
					{:else}
						<div class="space-y-2">
							{#each alertas as alerta}
								{@const Icon = getAlertIcon(alerta.tipo)}
								<div class="rounded-lg border p-3 {getAlertColor(alerta.tipo)}">
									<div class="flex items-start gap-2">
										<Icon class="h-4 w-4 flex-shrink-0 mt-0.5" />
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2">
												<p class="text-xs font-bold truncate">{alerta.sku}</p>
												<span
													class="text-[10px] px-1.5 py-0.5 rounded font-bold bg-white/50 dark:bg-black/20"
												>
													{alerta.abc}
												</span>
											</div>
											<p class="text-[11px] truncate opacity-80">{alerta.descripcion}</p>
											<p class="text-[11px] font-medium mt-0.5">{alerta.mensaje}</p>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
				<!-- Leyenda -->
				<div class="px-4 pb-3 border-t pt-2">
					<div class="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
						<span class="flex items-center gap-1"
							><span class="w-2 h-2 rounded-full bg-red-500"></span> Crítico</span
						>
						<span class="flex items-center gap-1"
							><span class="w-2 h-2 rounded-full bg-amber-500"></span> Advertencia</span
						>
						<span class="flex items-center gap-1"
							><span class="w-2 h-2 rounded-full bg-blue-500"></span> Info</span
						>
					</div>
				</div>
			</div>
		</div>

		<!-- Tercera fila: Resumen de pedidos y Top categorías -->
		<div class="grid gap-4 md:gap-6 lg:grid-cols-2">
			<!-- Resumen de Cantidades a Pedir -->
			<div class="rounded-xl border bg-card shadow-sm">
				<div class="border-b p-5">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-lg font-semibold">Resumen de Pedidos</h3>
							<p class="text-sm text-muted-foreground">Cantidades calculadas y sugeridas</p>
						</div>
						<ShoppingCart class="h-5 w-5 text-muted-foreground" />
					</div>
				</div>
				<div class="p-5">
					<div class="grid grid-cols-2 gap-4">
						<!-- Courier -->
						<div
							class="rounded-lg border p-4 bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
						>
							<div class="flex items-center gap-3 mb-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900"
								>
									<Truck class="h-5 w-5 text-orange-600 dark:text-orange-400" />
								</div>
								<div>
									<p class="text-sm font-semibold text-orange-800 dark:text-orange-200">Courier</p>
									<p class="text-xs text-orange-600 dark:text-orange-400">Urgente 2 meses</p>
								</div>
							</div>
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-xs text-muted-foreground">Calculado:</span>
									<span class="font-bold"
										>{formatNumber(Math.round(resumenPedidos.cantidadCourier))} uds</span
									>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-xs text-muted-foreground">Sugerido analista:</span>
									<span class="font-bold text-green-600"
										>{formatNumber(Math.round(resumenPedidos.sugeridoUrgente))} uds</span
									>
								</div>
							</div>
						</div>

						<!-- Aéreo -->
						<div
							class="rounded-lg border p-4 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
						>
							<div class="flex items-center gap-3 mb-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900"
								>
									<Plane class="h-5 w-5 text-purple-600 dark:text-purple-400" />
								</div>
								<div>
									<p class="text-sm font-semibold text-purple-800 dark:text-purple-200">Aéreo</p>
									<p class="text-xs text-purple-600 dark:text-purple-400">LT 3.5 meses</p>
								</div>
							</div>
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-xs text-muted-foreground">Calculado:</span>
									<span class="font-bold"
										>{formatNumber(Math.round(resumenPedidos.cantidadAereo))} uds</span
									>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-xs text-muted-foreground">Sugerido analista:</span>
									<span class="font-bold text-green-600"
										>{formatNumber(Math.round(resumenPedidos.sugeridoAereo))} uds</span
									>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Top Líneas y Marcas con Pedido -->
			<div class="rounded-xl border bg-card shadow-sm">
				<div class="border-b p-5">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-lg font-semibold">Top con Pedido Sugerido</h3>
							<p class="text-sm text-muted-foreground">
								Líneas y marcas con más SKUs que requieren reposición
							</p>
						</div>
						<ShoppingCart class="h-5 w-5 text-muted-foreground" />
					</div>
				</div>
				<div class="p-5">
					<div class="grid grid-cols-2 gap-6">
						<!-- Top Líneas -->
						<div>
							<h4 class="text-sm font-semibold mb-3 text-muted-foreground">Por Línea</h4>
							{#if stats.topLineas.length === 0}
								<p class="text-xs text-muted-foreground italic">Sin datos</p>
							{:else}
								<div class="space-y-2">
									{#each stats.topLineas as item, index}
										<div class="flex items-center justify-between text-sm">
											<div class="flex items-center gap-2">
												<span
													class="flex h-5 w-5 items-center justify-center rounded bg-blue-100 dark:bg-blue-900 text-[10px] font-bold text-blue-600 dark:text-blue-400"
												>
													{index + 1}
												</span>
												<span class="truncate max-w-[120px]" title={item.linea}>{item.linea}</span>
											</div>
											<div class="flex items-center gap-1">
												<span class="font-bold">{formatNumber(item.cantidad)}</span>
												<span class="text-[10px] text-muted-foreground">SKUs</span>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Top Marcas -->
						<div>
							<h4 class="text-sm font-semibold mb-3 text-muted-foreground">Por Marca</h4>
							{#if stats.topMarcas.length === 0}
								<p class="text-xs text-muted-foreground italic">Sin datos</p>
							{:else}
								<div class="space-y-2">
									{#each stats.topMarcas as item, index}
										<div class="flex items-center justify-between text-sm">
											<div class="flex items-center gap-2">
												<span
													class="flex h-5 w-5 items-center justify-center rounded bg-purple-100 dark:bg-purple-900 text-[10px] font-bold text-purple-600 dark:text-purple-400"
												>
													{index + 1}
												</span>
												<span class="truncate max-w-[120px]" title={item.marca}
													>{item.marca || 'Sin marca'}</span
												>
											</div>
											<div class="flex items-center gap-1">
												<span class="font-bold">{formatNumber(item.cantidad)}</span>
												<span class="text-[10px] text-muted-foreground">SKUs</span>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</main>
{/if}

<!-- Click fuera del dropdown para cerrar -->
{#if mostrarSelectorProcesamiento}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-40" onclick={() => (mostrarSelectorProcesamiento = false)}></div>
{/if}
