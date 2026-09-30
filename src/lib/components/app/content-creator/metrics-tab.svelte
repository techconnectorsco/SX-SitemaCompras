<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		TrendingUp,
		Heart,
		MessageCircle,
		Share2,
		Users,
		Award,
		Sparkles,
		RefreshCw,
		AlertCircle,
		Lightbulb,
		ExternalLink,
		Lock,
		ImageOff
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	// Props (se mantienen la firma del padre; los posts del calendario no se usan aquí
	// porque las métricas provienen del feed real de Meta Graph API de la cuenta
	// Meta seleccionada en el selector multi-cuenta).
	let { posts = $bindable(), catalogos, cuentaId = $bindable<number | null>(null) } = $props<{ posts: any[], catalogos: any, cuentaId?: number | null }>();

	type FeedPost = {
		id: string;
		message: string;
		created_time: string;
		permalink_url?: string;
		full_picture?: string;
		likes: number;
		comments: number;
		shares: number;
		engagement: number;
	};

	// Estado de datos reales
	let selectedPeriod = $state<'7d' | '30d' | '90d' | 'all'>('30d');
	let feedPosts = $state<FeedPost[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let pageInfo = $state<{ name?: string; id?: string; followers_count?: number } | null>(null);

	// Estado IA (real: pasarela Gemini vía /api/content-creator/meta/analyze)
	let aiGenerating = $state(false);
	let aiAnalyzed = $state(false);
	let aiError = $state<string | null>(null);
	let aiDiagnosis = $state('');
	let aiPautaRec = $state<Array<{ post: string; action: string; budget: string }>>([]);
	let aiTrends = $state<Array<{ topic: string; why: string; target: string }>>([]);

	const periodMs: Record<string, number> = {
		'7d': 7 * 24 * 60 * 60 * 1000,
		'30d': 30 * 24 * 60 * 60 * 1000,
		'90d': 90 * 24 * 60 * 60 * 1000,
		'all': Number.POSITIVE_INFINITY
	};

	const periodLabel: Record<string, string> = {
		'7d': 'Últimos 7 días',
		'30d': 'Últimos 30 días',
		'90d': 'Últimos 90 días',
		'all': 'Todo el histórico'
	};

	function fmt(n: number): string {
		return new Intl.NumberFormat('es-CR').format(n);
	}

	function fmtK(n: number): string {
		if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
		return String(n);
	}

	const filteredPosts = $derived.by(() => {
		if (selectedPeriod === 'all') return feedPosts;
		const cutoff = Date.now() - periodMs[selectedPeriod];
		return feedPosts.filter(p => new Date(p.created_time).getTime() >= cutoff);
	});

	const kpis = $derived.by(() => {
		const ps = filteredPosts;
		return {
			posts: ps.length,
			likes: ps.reduce((s, p) => s + p.likes, 0),
			comments: ps.reduce((s, p) => s + p.comments, 0),
			shares: ps.reduce((s, p) => s + p.shares, 0),
			engagement: ps.reduce((s, p) => s + p.engagement, 0),
			avg: ps.length > 0 ? Math.round(ps.reduce((s, p) => s + p.engagement, 0) / ps.length) : 0
		};
	});

	const topPosts = $derived.by(() => {
		return [...filteredPosts].sort((a, b) => b.engagement - a.engagement).slice(0, 5);
	});

	type DayPoint = { label: string; ts: number; engagement: number };
	const evolutionData = $derived.by<DayPoint[]>(() => {
		const ps = filteredPosts;
		if (ps.length === 0) return [];
		const byDay = new Map<string, number>();
		for (const p of ps) {
			const d = new Date(p.created_time);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
			byDay.set(key, (byDay.get(key) ?? 0) + p.engagement);
		}
		const points: DayPoint[] = Array.from(byDay.entries()).map(([k, eng]) => ({
			label: k,
			ts: new Date(k + 'T00:00:00').getTime(),
			engagement: eng
		}));
		points.sort((a, b) => a.ts - b.ts);
		return points;
	});

	const chartPath = $derived.by<{ line: string; area: string; max: number; labels: string[] }>(() => {
		const pts = evolutionData;
		if (pts.length === 0) return { line: '', area: '', max: 0, labels: [] };
		const max = Math.max(1, ...pts.map(p => p.engagement));
		const W = 400, H = 200, pad = 12;
		const innerW = W - pad * 2, innerH = H - pad * 2;
		const xStep = pts.length > 1 ? innerW / (pts.length - 1) : 0;
		const coords = pts.map((p, i) => {
			const x = pts.length === 1 ? W / 2 : pad + i * xStep;
			const y = pad + innerH - (p.engagement / max) * innerH;
			return { x, y };
		});
		const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
		const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${(pad + innerH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(pad + innerH).toFixed(1)} Z`;
		// Tomamos ~7 etiquetas distribuidas
		const step = Math.max(1, Math.floor(pts.length / 7));
		const labels = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map(p => dateLabel(p.ts));
		return { line, area, max, labels };
	});

	async function loadFeed() {
		isLoading = true;
		error = null;
		try {
			const qs = new URLSearchParams({ limit: '50' });
			if (cuentaId != null) qs.set('cuentaId', String(cuentaId));
			const res = await fetch(`/api/content-creator/meta/feed?${qs.toString()}`);
			const data = await res.json();
			if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
			feedPosts = data.posts as FeedPost[];
			if (feedPosts.length === 0) toast.info('Página de negocio conectada, sin publicaciones recientes.');
			else toast.success(`${feedPosts.length} publicaciones cargadas desde Meta Graph API.`);
		} catch (err: any) {
			error = (err?.message as string) || 'Error de conexión con Meta API';
			toast.error('No se pudieron cargar las métricas de Meta', { description: error || undefined });
		} finally {
			isLoading = false;
		}
	}

	async function loadPageInfo() {
		try {
			const url = cuentaId != null
				? `/api/content-creator/meta/status?cuentaId=${cuentaId}`
				: `/api/content-creator/meta/status`;
			const res = await fetch(url);
			const data = await res.json();
			if (data.success && data.page) pageInfo = data.page;
			else if (data.success && Array.isArray(data.accounts)) {
				const def = data.accounts.find((a: any) => a.id === data.default);
				if (def) pageInfo = { name: def.nombre, id: def.meta_facebook_page_id, followers_count: undefined };
			}
		} catch { /* silencioso */ }
	}

	onMount(() => {
		// La carga real la dispara el $effect de abajo cuando haya cuentaId.
		// Si entra sin cuenta conectada, mostramos estado vacío.
		if (cuentaId != null) {
			loadPageInfo();
			loadFeed();
		}
	});

	// Recargar cuando cambia la cuenta seleccionada (selector multi-cuenta)
	$effect(() => {
		if (cuentaId != null) {
			loadPageInfo();
			loadFeed();
		} else {
			// Sin cuenta seleccionada: limpiar estado
			feedPosts = [];
			pageInfo = null;
			error = null;
		}
	});

	async function analyzeWithGemini() {
		if (kpis.posts === 0) {
			toast.error('No hay publicaciones en el período seleccionado para analizar.');
			return;
		}
		aiGenerating = true;
		aiAnalyzed = false;
		aiError = null;
		try {
			const res = await fetch('/api/content-creator/meta/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					posts: filteredPosts.map(p => ({
						message: p.message,
						created_time: p.created_time,
						likes: p.likes,
						comments: p.comments,
						shares: p.shares,
						engagement: p.engagement
					})),
					pageInfo: pageInfo ? { name: pageInfo.name, followers_count: pageInfo.followers_count } : null,
					periodLabel: periodLabel[selectedPeriod]
				})
			});
			const data = await res.json();
			if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
			aiDiagnosis = data.diagnostico || '';
			aiPautaRec = data.sugerencias_pauta || [];
			aiTrends = data.topicos || [];
			aiAnalyzed = true;
			toast.success('Análisis de Gemini AI generado con éxito.');
		} catch (err: any) {
			aiError = (err?.message as string) || 'Error de conexión con la pasarela IA';
			aiAnalyzed = false;
			toast.error('El análisis IA falló', { description: aiError || undefined });
		} finally {
			aiGenerating = false;
		}
	}

	function preview(msg: string, n = 70): string {
		if (!msg) return '(sin texto)';
		return msg.length > n ? msg.slice(0, n).replace(/\s+\S*$/, '') + '…' : msg;
	}

	function dateLabel(ts: number): string {
		const d = new Date(ts);
		return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short' });
	}

	function timeAgo(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const hrs = Math.floor(diff / 3600000);
		if (hrs < 1) return 'hace minutos';
		if (hrs < 24) return `hace ${hrs}h`;
		const days = Math.floor(hrs / 24);
		if (days < 30) return `hace ${days}d`;
		const months = Math.floor(days / 30);
		return `hace ${months}m`;
	}
</script>

<div class="space-y-6">
	<!-- Cabecera -->
	<div class="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D1E3D]">
				<TrendingUp class="h-5.5 w-5.5 text-white" />
			</div>
			<div>
				<h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
					Métricas de Meta (API Connect)
					{#if pageInfo?.name}
						<Badge class="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-none text-[10px] font-bold">
							{pageInfo.name}
						</Badge>
					{/if}
				</h2>
				<p class="text-xs text-muted-foreground font-medium">
					{#if pageInfo?.followers_count != null}
						{fmt(pageInfo.followers_count)} seguidores ·
					{/if}
					Métricas orgánicas reales del feed (likes / comentarios / compartidos)
				</p>
			</div>
		</div>

		<div class="flex flex-wrap gap-2 items-center">
			<select
				bind:value={selectedPeriod}
				class="rounded-md border bg-background px-3 py-1.5 text-xs font-semibold outline-none focus:border-[#0D1E3D]"
			>
				<option value="7d">Últimos 7 días</option>
				<option value="30d">Últimos 30 días</option>
				<option value="90d">Últimos 90 días</option>
				<option value="all">Todo el histórico</option>
			</select>

			<Button
				class="bg-[#0D1E3D] text-white hover:bg-[#0D1E3D]/90 font-bold text-xs"
				onclick={loadFeed}
				disabled={isLoading}
			>
				{#if isLoading}
					<span class="animate-spin mr-1">🌀</span> Cargando...
				{:else}
					<RefreshCw class="h-3.5 w-3.5 mr-1.5" />
					Refrescar
				{/if}
			</Button>
		</div>
	</div>

	<!-- Banner informativo: Reach / CTR pendientes de Marketing API -->
	<div class="rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/10">
		<div class="flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
			<Lock class="h-4 w-4 mt-0.5 shrink-0" />
			<div>
				<span class="font-bold">Reach / Impresiones / CTR / CPC</span> requieren la
				<a href="https://developers.facebook.com/docs/marketing-api/insights" target="_blank" class="font-bold underline">
					Marketing API de Meta <ExternalLink class="h-3 w-3 inline-block" />
				</a>
				(scopes <code class="font-mono">ads_read</code>/<code class="font-mono">ads_management</code> + Ad Account ID).
				Trámite pendiente de aprobación. Mientras tanto, las métricas mostradas provienen del
				<code class="font-mono">Page Feed</code> y reflejan interacciones orgánicas reales.
			</div>
		</div>
	</div>

	{#if cuentaId == null}
		<!-- Sin cuenta seleccionada -->
		<Card.Root class="border-dashed">
			<Card.Content class="p-10 flex flex-col items-center text-center">
				<AlertCircle class="h-9 w-9 text-slate-400 mb-2" />
				<h3 class="text-sm font-bold text-slate-700 dark:text-slate-300">No hay cuenta Meta seleccionada</h3>
				<p class="text-xs text-muted-foreground mt-1 max-w-sm">
					Seleccioná una cuenta conectada en el selector de la barra lateral para ver sus métricas reales del feed.
				</p>
			</Card.Content>
		</Card.Root>
	{:else if error}
		<!-- Estado de error -->
		<Card.Root class="border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/10">
			<Card.Content class="p-8 flex flex-col items-center text-center">
				<AlertCircle class="h-9 w-9 text-rose-500 mb-2" />
				<h3 class="text-sm font-bold text-rose-700 dark:text-rose-300">No se pudo conectar con Meta API</h3>
				<p class="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1 max-w-md">{error}</p>
				<p class="text-[11px] text-muted-foreground mt-3">
					Verificá que la cuenta seleccionada tenga <code class="font-mono">meta_facebook_page_id</code> y
					<code class="font-mono">meta_access_token</code> válidos. Si el token expiró, refrescalo desde el selector de cuentas.
				</p>
				<Button class="mt-4 bg-[#0D1E3D] text-white hover:bg-[#0D1E3D]/90 font-bold text-xs" onclick={loadFeed} disabled={isLoading}>
					<RefreshCw class="h-3.5 w-3.5 mr-1.5" /> Reintentar
				</Button>
			</Card.Content>
		</Card.Root>
	{:else if isLoading && feedPosts.length === 0}
		<!-- Skeleton -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each Array(4) as _}
				<div class="rounded-xl border bg-card p-5 animate-pulse" style="height:110px"></div>
			{/each}
		</div>
		<div class="rounded-xl border bg-card p-5 animate-pulse" style="height:280px"></div>
	{:else if feedPosts.length === 0}
		<!-- Vacío -->
		<Card.Root class="border-dashed">
			<Card.Content class="p-10 flex flex-col items-center text-center">
				<ImageOff class="h-9 w-9 text-slate-400 mb-2" />
				<h3 class="text-sm font-bold text-slate-700 dark:text-slate-300">Sin publicaciones recientes</h3>
				<p class="text-xs text-muted-foreground mt-1 max-w-sm">
					La página de negocio conectada no tiene publicaciones en el feed. Publicá algo desde el cronograma y volvé a refrescar.
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- KPIs reales -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card.Root class="border-slate-200 bg-card shadow-sm dark:border-slate-800">
				<Card.Content class="p-5 flex items-start justify-between">
					<div class="space-y-1">
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
							<TrendingUp class="h-3.5 w-3.5 text-slate-400" />
							Publicaciones
						</p>
						<h4 class="text-2xl font-bold text-slate-950 dark:text-white mt-1">{fmt(kpis.posts)}</h4>
						<span class="inline-block text-[9px] font-bold text-slate-400 mt-1">{periodLabel[selectedPeriod]}</span>
					</div>
					<svg class="w-16 h-8 text-slate-400 overflow-visible shrink-0 mt-1" viewBox="0 0 100 50">
						<path d="M 0 30 L 25 25 L 50 28 L 75 20 L 100 22" fill="none" stroke="currentColor" stroke-width="2.5"></path>
					</svg>
				</Card.Content>
			</Card.Root>

			<Card.Root class="border-slate-200 bg-card shadow-sm dark:border-slate-800">
				<Card.Content class="p-5 flex items-start justify-between">
					<div class="space-y-1">
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
							<Heart class="h-3.5 w-3.5 text-rose-400" />
							Me gusta
						</p>
						<h4 class="text-2xl font-bold text-slate-950 dark:text-white mt-1">{fmt(kpis.likes)}</h4>
						<span class="inline-block text-[9px] font-bold text-rose-500 mt-1">total acumulado</span>
					</div>
					<svg class="w-16 h-8 text-rose-400 overflow-visible shrink-0 mt-1" viewBox="0 0 100 50">
						<path d="M 0 40 Q 25 15, 50 30 T 100 8" fill="none" stroke="currentColor" stroke-width="2.5"></path>
					</svg>
				</Card.Content>
			</Card.Root>

			<Card.Root class="border-slate-200 bg-card shadow-sm dark:border-slate-800">
				<Card.Content class="p-5 flex items-start justify-between">
					<div class="space-y-1">
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
							<MessageCircle class="h-3.5 w-3.5 text-blue-400" />
							Comentarios
						</p>
						<h4 class="text-2xl font-bold text-slate-950 dark:text-white mt-1">{fmt(kpis.comments)}</h4>
						<span class="inline-block text-[9px] font-bold text-blue-500 mt-1">total acumulado</span>
					</div>
					<svg class="w-16 h-8 text-blue-400 overflow-visible shrink-0 mt-1" viewBox="0 0 100 50">
						<path d="M 0 42 Q 15 30, 45 40 T 90 15 T 100 8" fill="none" stroke="currentColor" stroke-width="2.5"></path>
					</svg>
				</Card.Content>
			</Card.Root>

			<Card.Root class="border-slate-200 bg-card shadow-sm dark:border-slate-800">
				<Card.Content class="p-5 flex items-start justify-between">
					<div class="space-y-1">
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
							<Share2 class="h-3.5 w-3.5 text-emerald-400" />
							Compartidos
						</p>
						<h4 class="text-2xl font-bold text-slate-950 dark:text-white mt-1">{fmt(kpis.shares)}</h4>
						<span class="inline-block text-[9px] font-bold text-emerald-500 mt-1">Eng total: {fmtK(kpis.engagement)} · {kpis.avg}/post</span>
					</div>
					<svg class="w-16 h-8 text-emerald-400 overflow-visible shrink-0 mt-1" viewBox="0 0 100 50">
						<path d="M 0 48 Q 30 40, 60 20 T 100 5" fill="none" stroke="currentColor" stroke-width="2.5"></path>
					</svg>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Gráficos y top posts -->
		<div class="grid gap-6 md:grid-cols-[1.3fr_0.7fr]">
			<!-- Evolución real -->
			<Card.Root class="border-slate-200 bg-card p-5 dark:border-slate-800">
				<h3 class="text-sm font-bold text-slate-900 dark:text-white mb-1">
					Evolución de Engagement Diario
				</h3>
				<p class="text-[11px] text-muted-foreground mb-4">Suma de likes + comentarios + compartidos por día · {periodLabel[selectedPeriod]}</p>

				{#if evolutionData.length === 0}
					<div class="flex items-center justify-center h-64 text-xs text-muted-foreground">Sin datos suficientes para graficar.</div>
				{:else}
					<div class="relative w-full h-64 border-l border-b border-slate-100 dark:border-slate-800 flex items-end justify-between px-4 pb-2">
						<svg class="absolute inset-0 w-full h-full text-slate-200 dark:text-slate-800 pointer-events-none" viewBox="0 0 400 200">
							<line x1="0" y1="50" x2="400" y2="50" stroke="currentColor" stroke-dasharray="4" stroke-width="1"></line>
							<line x1="0" y1="100" x2="400" y2="100" stroke="currentColor" stroke-dasharray="4" stroke-width="1"></line>
							<line x1="0" y1="150" x2="400" y2="150" stroke="currentColor" stroke-dasharray="4" stroke-width="1"></line>
						</svg>
						<svg class="absolute inset-0 w-full h-full text-indigo-600 dark:text-blue-500" viewBox="0 0 400 200" preserveAspectRatio="none">
							<defs>
								<linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stop-color="currentColor" stop-opacity="0.3"></stop>
									<stop offset="100%" stop-color="currentColor" stop-opacity="0"></stop>
								</linearGradient>
							</defs>
							<path d={chartPath.area} fill="url(#areaGrad)"></path>
							<path d={chartPath.line} fill="none" stroke="currentColor" stroke-width="3"></path>
						</svg>
						<div class="absolute bottom-[-24px] left-0 right-0 flex justify-between text-[10px] text-slate-400 px-4">
							{#each chartPath.labels as label}
								<span>{label}</span>
							{/each}
						</div>
						<span class="absolute top-1 right-2 text-[10px] font-bold text-slate-500">Pico: {fmt(chartPath.max)}</span>
					</div>
				{/if}
			</Card.Root>

			<!-- Mejores contenidos reales -->
			<Card.Root class="border-slate-200 bg-card p-5 dark:border-slate-800 flex flex-col justify-between">
				<div>
					<h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
						<Award class="h-4.5 w-4.5 text-amber-500" />
						Mejores Contenidos
					</h3>
					<p class="text-[11px] text-slate-500 mb-4 dark:text-slate-400">Top posts por engagement real.</p>

					<div class="space-y-3">
						{#each topPosts as post, i (post.id)}
							<a
								href={post.permalink_url || '#'}
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors group"
							>
								<div class="h-10 w-10 rounded-lg bg-[#0D1E3D]/10 flex items-center justify-center text-xs font-bold text-[#0D1E3D] dark:bg-[#0D1E3D]/20 shrink-0">
									#{i + 1}
								</div>
								<div class="min-w-0 flex-1">
									<h5 class="text-xs font-bold text-slate-900 line-clamp-1 dark:text-slate-100 group-hover:text-[#0D1E3D]">
										{preview(post.message, 50)}
									</h5>
									<div class="flex gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
										<span>{timeAgo(post.created_time)}</span>
										<span>·</span>
										<Heart class="h-2.5 w-2.5" /> {fmtK(post.likes)}
										<MessageCircle class="h-2.5 w-2.5" /> {fmtK(post.comments)}
										<Share2 class="h-2.5 w-2.5" /> {fmtK(post.shares)}
									</div>
								</div>
								<div class="text-right shrink-0">
									<p class="text-xs font-bold text-slate-800 dark:text-slate-200">{fmtK(post.engagement)}</p>
									<p class="text-[10px] text-emerald-600 font-bold">eng</p>
								</div>
							</a>
						{/each}
					</div>
				</div>

				<div class="border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 text-center">
					<p class="text-[10px] text-muted-foreground">
						Click en cada post para verlo en Facebook <ExternalLink class="h-3 w-3 inline-block" />
					</p>
				</div>
			</Card.Root>
		</div>

		<!-- Asistente IA sobre métricas reales -->
		<Card.Root class="border-indigo-200/60 bg-gradient-to-r from-blue-50/30 to-indigo-50/30 dark:from-blue-950/5 dark:to-indigo-950/5 dark:border-blue-900/40 p-5 shadow-sm">
			<div class="flex flex-wrap items-center justify-between border-b pb-4 gap-4">
				<div class="flex items-center gap-3">
					<div class="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
						<Sparkles class="h-5.5 w-5.5 text-white animate-pulse" />
					</div>
					<div>
						<h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
							Asistente de Optimización (Gemini AI)
						</h3>
						<p class="text-xs text-muted-foreground font-medium">Diagnóstico sobre métricas reales de {fmt(kpis.posts)} posts en {periodLabel[selectedPeriod]}</p>
					</div>
				</div>

				<Button
					class="bg-gradient-to-r from-[#0D1E3D] to-indigo-700 hover:from-[#0D1E3D]/90 hover:to-indigo-700/90 text-white font-bold shadow-sm"
					onclick={analyzeWithGemini}
					disabled={aiGenerating || kpis.posts === 0}
				>
					{#if aiGenerating}
						<span class="animate-spin mr-1">🌀</span> Analizando Métricas...
					{:else}
						<Sparkles class="h-4 w-4 mr-1.5" />
						Analizar con Gemini AI
					{/if}
				</Button>
			</div>

			{#if aiGenerating}
			<!-- Loading state: auditoría IA en curso -->
			<div class="flex flex-col items-center justify-center text-center py-10 bg-card rounded-xl border border-dashed border-indigo-200 mt-5 dark:border-blue-900/40">
				<Sparkles class="h-9 w-9 text-indigo-400 animate-pulse mb-2.5" />
				<p class="text-xs font-semibold text-slate-700 dark:text-slate-300">Analizando {fmt(kpis.posts)} publicaciones con Gemini AI…</p>
				<p class="text-[10px] text-muted-foreground max-w-sm mt-1">
					Se envían los KPIs reales del feed (likes, comentarios, compartidos y top posts) a la pasarela de Gemini para generar el diagnóstico.
				</p>
			</div>
		{:else if aiError}
			<!-- Error state -->
			<div class="flex flex-col items-center justify-center text-center py-10 bg-rose-50/40 rounded-xl border border-rose-200 border-dashed mt-5 dark:bg-rose-950/10 dark:border-rose-900/40">
				<AlertCircle class="h-9 w-9 text-rose-500 mb-2" />
				<p class="text-xs font-semibold text-rose-700 dark:text-rose-300">No se pudo completar el análisis IA</p>
				<p class="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-1 max-w-md">{aiError}</p>
				<div class="flex gap-2 mt-4">
					<Button class="bg-[#0D1E3D] text-white hover:bg-[#0D1E3D]/90 font-bold text-xs" onclick={analyzeWithGemini} disabled={aiGenerating}>
						<RefreshCw class="h-3.5 w-3.5 mr-1.5" /> Reintentar análisis
					</Button>
				</div>
			</div>
		{:else if aiAnalyzed}
				<div class="grid gap-6 md:grid-cols-[1.2fr_0.9fr_0.9fr] pt-5 text-xs animate-fade-in">
					<div class="space-y-3">
						<span class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-blue-400 block border-b pb-1">Diagnóstico de Rendimiento</span>
						<div class="bg-card border rounded-xl p-4 leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300 shadow-inner">
							{aiDiagnosis}
						</div>
					</div>
					<div class="space-y-3">
						<span class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-blue-400 block border-b pb-1">Optimización de Pauta Meta Ads</span>
						<div class="space-y-3">
							{#each aiPautaRec as rec}
								<div class="rounded-xl border bg-card p-3 shadow-sm flex flex-col justify-between gap-2 border-l-4 border-l-emerald-500">
									<div>
										<h5 class="font-bold text-slate-800 dark:text-slate-200 truncate">{rec.post}</h5>
										<p class="text-slate-500 mt-1 leading-snug">{rec.action}</p>
									</div>
									<div class="flex items-center gap-1.5 mt-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded w-fit">
										<span>Ajuste: {rec.budget}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
					<div class="space-y-3">
						<span class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-blue-400 block border-b pb-1">Próximos Tópicos (Predictivo)</span>
						<div class="space-y-3">
							{#each aiTrends as trend}
								<div class="rounded-xl border bg-card p-3 shadow-sm flex flex-col justify-between gap-2 border-l-4 border-l-indigo-500">
									<div>
										<h5 class="font-bold text-slate-800 dark:text-slate-200 leading-snug">{trend.topic}</h5>
										<p class="text-slate-500 mt-1 leading-snug"><span class="font-semibold text-slate-600 dark:text-slate-400">Por qué:</span> {trend.why}</p>
									</div>
									<div class="flex items-center gap-1.5 mt-1 text-[10px] font-extrabold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-1 rounded w-fit">
										<Lightbulb class="h-3.5 w-3.5" />
										<span>Público: {trend.target}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{:else}
				<div class="flex flex-col items-center justify-center text-center py-10 bg-card rounded-xl border border-dashed border-slate-200 mt-5 dark:border-slate-800">
					<Sparkles class="h-9 w-9 text-indigo-400 animate-pulse mb-2.5" />
					<p class="text-xs font-semibold text-slate-700 dark:text-slate-300">Auditoría de IA Pendiente</p>
					<p class="text-[10px] text-muted-foreground max-w-sm mt-1">
						Presiona "Analizar con Gemini AI" para generar un diagnóstico basado en las métricas reales recién cargadas del feed de Meta.
					</p>
				</div>
			{/if}
		</Card.Root>
	{/if}
</div>
