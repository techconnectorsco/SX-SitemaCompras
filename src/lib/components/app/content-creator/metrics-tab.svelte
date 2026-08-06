<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { 
		TrendingUp, 
		Facebook, 
		Instagram, 
		Users, 
		MousePointerClick, 
		Heart, 
		Award,
		Sparkles,
		RefreshCw,
		AlertCircle,
		Coins,
		Lightbulb
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	// Props
	let { posts = $bindable(), catalogos } = $props<{ posts: any[], catalogos: any }>();

	let selectedBrand = $state<string>('Todas');
	let selectedMonth = $state<string>('Abril 2026');

	// Estados de IA
	let aiGenerating = $state(false);
	let aiAnalyzed = $state(false);
	let aiDiagnosis = $state('');
	let aiPautaRec = $state<Array<{ post: string; action: string; budget: string }>>([]);
	let aiTrends = $state<Array<{ topic: string; why: string; target: string }>>([]);

	// Datos de métricas simulados por marca del portafolio real
	const metricsData: Record<string, { reach: string; reachDiff: string; imp: string; impDiff: string; eng: string; engDiff: string; ctr: string; ctrDiff: string }> = {
		'Todas': { reach: '185,420', reachDiff: '+16.5%', imp: '512,900', impDiff: '+11.2%', eng: '24,340', engDiff: '+28.4%', ctr: '3.62%', ctrDiff: '+0.34%' },
		'Toyama': { reach: '72,100', reachDiff: '+20.3%', imp: '210,500', impDiff: '+14.5%', eng: '11,210', engDiff: '+32.1%', ctr: '3.75%', ctrDiff: '+0.52%' },
		'Husqvarna': { reach: '68,200', reachDiff: '+18.1%', imp: '198,000', impDiff: '+12.3%', eng: '10,900', engDiff: '+25.1%', ctr: '3.80%', ctrDiff: '+0.42%' },
		'Oregon': { reach: '18,400', reachDiff: '+6.2%', imp: '48,000', impDiff: '+4.5%', eng: '1,250', engDiff: '+9.2%', ctr: '2.85%', ctrDiff: '-0.15%' },
		'Penagos': { reach: '12,300', reachDiff: '+3.1%', imp: '28,400', impDiff: '+2.8%', eng: '620', engDiff: '+4.1%', ctr: '2.40%', ctrDiff: '+0.05%' },
		'GTM': { reach: '9,120', reachDiff: '+1.5%', imp: '18,500', impDiff: '+0.9%', eng: '240', engDiff: '+1.8%', ctr: '2.10%', ctrDiff: '-0.08%' },
		'Imacasa': { reach: '4,100', reachDiff: '+0.5%', imp: '7,200', impDiff: '+0.4%', eng: '90', engDiff: '+0.2%', ctr: '1.95%', ctrDiff: '+0.01%' },
		'Norwood': { reach: '1,200', reachDiff: '+12.5%', imp: '2,300', impDiff: '+10.2%', eng: '30', engDiff: '+15.4%', ctr: '3.10%', ctrDiff: '+0.25%' }
	};

	const bestPosts = $derived.by(() => {
		const all = [
			{ id: 1, title: 'Toyama Ahoyadora: Perforación Fácil', brand: 'Toyama', network: 'Instagram', reach: '28,200', engagement: '10.5%', image: '🚜' },
			{ id: 2, title: 'La Husqvarna 125BVX: Sopladora Pro', brand: 'Husqvarna', network: 'Instagram', reach: '24,500', engagement: '9.2%', image: '🪚' },
			{ id: 3, title: 'Chipper GTM GTS600: Tritura tus Podas', brand: 'GTM', network: 'Facebook', reach: '12,100', engagement: '8.4%', image: '🌿' },
			{ id: 4, title: 'Atomizadora Oregon: Cuida tus Cultivos', brand: 'Oregon', network: 'Instagram', reach: '9,400', engagement: '5.2%', image: '🌾' }
		];

		if (selectedBrand === 'Todas') return all.slice(0, 3);
		return all.filter(p => p.brand === selectedBrand).slice(0, 3);
	});

	const activeMetrics = $derived(metricsData[selectedBrand] || metricsData['Todas']);

	// Simular auditoría IA de Gemini sobre la Meta Insights API
	function analyzeWithGemini() {
		aiGenerating = true;
		aiAnalyzed = false;

		setTimeout(() => {
			aiGenerating = false;
			aiAnalyzed = true;
			const b = selectedBrand;

			if (b === 'Husqvarna' || b === 'Todas') {
				aiDiagnosis = `Análisis de rendimiento de la Meta API para Husqvarna:\n\n1. Los Reels cortos muestran un tiempo promedio de reproducción de 4.2 segundos (22% superior a fotos). El CTR de la pieza "La Husqvarna 125BVX" alcanzó un pico de 3.80% impulsado por el copy de oportunidad generado por la IA.\n2. La pauta publicitaria asignada los fines de semana genera un CPM de ¢820, siendo un 12% más eficiente en conversiones a WhatsApp que la de lunes a viernes.\n3. Se observa un volumen inusual de comentarios preguntando por talleres autorizados y garantía.`;
				aiPautaRec = [
					{ post: 'Video Reel: Husqvarna 122HD60', action: 'Reasignar ¢5,000 de pauta de historias a este Reel', budget: '+¢5,000' },
					{ post: 'Carrusel: Repuestos Originales', action: 'Segmentar pauta exclusivamente a dueños de fincas', budget: '¢0 (Optimización)' }
				];
				aiTrends = [
					{ topic: 'Motosierra Husqvarna 585: Mantenimiento pro', why: 'Búsqueda de preparación de leña al alza este mes en Costa Rica', target: 'Zonas rurales / Madereros' },
					{ topic: 'Sopladoras: Limpieza de canaletas fluviales', why: 'Consultas de usuarios disparadas por lluvias recientes', target: 'Hogares urbanos' }
				];
			} else if (b === 'Toyama') {
				aiDiagnosis = `Análisis de rendimiento de la Meta API para Toyama:\n\n1. La "Toyama Ahoyadora" tuvo una alta tracción orgánica en Facebook debido a compartidos en grupos ganaderos de la Zona Norte.\n2. El CTA 'Cotizar por WhatsApp' muestra un 34% mayor tasa de contacto final que 'Enviar mensaje' directo en Instagram.\n3. Los carruseles técnicos están logrando que los usuarios los guarden más veces en comparación con piezas promocionales directas de precio.`;
				aiPautaRec = [
					{ post: 'Carrusel: Multifuncional TBC26MTX', action: 'Activar pauta de mensajes con geolocalización', budget: '¢7,500' },
					{ post: 'Sopladora TVB26-GII Toyama', action: 'Reducir presupuesto pautado por bajo CTR', budget: '-¢2,500' }
				];
				aiTrends = [
					{ topic: 'Motocultivador TF338: Labranza rápida', why: 'Interés detectado en posts sobre siembra y arado de suelos', target: 'Agricultores' },
					{ topic: 'Desbrozadora TBC26H: Limpieza de linderos', why: 'Consultas activas por repuestos de cabezal de Toyama', target: 'Mantenimiento' }
				];
			} else {
				aiDiagnosis = `Análisis general de rendimiento de la Meta API consolidada:\n\n1. Registramos un incremento global de interacciones de +28.4%, impulsado por piezas planificadas a mitad de semana.\n2. Recomendamos priorizar formatos carrusel con precio y CTA directo de cotización, ya que las conversiones a venta directa por chat crecieron un 18%.\n3. La pauta de presupuesto rinde más los primeros 15 días del mes por menor saturación publicitaria de competidores.`;
				aiPautaRec = [
					{ post: 'Pauta general del mes', action: 'Concentrar pauta de mensajes en fines de semana', budget: '¢15,000 (Ajuste)' }
				];
				aiTrends = [
					{ topic: 'Uso seguro de maquinaria agrícola', why: 'Consultas de soporte posventa recurrentes en comentarios', target: 'Público general' }
				];
			}
			toast.success('¡Diagnóstico de rendimiento generado con éxito por Gemini AI!');
		}, 1500);
	}
</script>

<div class="space-y-6">
	<!-- Cabecera de Filtros -->
	<div class="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#253166]">
				<TrendingUp class="h-5.5 w-5.5 text-white" />
			</div>
			<div>
				<h2 class="text-base font-bold text-slate-900 dark:text-white">Métricas de Meta (API Connect)</h2>
				<p class="text-xs text-muted-foreground font-medium">Estadísticas de rendimiento consolidado y optimización de pauta Meta Ads</p>
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<select 
				bind:value={selectedBrand}
				class="rounded-md border bg-background px-3 py-1.5 text-xs font-semibold outline-none focus:border-[#253166]"
			>
				<option value="Todas">Todas las marcas</option>
				{#each catalogos.marcas as marca}
					<option value={marca.nombre}>{marca.nombre}</option>
				{/each}
			</select>

			<select 
				bind:value={selectedMonth}
				class="rounded-md border bg-background px-3 py-1.5 text-xs font-semibold outline-none focus:border-[#253166]"
			>
				<option value="Abril 2026">Abril 2026</option>
				<option value="Mayo 2026">Mayo 2026</option>
				<option value="Junio 2026">Junio 2026</option>
			</select>
		</div>
	</div>

	<!-- Tarjetas de KPIs (Meta Insights) -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card.Root class="border-slate-200 bg-card shadow-sm dark:border-slate-800">
			<Card.Content class="p-5 flex items-start justify-between">
				<div class="space-y-1">
					<p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
						<Users class="h-3.5 w-3.5 text-slate-400" />
						Alcance (Reach)
					</p>
					<h4 class="text-2xl font-bold text-slate-950 dark:text-white mt-1">{activeMetrics.reach}</h4>
					<span class="inline-block text-[9px] font-bold text-emerald-600 mt-1">
						{activeMetrics.reachDiff} vs mes anterior
					</span>
				</div>
				<!-- SVG Sparkline miniatura -->
				<svg class="w-16 h-8 text-emerald-500 overflow-visible shrink-0 mt-1" viewBox="0 0 100 50">
					<path d="M 0 45 Q 20 20, 40 35 T 80 10 T 100 5" fill="none" stroke="currentColor" stroke-width="2.5"></path>
				</svg>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-slate-200 bg-card shadow-sm dark:border-slate-800">
			<Card.Content class="p-5 flex items-start justify-between">
				<div class="space-y-1">
					<p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
						<TrendingUp class="h-3.5 w-3.5 text-slate-400" />
						Impresiones
					</p>
					<h4 class="text-2xl font-bold text-slate-950 dark:text-white mt-1">{activeMetrics.imp}</h4>
					<span class="inline-block text-[9px] font-bold text-emerald-600 mt-1">
						{activeMetrics.impDiff} vs mes anterior
					</span>
				</div>
				<svg class="w-16 h-8 text-blue-500 overflow-visible shrink-0 mt-1" viewBox="0 0 100 50">
					<path d="M 0 38 Q 25 15, 50 30 T 100 8" fill="none" stroke="currentColor" stroke-width="2.5"></path>
				</svg>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-slate-200 bg-card shadow-sm dark:border-slate-800">
			<Card.Content class="p-5 flex items-start justify-between">
				<div class="space-y-1">
					<p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
						<Heart class="h-3.5 w-3.5 text-slate-400" />
						Interacciones
					</p>
					<h4 class="text-2xl font-bold text-slate-950 dark:text-white mt-1">{activeMetrics.eng}</h4>
					<span class="inline-block text-[9px] font-bold text-emerald-600 mt-1">
						{activeMetrics.engDiff} vs mes anterior
					</span>
				</div>
				<svg class="w-16 h-8 text-orange-500 overflow-visible shrink-0 mt-1" viewBox="0 0 100 50">
					<path d="M 0 42 Q 15 30, 45 40 T 90 15 T 100 8" fill="none" stroke="currentColor" stroke-width="2.5"></path>
				</svg>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-slate-200 bg-card shadow-sm dark:border-slate-800">
			<Card.Content class="p-5 flex items-start justify-between">
				<div class="space-y-1">
					<p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
						<MousePointerClick class="h-3.5 w-3.5 text-slate-400" />
						Click Rate (CTR)
					</p>
					<h4 class="text-2xl font-bold text-slate-950 dark:text-white mt-1">{activeMetrics.ctr}</h4>
					<span class="inline-block text-[9px] font-bold text-emerald-600 mt-1">
						{activeMetrics.ctrDiff} vs mes anterior
					</span>
				</div>
				<svg class="w-16 h-8 text-purple-500 overflow-visible shrink-0 mt-1" viewBox="0 0 100 50">
					<path d="M 0 48 Q 30 40, 60 20 T 100 5" fill="none" stroke="currentColor" stroke-width="2.5"></path>
				</svg>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Gráficos de evolución y mejores contenidos -->
	<div class="grid gap-6 md:grid-cols-[1.3fr_0.7fr]">
		<!-- Gráfico de tendencia mensual -->
		<Card.Root class="border-slate-200 bg-card p-5 dark:border-slate-800">
			<h3 class="text-sm font-bold text-slate-900 dark:text-white mb-4">
				Evolución de Alcance Diario (Meta Ads + Orgánico)
			</h3>
			
			<div class="relative w-full h-64 border-l border-b border-slate-100 dark:border-slate-800 flex items-end justify-between px-4 pb-2">
				<!-- Simulación de líneas de cuadrícula y barras SVG -->
				<svg class="absolute inset-0 w-full h-full text-slate-200 dark:text-slate-800 pointer-events-none" viewBox="0 0 400 200">
					<!-- Líneas horizontales -->
					<line x1="0" y1="50" x2="400" y2="50" stroke="currentColor" stroke-dasharray="4" stroke-width="1"></line>
					<line x1="0" y1="100" x2="400" y2="100" stroke="currentColor" stroke-dasharray="4" stroke-width="1"></line>
					<line x1="0" y1="150" x2="400" y2="150" stroke="currentColor" stroke-dasharray="4" stroke-width="1"></line>
				</svg>

				<!-- Barras o líneas del gráfico SVG -->
				<svg class="absolute inset-0 w-full h-full text-indigo-600 dark:text-blue-500" viewBox="0 0 400 200" preserveAspectRatio="none">
					<!-- Área de gradiente de alcance -->
					<defs>
						<linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="currentColor" stop-opacity="0.3"></stop>
							<stop offset="100%" stop-color="currentColor" stop-opacity="0"></stop>
						</linearGradient>
					</defs>
					<path d="M 0 180 L 50 140 L 100 150 L 150 90 L 200 110 L 250 60 L 300 80 L 350 40 L 400 20 L 400 200 L 0 200 Z" fill="url(#areaGrad)"></path>
					<path d="M 0 180 L 50 140 L 100 150 L 150 90 L 200 110 L 250 60 L 300 80 L 350 40 L 400 20" fill="none" stroke="currentColor" stroke-width="3"></path>
				</svg>

				<!-- Etiquetas del eje X -->
				<div class="absolute bottom-[-24px] left-0 right-0 flex justify-between text-[10px] text-slate-400 px-4">
					<span>Día 1</span>
					<span>Día 5</span>
					<span>Día 10</span>
					<span>Día 15</span>
					<span>Día 20</span>
					<span>Día 25</span>
					<span>Día 30</span>
				</div>
			</div>
		</Card.Root>

		<!-- Mejores publicaciones -->
		<Card.Root class="border-slate-200 bg-card p-5 dark:border-slate-800 flex flex-col justify-between">
			<div>
				<h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
					<Award class="h-4.5 w-4.5 text-amber-500" />
					Mejores Contenidos
				</h3>
				<p class="text-[11px] text-slate-500 mb-4 dark:text-slate-400">Top posts con mayor retención.</p>

				<div class="space-y-3">
					{#each bestPosts as post (post.id)}
						<div class="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
							<div class="h-10 w-10 rounded-lg bg-[#253166]/10 flex items-center justify-center text-lg shadow-inner shrink-0 dark:bg-[#253166]/20">
								{post.image}
							</div>
							<div class="min-w-0 flex-1">
								<h5 class="text-xs font-bold text-slate-900 line-clamp-1 dark:text-slate-100">
									{post.title}
								</h5>
								<div class="flex gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
									<span>{post.brand}</span>
									<span>·</span>
									<span>{post.network}</span>
								</div>
							</div>
							<div class="text-right shrink-0">
								<p class="text-xs font-bold text-slate-800 dark:text-slate-200">{post.reach}</p>
								<p class="text-[10px] text-emerald-600 font-bold">{post.engagement} Eng</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 text-center">
				<button 
					type="button"
					class="text-xs font-bold text-[#253166] dark:text-blue-400 hover:underline"
					onclick={() => toast.success('Reporte exportado con éxito en formato PDF')}
				>
					Exportar Reporte Mensual (PDF) →
				</button>
			</div>
		</Card.Root>
	</div>

	<!-- SECCIÓN NUEVA: Asistente de Marketing e Insights IA (Gemini) -->
	<Card.Root class="border-indigo-200/60 bg-gradient-to-r from-blue-50/30 to-indigo-50/30 dark:from-blue-950/5 dark:to-indigo-950/5 dark:border-blue-900/40 p-5 shadow-sm">
		<div class="flex flex-wrap items-center justify-between border-b pb-4 gap-4">
			<div class="flex items-center gap-3">
				<div class="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
					<Sparkles class="h-5.5 w-5.5 text-white animate-pulse" />
				</div>
				<div>
					<h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
						Asistente de Optimización de Marketing (Gemini AI)
					</h3>
					<p class="text-xs text-muted-foreground font-medium">Auditoría inteligente de Meta Ads y sugerencias predictivas de pauta semanal</p>
				</div>
			</div>

			<Button 
				class="bg-gradient-to-r from-[#253166] to-indigo-700 hover:from-[#253166]/90 hover:to-indigo-700/90 text-white font-bold shadow-sm"
				onclick={analyzeWithGemini}
				disabled={aiGenerating}
			>
				{#if aiGenerating}
					<span class="animate-spin mr-1">🌀</span> Analizando Métricas...
				{:else}
					<Sparkles class="h-4 w-4 mr-1.5" />
					Analizar con Gemini AI
				{/if}
			</Button>
		</div>

		{#if aiAnalyzed}
			<div class="grid gap-6 md:grid-cols-[1.2fr_0.9fr_0.9fr] pt-5 text-xs animate-fade-in">
				
				<!-- Columna 1: Diagnóstico de Gemini -->
				<div class="space-y-3">
					<span class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-blue-400 block border-b pb-1">Diagnóstico de Rendimiento</span>
					<div class="bg-card border rounded-xl p-4 leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300 shadow-inner">
						{aiDiagnosis}
					</div>
				</div>

				<!-- Columna 2: Sugerencias de Pauta (Presupuestos) -->
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
									<Coins class="h-3.5 w-3.5" />
									<span>Ajuste: {rec.budget}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Columna 3: Tendencias y Próximos Tópicos Recomendados -->
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
				<p class="text-[10px] text-muted-foreground max-w-sm mt-1">Presiona "Analizar con Gemini AI" para que el asistente consulte la API de rendimiento y estructure las recomendaciones de marketing de la marca.</p>
			</div>
		{/if}
	</Card.Root>
</div>
