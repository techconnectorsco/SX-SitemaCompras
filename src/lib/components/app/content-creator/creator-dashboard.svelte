<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { 
		LayoutDashboard, 
		Sparkles, 
		TrendingUp, 
		Clock, 
		CheckCircle2, 
		Plus, 
		FileText, 
		ChevronRight,
		Coins,
		Layers,
		Calendar,
		Instagram,
		Facebook,
		BookOpen,
		Video
	} from 'lucide-svelte';

	// Estado del Dashboard
	let selectedBrandFilter = $state<string>('Todas');
	
	// Props Svelte 5
	let { posts = $bindable(), catalogos, tokenStats } = $props<{ 
		posts: any[], 
		catalogos: any,
		tokenStats: { costo_total: number; tokens_total: number; llamadas_total: number }
	}>();

	// Lista de marcas filtradas
	const filteredPosts = $derived(
		selectedBrandFilter === 'Todas'
			? posts
			: posts.filter(p => p.brand === selectedBrandFilter)
	);

	// Estadísticas reactivas basadas en la marca seleccionada (enfocado 100% en Gemini)
	const stats = $derived.by(() => {
		const total = filteredPosts.length;
		const approved = filteredPosts.filter(p => p.status === 'Aprobado').length;
		const inReview = filteredPosts.filter(p => p.status === 'En revisión').length;
		const drafts = filteredPosts.filter(p => p.status === 'Borrador').length;

		// Pipeline de formatos
		const postsCount = total;
		const blogsCount = filteredPosts.filter(p => p.format?.includes('Blog')).length;
		const videoCount = filteredPosts.filter(p => p.format?.includes('Video') || p.format?.includes('Reel')).length;

		return {
			total,
			approved,
			inReview,
			drafts,
			// Tokens y costo leídos directamente desde ai_token_logs (reales, no estimados)
			tokensUsed: tokenStats.tokens_total,
			cost: tokenStats.costo_total.toFixed(4),
			llamadasIA: tokenStats.llamadas_total,
			pipeline: {
				posts: postsCount,
				blogs: blogsCount,
				videos: videoCount
			}
		};
	});

	// Próxima publicación programada
	const nextPublish = $derived.by(() => {
		// Encontrar la primera publicación con estado Aprobado y que no esté publicada todavía
		return posts.find(p => p.status === 'Aprobado' && !p.published) || posts.find(p => p.status === 'Aprobado') || null;
	});

	function formatNum(num: number): string {
		return new Intl.NumberFormat('es-CR').format(num);
	}
