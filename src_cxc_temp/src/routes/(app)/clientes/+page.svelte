<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let clientes = $derived(data.clientes ?? []);
	let stats    = $derived(data.stats ?? { totalEjecuciones: 0, totalBots: 0, totalProyectos: 0 });

	// Paleta de colores por índice — para avatares cuando no hay logo
	const avatarColors = [
		{ bg: '#1d4ed8', text: '#fff' },  // blue
		{ bg: '#059669', text: '#fff' },  // emerald
		{ bg: '#7c3aed', text: '#fff' },  // violet
		{ bg: '#d97706', text: '#fff' },  // amber
		{ bg: '#dc2626', text: '#fff' },  // red
		{ bg: '#0891b2', text: '#fff' },  // cyan
	];

	function getColor(i: number) {
		return avatarColors[i % avatarColors.length];
	}

	function getInitials(nombre: string): string {
		return nombre
			.split(' ')
			.slice(0, 2)
			.map(w => w[0])
			.join('')
			.toUpperCase();
	}

	function fmtNum(v: number): string {
		if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
		return String(v);
	}

	// Logo size map por slug
	const logoSizeMap: Record<string, string> = {
		'samesa':          'h-10',
		'vedova-y-obando': 'h-11',
		'ae-logistics':    'h-14',
		'sito-cr':         'h-8',
		'soportexperto':   'h-10',
		'techconnectors':  'h-14',
	};
	function getLogoSize(slug: string): string {
		return logoSizeMap[slug] ?? 'h-10';
	}
</script>

