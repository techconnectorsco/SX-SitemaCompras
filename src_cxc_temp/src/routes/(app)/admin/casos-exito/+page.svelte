<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let casos    = $derived(data.casos    ?? []);
	let clientes = $derived(data.clientes ?? []);

	// ── Estado modal ──────────────────────────────────────────────
	type Mode = 'crear' | 'editar' | null;
	let mode       = $state<Mode>(null);
	let editTarget = $state<any>(null);
	let guardando  = $state(false);
	let confirmDel = $state<string | null>(null);

	// ── Campos del formulario ─────────────────────────────────────
	let fTitulo      = $state('');
	let fDescripcion = $state('');
	let fIndustria   = $state('');
	let fTipo        = $state('rpa');
	let fIcon        = $state('⚡');
	let fImagenUrl   = $state('');
	let fPublicado   = $state(true);
	let fMostrarCliente = $state(true);
	let fClienteId   = $state('');
	let fOrden       = $state(0);
	let fStats       = $state<{ valor: string; label: string }[]>([
		{ valor: '', label: '' }
	]);

	const tipos = [
		{ value: 'rpa',        label: 'RPA'             },
		{ value: 'software',   label: 'Software'        },
		{ value: 'integracion',label: 'Integración'     },
		{ value: 'analytics',  label: 'Analytics'       },
		{ value: 'dashboard',  label: 'Dashboard'       },
	];

	const tipoConfig: Record<string, { color: string; icon: string }> = {
		'rpa':         { color: '#8b5cf6', icon: '🤖' },
		'software':    { color: '#3b82f6', icon: '💻' },
		'integracion': { color: '#10b981', icon: '🔗' },
		'analytics':   { color: '#f59e0b', icon: '📊' },
		'dashboard':   { color: '#f59e0b', icon: '📈' },
	};

	function getTipoColor(tipo: string | null): string {
		return tipoConfig[tipo ?? '']?.color ?? '#6366f1';
	}

	// ── Abrir modales ─────────────────────────────────────────────
	function abrirCrear() {
		mode = 'crear'; editTarget = null;
		fTitulo = ''; fDescripcion = ''; fIndustria = '';
		fTipo = 'rpa'; fIcon = '⚡'; fImagenUrl = '';
		fPublicado = true; fMostrarCliente = true; fClienteId = '';
		fOrden = casos.length + 1;
		fStats = [{ valor: '', label: '' }];
	}

	function abrirEditar(c: any) {
		mode = 'editar'; editTarget = c;
		fTitulo      = c.titulo             ?? '';
		fDescripcion = c.descripcion        ?? '';
		fIndustria   = c.industria          ?? '';
		fTipo        = c.tipo_automatizacion ?? 'rpa';
		fIcon        = c.metricas_publicas?.icon ?? '⚡';
		fImagenUrl   = c.imagen_url         ?? '';
		fPublicado   = c.esta_publicado     ?? true;
		fMostrarCliente = c.mostrar_cliente ?? true;
		fClienteId   = c.cliente_id         ?? '';
		fOrden       = c.orden              ?? 0;
		fStats       = Array.isArray(c.metricas_publicas?.stats)
			? c.metricas_publicas.stats.map((s: any) => ({ ...s }))
			: [{ valor: '', label: '' }];
	}

	function cerrarModal() { mode = null; editTarget = null; }

	// ── Stats helpers ─────────────────────────────────────────────
	function addStat()     { fStats = [...fStats, { valor: '', label: '' }]; }
	function removeStat(i: number) { fStats = fStats.filter((_, idx) => idx !== i); }
	function updateStat(i: number, key: 'valor' | 'label', val: string) {
		fStats = fStats.map((s, idx) => idx === i ? { ...s, [key]: val } : s);
	}

	$effect(() => { if (form?.success) { cerrarModal(); confirmDel = null; } });
</script>

