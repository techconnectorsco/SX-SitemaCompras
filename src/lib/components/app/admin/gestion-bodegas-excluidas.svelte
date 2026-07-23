<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { RefreshCw, Check, AlertCircle, Search, X, Download } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	interface Bodega {
		id: number;
		bodega_codigo: string;
		bodega_nombre: string;
		tipo: string;
		telefono: string;
		direccion: string;
		u_zona: string;
		tipo_establecimiento: string;
		excluida: boolean;
		fecha_actualizacion: string | null;
	}

	let bodegas = $state<Bodega[]>([]);
	let bodegasFiltradas = $state<Bodega[]>([]);
	let cargando = $state(false);
	let guardando = $state(false);
	let cambiosPendientes = $state(false);
	let error = $state<string | null>(null);
	let filtro = $state('');
	let mostrarSoloIncluidas = $state(false);
	let montado = $state(false);

	let bodegasModificadas = $state<Map<number, boolean>>(new Map());

	function aplicarFiltro() {
		let resultado = [...bodegas];

		if (filtro.trim()) {
			const busqueda = filtro.toLowerCase();
			resultado = resultado.filter(
				(bodega) =>
					bodega.bodega_codigo.toLowerCase().includes(busqueda) ||
					bodega.bodega_nombre.toLowerCase().includes(busqueda) ||
					bodega.tipo.toLowerCase().includes(busqueda) ||
					bodega.telefono.toLowerCase().includes(busqueda) ||
					bodega.direccion.toLowerCase().includes(busqueda) ||
					bodega.u_zona.toLowerCase().includes(busqueda) ||
					bodega.tipo_establecimiento.toLowerCase().includes(busqueda)
			);
		}

		if (mostrarSoloIncluidas) {
			resultado = resultado.filter((bodega) => !bodega.excluida);
		}

		bodegasFiltradas = resultado;
	}

	function limpiarFiltro() {
		filtro = '';
		mostrarSoloIncluidas = false;
		bodegasFiltradas = [...bodegas];
	}

	$effect(() => {
		if (!montado) {
			montado = true;
			(async () => {
				try {
					console.log('[Component] Cargando bodegas de SQLite...');
					const res = await fetch('/api/admin/bodegas');

					if (res.ok) {
						const data = await res.json();
						if (data.bodegas && data.bodegas.length > 0) {
							bodegas = (data.bodegas || []).map((b: any) => ({
								...b,
								excluida: b.excluida === 1 || b.excluida === true
							}));
							bodegasFiltradas = [...bodegas];
							console.log(`[Component] ✅ Cargadas ${bodegas.length} bodegas de SQLite`);
						}
					}
				} catch (e) {
					console.error('[Component] Error cargando de SQLite:', e);
				}
			})();
		}
	});

	async function cargarBodegasDesdeExactus() {
		cargando = true;
		error = null;
		bodegasModificadas.clear();
		cambiosPendientes = false;

		try {
			const res = await fetch('/api/admin/bodegas/actualizar', {
				method: 'POST'
			});

			if (!res.ok) {
				throw new Error(`Error ${res.status}: ${res.statusText}`);
			}

			const data = await res.json();

			if (data.bodegas && data.bodegas.length > 0) {
				await obtenerBodegasDelSQLite();
				toast.success(data.mensaje || `✅ ${data.nuevas_agregadas} bodegas cargadas`);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error desconocido';
			toast.error(`❌ ${error}`);
		} finally {
			cargando = false;
		}
	}

	async function obtenerBodegasDelSQLite() {
		try {
			const res = await fetch('/api/admin/bodegas');

			if (res.ok) {
				const data = await res.json();
				bodegas = (data.bodegas || []).map((b: any) => ({
					...b,
					excluida: b.excluida === 1 || b.excluida === true
				}));
				bodegasFiltradas = [...bodegas];
			}
		} catch (e) {
			console.error('[Component] Error recargando bodegas:', e);
		}
	}

	async function actualizarBodegasDesdeExactus() {
		cargando = true;
		error = null;

		try {
			const res = await fetch('/api/admin/bodegas/actualizar', {
				method: 'POST'
			});

			if (!res.ok) {
				throw new Error('Error al actualizar bodegas');
			}

			const data = await res.json();
			toast.success(data.mensaje || `✅ Sincronización completada`);

			await obtenerBodegasDelSQLite();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error desconocido';
			toast.error(error);
		} finally {
			cargando = false;
		}
	}

	/**
	 * Checkbox marcado significa "INCLUIR".
	 * Al hacer click: si estaba excluida → se incluye; si estaba incluida → se excluye.
	 * La BD sigue almacenando el campo 'excluida' tal cual.
	 */
	function toggleIncluida(bodega: Bodega) {
		const novaExcluida = !bodega.excluida;
		bodega.excluida = novaExcluida;

		bodegasModificadas.set(bodega.id, novaExcluida);
		bodegasModificadas = new Map(bodegasModificadas);

		cambiosPendientes = true;
		aplicarFiltro();
	}

	async function guardarCambios() {
		if (bodegasModificadas.size === 0) {
			toast.info('No hay cambios pendientes');
			return;
		}

		guardando = true;
		error = null;
		let exito = 0;
		let errores = 0;

		try {
			for (const [id, excluida] of bodegasModificadas.entries()) {
				try {
					const bodega = bodegas.find((b) => b.id === id);
					console.log(
						`[Component] PATCH /api/admin/bodegas (${bodega?.bodega_codigo}): excluida=${excluida}`
					);

					const res = await fetch(`/api/admin/bodegas`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							id: id,
							excluida,
							razon: 'Cambio manual del admin'
						})
					});

					if (res.ok) {
						exito++;
					} else {
						const errorData = await res.json();
						errores++;
						console.error(`[Component] ❌ ID=${id} error:`, errorData);
					}
				} catch (e) {
					errores++;
					console.error(`[Component] ❌ ID=${id} excepción:`, e);
				}
			}

			if (exito > 0) {
				toast.success(`✅ ${exito} bodega(s) actualizada(s)`);
				bodegasModificadas.clear();
				bodegasModificadas = new Map();
				cambiosPendientes = false;
			}

			if (errores > 0) {
				toast.error(`❌ ${errores} error(es) al actualizar`);
			}

			await obtenerBodegasDelSQLite();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error desconocido';
			toast.error(error);
		} finally {
			guardando = false;
		}
	}

	$effect(() => {
		aplicarFiltro();
	});
