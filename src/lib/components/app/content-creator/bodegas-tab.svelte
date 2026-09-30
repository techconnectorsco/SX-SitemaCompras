<script lang="ts">
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';
	import {
		RefreshCw,
		Check,
		AlertCircle,
		Search,
		X,
		Download,
		Warehouse,
		CheckSquare,
		Square
	} from 'lucide-svelte';

	interface Bodega {
		id: number;
		bodega_codigo: string;
		bodega_nombre: string;
		tipo: string;
		telefono: string;
		direccion: string;
		u_zona: string;
		tipo_establecimiento: string;
		cc_incluida: boolean;
	}

	let bodegas = $state<Bodega[]>([]);
	let bodegasFiltradas = $state<Bodega[]>([]);
	let cargando = $state(false);
	let guardando = $state(false);
	let sincronizando = $state(false);
	let error = $state<string | null>(null);
	let filtro = $state('');
	let mostrarSoloIncluidas = $state(false);

	let bodegasModificadas = $state<Map<number, boolean>>(new Map());
	let cambiosPendientes = $state(false);

	function aplicarFiltro() {
		let resultado = [...bodegas];
		if (filtro.trim()) {
			const busqueda = filtro.toLowerCase();
			resultado = resultado.filter(
				(b) =>
					b.bodega_codigo.toLowerCase().includes(busqueda) ||
					b.bodega_nombre.toLowerCase().includes(busqueda) ||
					b.tipo.toLowerCase().includes(busqueda) ||
					b.u_zona.toLowerCase().includes(busqueda) ||
					b.tipo_establecimiento.toLowerCase().includes(busqueda) ||
					b.direccion.toLowerCase().includes(busqueda)
			);
		}
		if (mostrarSoloIncluidas) {
			resultado = resultado.filter((b) => b.cc_incluida);
		}
		bodegasFiltradas = resultado;
	}

	function limpiarFiltro() {
		filtro = '';
		mostrarSoloIncluidas = false;
		bodegasFiltradas = [...bodegas];
	}

	async function cargarBodegas() {
		cargando = true;
		error = null;
		try {
			const res = await fetch('/api/content-creator/bodegas');
			if (!res.ok) throw new Error(`Error ${res.status}`);
			const data = await res.json();
			bodegas = (data.bodegas || []).map((b: any) => ({
				...b,
				cc_incluida: b.cc_incluida === true || b.cc_incluida === 1
			}));
			bodegasModificadas = new Map();
			cambiosPendientes = false;
			bodegasFiltradas = [...bodegas];
		} catch (e: any) {
			error = e?.message || 'Error cargando bodegas';
			console.error('[CC Bodegas] cargarBodegas:', e);
		} finally {
			cargando = false;
		}
	}

	$effect(() => {
		aplicarFiltro();
	});

	onMount(() => {
		cargarBodegas();
	});

	async function sincronizarDesdeExactus() {
		sincronizando = true;
		error = null;
		try {
			const res = await fetch('/api/content-creator/bodegas/sync', { method: 'POST' });
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data?.error || `Error ${res.status}`);
			}
			toast.success(data?.mensaje || 'Sincronización completada');
			await cargarBodegas();
		} catch (e: any) {
			error = e?.message || 'Error al sincronizar';
			toast.error(`❌ ${error}`);
		} finally {
			sincronizando = false;
		}
	}

	function toggleIncluida(bodega: Bodega) {
		const nueva = !bodega.cc_incluida;
		bodega.cc_incluida = nueva;
		bodegasModificadas.set(bodega.id, nueva);
		bodegasModificadas = new Map(bodegasModificadas);
		cambiosPendientes = true;
		aplicarFiltro();
	}

	function seleccionarTodas(incluir: boolean) {
		let recuento = 0;
		for (const b of bodegasFiltradas) {
			if (b.cc_incluida !== incluir) {
				b.cc_incluida = incluir;
				bodegasModificadas.set(b.id, incluir);
				recuento++;
			}
		}
		if (recuento > 0) {
			bodegasModificadas = new Map(bodegasModificadas);
			cambiosPendientes = true;
			aplicarFiltro();
			toast.info(incluir ? `Se marcaron ${recuento} bodega(s)` : `Se desmarcaron ${recuento} bodega(s)`);
		}
	}

	async function guardarCambios() {
		if (bodegasModificadas.size === 0) {
			toast.info('No hay cambios pendientes');
			return;
		}
		guardando = true;
		try {
			const items = Array.from(bodegasModificadas.entries()).map(([id, cc_incluida]) => ({ id, cc_incluida }));
			const res = await fetch('/api/content-creator/bodegas', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ items })
			});
			if (res.ok) {
				toast.success(`✅ ${items.length} bodega(s) actualizada(s)`);
				bodegasModificadas = new Map();
				cambiosPendientes = false;
				await cargarBodegas();
			} else {
				toast.error('❌ Error al actualizar las bodegas');
			}
		} catch (e) {
			toast.error('❌ Error de red al actualizar');
		} finally {
			guardando = false;
		}
	}