<div class="space-y-10 animate-fade-in">

	<!-- ── Encabezado ──────────────────────────────────────────── -->
	<div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
		<div>
			<p class="text-xs font-bold uppercase tracking-[0.18em] mb-2 text-blue-600 dark:text-blue-400">
				Nuestros clientes
			</p>
			<h1 class="text-3xl font-bold text-foreground leading-tight">
				Empresas que confían<br class="hidden sm:block" /> en SX Desarrollos
			</h1>
			<p class="text-muted-foreground mt-2 text-sm max-w-lg leading-relaxed">
				Organizaciones costarricenses que han transformado sus operaciones
				con automatización y desarrollo a medida.
			</p>
		</div>

		<!-- Counter pill -->
		<div class="self-start sm:self-auto flex items-center gap-3 px-5 py-3 bg-card border border-border rounded-2xl shadow-sm flex-shrink-0">
			<span class="text-2xl font-extrabold text-foreground">{clientes.length}</span>
			<span class="text-sm text-muted-foreground font-medium leading-tight">empresas<br/>activas</span>
		</div>
	</div>

	<!-- ── Stats globales ──────────────────────────────────────── -->
	<div class="grid grid-cols-3 gap-4">
		{#each [
			{ icon: '⚡', val: fmtNum(stats.totalEjecuciones), label: 'Ejecuciones totales', color: 'text-blue-600 dark:text-blue-400' },
			{ icon: '🤖', val: String(stats.totalBots),        label: 'Automatizaciones',    color: 'text-violet-600 dark:text-violet-400' },
			{ icon: '💻', val: String(stats.totalProyectos),   label: 'Proyectos de software', color: 'text-emerald-600 dark:text-emerald-400' },
		] as s}
			<div class="bg-card border border-border rounded-2xl px-5 py-5 text-center
			            hover:shadow-md transition-shadow">
				<p class="text-2xl mb-1">{s.icon}</p>
				<p class="text-3xl font-extrabold {s.color} leading-none">{s.val}</p>
				<p class="text-xs text-muted-foreground mt-1.5 font-medium">{s.label}</p>
			</div>
		{/each}
	</div>

	<!-- ── Grid de clientes ────────────────────────────────────── -->
	<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
		{#each clientes as cliente, i}
			{@const color = getColor(i)}

			<div class="group relative flex flex-col bg-card border border-border rounded-3xl
			            overflow-hidden hover:shadow-xl hover:-translate-y-1
			            transition-all duration-300">

				<!-- Franja de color superior -->
				<div class="h-1 w-full flex-shrink-0"
				     style="background: linear-gradient(90deg, {color.bg}, {color.bg}99)">
				</div>

				<!-- Zona hero: avatar grande + fondo sutil -->
				<div class="relative flex items-center justify-center pt-10 pb-6 px-6"
				     style="background: linear-gradient(180deg, {color.bg}10 0%, transparent 100%)">

					<!-- Avatar / Logo -->
					{#if cliente.logo_url}
						<div class="w-20 h-20 rounded-2xl bg-card border border-border shadow-md
						            flex items-center justify-center overflow-hidden
						            group-hover:scale-105 transition-transform duration-300">
							<img
								src={cliente.logo_url}
								alt={cliente.nombre}
								class="object-contain p-2 {getLogoSize(cliente.slug)}"
							/>
						</div>
					{:else}
						<div class="w-20 h-20 rounded-2xl shadow-md flex items-center justify-center
						            text-2xl font-extrabold tracking-tight
						            group-hover:scale-105 transition-transform duration-300"
						     style="background:{color.bg}; color:{color.text}">
							{getInitials(cliente.nombre)}
						</div>
					{/if}

					<!-- Sitio web badge flotante -->
					{#if cliente.sitio_web}
						<a
							href={cliente.sitio_web}
							target="_blank"
							rel="noopener noreferrer"
							class="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full
							       text-[10px] font-semibold border border-border bg-card
							       text-muted-foreground hover:text-foreground hover:border-blue-500/40
							       transition-colors opacity-0 group-hover:opacity-100 duration-200"
						>
							<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
							</svg>
							Web
						</a>
					{/if}
				</div>

				<!-- Info del cliente -->
				<div class="flex flex-col flex-1 px-6 pb-6">

					<!-- Nombre -->
					<h3 class="text-base font-bold text-foreground text-center mb-2 leading-snug">
						{cliente.nombre}
					</h3>

					<!-- Descripción -->
					{#if cliente.descripcion}
						<p class="text-xs text-muted-foreground text-center leading-relaxed mb-5 line-clamp-2">
							{cliente.descripcion}
						</p>
					{/if}

					<!-- Stats del cliente -->
					<div class="grid grid-cols-3 gap-2 mb-5">
						<div class="flex flex-col items-center py-3 px-2 rounded-xl bg-muted/50 border border-border">
							<p class="text-lg font-extrabold leading-none text-foreground">
								{cliente.botsActivos}
							</p>
							<p class="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground mt-1 text-center">
								Bots<br/>activos
							</p>
						</div>
						<div class="flex flex-col items-center py-3 px-2 rounded-xl bg-muted/50 border border-border">
							<p class="text-lg font-extrabold leading-none text-foreground">
								{fmtNum(cliente.totalEjecuciones)}
							</p>
							<p class="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground mt-1 text-center">
								Ejecuciones
							</p>
						</div>
						<div class="flex flex-col items-center py-3 px-2 rounded-xl bg-muted/50 border border-border">
							<p class="text-lg font-extrabold leading-none text-foreground">
								{cliente.totalProyectos}
							</p>
							<p class="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground mt-1 text-center">
								Proyectos<br/>software
							</p>
						</div>
					</div>

					<div class="flex-1"></div>

					<!-- Indicador activo + botón web -->
					<div class="flex items-center justify-between pt-4 border-t border-border">
						<div class="flex items-center gap-1.5">
							<span class="w-1.5 h-1.5 rounded-full animate-pulse"
							      style="background:{color.bg}">
							</span>
							<span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
								Activo
							</span>
						</div>

						{#if cliente.sitio_web}
							<a
								href={cliente.sitio_web}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
								       border border-border text-muted-foreground
								       hover:text-foreground hover:border-blue-500/40 hover:bg-muted/60
								       transition-all duration-150"
							>
								Visitar sitio
								<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
								</svg>
							</a>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- ── CTA al fondo ────────────────────────────────────────── -->
	<div class="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-10 text-center">
		<p class="text-base font-bold text-foreground mb-2">
			¿Tu empresa quiere formar parte de esta lista?
		</p>
		<p class="text-sm text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
			Conversemos sobre cómo la automatización puede transformar
			la operación de tu empresa.
		</p>
		<a
			href="mailto:omar.hernandez@soportexperto.com"
			class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
			       bg-blue-600 hover:bg-blue-500 text-white
			       shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5"
		>
			Contactar a ventas
			<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
				<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
				<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
			</svg>
		</a>
	</div>

</div>

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(14px); }
		to   { opacity: 1; transform: translateY(0); }
	}
	.animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>