<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let equipo = $derived(data.equipo ?? []);

	// ── Estado del modal ──────────────────────────────────────────
	type Mode = 'crear' | 'editar' | null;
	let mode       = $state<Mode>(null);
	let editTarget = $state<any>(null);
	let guardando  = $state(false);
	let confirmDel = $state<string | null>(null);

	// ── Formulario ────────────────────────────────────────────────
	let fNombre      = $state('');
	let fCargo       = $state('');
	let fDescripcion = $state('');
	let fEmail       = $state('');
	let fFotoUrl     = $state('');
	let fColor       = $state('#3b82f6');
	let fOrden       = $state(0);
	let fVisible     = $state(true);
	let fActivo      = $state(true);
	let fRedes       = $state<{ red: string; url: string }[]>([]);

	// ── Upload de foto ────────────────────────────────────────────
	let fotoFile        = $state<File | null>(null);
	let fotoPreview     = $state<string | null>(null);
	let uploadando      = $state(false);
	let uploadError     = $state<string | null>(null);
	let fileInputEl     = $state<HTMLInputElement | null>(null);

	const SUPABASE_URL   = 'https://wlezxeylbumivapbkbas.supabase.co';
	const BUCKET_EQUIPO  = 'equipo';

	function onFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file  = input.files?.[0];
		if (!file) return;

		// Validar tipo y tamaño (máx 2MB)
		if (!file.type.startsWith('image/')) {
			uploadError = 'Solo se permiten imágenes (JPG, PNG, WebP)';
			return;
		}
		if (file.size > 2 * 1024 * 1024) {
			uploadError = 'La imagen no puede superar 2MB';
			return;
		}

		uploadError  = null;
		fotoFile     = file;
		fotoPreview  = URL.createObjectURL(file);
	}

	async function subirFoto(): Promise<string | null> {
		if (!fotoFile) return fFotoUrl || null;
		uploadando = true;
		uploadError = null;

		try {
			const supabase = page.data.supabase;
			const ext      = fotoFile.name.split('.').pop()?.toLowerCase() ?? 'png';
			const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

			const { error } = await supabase.storage
				.from(BUCKET_EQUIPO)
				.upload(fileName, fotoFile, { upsert: true, contentType: fotoFile.type });

			if (error) throw error;

			const { data: urlData } = supabase.storage
				.from(BUCKET_EQUIPO)
				.getPublicUrl(fileName);

			return urlData.publicUrl;
		} catch (err: any) {
			uploadError = err.message ?? 'Error al subir la imagen';
			return null;
		} finally {
			uploadando = false;
		}
	}

	function quitarFoto() {
		fotoFile    = null;
		fotoPreview = null;
		fFotoUrl    = '';
		uploadError = null;
		if (fileInputEl) fileInputEl.value = '';
	}

	// ── Redes ─────────────────────────────────────────────────────
	const redesDisponibles = ['linkedin','github','x','facebook','instagram'];
	function addRed()    { fRedes = [...fRedes, { red: 'linkedin', url: '' }]; }
	function removeRed(i: number) { fRedes = fRedes.filter((_, idx) => idx !== i); }
	function updateRed(i: number, key: 'red' | 'url', val: string) {
		fRedes = fRedes.map((r, idx) => idx === i ? { ...r, [key]: val } : r);
	}

	// ── Abrir modales ─────────────────────────────────────────────
	function abrirCrear() {
		mode = 'crear'; editTarget = null;
		fNombre = ''; fCargo = ''; fDescripcion = ''; fEmail = '';
		fFotoUrl = ''; fColor = '#3b82f6'; fOrden = equipo.length + 1;
		fVisible = true; fActivo = true; fRedes = [];
		fotoFile = null; fotoPreview = null; uploadError = null;
	}

	function abrirEditar(m: any) {
		mode = 'editar'; editTarget = m;
		fNombre      = m.nombre      ?? '';
		fCargo       = m.cargo       ?? '';
		fDescripcion = m.descripcion ?? '';
		fEmail       = m.email       ?? '';
		fFotoUrl     = m.foto_url    ?? '';
		fColor       = m.color       ?? '#3b82f6';
		fOrden       = m.orden       ?? 0;
		fVisible     = m.visible     ?? true;
		fActivo      = m.esta_activo ?? true;
		fRedes       = Array.isArray(m.redes_sociales) ? [...m.redes_sociales] : [];
		fotoFile     = null;
		fotoPreview  = m.foto_url ?? null;
		uploadError  = null;
	}

	function cerrarModal() {
		mode = null; editTarget = null;
		fotoFile = null; fotoPreview = null; uploadError = null;
	}

	// Submit con upload primero
	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (guardando || uploadando) return;
		guardando = true;

		// 1. Subir foto si hay archivo nuevo seleccionado
		if (fotoFile) {
			const url = await subirFoto();
			if (url) {
				fFotoUrl = url;
			} else {
				guardando = false;
				return; // uploadError ya está seteado
			}
		}

		// 2. Submit del formulario via fetch
		const formEl = e.target as HTMLFormElement;
		const fd     = new FormData(formEl);
		fd.set('foto_url',       fFotoUrl);
		fd.set('visible',        String(fVisible));
		fd.set('esta_activo',    String(fActivo));
		fd.set('redes_sociales', JSON.stringify(fRedes));

		try {
			const action = mode === 'crear' ? '?/crear' : '?/editar';
			const res    = await fetch(action, { method: 'POST', body: fd });
			if (res.ok) {
				cerrarModal();
				await invalidateAll();
			}
		} finally {
			guardando = false;
		}
	}

	function getInitials(nombre: string): string {
		return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
	}

	$effect(() => {
		if (form?.success) { cerrarModal(); confirmDel = null; }
	});
