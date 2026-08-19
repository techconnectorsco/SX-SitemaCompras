<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let casos       = $derived(data.casos       ?? []);
	let proyectoMap = $derived(data.proyectoMap ?? {});

	const logoHeightMap: Record<string, string> = {
		'samesa':          'h-8',
		'vedova-y-obando': 'h-10',
		'ae-logistics':    'h-16',
		'sito-cr':         'h-6',
		'soportexperto':   'h-8',
		'techconnectors':  'h-14',
	};
	function getLogoHeight(slug: string | undefined): string {
		return logoHeightMap[slug ?? ''] ?? 'h-10';
	}

	const tipoConfig: Record<string, { label: string; color: string; icon: string; bg: string }> = {
		'rpa':         { label: 'RPA',        color: '#8b5cf6', icon: '🤖', bg: '#8b5cf610' },
		'software':    { label: 'Software',    color: '#3b82f6', icon: '💻', bg: '#3b82f610' },
		'web':         { label: 'App Web',     color: '#3b82f6', icon: '🌐', bg: '#3b82f610' },
		'dashboard':   { label: 'Dashboard',   color: '#f59e0b', icon: '📊', bg: '#f59e0b10' },
		'integracion': { label: 'Integración', color: '#10b981', icon: '🔗', bg: '#10b98110' },
		'analytics':   { label: 'Analytics',   color: '#f59e0b', icon: '📈', bg: '#f59e0b10' },
	};
	function getTipoConfig(tipo: string | null) {
		return tipoConfig[tipo ?? ''] ?? { label: tipo ?? 'Automatización', color: '#6366f1', icon: '⚡', bg: '#6366f110' };
	}

	let filtro = $state<'todos' | 'rpa' | 'software'>('todos');
	let casosFiltrados = $derived.by(() => {
		if (filtro === 'todos') return casos;
		if (filtro === 'rpa')   return casos.filter((c: any) => c.tipo_automatizacion === 'rpa');
		return casos.filter((c: any) => c.tipo_automatizacion !== 'rpa');
	});

	let puedeVerProceso = $derived(!!data.user && (data.esAdmin || !!data.clienteId));

	function getTechs(clienteId: string | null): string[] {
		if (!clienteId) return [];
		const p = proyectoMap[clienteId];
		if (!p?.tecnologias) return [];
		return (p.tecnologias as string).split(',').map((t: string) => t.trim()).filter(Boolean).slice(0, 4);
	}
</script>