</script>

	<!-- Panel Principal -->
	<main class="flex flex-col gap-6">
		<!-- Header Principal -->
		<header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
			<div class="flex items-center gap-3">
				<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#253166]">
					<LayoutDashboard class="h-6 w-6 text-white" />
				</div>
				<div>
					<h1 class="text-xl font-bold tracking-tight">Dashboard de Contenido</h1>
					<p class="text-xs text-muted-foreground">Orquestador y planificación de contenido con automatización de IA</p>
				</div>
			</div>

			<!-- Filtro por marca -->
			<div class="flex items-center gap-2">
				<span class="text-xs font-medium text-muted-foreground">Filtrar marca:</span>
				<select 
					bind:value={selectedBrandFilter}
					class="h-9 rounded-md border border-input dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs dark:text-slate-200 outline-none focus:border-[#253166]"
				>
					<option value="Todas">Todas las marcas</option>
					{#each catalogos.marcas as marca}
						<option value={marca.nombre}>{marca.nombre}</option>
					{/each}
				</select>
			</div>
		</header>

		<!-- Grid de KPIs -->
		<section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			
			<!-- KPI: Total Piezas -->
			<div class="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-1">
						<p class="text-sm font-medium text-muted-foreground">Total Piezas</p>
						<p class="text-3xl font-bold">{stats.total}</p>
						<p class="text-xs text-muted-foreground">{stats.approved} aprobadas · {stats.drafts} borradores</p>
					</div>
					<div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/50">
						<FileText class="h-6 w-6 text-blue-600 dark:text-blue-400" />
					</div>
				</div>
			</div>

			<!-- KPI: En Revisión Humana -->
			<div class="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-1">
						<p class="text-sm font-medium text-muted-foreground">En Revisión</p>
						<p class="text-3xl font-bold {stats.inReview > 0 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}">{stats.inReview}</p>
						<p class="text-xs text-muted-foreground">{stats.inReview > 0 ? 'Requiere aprobación' : 'Todo revisado'}</p>
					</div>
					<div class="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
						<Clock class="h-6 w-6 text-amber-600 dark:text-amber-400" />
					</div>
				</div>
			</div>

			<!-- KPI: Tokens Gemini Usados -->
			<div class="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-1">
						<p class="text-sm font-medium text-muted-foreground">Tokens Consumidos</p>
						<p class="text-3xl font-bold">{formatNum(stats.tokensUsed)}</p>
						<p class="text-xs text-muted-foreground">De 1,000,000 cuota</p>
					</div>
					<div class="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/50">
						<Coins class="h-6 w-6 text-orange-600 dark:text-orange-400" />
					</div>
				</div>
			</div>

			<!-- KPI: Costo Estimado Gemini -->
			<div class="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-1">
						<p class="text-sm font-medium text-muted-foreground">Costo Estimado</p>
						<p class="text-3xl font-bold text-emerald-600">${stats.cost}</p>
						<p class="text-xs text-muted-foreground">SLA Corporativo</p>
					</div>
					<div class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
						<TrendingUp class="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
					</div>
				</div>
			</div>

		</section>

		<!-- Segunda Fila: Gráfico, Próxima Publicación/Pipeline, e Historial -->
		<div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr_1fr]">
			
			<!-- Gráfico SVG: Tendencia de Alcance -->
			<div class="rounded-xl border bg-card shadow-sm flex flex-col justify-between">
				<div class="border-b p-4">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-sm font-semibold">Tendencia de Alcance</h3>
							<p class="text-[10px] text-muted-foreground">Estimación de alcance orgánico mensual</p>
						</div>
						<TrendingUp class="h-4 w-4 text-muted-foreground" />
					</div>
				</div>
				
				<div class="p-4 flex-1 flex flex-col justify-center">
					<div class="relative h-36 w-full border-l border-b border-slate-100 dark:border-slate-800">
						<svg class="absolute inset-0 h-full w-full text-slate-100 dark:text-slate-900" viewBox="0 0 100 100" preserveAspectRatio="none">
							<line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" stroke-dasharray="3" stroke-width="0.5" />
							<line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" stroke-dasharray="3" stroke-width="0.5" />
							<line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" stroke-dasharray="3" stroke-width="0.5" />
						</svg>

						<svg class="absolute inset-0 h-full w-full text-[#253166] dark:text-blue-500" viewBox="0 0 100 100" preserveAspectRatio="none">
							<defs>
								<linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stop-color="currentColor" stop-opacity="0.2" />
									<stop offset="100%" stop-color="currentColor" stop-opacity="0" />
								</linearGradient>
							</defs>
							<path d="M 0 90 Q 20 70, 40 80 T 80 30 T 100 10 L 100 100 L 0 100 Z" fill="url(#chartGrad)" />
							<path d="M 0 90 Q 20 70, 40 80 T 80 30 T 100 10" fill="none" stroke="currentColor" stroke-width="2" />
						</svg>

						<div class="absolute right-[20%] top-[30%] flex h-3.5 w-3.5 items-center justify-center">
							<div class="absolute h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></div>
							<div class="relative h-2 w-2 rounded-full bg-orange-500"></div>
						</div>
					</div>
					<div class="mt-2.5 flex justify-between text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
						<span>Inicio</span>
						<span>Mitad</span>
						<span>Cierre</span>
					</div>
				</div>
			</div>

			<!-- Novedad: Próxima Publicación -->
			<div class="rounded-xl border bg-card shadow-sm flex flex-col justify-between">
				<div class="border-b p-4 flex items-center justify-between">
					<div>
						<h3 class="text-sm font-semibold">Próxima Publicación</h3>
						<p class="text-[10px] text-muted-foreground">Siguiente pieza en calendario</p>
					</div>
					{#if nextPublish}
						<div class="text-[#253166] dark:text-blue-400 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg shrink-0">
							{#if nextPublish.network === 'Instagram'}
								<Instagram class="h-4 w-4" />
							{:else}
								<Facebook class="h-4 w-4" />
							{/if}
						</div>
					{/if}
				</div>
				
				<div class="p-4 flex-1 flex flex-col justify-between gap-3.5">
					{#if nextPublish}
						<!-- Vista Previa Social Compacta -->
						<div class="rounded-lg border bg-muted/20 p-3 flex flex-col gap-2">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div class="h-6 w-6 rounded-full bg-[#253166] text-white text-[9px] flex items-center justify-center font-bold">
										{(nextPublish.brand || 'V&O')[0]}
									</div>
									<div class="min-w-0">
										<p class="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-none">{nextPublish.brand || 'V&O'}</p>
										<p class="text-[8px] text-slate-400 mt-0.5">{nextPublish.network}</p>
									</div>
								</div>
								<span class="rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 text-[8px] font-bold">
									Aprobado
								</span>
							</div>
							
							<p class="text-[10px] text-slate-700 dark:text-slate-300 line-clamp-2 italic leading-relaxed">
								"{nextPublish.title}"
							</p>
						</div>

						<!-- Grid de Parámetros -->
						<div class="grid grid-cols-2 gap-2 border-t pt-3">
							<div class="rounded-lg bg-slate-50 dark:bg-slate-900/30 p-2 border">
								<span class="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">Hora de Envío</span>
								<p class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{nextPublish.time || '09:00'} hs</p>
							</div>
							<div class="rounded-lg bg-slate-50 dark:bg-slate-900/30 p-2 border">
								<span class="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">Countdown</span>
								<p class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">~14h 15m</p>
							</div>
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center py-10 text-center">
							<p class="text-xs text-muted-foreground">No hay publicaciones programadas hoy.</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Historial de publicaciones / Cola de Trabajo -->
			<div class="rounded-xl border bg-card shadow-sm flex flex-col justify-between">
				<div class="border-b p-4">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-sm font-semibold">Cola de Trabajo</h3>
							<p class="text-[10px] text-muted-foreground">Estado de piezas en el Cronograma 2026</p>
						</div>
						<Calendar class="h-4 w-4 text-muted-foreground" />
					</div>
				</div>

				<div class="p-4 space-y-2 flex-1 overflow-y-auto max-h-[260px] scrollbar-thin">
					{#if filteredPosts.length === 0}
						<div class="text-center py-8 text-xs text-muted-foreground">
							Ninguna pieza coincide con los filtros.
						</div>
					{:else}
						{#each filteredPosts.slice(0, 5) as post (post.id)}
							<div class="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/30 transition">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="rounded bg-[#253166]/10 dark:bg-blue-950/40 px-1.5 py-0.5 text-[8px] font-bold text-[#253166] dark:text-blue-300">
											{post.brand || 'V&O'}
										</span>
										<span class="text-[9px] text-muted-foreground">{post.date} · {post.week || 'Semana 1'}</span>
									</div>
									<h4 class="mt-1 truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{post.title}</h4>
								</div>
								<span class="ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-semibold 
									{post.status === 'Aprobado' 
										? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' 
										: post.status === 'En revisión' 
											? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' 
											: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}">
									{post.status || 'Borrador'}
								</span>
							</div>
						{/each}
					{/if}
				</div>

				<div class="p-3 border-t text-center bg-muted/10">
					<button 
						type="button" 
						class="text-xs font-bold text-[#253166] dark:text-blue-400 hover:underline flex items-center justify-center gap-1 w-full"
						onclick={() => toast.info('Gestión de posts detallado próximamente.')}
					>
						<span>Ver todos los posts</span>
						<ChevronRight class="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
		</div>
	</main>