<div class="space-y-6 animate-fade-in">

	<!-- ── Encabezado ──────────────────────────────────────────── -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">Casos de Éxito</h1>
			<p class="text-sm text-muted-foreground mt-0.5">
				{casos.length} casos · {casos.filter((c: any) => c.esta_publicado).length} publicados
			</p>
		</div>
		<button
			onclick={abrirCrear}
			class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
			       bg-blue-600 hover:bg-blue-500 text-white
			       shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5"
		>
			<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
			</svg>
			Nuevo caso
		</button>
	</div>

	{#if form?.error}
		<div class="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
			{form.error}
		</div>
	{/if}

	<!-- ── Lista ───────────────────────────────────────────────── -->
	{#if casos.length === 0}
		<div class="bg-card border border-dashed border-border rounded-2xl p-16 text-center">
			<p class="text-4xl mb-4">🏆</p>
			<p class="text-sm font-semibold text-foreground mb-1">Sin casos de éxito aún</p>
			<p class="text-xs text-muted-foreground mb-4">Agrega el primer caso.</p>
			<button onclick={abrirCrear}
			        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
			               bg-blue-600 hover:bg-blue-500 text-white transition-colors">
				+ Agregar caso
			</button>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
			{#each casos as caso}
				{@const color = getTipoColor(caso.tipo_automatizacion)}
				{@const cliente = (caso.clientes as any)}

				<div class="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
					<div class="h-1 w-full" style="background:{color}"></div>
					<div class="p-5">

						<!-- Header -->
						<div class="flex items-start justify-between gap-3 mb-3">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<span class="text-lg">{caso.metricas_publicas?.icon ?? '⚡'}</span>
									<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
									             border"
									      style="color:{color}; border-color:{color}40; background:{color}10">
										{caso.tipo_automatizacion ?? '—'}
									</span>
									{#if caso.industria}
										<span class="text-[10px] text-muted-foreground">{caso.industria}</span>
									{/if}
								</div>
								<p class="font-bold text-foreground text-sm leading-snug line-clamp-2">
									{caso.titulo}
								</p>
							</div>
							<!-- Orden -->
							<span class="text-[10px] text-muted-foreground flex-shrink-0">#{caso.orden}</span>
						</div>

						<!-- Descripción -->
						<p class="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
							{caso.descripcion}
						</p>

						<!-- Stats preview -->
						{#if caso.metricas_publicas?.stats?.length}
							<div class="flex gap-2 mb-3 flex-wrap">
								{#each caso.metricas_publicas.stats.slice(0, 3) as stat}
									<div class="px-2.5 py-1.5 rounded-lg bg-muted border border-border text-center">
										<p class="text-xs font-extrabold leading-none" style="color:{color}">{stat.valor}</p>
										<p class="text-[9px] text-muted-foreground mt-0.5 leading-tight">{stat.label}</p>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Cliente + badges -->
						<div class="flex items-center gap-2 mb-3 flex-wrap">
							{#if caso.mostrar_cliente && cliente?.nombre}
								<div class="flex items-center gap-1.5">
									{#if cliente.logo_url}
										<img src={cliente.logo_url} alt={cliente.nombre} class="h-4 w-auto object-contain"/>
									{/if}
									<span class="text-[10px] text-muted-foreground font-medium">{cliente.nombre}</span>
								</div>
							{/if}

							<!-- Toggle publicado -->
							<form method="POST" action="?/togglePublicado" class="ml-auto"
							      use:enhance={() => {
								return async ({ update }) => { await update(); await invalidateAll(); };
							}}>
								<input type="hidden" name="id" value={caso.id}/>
								<input type="hidden" name="esta_publicado" value={String(!caso.esta_publicado)}/>
								<button type="submit"
								        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold
								               border transition-colors {caso.esta_publicado
								                 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
								                 : 'bg-muted border-border text-muted-foreground'}">
									<span class="w-1.5 h-1.5 rounded-full {caso.esta_publicado ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
									{caso.esta_publicado ? 'Publicado' : 'Borrador'}
								</button>
							</form>
						</div>

						<!-- Acciones -->
						<div class="flex gap-2 pt-3 border-t border-border">
							<button onclick={() => abrirEditar(caso)}
							        class="flex-1 py-2 rounded-xl text-xs font-semibold
							               border border-border text-foreground bg-muted hover:bg-card transition-colors">
								Editar
							</button>
							<button onclick={() => confirmDel = caso.id}
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

	<!-- FAB -->
	<button onclick={abrirCrear}
	        class="fixed bottom-8 right-8 z-40 flex items-center gap-2 px-5 py-3.5 rounded-2xl
	               text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500
	               shadow-xl shadow-blue-600/30 transition-all duration-200 hover:-translate-y-0.5">
		<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
			<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
		</svg>
		Nuevo caso
	</button>
</div>

<!-- ── Modal crear/editar ───────────────────────────────────── -->
{#if mode}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onclick={cerrarModal}></div>

	<div class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
	            w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl
	            overflow-y-auto max-h-[92vh]">

		<!-- Header modal -->
		<div class="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-card z-10">
			<h2 class="text-base font-bold text-foreground">
				{mode === 'crear' ? 'Nuevo caso de éxito' : 'Editar caso de éxito'}
			</h2>
			<button onclick={cerrarModal} class="text-muted-foreground hover:text-foreground transition-colors">
				<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
				</svg>
			</button>
		</div>

		<form method="POST" action={mode === 'crear' ? '?/crear' : '?/editar'}
		      use:enhance={() => {
			guardando = true;
			return async ({ update }) => {
				await update(); guardando = false; await invalidateAll();
			};
		}} class="p-6 space-y-6">

			{#if mode === 'editar'}
				<input type="hidden" name="id" value={editTarget.id}/>
			{/if}
			<input type="hidden" name="stats" value={JSON.stringify(fStats)}/>

			<!-- Título -->
			<div class="field-group">
				<label class="field-label">
					Título <span class="text-red-500">*</span>
				</label>
				<input type="text" name="titulo" bind:value={fTitulo} required
				       placeholder="Ej: Automatización de Cuentas por Cobrar"
				       class="field-input"/>
			</div>

			<!-- Descripción -->
			<div class="field-group">
				<label class="field-label">Descripción</label>
				<textarea name="descripcion" bind:value={fDescripcion} rows="4"
				          placeholder="Describe el caso de éxito, el problema que resolvió y el impacto generado..."
				          class="field-input resize-none"></textarea>
			</div>

			<!-- Tipo + Industria -->
			<div class="grid grid-cols-2 gap-4">
				<div class="field-group">
					<label class="field-label">Tipo de automatización</label>
					<select name="tipo" bind:value={fTipo} class="field-input">
						{#each tipos as t}
							<option value={t.value}>{t.label}</option>
						{/each}
					</select>
				</div>
				<div class="field-group">
					<label class="field-label">Industria</label>
					<input type="text" name="industria" bind:value={fIndustria}
					       placeholder="Ej: Logística, Finanzas..."
					       class="field-input"/>
				</div>
			</div>

			<!-- Cliente + Orden -->
			<div class="grid grid-cols-2 gap-4">
				<div class="field-group">
					<label class="field-label">Cliente asociado</label>
					<select name="cliente_id" bind:value={fClienteId} class="field-input">
						<option value="">— Sin cliente —</option>
						{#each clientes as c}
							<option value={c.id}>{c.nombre}</option>
						{/each}
					</select>
				</div>
				<div class="field-group">
					<label class="field-label">Orden de aparición</label>
					<input type="number" name="orden" bind:value={fOrden} min="0"
					       class="field-input"/>
				</div>
			</div>

			<!-- URL Imagen -->
			<div class="field-group">
				<label class="field-label">URL Imagen / Captura de pantalla</label>
				<div class="relative">
					<svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
					     viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
					</svg>
					<input type="url" name="imagen_url" bind:value={fImagenUrl}
					       placeholder="https://..."
					       class="field-input pl-10"/>
				</div>
			</div>

			<!-- Publicado + Mostrar cliente — toggle cards -->
			<div class="grid grid-cols-2 gap-4">
				<label class="toggle-card {fPublicado ? 'toggle-card-on' : ''}">
					<div class="toggle-dot {fPublicado ? 'bg-emerald-500' : 'bg-muted-foreground/30'}"></div>
					<input type="checkbox" bind:checked={fPublicado} class="sr-only"/>
					<div>
						<p class="text-sm font-semibold text-foreground">Publicado</p>
						<p class="text-xs text-muted-foreground mt-0.5">Visible en la página pública</p>
					</div>
				</label>
				<label class="toggle-card {fMostrarCliente ? 'toggle-card-on' : ''}">
					<div class="toggle-dot {fMostrarCliente ? 'bg-blue-500' : 'bg-muted-foreground/30'}"></div>
					<input type="checkbox" bind:checked={fMostrarCliente} class="sr-only"/>
					<div>
						<p class="text-sm font-semibold text-foreground">Mostrar cliente</p>
						<p class="text-xs text-muted-foreground mt-0.5">Logo visible en la card</p>
					</div>
				</label>
			</div>
			<input type="hidden" name="esta_publicado"  value={String(fPublicado)}/>
			<input type="hidden" name="mostrar_cliente" value={String(fMostrarCliente)}/>

			<!-- Métricas públicas -->
			<div class="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-5 space-y-5">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-bold text-foreground">Métricas públicas</p>
						<p class="text-xs text-muted-foreground mt-0.5">Estadísticas visibles en la card del caso</p>
					</div>
					<button type="button" onclick={addStat}
					        class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
					               bg-blue-600/10 border border-blue-500/30 text-blue-600 dark:text-blue-400
					               hover:bg-blue-600/20 transition-colors">
						<svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
						</svg>
						Agregar métrica
					</button>
				</div>

				<!-- Ícono emoji -->
				<div class="field-group">
					<label class="field-label">Ícono del caso (emoji)</label>
					<div class="flex items-center gap-3">
						<input type="text" name="icon" bind:value={fIcon}
						       class="field-input w-20 text-center text-2xl"
						       maxlength="4"/>
						<span class="text-xs text-muted-foreground">
							Sugerencias: ⚡ 🤖 💰 🧾 📊 🚚 💻 🏠 💱 🔗
						</span>
					</div>
				</div>

				<!-- Stats dinámicos -->
				<div class="space-y-3">
					{#each fStats as stat, i}
    <div class="rounded-xl border border-border bg-card overflow-hidden">
        <!-- Header de la fila -->
        <div class="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
            <span class="w-5 h-5 rounded-md bg-muted border border-border flex items-center justify-center
                         text-[10px] font-bold text-muted-foreground flex-shrink-0">
                {i + 1}
            </span>
            <span class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1">
                Métrica #{i + 1}
            </span>
            <button type="button" onclick={() => removeStat(i)}
                    class="p-1 rounded-lg text-muted-foreground hover:text-red-500
                           hover:bg-red-500/10 transition-colors">
                <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
            </button>
        </div>
        <!-- Campos -->
        <div class="grid grid-cols-2 gap-3 p-3">
            <div>
                <label class="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-widest">
                    Valor
                </label>
                <input
                    type="text"
                    value={stat.valor}
                    oninput={(e) => updateStat(i, 'valor', (e.target as HTMLInputElement).value)}
                    placeholder="Ej: 99%, 500+, 24/7"
                    class="field-input text-center font-extrabold text-base"
                    style="color:{getTipoColor(fTipo)}"
                />
            </div>
            <div>
                <label class="block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-widest">
                    Etiqueta
                </label>
                <input
                    type="text"
                    value={stat.label}
                    oninput={(e) => updateStat(i, 'label', (e.target as HTMLInputElement).value)}
                    placeholder="Ej: Tasa de éxito"
                    class="field-input"
                />
            </div>
        </div>
    </div>
{/each}
					{#if fStats.length === 0}
						<div class="text-center py-4 text-xs text-muted-foreground">
							Sin métricas aún — agrega al menos una para que aparezca en la card.
						</div>
					{/if}
				</div>

				<!-- Preview -->
				{#if fStats.some(s => s.valor)}
					<div class="pt-4 border-t border-border">
						<p class="text-[10px] font-bold text-muted-foreground mb-3 uppercase tracking-widest">
							Vista previa de métricas
						</p>
						<div class="flex gap-2 flex-wrap">
							{#each fStats.filter(s => s.valor) as stat}
								<div class="px-4 py-3 rounded-xl bg-card border border-border text-center min-w-[80px]">
									<p class="text-base font-extrabold leading-none mb-1"
									   style="color:{getTipoColor(fTipo)}">
										{stat.valor}
									</p>
									<p class="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Botones -->
			<div class="flex gap-3 pt-2 border-t border-border">
				<button type="submit" disabled={guardando}
				        class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
				               bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white transition-colors">
					{#if guardando}
						<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12"/>
						</svg>
						Guardando…
					{:else}
						{mode === 'crear' ? 'Crear caso' : 'Guardar cambios'}
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
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onclick={() => confirmDel = null}></div>
	<div class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
	            w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
		<div class="text-center mb-6">
			<div class="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20
			            flex items-center justify-center text-2xl mx-auto mb-4">⚠️</div>
			<p class="text-base font-bold text-foreground mb-2">¿Eliminar caso de éxito?</p>
			<p class="text-sm text-muted-foreground">
				Esta acción no se puede deshacer. Si solo quieres ocultarlo usa el toggle "Publicado".
			</p>
		</div>
		<form method="POST" action="?/eliminar"
		      use:enhance={() => {
			return async ({ update }) => { await update(); await invalidateAll(); };
		}}>
			<input type="hidden" name="id" value={confirmDel}/>
			<div class="flex gap-3">
				<button type="submit"
				        class="flex-1 py-2.5 rounded-xl text-sm font-semibold
				               bg-red-600 hover:bg-red-500 text-white transition-colors">
					Sí, eliminar
				</button>
				<button type="button" onclick={() => confirmDel = null}
				        class="flex-1 py-2.5 rounded-xl text-sm font-semibold
				               border border-border text-foreground hover:bg-muted transition-colors">
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

	/* ── Grupos de campo ─────────────────────────────── */
	:global(.field-group) {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	:global(.field-label) {
		font-size: 0.75rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		letter-spacing: 0.01em;
	}

	/* ── Inputs ──────────────────────────────────────── */
	:global(.field-input) {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border-radius: 0.75rem;
		border: 1.5px solid hsl(var(--border));
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		font-size: 0.875rem;
		transition: border-color 0.15s, box-shadow 0.15s;
		box-shadow: 0 1px 2px rgba(0,0,0,0.04);
	}
	:global(.field-input::placeholder) {
		color: hsl(var(--muted-foreground) / 0.6);
	}
	:global(.field-input:focus) {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59,130,246,0.15), 0 1px 2px rgba(0,0,0,0.04);
	}
	:global(select.field-input) {
		cursor: pointer;
	}

	/* ── Toggle cards ────────────────────────────────── */
	:global(.toggle-card) {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		border-radius: 0.875rem;
		border: 1.5px solid hsl(var(--border));
		background: hsl(var(--background));
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
		box-shadow: 0 1px 2px rgba(0,0,0,0.04);
	}
	:global(.toggle-card:hover) {
		border-color: #3b82f680;
		background: hsl(var(--muted) / 0.5);
	}
	:global(.toggle-card-on) {
		border-color: #3b82f6;
		background: rgba(59,130,246,0.04);
		box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
	}
	:global(.toggle-dot) {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 9999px;
		flex-shrink: 0;
		transition: background 0.2s;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>