<div class="space-y-10 animate-fade-in">

	<!-- ── Encabezado ──────────────────────────────────────────── -->
	<div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
		<div>
			<p class="text-xs font-bold uppercase tracking-[0.14em] mb-2 text-blue-600 dark:text-blue-400">
				Portafolio
			</p>
			<h1 class="text-3xl font-bold text-foreground">Aplicaciones y Automatizaciones</h1>
			<p class="text-muted-foreground mt-2 text-sm max-w-xl leading-relaxed">
				Proyectos de transformación digital desarrollados por SX Desarrollos —
				desde plataformas web completas hasta robots RPA en producción.
			</p>
		</div>
		<div class="flex items-center gap-2 self-start sm:self-auto px-5 py-3 bg-card border border-border rounded-2xl shadow-sm shrink-0">
			<span class="text-2xl font-extrabold text-foreground">{casos.length}</span>
			<span class="text-sm text-muted-foreground font-medium">casos de éxito</span>
		</div>
	</div>

	<!-- ── Filtros ─────────────────────────────────────────────── -->
	<div class="flex gap-2">
		{#each [
			{ key: 'todos',    label: 'Todos',    emoji: '✦' },
			{ key: 'rpa',      label: 'RPA',      emoji: '🤖' },
			{ key: 'software', label: 'Software', emoji: '💻' }
		] as f}
			<button
				onclick={() => (filtro = f.key as any)}
				class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
				       border transition-all duration-200
				       {filtro === f.key
				         ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20'
				         : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-blue-500/40'}"
			>
				<span>{f.emoji}</span>
				{f.label}
				{#if f.key === 'todos'}
					<span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold
					             {filtro === 'todos' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}">
						{casos.length}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- ── Grid de cards ───────────────────────────────────────── -->
	{#if casosFiltrados.length === 0}
		<div class="bg-card border border-border rounded-2xl p-16 text-center">
			<p class="text-4xl mb-4">🔍</p>
			<p class="text-sm text-muted-foreground">No hay casos en esta categoría aún.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
			{#each casosFiltrados as caso}
				{@const cliente  = (caso.clientes as any)}
				{@const tipo     = getTipoConfig(caso.tipo_automatizacion)}
				{@const proyecto = cliente?.id ? proyectoMap[cliente.id] : null}
				{@const techs    = getTechs(cliente?.id ?? null)}
				{@const stats    = caso.metricas_publicas?.stats ?? []}

				<div class="group flex flex-col bg-card rounded-2xl border border-border
				            hover:shadow-xl hover:-translate-y-1
				            transition-all duration-300 overflow-hidden">

					<!-- Imagen o placeholder -->
					{#if caso.imagen_url || proyecto?.captura_pantalla_url}
						<div class="w-full h-52 overflow-hidden bg-muted shrink-0 relative">
							<img
								src={caso.imagen_url ?? proyecto.captura_pantalla_url}
								alt={caso.titulo}
								class="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
							/>
							<div class="absolute inset-0 bg-linear-to-t from-card/60 to-transparent"></div>
							<div class="absolute bottom-3 left-4">
								<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm"
								      style="background:{tipo.color}cc; color:white;">
									{tipo.icon} {tipo.label}
								</span>
							</div>
						</div>
					{:else}
						<div class="w-full h-52 shrink-0 flex flex-col items-center justify-center gap-3 relative"
						     style="background: linear-gradient(135deg, {tipo.color}12 0%, {tipo.color}06 100%)">
							<div class="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl
							            transition-transform duration-300 group-hover:scale-110"
							     style="background:{tipo.color}18; border:1.5px solid {tipo.color}30">
								{tipo.icon}
							</div>
							<span class="absolute bottom-3 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
							      style="background:{tipo.color}20; color:{tipo.color}; border:1px solid {tipo.color}30">
								{tipo.label}
							</span>
						</div>
					{/if}

					<!-- Cuerpo -->
					<div class="flex flex-col flex-1 p-7">

						<!-- Logo + industria -->
						<div class="flex items-center justify-between mb-5">
							<span class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
								{caso.industria ?? caso.tipo_automatizacion ?? '—'}
							</span>
							{#if caso.mostrar_cliente && cliente?.logo_url}
								<img
									src={cliente.logo_url}
									alt={cliente.nombre}
									class="w-auto object-contain opacity-75 group-hover:opacity-100 transition-opacity duration-200 {getLogoHeight(cliente?.slug)}"
								/>
							{:else if caso.mostrar_cliente && cliente?.nombre}
								<span class="text-xs font-semibold text-muted-foreground">{cliente.nombre}</span>
							{/if}
						</div>

						<!-- Título -->
						<h3 class="font-bold text-foreground text-lg leading-snug mb-3">
							{caso.titulo}
						</h3>

						<!-- Descripción -->
						<p class="text-sm text-muted-foreground leading-relaxed mb-6 line-clamp-3">
							{caso.descripcion}
						</p>

						<!-- Stats -->
						{#if stats.length > 0}
							<div class="grid grid-cols-3 gap-3 mb-6 p-4 rounded-xl border border-border bg-muted/40">
								{#each stats.slice(0, 3) as stat}
									<div class="text-center">
										<p class="text-base font-extrabold leading-none mb-1" style="color:{tipo.color}">
											{stat.valor}
										</p>
										<p class="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground leading-tight">
											{stat.label}
										</p>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Tecnologías -->
						{#if techs.length > 0}
							<div class="flex flex-wrap gap-1.5 mb-6">
								{#each techs as tech}
									<span class="px-2 py-1 rounded-lg text-[10px] font-medium border border-border bg-muted text-muted-foreground">
										{tech}
									</span>
								{/each}
							</div>
						{/if}

						<div class="flex-1"></div>

						<!-- Botones -->
						<div class="flex gap-3 pt-5 border-t border-border">
    
    <a   href="/apps/{caso.id}"
        class="flex-1 text-center px-4 py-2.5 rounded-xl text-xs font-semibold
               border border-border bg-muted text-foreground
               hover:bg-card transition-colors duration-150"
    >
        Ver detalle
    </a>

    {#if puedeVerProceso}
        
        <a   href="/apps/{caso.id}/proceso"
            class="flex-1 text-center px-4 py-2.5 rounded-xl text-xs font-semibold
                   text-white hover:-translate-y-0.5 transition-all duration-150"
            style="background:{tipo.color}"
        >
            Ver proceso →
        </a>
    {:else}
        
        <a    href="/auth?mode=login"
            class="flex-1 text-center px-4 py-2.5 rounded-xl text-xs font-semibold
                   border transition-colors duration-150"
            style="border-color:{tipo.color}40; color:{tipo.color}; background:{tipo.color}08"
        >
            Acceder
        </a>
    {/if}
</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- ── CTA según estado de acceso ─────────────────────────── -->
	{#if data.accesoEstado === 'dominio_valido_sin_solicitud'}
		<div class="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-10">
			<div class="max-w-xl mx-auto text-center">
				<div class="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl mx-auto mb-5">✅</div>
				<p class="text-base font-bold text-foreground mb-2">Tu empresa está registrada con nosotros</p>
				<p class="text-sm text-muted-foreground mb-6 leading-relaxed">
					Tu correo pertenece a <strong class="text-foreground">{data.dominioCliente}</strong>.
					Solicita acceso para ver métricas, logs de ejecución y el estado en tiempo real de tus procesos.
				</p>
				<a
					href="/solicitar-acceso"
					class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
					       bg-emerald-600 hover:bg-emerald-500 text-white
					       shadow-md shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5"
				>
					Solicitar acceso a mis procesos
					<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
					</svg>
				</a>
			</div>
		</div>

	{:else if data.accesoEstado === 'solicitud_pendiente'}
		<div class="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-10">
			<div class="max-w-xl mx-auto text-center">
				<div class="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl mx-auto mb-5">⏳</div>
				<p class="text-base font-bold text-foreground mb-2">Solicitud en revisión</p>
				<p class="text-sm text-muted-foreground leading-relaxed">
					Tu solicitud de acceso a <strong class="text-foreground">{data.dominioCliente}</strong> está siendo procesada.
					Te notificaremos por correo cuando sea aprobada.
				</p>
			</div>
		</div>

	{:else if data.accesoEstado === 'dominio_invalido'}
    <div class="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-10">
        <div class="max-w-xl mx-auto text-center">
            <div class="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl mx-auto mb-5">📋</div>
            <p class="text-base font-bold text-foreground mb-2">Tu correo no está vinculado a ninguna empresa</p>
            <p class="text-sm text-muted-foreground mb-6 leading-relaxed">
                Tu cuenta <strong class="text-foreground">{data.user?.email}</strong> no pertenece
                a ningún dominio corporativo registrado con nosotros. Para acceder a los procesos
                de tu empresa debes cerrar esta sesión y registrarte con tu correo corporativo.
            </p>
            
            <a   href="/solicitar-acceso"
                class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                       bg-amber-600 hover:bg-amber-500 text-white
                       shadow-md shadow-amber-600/20 transition-all duration-200 hover:-translate-y-0.5"
            >
                Ver instrucciones de acceso
                <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
            </a>
        </div>
    </div>

	{:else if data.accesoEstado === 'sin_sesion'}
		<div class="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-10">
			<div class="max-w-xl mx-auto text-center">
				<div class="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl mx-auto mb-5">🔐</div>
				<p class="text-base font-bold text-foreground mb-2">¿Eres parte de una empresa cliente?</p>
				<p class="text-sm text-muted-foreground mb-6 leading-relaxed">
					Regístrate con tu correo corporativo para solicitar acceso a las métricas,
					logs y estado en tiempo real de los procesos de tu empresa.
				</p>
				<div class="flex flex-wrap gap-3 justify-center">
					<a
						href="/auth?mode=register"
						class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
						       bg-blue-600 hover:bg-blue-500 text-white
						       shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5"
					>
						Registrarme
						<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
						</svg>
					</a>
					<a
						href="/auth?mode=login"
						class="inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold
						       border border-border text-foreground hover:bg-muted transition-colors duration-200"
					>
						Ya tengo cuenta
					</a>
				</div>
			</div>
		</div>
	{/if}

</div>

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(12px); }
		to   { opacity: 1; transform: translateY(0);    }
	}
	.animate-fade-in { animation: fade-in 0.45s ease-out forwards; }
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>