</script>

<div class="space-y-4">
	<div class="flex items-center gap-2 text-[#0D1E3D]">
		<Warehouse class="h-5 w-5" />
		<div>
			<h2 class="text-sm font-bold uppercase tracking-wider">Bodegas · Creador de Contenido</h2>
			<p class="text-xs text-muted-foreground">
				Selecciona las bodegas cuyas existencias alimentarán el catálogo de productos.
				Independiente del módulo de Compras.
			</p>
		</div>
	</div>

	<Card.Root class="border-blue-100 dark:border-blue-900">
		<Card.Header>
			<div class="flex items-start justify-between mb-4">
				<div>
					<Card.Title>Gestión de Bodegas</Card.Title>
					<Card.Description>
						Marca las bodegas que deseas <strong>incluir</strong> en el catálogo del Cronograma.
					</Card.Description>
				</div>
				<Button
					onclick={sincronizarDesdeExactus}
					disabled={sincronizando}
					variant="outline"
					size="sm"
					class="gap-2"
				>
					{#if sincronizando}
						<span class="animate-spin inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
						Sincronizando...
					{:else if bodegas.length === 0}
						<Download class="h-4 w-4" />
						Cargar Bodegas
					{:else}
						<RefreshCw class="h-4 w-4" />
						Sincronizar de Exactus
					{/if}
				</Button>
			</div>

			{#if bodegas.length > 0}
				<div class="flex gap-2 items-center mb-3">
					<div class="flex-1 relative">
						<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<input
							type="text"
							placeholder="Buscar por código, nombre, tipo, zona..."
							bind:value={filtro}
							class="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					{#if filtro || mostrarSoloIncluidas}
						<Button onclick={limpiarFiltro} variant="outline" size="sm" class="gap-2">
							<X class="h-4 w-4" />
							Limpiar
						</Button>
					{/if}
				</div>

				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							id="cc_soloIncluidas"
							bind:checked={mostrarSoloIncluidas}
							class="h-4 w-4 rounded accent-blue-600 cursor-pointer"
						/>
						<label for="cc_soloIncluidas" class="text-sm text-muted-foreground cursor-pointer select-none">
							Mostrar solo incluidas ({bodegas.filter((b) => b.cc_incluida).length})
						</label>
					</div>

					<div class="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							class="h-8 text-xs font-semibold gap-1.5 cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-700 dark:hover:text-green-300"
							onclick={() => seleccionarTodas(true)}
							disabled={guardando || bodegasFiltradas.length === 0 || bodegasFiltradas.every((b) => b.cc_incluida)}
							title="Seleccionar todas las bodegas visibles"
						>
							<CheckSquare class="h-3.5 w-3.5 text-green-600" />
							Seleccionar todas
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							class="h-8 text-xs font-semibold gap-1.5 cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300"
							onclick={() => seleccionarTodas(false)}
							disabled={guardando || bodegasFiltradas.length === 0 || bodegasFiltradas.every((b) => !b.cc_incluida)}
							title="Desmarcar todas las bodegas visibles"
						>
							<Square class="h-3.5 w-3.5 text-red-500" />
							Desmarcar todas
						</Button>
					</div>
				</div>
			{/if}
		</Card.Header>

		<Card.Content class="space-y-5">
			{#if error}
				<div class="flex gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
					<AlertCircle class="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
					<div>
						<p class="font-semibold text-red-900 dark:text-red-100">Error</p>
						<p class="text-sm text-red-700 dark:text-red-200">{error}</p>
					</div>
				</div>
			{/if}

			{#if sincronizando && bodegas.length === 0}
				<div class="flex justify-center py-12">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				</div>
			{:else if bodegas.length === 0}
				<p class="text-center text-muted-foreground py-8">
					No hay bodegas cargadas. Presiona <strong>"Cargar Bodegas"</strong> para sincronizar desde Exactus (requiere VPN).
				</p>
			{:else}
				<div class="space-y-3">
					<div class="text-xs text-muted-foreground">
						Mostrando {bodegasFiltradas.length} de {bodegas.length} bodegas
						{#if mostrarSoloIncluidas}
							<span class="text-green-600 font-semibold">(filtradas: solo incluidas)</span>
						{/if}
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2">
						{#each bodegasFiltradas as bodega (bodega.id)}
							<div
								class="border rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition {bodega.cc_incluida
									? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
									: 'bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/40'}"
							>
								<div class="flex items-start gap-3 mb-2">
									<input
										type="checkbox"
										checked={bodega.cc_incluida}
										onchange={() => toggleIncluida(bodega)}
										disabled={guardando}
										class="h-4 w-4 rounded accent-blue-600 cursor-pointer mt-0.5 flex-shrink-0"
										title={bodega.cc_incluida
											? 'Desmarcar para no incluir en el catálogo'
											: 'Marcar para incluir en el catálogo'}
									/>

									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<p class="font-bold text-sm text-slate-900 dark:text-white">{bodega.bodega_codigo}</p>
											<span class="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">
												ID: {bodega.id}
											</span>
										</div>
										<p class="text-xs text-muted-foreground truncate">{bodega.bodega_nombre}</p>
									</div>

									{#if bodega.cc_incluida}
										<span class="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-semibold flex-shrink-0">Incluida</span>
									{:else}
										<span class="px-2 py-1 bg-red-100/70 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded text-xs font-semibold flex-shrink-0">No incluida</span>
									{/if}
								</div>

								<div class="space-y-1.5 text-xs border-t pt-2">
									{#if bodega.tipo}
										<div><span class="text-muted-foreground font-semibold">Tipo:</span><span class="text-slate-700 dark:text-slate-300 ml-1">{bodega.tipo}</span></div>
									{/if}
									{#if bodega.u_zona}
										<div><span class="text-muted-foreground font-semibold">Zona:</span><span class="text-slate-700 dark:text-slate-300 ml-1">{bodega.u_zona}</span></div>
									{/if}
									{#if bodega.tipo_establecimiento}
										<div><span class="text-muted-foreground font-semibold">Estab.:</span><span class="text-slate-700 dark:text-slate-300 ml-1">{bodega.tipo_establecimiento}</span></div>
									{/if}
									{#if bodega.direccion}
										<div><span class="text-muted-foreground font-semibold">Dirección:</span><p class="text-slate-700 dark:text-slate-300 text-xs mt-0.5">{bodega.direccion}</p></div>
									{/if}
								</div>
							</div>
						{/each}
					</div>

					{#if bodegasFiltradas.length === 0}
						<div class="text-center py-8 text-muted-foreground">
							<AlertCircle class="h-8 w-8 mx-auto mb-2 opacity-50" />
							<p>No hay bodegas que coincidan con la búsqueda</p>
						</div>
					{/if}

					<div class="grid grid-cols-3 gap-3 pt-4 border-t mt-4">
						<div class="text-center"><p class="text-sm text-muted-foreground">Total</p><p class="text-lg font-bold">{bodegas.length}</p></div>
						<div class="text-center"><p class="text-sm text-muted-foreground">Incluidas</p><p class="text-lg font-bold text-green-600">{bodegas.filter((b) => b.cc_incluida).length}</p></div>
						<div class="text-center"><p class="text-sm text-muted-foreground">No incluidas</p><p class="text-lg font-bold text-red-600">{bodegas.filter((b) => !b.cc_incluida).length}</p></div>
					</div>

					{#if cambiosPendientes}
						<div class="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900">
							<AlertCircle class="h-4 w-4 text-yellow-600" />
							<p class="text-sm text-yellow-700 dark:text-yellow-200">Tienes {bodegasModificadas.size} cambio(s) sin guardar</p>
						</div>
					{/if}

					<Button onclick={guardarCambios} disabled={!cambiosPendientes || guardando} class="w-full gap-2 bg-blue-600 hover:bg-blue-700">
						{#if guardando}
							<span class="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
							Guardando...
						{:else}
							<Check class="h-4 w-4" />
							Guardar Cambios
						{/if}
					</Button>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>