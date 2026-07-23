<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Check, AlertCircle, Plus, Trash2, Info, Search, Copy, Lock } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	interface MarcaLt {
		clave: string;
		marca_exactus: string | null;
		etiqueta: string;
		lt_courier: number;
		lt_aereo: number;
		lt_maritimo: number;
		meses_pedido: number;
		activo: number; // 0 | 1
		nota: string | null;
		actualizado_por: string | null;
		fecha_actualizacion: string | null;
	}

	const CLAVE_DEFAULT = '__DEFAULT__';

	let filas = $state<MarcaLt[]>([]);
	let cargando = $state(false);
	let guardando = $state(false);
	let error = $state<string | null>(null);
	let montado = $state(false);
	let filtro = $state('');

	let modificadas = $state<Set<string>>(new Set());

	// Alta de proveedor nuevo (caso simple: una marca = una clave)
	let nueva = $state({
		marca_exactus: '',
		etiqueta: '',
		lt_courier: 1,
		lt_aereo: 2,
		lt_maritimo: 3,
		meses_pedido: 0
	});
	let agregando = $state(false);
	let mostrarFormNueva = $state(false);

	let filasFiltradas = $derived(
		filtro.trim()
			? filas.filter((f) => {
					const b = filtro.toLowerCase();
					return (
						f.etiqueta.toLowerCase().includes(b) ||
						(f.marca_exactus || '').toLowerCase().includes(b) ||
						f.clave.toLowerCase().includes(b)
					);
				})
			: filas
	);

	// Agrupar por etiqueta (Deyu = un bloque con sus 4 filas)
	let grupos = $derived.by(() => {
		const map = new Map<string, MarcaLt[]>();
		for (const f of filasFiltradas) {
			if (!map.has(f.etiqueta)) map.set(f.etiqueta, []);
			map.get(f.etiqueta)!.push(f);
		}
		return [...map.entries()].map(([etiqueta, items]) => ({ etiqueta, items }));
	});

	async function cargar() {
		cargando = true;
		error = null;
		try {
			const res = await fetch('/api/admin/marcas-lt');
			if (res.ok) {
				const data = await res.json();
				filas = (data.marcas || []).map((m: any) => ({
					...m,
					lt_courier: Number(m.lt_courier),
					lt_aereo: Number(m.lt_aereo),
					lt_maritimo: Number(m.lt_maritimo),
					meses_pedido: Number(m.meses_pedido),
					activo: Number(m.activo)
				}));
				modificadas = new Set();
			} else {
				const e = await res.json();
				throw new Error(e.error || `Error ${res.status}`);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error desconocido';
			toast.error(`❌ ${error}`);
		} finally {
			cargando = false;
		}
	}

	$effect(() => {
		if (!montado) {
			montado = true;
			cargar();
		}
	});

	function marcarModificada(clave: string) {
		modificadas.add(clave);
		modificadas = new Set(modificadas);
	}

	function toggleActivo(f: MarcaLt) {
		f.activo = f.activo ? 0 : 1;
		marcarModificada(f.clave);
	}

	// Copia los valores de una fila a las hermanas del mismo grupo (ej. Deyu)
	function igualarGrupo(items: MarcaLt[], origen: MarcaLt) {
		for (const f of items) {
			if (f.clave === origen.clave) continue;
			f.lt_courier = origen.lt_courier;
			f.lt_aereo = origen.lt_aereo;
			f.lt_maritimo = origen.lt_maritimo;
			f.meses_pedido = origen.meses_pedido;
			marcarModificada(f.clave);
		}
		toast.success('Valores copiados al resto del grupo (recordá guardar)');
	}

	async function guardarCambios() {
		if (modificadas.size === 0) {
			toast.info('No hay cambios pendientes');
			return;
		}
		guardando = true;
		error = null;
		let exito = 0;
		let errores = 0;

		try {
			for (const clave of modificadas) {
				const f = filas.find((x) => x.clave === clave);
				if (!f) continue;
				try {
					const res = await fetch('/api/admin/marcas-lt', {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							clave: f.clave,
							etiqueta: f.etiqueta,
							lt_courier: f.lt_courier,
							lt_aereo: f.lt_aereo,
							lt_maritimo: f.lt_maritimo,
							meses_pedido: f.meses_pedido,
							activo: f.activo,
							nota: f.nota
						})
					});
					if (res.ok) exito++;
					else {
						errores++;
						const e = await res.json();
						console.error(`[Marcas-LT] ❌ ${f.clave}:`, e);
						toast.error(`❌ ${f.etiqueta}: ${e.error || 'error'}`);
					}
				} catch (e) {
					errores++;
					console.error(`[Marcas-LT] ❌ ${f.clave}:`, e);
				}
			}
			if (exito > 0) toast.success(`✅ ${exito} tarifa(s) actualizada(s)`);
			await cargar();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error desconocido';
			toast.error(error);
		} finally {
			guardando = false;
		}
	}

	async function agregarProveedor() {
		const marca = nueva.marca_exactus.toUpperCase().trim();
		if (!marca) {
			toast.error('Escribe el nombre de la marca tal como está en Exactus');
			return;
		}
		agregando = true;
		try {
			const res = await fetch('/api/admin/marcas-lt', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...nueva,
					marca_exactus: marca,
					etiqueta: nueva.etiqueta.trim() || marca
				})
			});
			if (res.ok) {
				toast.success(`✅ ${marca} agregado`);
				nueva = {
					marca_exactus: '',
					etiqueta: '',
					lt_courier: 1,
					lt_aereo: 2,
					lt_maritimo: 3,
					meses_pedido: 0
				};
				mostrarFormNueva = false;
				await cargar();
			} else {
				const e = await res.json();
				toast.error(`❌ ${e.error || 'No se pudo agregar'}`);
			}
		} catch (e) {
			toast.error(`❌ ${e instanceof Error ? e.message : 'Error'}`);
		} finally {
			agregando = false;
		}
	}

	async function eliminar(f: MarcaLt) {
		if (f.clave === CLAVE_DEFAULT) return;
		if (
			!confirm(
				`¿Eliminar "${f.etiqueta}" (${f.marca_exactus})? Esos SKU pasarán a usar la tarifa por defecto (Otras marcas).`
			)
		)
			return;
		try {
			const res = await fetch(`/api/admin/marcas-lt?clave=${encodeURIComponent(f.clave)}`, {
				method: 'DELETE'
			});
			if (res.ok) {
				toast.success(`✅ ${f.etiqueta} eliminado`);
				await cargar();
			} else {
				const e = await res.json();
				toast.error(`❌ ${e.error || 'No se pudo eliminar'}`);
			}
		} catch (e) {
			toast.error(`❌ ${e instanceof Error ? e.message : 'Error'}`);
		}
	}