</script>

<div class="space-y-6 animate-fade-in">

	<!-- ── Encabezado ──────────────────────────────────────────── -->
	<!-- Botón flotante nuevo miembro -->
<button
    onclick={abrirCrear}
    class="fixed bottom-8 right-8 z-40 flex items-center gap-2 px-5 py-3.5 rounded-2xl
           text-sm font-semibold text-white
           bg-blue-600 hover:bg-blue-500
           shadow-xl shadow-blue-600/30
           transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-600/40"
>
    <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
    </svg>
    Nuevo miembro
</button>

	{#if form?.error}
		<div class="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
			{form.error}
		</div>
	{/if}

	<!-- ── Lista ───────────────────────────────────────────────── -->
	{#if equipo.length === 0}
		<div class="bg-card border border-dashed border-border rounded-2xl p-16 text-center">
			<p class="text-4xl mb-4">👥</p>
			<p class="text-sm font-semibold text-foreground mb-1">Sin miembros aún</p>
			<p class="text-xs text-muted-foreground mb-4">Agrega el primer miembro del equipo.</p>
			<button onclick={abrirCrear}
			        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
			               bg-blue-600 hover:bg-blue-500 text-white transition-colors">
				+ Agregar miembro
			</button>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			{#each equipo as m}
				<div class="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
					<div class="h-1 w-full" style="background:{m.color ?? '#3b82f6'}"></div>
					<div class="p-5">
						<div class="flex items-start gap-4 mb-4">
							<div class="w-14 h-14 rounded-2xl flex items-center justify-center
							            text-base font-extrabold flex-shrink-0 overflow-hidden"
							     style="background:{m.color ?? '#3b82f6'}20; border:2px solid {m.color ?? '#3b82f6'}40">
								{#if m.foto_url}
									<img src={m.foto_url} alt={m.nombre} class="w-full h-full object-cover"/>
								{:else}
									<span style="color:{m.color ?? '#3b82f6'}">{getInitials(m.nombre)}</span>
								{/if}
							</div>
							<div class="flex-1 min-w-0">
								<p class="font-bold text-foreground text-sm truncate">{m.nombre}</p>
								<p class="text-xs font-medium mt-0.5 truncate" style="color:{m.color ?? '#3b82f6'}">{m.cargo}</p>
								{#if m.email}<p class="text-[11px] text-muted-foreground mt-1 truncate">{m.email}</p>{/if}
							</div>
						</div>

						<div class="flex items-center gap-2 mb-4">
							<form method="POST" action="?/toggleVisible" use:enhance={() => {
								return async ({ update }) => { await update(); await invalidateAll(); };
							}}>
								<input type="hidden" name="id" value={m.id}/>
								<input type="hidden" name="visible" value={String(!m.visible)}/>
								<button type="submit"
								        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold
								               border transition-colors {m.visible
								                 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
								                 : 'bg-muted border-border text-muted-foreground'}">
									<span class="w-1.5 h-1.5 rounded-full {m.visible ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
									{m.visible ? 'Visible' : 'Oculto'}
								</button>
							</form>
							<form method="POST" action="?/toggleActivo" use:enhance={() => {
								return async ({ update }) => { await update(); await invalidateAll(); };
							}}>
								<input type="hidden" name="id" value={m.id}/>
								<input type="hidden" name="esta_activo" value={String(!m.esta_activo)}/>
								<button type="submit"
								        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold
								               border transition-colors {m.esta_activo
								                 ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
								                 : 'bg-muted border-border text-muted-foreground'}">
									{m.esta_activo ? 'Activo' : 'Inactivo'}
								</button>
							</form>
							<span class="ml-auto text-[10px] text-muted-foreground">#{m.orden}</span>
						</div>

						{#if m.redes_sociales?.length}
							<div class="flex gap-1.5 mb-4 flex-wrap">
								{#each m.redes_sociales as red}
									<span class="px-2 py-0.5 rounded-md bg-muted border border-border
									             text-[10px] font-medium text-muted-foreground capitalize">
										{red.red}
									</span>
								{/each}
							</div>
						{/if}

						<div class="flex gap-2 pt-3 border-t border-border">
							<button onclick={() => abrirEditar(m)}
							        class="flex-1 py-2 rounded-xl text-xs font-semibold
							               border border-border text-foreground bg-muted hover:bg-card transition-colors">
								Editar
							</button>
							<button onclick={() => confirmDel = m.id}
							        class="px-3 py-2 rounded-xl text-xs font-semibold
							               border border-red-200 dark:border-red-900/40
							               text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors">
								<svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
								</svg>
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- ── Modal crear/editar ───────────────────────────────────── -->
{#if mode}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onclick={cerrarModal}></div>

	<div class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
	            w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl
	            overflow-y-auto max-h-[92vh]">

		<div class="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-card z-10">
			<h2 class="text-base font-bold text-foreground">
				{mode === 'crear' ? 'Nuevo miembro' : 'Editar miembro'}
			</h2>
			<button onclick={cerrarModal} class="text-muted-foreground hover:text-foreground transition-colors">
				<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
				</svg>
			</button>
		</div>

		<form onsubmit={handleSubmit} class="p-6 space-y-5">
			{#if mode === 'editar'}
				<input type="hidden" name="id" value={editTarget.id}/>
			{/if}

			<!-- ── Foto ──────────────────────────────────────────── -->
			<div>
				<label class="block text-xs font-semibold text-foreground mb-2">Foto del miembro</label>
				<div class="flex items-start gap-4">
					<!-- Preview circular -->
					<div class="w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden border-2 border-dashed border-border
					            flex items-center justify-center bg-muted"
					     style={fotoPreview ? `border-style:solid; border-color:${fColor}40` : ''}>
						{#if fotoPreview}
							<img src={fotoPreview} alt="preview" class="w-full h-full object-cover"/>
						{:else}
							<div class="text-center">
								<svg class="w-6 h-6 text-muted-foreground mx-auto mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
								</svg>
								<p class="text-[9px] text-muted-foreground">Sin foto</p>
							</div>
						{/if}
					</div>

					<div class="flex-1 space-y-2">
						<!-- Upload -->
						<label class="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border
						              bg-muted hover:bg-card cursor-pointer transition-colors text-xs font-semibold text-foreground">
							<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
							</svg>
							{fotoFile ? fotoFile.name : 'Subir imagen'}
							<input
								bind:this={fileInputEl}
								type="file"
								accept="image/*"
								onchange={onFileChange}
								class="hidden"
							/>
						</label>

						{#if fotoPreview}
							<button type="button" onclick={quitarFoto}
							        class="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/40
							               text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors">
								<svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
								</svg>
								Quitar foto
							</button>
						{/if}

						<p class="text-[10px] text-muted-foreground">JPG, PNG o WebP · máx 2MB</p>
					</div>
				</div>

				{#if uploadError}
					<p class="mt-2 text-xs text-red-600 dark:text-red-400">{uploadError}</p>
				{/if}
			</div>

			<!-- Nombre + Cargo -->
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="block text-xs font-semibold text-foreground mb-1.5">Nombre <span class="text-red-500">*</span></label>
					<input type="text" name="nombre" bind:value={fNombre} required
					       class="input-field"/>
				</div>
				<div>
					<label class="block text-xs font-semibold text-foreground mb-1.5">Cargo <span class="text-red-500">*</span></label>
					<input type="text" name="cargo" bind:value={fCargo} required
					       class="input-field"/>
				</div>
			</div>

			<!-- Descripción -->
			<div>
				<label class="block text-xs font-semibold text-foreground mb-1.5">Descripción</label>
				<textarea name="descripcion" bind:value={fDescripcion} rows="3"
				          class="input-field resize-none"></textarea>
			</div>

			<!-- Email -->
			<div>
				<label class="block text-xs font-semibold text-foreground mb-1.5">Email</label>
				<input type="email" name="email" bind:value={fEmail} class="input-field"/>
			</div>

			<!-- Color + Orden -->
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="block text-xs font-semibold text-foreground mb-1.5">Color acento</label>
					<div class="flex items-center gap-2">
						<input type="color" name="color" bind:value={fColor}
						       class="w-10 h-10 rounded-lg border border-border cursor-pointer"/>
						<span class="text-xs text-muted-foreground font-mono">{fColor}</span>
					</div>
				</div>
				<div>
					<label class="block text-xs font-semibold text-foreground mb-1.5">Orden</label>
					<input type="number" name="orden" bind:value={fOrden} min="0" class="input-field"/>
				</div>
			</div>

			<!-- Visible + Activo -->
			<div class="grid grid-cols-2 gap-3">
				<label class="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
					<input type="checkbox" bind:checked={fVisible} class="w-4 h-4 rounded"/>
					<div>
						<p class="text-xs font-semibold text-foreground">Visible</p>
						<p class="text-[10px] text-muted-foreground">Aparece en página pública</p>
					</div>
				</label>
				<label class="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
					<input type="checkbox" bind:checked={fActivo} class="w-4 h-4 rounded"/>
					<div>
						<p class="text-xs font-semibold text-foreground">Activo</p>
						<p class="text-[10px] text-muted-foreground">Sigue en el equipo</p>
					</div>
				</label>
			</div>

			<!-- Redes sociales -->
			<div>
				<div class="flex items-center justify-between mb-2">
					<label class="text-xs font-semibold text-foreground">Redes sociales</label>
					<button type="button" onclick={addRed}
					        class="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">
						+ Agregar red
					</button>
				</div>
				<div class="space-y-2">
					{#each fRedes as red, i}
						<div class="flex items-center gap-2">
							<select
								value={red.red}
								onchange={(e) => updateRed(i, 'red', (e.target as HTMLSelectElement).value)}
								class="px-3 py-2 rounded-xl border border-border bg-muted text-xs text-foreground
								       focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-36"
							>
								{#each redesDisponibles as r}
									<option value={r} selected={red.red === r}>{r}</option>
								{/each}
							</select>
							<input
								type="url"
								value={red.url}
								oninput={(e) => updateRed(i, 'url', (e.target as HTMLInputElement).value)}
								placeholder="https://..."
								class="flex-1 px-3 py-2 rounded-xl border border-border bg-muted text-xs text-foreground
								       focus:outline-none focus:ring-2 focus:ring-blue-500/30"
							/>
							<button type="button" onclick={() => removeRed(i)}
							        class="text-red-500 hover:text-red-400 transition-colors p-1 flex-shrink-0">
								<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
								</svg>
							</button>
						</div>
					{/each}
					{#if fRedes.length === 0}
						<p class="text-xs text-muted-foreground py-1">Sin redes agregadas.</p>
					{/if}
				</div>
			</div>

			<!-- Botones -->
			<div class="flex gap-3 pt-2 border-t border-border">
				<button type="submit" disabled={guardando || uploadando}
				        class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
				               bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white transition-colors">
					{#if uploadando}
						<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12"/>
						</svg>
						Subiendo foto…
					{:else if guardando}
						<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12"/>
						</svg>
						Guardando…
					{:else}
						{mode === 'crear' ? 'Crear miembro' : 'Guardar cambios'}
					{/if}
				</button>
				<button type="button" onclick={cerrarModal}
				        class="px-5 py-2.5 rounded-xl text-sm font-semibold
				               border border-border text-foreground hover:bg-muted transition-colors">
					Cancelar
				</button>
			</div>
		</form>
	</div>
{/if}

<!-- ── Confirmar eliminar ───────────────────────────────────── -->
{#if confirmDel}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onclick={() => confirmDel = null}></div>
	<div class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
	            w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
		<div class="text-center mb-6">
			<div class="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20
			            flex items-center justify-center text-2xl mx-auto mb-4">⚠️</div>
			<p class="text-base font-bold text-foreground mb-2">¿Eliminar miembro?</p>
			<p class="text-sm text-muted-foreground">
				Esta acción no se puede deshacer. Si solo quieres ocultarlo usa el toggle "Visible".
			</p>
		</div>
		<form method="POST" action="?/eliminar" use:enhance={() => {
			return async ({ update }) => { await update(); await invalidateAll(); };
		}}>
			<input type="hidden" name="id" value={confirmDel}/>
			<div class="flex gap-3">
				<button type="submit"
				        class="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors">
					Sí, eliminar
				</button>
				<button type="button" onclick={() => confirmDel = null}
				        class="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors">
					Cancelar
				</button>
			</div>
		</form>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(12px); }
		to   { opacity: 1; transform: translateY(0); }
	}
	.animate-fade-in { animation: fade-in 0.4s ease-out forwards; }

	.input-field {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border-radius: 0.75rem;
		border: 1px solid hsl(var(--border));
		background: hsl(var(--muted));
		color: hsl(var(--foreground));
		font-size: 0.875rem;
	}
	.input-field:focus {
		outline: none;
		box-shadow: 0 0 0 2px hsl(var(--primary) / 0.3);
		border-color: hsl(var(--primary) / 0.5);
	}
</style>