<script lang="ts">
	import { onMount } from 'svelte';
	import { Search, Save, LoaderCircle, ShieldCheck, Tag, Check } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	interface Usuario {
		id: string;
		email: string;
		display_name: string | null;
		role: string;
	}

	let cargando = $state(true);
	let guardando = $state<string | null>(null);
	let usuarios = $state<Usuario[]>([]);
	let etiquetas = $state<string[]>([]);
	let seleccion = $state<Record<string, Set<string>>>({});
	let original = $state<Record<string, Set<string>>>({});
	let busqueda = $state('');

	const usuariosFiltrados = $derived.by(() => {
		const q = busqueda.trim().toLowerCase();
		if (!q) return usuarios;
		return usuarios.filter(
			(u) => (u.display_name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
		);
	});

	onMount(cargar);

	async function cargar() {
		cargando = true;
		try {
			const res = await fetch('/api/admin/usuario-marcas');
			if (!res.ok) throw new Error();
			const data = await res.json();
			usuarios = data.usuarios || [];
			etiquetas = data.etiquetas || [];
			const asig = data.asignaciones || {};
			const sel: Record<string, Set<string>> = {};
			const orig: Record<string, Set<string>> = {};
			for (const u of usuarios) {
				const arr: string[] = asig[u.id] || [];
				sel[u.id] = new Set(arr);
				orig[u.id] = new Set(arr);
			}
			seleccion = sel;
			original = orig;
		} catch {
			toast.error('No se pudieron cargar las asignaciones');
		} finally {
			cargando = false;
		}
	}

	function toggle(usuarioId: string, etiqueta: string) {
		const set = new Set(seleccion[usuarioId] ?? []);
		if (set.has(etiqueta)) set.delete(etiqueta);
		else set.add(etiqueta);
		seleccion = { ...seleccion, [usuarioId]: set };
	}

	function tieneCambios(usuarioId: string): boolean {
		const a = seleccion[usuarioId] ?? new Set();
		const b = original[usuarioId] ?? new Set();
		if (a.size !== b.size) return true;
		for (const x of a) if (!b.has(x)) return true;
		return false;
	}

	async function guardar(usuarioId: string) {
		guardando = usuarioId;
		try {
			const etiquetasSel = [...(seleccion[usuarioId] ?? new Set())];
			const res = await fetch('/api/admin/usuario-marcas', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ usuario_id: usuarioId, etiquetas: etiquetasSel })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Error al guardar');
			original = { ...original, [usuarioId]: new Set(etiquetasSel) };
			toast.success('Asignación guardada');
		} catch (e: any) {
			toast.error(e.message || 'No se pudo guardar');
		} finally {
			guardando = null;
		}
	}
</script>

<div class="space-y-4">
	<div class="relative max-w-sm">
		<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
		<input
			bind:value={busqueda}
			placeholder="Buscar usuario..."
			class="h-9 w-full rounded-md border border-input dark:border-slate-700 bg-background dark:bg-slate-800 pl-9 pr-3 text-sm dark:text-slate-200"
		/>
	</div>

	{#if cargando}
		<div class="flex items-center justify-center gap-2 py-10 text-muted-foreground">
			<LoaderCircle class="h-5 w-5 animate-spin" /> Cargando...
		</div>
	{:else if usuarios.length === 0}
		<p class="py-6 text-center text-sm text-muted-foreground">No hay usuarios activos.</p>
	{:else}
		<div class="space-y-3">
			{#each usuariosFiltrados as u (u.id)}
				{@const esAdmin = String(u.role).toUpperCase() === 'ADMIN'}
				{@const sel = seleccion[u.id] ?? new Set()}
				<div
					class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
				>
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p class="text-sm font-semibold dark:text-slate-100">{u.display_name || u.email}</p>
							<p class="text-xs text-muted-foreground">{u.email}</p>
						</div>
						{#if esAdmin}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
							>
								<ShieldCheck class="h-3.5 w-3.5" /> Admin — ve todas las marcas
							</span>
						{:else if sel.size === 0}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
							>
								Sin restricción — ve todo
							</span>
						{:else}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
							>
								{sel.size} marca(s) asignada(s)
							</span>
						{/if}
					</div>

					{#if !esAdmin}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each etiquetas as et}
								{@const activa = sel.has(et)}
								<button
									type="button"
									onclick={() => toggle(u.id, et)}
									class={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
										activa
											? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200'
											: 'border-slate-200 text-muted-foreground hover:bg-muted dark:border-slate-700'
									}`}
								>
									{#if activa}<Check class="h-3.5 w-3.5" />{:else}<Tag class="h-3.5 w-3.5" />{/if}
									{et}
								</button>
							{/each}
						</div>

						<div class="mt-3 flex justify-end">
							<button
								type="button"
								disabled={!tieneCambios(u.id) || guardando === u.id}
								onclick={() => guardar(u.id)}
								class="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
							>
								{#if guardando === u.id}
									<LoaderCircle class="h-4 w-4 animate-spin" /> Guardando...
								{:else}
									<Save class="h-4 w-4" /> Guardar
								{/if}
							</button>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