</script>

<Card class="border-blue-100 dark:border-blue-900">
	<CardHeader>
		<div class="flex items-start justify-between mb-3">
			<div>
				<CardTitle>Lead Time por Proveedor</CardTitle>
				<CardDescription
					>Tiempos de entrega por vía y meses de pedido de cada proveedor</CardDescription
				>
			</div>
			<Button
				onclick={() => (mostrarFormNueva = !mostrarFormNueva)}
				size="sm"
				class="gap-2 bg-blue-600 hover:bg-blue-700"
			>
				<Plus class="h-4 w-4" />
				Agregar proveedor
			</Button>
		</div>

		<!-- Explicación para el cliente -->
		<div
			class="flex gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 text-sm"
		>
			<Info class="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
			<div class="text-slate-700 dark:text-slate-200 space-y-1">
				<p>
					Ingrese el lead time (en meses) de <strong>courier</strong>, <strong>aéreo</strong> y
					<strong>marítimo</strong> por separado. El sistema suma los
					<strong>meses de pedido</strong> a las vías aérea y marítima (no al courier).
				</p>
				<p>
					<strong>Husqvarna</strong> se divide en dos tarifas: <em>A</em> para productos de línea RP
					y
					<em>B</em> para el resto. <strong>Deyu</strong> agrupa sus variantes; al editar una, podés
					usar "igualar grupo" para copiar a las demás. <strong>Otras marcas</strong> es la tarifa por
					defecto para todo lo no listado (no se puede borrar, pero sí editar).
				</p>
			</div>
		</div>

		<!-- Alta de proveedor nuevo -->
		{#if mostrarFormNueva}
			<div class="mt-3 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50 space-y-3">
				<p class="text-sm font-semibold">Nuevo proveedor</p>
				<p class="text-xs text-muted-foreground">
					La "Marca (Exactus)" debe coincidir <strong>exactamente</strong> con el nombre en Exactus
					(CLASIFICACION_4), ej. <code>OREGON</code>.
				</p>
				<div class="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
					<div class="col-span-2">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="text-xs text-muted-foreground">Marca (Exactus)</label>
						<input
							type="text"
							placeholder="Ej: OREGON"
							bind:value={nueva.marca_exactus}
							class="w-full px-2 py-1.5 border rounded dark:bg-slate-900 dark:border-slate-700 uppercase"
						/>
					</div>
					<div class="col-span-2">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="text-xs text-muted-foreground">Etiqueta (nombre amigable)</label>
						<input
							type="text"
							placeholder="Ej: Oregon"
							bind:value={nueva.etiqueta}
							class="w-full px-2 py-1.5 border rounded dark:bg-slate-900 dark:border-slate-700"
						/>
					</div>
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="text-xs text-muted-foreground">L.T. courier</label>
						<input
							type="number"
							min="0.5"
							step="0.5"
							bind:value={nueva.lt_courier}
							class="w-full px-2 py-1.5 border rounded dark:bg-slate-900 dark:border-slate-700"
						/>
					</div>
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="text-xs text-muted-foreground">L.T. aéreo</label>
						<input
							type="number"
							min="0.5"
							step="0.5"
							bind:value={nueva.lt_aereo}
							class="w-full px-2 py-1.5 border rounded dark:bg-slate-900 dark:border-slate-700"
						/>
					</div>
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="text-xs text-muted-foreground">L.T. marítimo</label>
						<input
							type="number"
							min="0.5"
							step="0.5"
							bind:value={nueva.lt_maritimo}
							class="w-full px-2 py-1.5 border rounded dark:bg-slate-900 dark:border-slate-700"
						/>
					</div>
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="text-xs text-muted-foreground">Meses pedido</label>
						<input
							type="number"
							min="0"
							step="0.5"
							bind:value={nueva.meses_pedido}
							class="w-full px-2 py-1.5 border rounded dark:bg-slate-900 dark:border-slate-700"
						/>
					</div>
				</div>
				<div class="flex gap-2">
					<Button
						onclick={agregarProveedor}
						disabled={agregando}
						size="sm"
						class="gap-2 bg-green-600 hover:bg-green-700"
					>
						<Check class="h-4 w-4" />
						{agregando ? 'Agregando...' : 'Guardar proveedor'}
					</Button>
					<Button onclick={() => (mostrarFormNueva = false)} variant="outline" size="sm"
						>Cancelar</Button
					>
				</div>
			</div>
		{/if}

		{#if filas.length > 0}
			<div class="relative mt-3">
				<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
				<input
					type="text"
					placeholder="Buscar proveedor..."
					bind:value={filtro}
					class="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
		{/if}
	</CardHeader>

	<CardContent class="space-y-4">
		{#if error}
			<div
				class="flex gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900"
			>
				<AlertCircle class="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
				<div>
					<p class="font-semibold text-red-900 dark:text-red-100">Error</p>
					<p class="text-sm text-red-700 dark:text-red-200">{error}</p>
				</div>
			</div>
		{/if}

		{#if cargando && filas.length === 0}
			<div class="flex justify-center py-12">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			</div>
		{:else if filas.length === 0}
			<p class="text-center text-muted-foreground py-8">No hay proveedores configurados.</p>
		{:else}
			<div class="space-y-4 max-h-[620px] overflow-y-auto pr-1">
				{#each grupos as grupo (grupo.etiqueta)}
					{@const esDefault = grupo.items[0].clave === CLAVE_DEFAULT}
					<div
						class="border rounded-lg overflow-hidden {esDefault
							? 'border-amber-300 dark:border-amber-800'
							: 'border-slate-200 dark:border-slate-800'}"
					>
						<!-- Encabezado del grupo -->
						<div
							class="flex items-center justify-between px-3 py-2 {esDefault
								? 'bg-amber-50 dark:bg-amber-950/20'
								: 'bg-slate-50 dark:bg-slate-900/40'}"
						>
							<div class="flex items-center gap-2">
								<span class="font-semibold text-sm">{grupo.etiqueta}</span>
								{#if esDefault}
									<span
										class="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300"
										><Lock class="h-3 w-3" /> por defecto</span
									>
								{/if}
								{#if grupo.items.length > 1}
									<span class="text-[11px] text-muted-foreground"
										>({grupo.items.length} marcas)</span
									>
								{/if}
							</div>
							{#if grupo.items.length > 1}
								<Button
									onclick={() => igualarGrupo(grupo.items, grupo.items[0])}
									variant="ghost"
									size="sm"
									class="h-7 gap-1 text-xs text-blue-600"
								>
									<Copy class="h-3 w-3" /> igualar grupo
								</Button>
							{/if}
						</div>

						<!-- Filas del grupo -->
						<div class="divide-y divide-slate-100 dark:divide-slate-800">
							{#each grupo.items as f (f.clave)}
								<div
									class="grid grid-cols-2 md:grid-cols-12 gap-2 items-center p-3 {modificadas.has(
										f.clave
									)
										? 'bg-yellow-50/60 dark:bg-yellow-950/20'
										: f.activo
											? ''
											: 'opacity-60'}"
								>
									<div class="col-span-2 md:col-span-3">
										<p class="text-xs font-mono text-slate-700 dark:text-slate-300">
											{f.marca_exactus || '—'}
										</p>
										{#if f.nota}<p class="text-[11px] text-muted-foreground leading-tight">
												{f.nota}
											</p>{/if}
									</div>

									<div class="md:col-span-2">
										<!-- svelte-ignore a11y_label_has_associated_control -->
										<label class="md:hidden text-xs text-muted-foreground">L.T. courier</label>
										<input
											type="number"
											min="0.5"
											step="0.5"
											bind:value={f.lt_courier}
											oninput={() => marcarModificada(f.clave)}
											class="w-full px-2 py-1.5 border rounded text-center dark:bg-slate-900 dark:border-slate-700"
										/>
									</div>
									<div class="md:col-span-2">
										<!-- svelte-ignore a11y_label_has_associated_control -->
										<label class="md:hidden text-xs text-muted-foreground">L.T. aéreo</label>
										<input
											type="number"
											min="0.5"
											step="0.5"
											bind:value={f.lt_aereo}
											oninput={() => marcarModificada(f.clave)}
											class="w-full px-2 py-1.5 border rounded text-center dark:bg-slate-900 dark:border-slate-700"
										/>
									</div>
									<div class="md:col-span-2">
										<!-- svelte-ignore a11y_label_has_associated_control -->
										<label class="md:hidden text-xs text-muted-foreground">L.T. marítimo</label>
										<input
											type="number"
											min="0.5"
											step="0.5"
											bind:value={f.lt_maritimo}
											oninput={() => marcarModificada(f.clave)}
											class="w-full px-2 py-1.5 border rounded text-center dark:bg-slate-900 dark:border-slate-700"
										/>
									</div>
									<div class="md:col-span-1">
										<!-- svelte-ignore a11y_label_has_associated_control -->
										<label class="md:hidden text-xs text-muted-foreground">Meses pedido</label>
										<input
											type="number"
											min="0"
											step="0.5"
											bind:value={f.meses_pedido}
											oninput={() => marcarModificada(f.clave)}
											class="w-full px-2 py-1.5 border rounded text-center dark:bg-slate-900 dark:border-slate-700"
										/>
									</div>

									<div class="md:col-span-1 flex justify-center">
										<input
											type="checkbox"
											checked={f.activo === 1}
											onchange={() => toggleActivo(f)}
											class="h-4 w-4 rounded accent-blue-600 cursor-pointer"
											title={f.activo ? 'Activo' : 'Inactivo (usa el default)'}
										/>
									</div>

									<div class="md:col-span-1 flex justify-center">
										{#if f.clave !== CLAVE_DEFAULT}
											<Button
												onclick={() => eliminar(f)}
												variant="ghost"
												size="sm"
												class="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
											>
												<Trash2 class="h-4 w-4" />
											</Button>
										{:else}
											<Lock class="h-4 w-4 text-muted-foreground" />
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			{#if filasFiltradas.length === 0}
				<p class="text-center py-6 text-muted-foreground text-sm">
					No hay proveedores que coincidan con la búsqueda
				</p>
			{/if}

			{#if modificadas.size > 0}
				<div
					class="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900"
				>
					<AlertCircle class="h-4 w-4 text-yellow-600" />
					<p class="text-sm text-yellow-700 dark:text-yellow-200">
						Tienes {modificadas.size} tarifa(s) con cambios sin guardar
					</p>
				</div>
			{/if}

			<Button
				onclick={guardarCambios}
				disabled={modificadas.size === 0 || guardando}
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