</script>

<Card class="border-blue-100 dark:border-blue-900">
	<CardHeader>
		<div class="flex items-start justify-between mb-4">
			<div>
				<CardTitle>Gestión de Bodegas</CardTitle>
				<CardDescription>
					Selecciona qué bodegas <strong>incluir</strong> en el cálculo de existencia
				</CardDescription>
			</div>
			{#if bodegas.length > 0}
				<Button
					onclick={actualizarBodegasDesdeExactus}
					disabled={cargando}
					variant="outline"
					size="sm"
					class="gap-2"
				>
					<RefreshCw class="h-4 w-4" />
					Actualizar de Exactus
				</Button>
			{:else}
				<Button
					onclick={cargarBodegasDesdeExactus}
					disabled={cargando}
					size="sm"
					class="gap-2 bg-blue-600 hover:bg-blue-700"
				>
					<Download class="h-4 w-4" />
					Cargar Bodegas
				</Button>
			{/if}
		</div>

		{#if bodegas.length > 0}
			<div class="flex gap-2 items-center mb-3">
				<div class="flex-1 relative">
					<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
					<input
						type="text"
						placeholder="Buscar por código, nombre, tipo, zona, dirección..."
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

			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					id="soloIncluidas"
					bind:checked={mostrarSoloIncluidas}
					class="h-4 w-4 rounded accent-blue-600 cursor-pointer"
				/>
				<label for="soloIncluidas" class="text-sm text-muted-foreground cursor-pointer">
					Mostrar solo bodegas incluidas ({bodegas.filter((b) => !b.excluida).length})
				</label>
			</div>
		{/if}
	</CardHeader>

	<CardContent class="space-y-5">
		{#if error}
			<div
				class="flex gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900"
			>
				<AlertCircle class="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
				<div>
					<p class="font-semibold text-red-900 dark:text-red-100">Error</p>
					<p class="text-sm text-red-700 dark:text-red-200">{error}</p>
				</div>
			</div>
		{/if}

		{#if cargando && bodegas.length === 0}
			<div class="flex justify-center py-12">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			</div>
		{:else if bodegas.length === 0}
			<p class="text-center text-muted-foreground py-8">
				No hay bodegas cargadas. Presiona "Cargar Bodegas" para sincronizar desde Exactus.
				<br />
				<span class="text-xs"
					>Las bodegas entrarán como excluidas por defecto. Marca las que deseas incluir.</span
				>
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
						<!-- Incluida: verde fuerte | Excluida: rojo suave -->
						<div
							class="border rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition {!bodega.excluida
								? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
								: 'bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/40'}"
						>
							<div class="flex items-start gap-3 mb-2">
								<input
									type="checkbox"
									checked={!bodega.excluida}
									onchange={() => toggleIncluida(bodega)}
									disabled={guardando}
									class="h-4 w-4 rounded accent-blue-600 cursor-pointer mt-0.5 flex-shrink-0"
									title={bodega.excluida
										? 'Marcar para incluir en el procesamiento'
										: 'Desmarcar para excluir del procesamiento'}
								/>

								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<p class="font-bold text-sm text-slate-900 dark:text-white">
											{bodega.bodega_codigo}
										</p>
										<span
											class="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono"
										>
											ID: {bodega.id}
										</span>
									</div>
									<p class="text-xs text-muted-foreground truncate">
										{bodega.bodega_nombre}
									</p>
								</div>

								<!-- Badge: Incluida=verde fuerte | Excluida=rojo suave -->
								{#if !bodega.excluida}
									<span
										class="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-semibold flex-shrink-0"
									>
										Incluida
									</span>
								{:else}
									<span
										class="px-2 py-1 bg-red-100/70 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded text-xs font-semibold flex-shrink-0"
									>
										Excluida
									</span>
								{/if}
							</div>

							<div class="space-y-1.5 text-xs border-t pt-2">
								{#if bodega.tipo}
									<div>
										<span class="text-muted-foreground font-semibold">Tipo:</span>
										<span class="text-slate-700 dark:text-slate-300 ml-1">{bodega.tipo}</span>
									</div>
								{/if}

								{#if bodega.u_zona}
									<div>
										<span class="text-muted-foreground font-semibold">Zona:</span>
										<span class="text-slate-700 dark:text-slate-300 ml-1">{bodega.u_zona}</span>
									</div>
								{/if}

								{#if bodega.tipo_establecimiento}
									<div>
										<span class="text-muted-foreground font-semibold">Estab.:</span>
										<span class="text-slate-700 dark:text-slate-300 ml-1"
											>{bodega.tipo_establecimiento}</span
										>
									</div>
								{/if}

								{#if bodega.telefono}
									<div>
										<span class="text-muted-foreground font-semibold">Tel:</span>
										<span class="text-slate-700 dark:text-slate-300 ml-1">{bodega.telefono}</span>
									</div>
								{/if}

								{#if bodega.direccion}
									<div>
										<span class="text-muted-foreground font-semibold">Dirección:</span>
										<p class="text-slate-700 dark:text-slate-300 text-xs mt-0.5">
											{bodega.direccion}
										</p>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				{#if bodegasFiltradas.length === 0}
					<div class="text-center py-8 text-muted-foreground">
						<AlertCircle class="h-8 w-8 mx-auto mb-2 opacity-50" />
						<p>
							{mostrarSoloIncluidas
								? 'No hay bodegas incluidas. Marca las que deseas usar en el procesamiento.'
								: 'No hay bodegas que coincidan con la búsqueda'}
						</p>
					</div>
				{/if}
			</div>

			<!-- Resumen: Incluidas verde | Excluidas rojo -->
			<div class="grid grid-cols-3 gap-3 pt-4 border-t mt-4">
				<div class="text-center">
					<p class="text-sm text-muted-foreground">Total</p>
					<p class="text-lg font-bold">{bodegas.length}</p>
				</div>
				<div class="text-center">
					<p class="text-sm text-muted-foreground">Incluidas</p>
					<p class="text-lg font-bold text-green-600">
						{bodegas.filter((b) => !b.excluida).length}
					</p>
				</div>
				<div class="text-center">
					<p class="text-sm text-muted-foreground">Excluidas</p>
					<p class="text-lg font-bold text-red-600">
						{bodegas.filter((b) => b.excluida).length}
					</p>
				</div>
			</div>

			{#if cambiosPendientes}
				<div
					class="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900"
				>
					<AlertCircle class="h-4 w-4 text-yellow-600" />
					<p class="text-sm text-yellow-700 dark:text-yellow-200">
						Tienes {bodegasModificadas.size} cambio(s) sin guardar
					</p>
				</div>
			{/if}

			<Button
				onclick={guardarCambios}
				disabled={!cambiosPendientes || guardando}
				class="w-full gap-2 bg-blue-600 hover:bg-blue-700"
			>
				{#if guardando}
					<span
						class="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full"
					></span>
					Guardando...
				{:else}
					<Check class="h-4 w-4" />
					Guardar Cambios
				{/if}
			</Button>
		{/if}
	</CardContent>
</Card>
