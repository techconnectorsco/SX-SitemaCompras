<script lang="ts">
	import CreatorDashboard from '$lib/components/app/content-creator/creator-dashboard.svelte';
	import CreatorCalendar from '$lib/components/app/content-creator/creator-calendar.svelte';
	import ReviewTab from '$lib/components/app/content-creator/review-tab.svelte';
	import MetricsTab from '$lib/components/app/content-creator/metrics-tab.svelte';
	import MetaHubTab from '$lib/components/app/content-creator/meta-hub-tab.svelte';
	import PromptsMarcas from '$lib/components/app/content-creator/prompts-marcas.svelte';
	import AssetsTab from '$lib/components/app/content-creator/assets-tab.svelte';
	import BodegasTab from '$lib/components/app/content-creator/bodegas-tab.svelte';
	import { LayoutDashboard, Calendar, Layers, ClipboardCheck, TrendingUp, Facebook, Image, Tag, Warehouse } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Estado global/compartido de la pestaña activa
	let activeTab = $state<'dashboard' | 'schedule' | 'review' | 'metrics' | 'meta-hub' | 'prompts' | 'assets' | 'bodegas'>('dashboard');

	function formatTimestampToDateInput(ts: number | null | undefined): string {
		if (!ts || isNaN(ts) || ts <= 0) return '';
		const date = new Date(ts * 1000);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// Estructura de posts compartida, mapeada al formato que espera el frontend (ExcelPost)
	let posts = $state(data.publicaciones.map((p: any) => ({
		id: p.id.toString(), // Usamos el ID real numérico de la base de datos como string
		title: p.titulo || '',
		format: p.formato || '',
		context: p.contexto || '',
		objective: p.objetivo || '',
		audience: p.audiencia || '',
		budget: p.presupuesto_usd || 0,
		network: Array.isArray(p.redes) ? p.redes.join(', ') : '',
		designed: p.designed === 1 || p.estado === 'Aprobado' || p.estado === 'Publicado',
		published: p.published === 1 || p.estado === 'Publicado',
		promoted: p.promoted === 1,
		copy: p.copy_final || '',
		week: p.campana || '',
		links: '',
		kpi: '',
		cta: p.cta || '',
		references: '',
		trend: '',
		date: formatTimestampToDateInput(p.fecha_programada),
		metaStartDate: formatTimestampToDateInput(p.meta_pauta_inicio),
		metaEndDate: formatTimestampToDateInput(p.meta_pauta_fin),
		imagePreview: p.sharepoint_item_id || null,
		imageName: p.image_name || '',
		carouselImages: (() => {
			if (p.carousel_images) {
				try {
					return JSON.parse(p.carousel_images);
				} catch (e) {
					return [];
				}
			}
			return [];
		})(),
		brand: p.marca || '',
		status: p.estado || 'Borrador',
		prompt: p.prompt_personalizado || '',
		promptCopy: p.prompt_copy || '',
		esCarrusel: p.es_carrusel === 1
	})));
	let catalogos = data.catalogos;
	let tokenStats = data.tokenStats;
</script>

<svelte:head>
	<title>Vedoba - Creador de Contenido</title>
</svelte:head>

<!-- Estructura de layout unificada de la aplicación -->
<div class="grid min-h-[75vh] w-full grid-cols-1 overflow-hidden rounded-xl border bg-background shadow-sm lg:grid-cols-[260px_1fr]">
	
	<!-- Sidebar del módulo Creador de Contenido -->
	<aside class="flex flex-col justify-between border-r bg-muted/30 p-5 lg:p-6">
		<div class="space-y-6">
			<!-- Logo de marca del módulo -->
			<div class="flex items-center gap-2.5 px-1.5 border-b pb-4">
				<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#253166] text-white shadow-sm">
					<Layers class="h-4.5 w-4.5" />
				</div>
				<div>
					<h2 class="text-xs font-bold tracking-tight text-foreground uppercase">Creador Contenido</h2>
					<p class="text-[9px] font-semibold text-orange-500 uppercase tracking-widest">SX IA</p>
				</div>
			</div>

			<!-- Botones de Navegación del Módulo -->
			<nav class="space-y-1">
				<p class="px-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/85">Módulos</p>
				
				<!-- Botón Dashboard -->
				<button 
					type="button" 
					onclick={() => activeTab = 'dashboard'}
					class={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-xs font-medium transition-all duration-200
						${activeTab === 'dashboard' 
							? 'bg-[#253166] text-white shadow-sm dark:bg-blue-600' 
							: 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
				>
					<LayoutDashboard class="h-4 w-4" />
					<span>Dashboard</span>
				</button>

				<!-- Botón Cronograma -->
				<button 
					type="button" 
					onclick={() => activeTab = 'schedule'}
					class={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-xs font-medium transition-all duration-200
						${activeTab === 'schedule' 
							? 'bg-[#253166] text-white shadow-sm dark:bg-blue-600' 
							: 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
				>
					<Calendar class="h-4 w-4" />
					<span>Cronograma</span>
				</button>

				<!-- Botón Revisión y HITL -->
				<button 
					type="button" 
					onclick={() => activeTab = 'review'}
					class={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-xs font-medium transition-all duration-200
						${activeTab === 'review' 
							? 'bg-[#253166] text-white shadow-sm dark:bg-blue-600' 
							: 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
				>
					<ClipboardCheck class="h-4 w-4" />
					<span>Revisión y HITL</span>
				</button>

				<!-- Botón Métricas IA -->
				<button 
					type="button" 
					onclick={() => activeTab = 'metrics'}
					class={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-xs font-medium transition-all duration-200
						${activeTab === 'metrics' 
							? 'bg-[#253166] text-white shadow-sm dark:bg-blue-600' 
							: 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
				>
					<TrendingUp class="h-4 w-4" />
					<span>Métricas IA</span>
				</button>

				<!-- Botón Meta Ads & Hub -->
				<button 
					type="button" 
					onclick={() => activeTab = 'meta-hub'}
					class={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-xs font-medium transition-all duration-200
						${activeTab === 'meta-hub' 
							? 'bg-[#253166] text-white shadow-sm dark:bg-blue-600' 
							: 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
				>
					<Facebook class="h-4 w-4" />
					<span>Meta Hub & Ads</span>
				</button>

				<!-- Botón Prompts de Marcas -->
				<button 
					type="button" 
					onclick={() => activeTab = 'prompts'}
					class={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-xs font-medium transition-all duration-200
						${activeTab === 'prompts' 
							? 'bg-[#253166] text-white shadow-sm dark:bg-blue-600' 
							: 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
				>
					<Image class="h-4 w-4" />
					<span>Prompts</span>
				</button>

				<!-- Botón Brand Assets -->
				<button 
					type="button" 
					onclick={() => activeTab = 'assets'}
					class={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-xs font-medium transition-all duration-200
						${activeTab === 'assets' 
							? 'bg-[#253166] text-white shadow-sm dark:bg-blue-600' 
							: 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
				>
<Tag class="h-4 w-4" />
						<span>Brand Assets</span>
					</button>

					<!-- Botón Bodegas (inventario Exactus) -->
					<button
						type="button"
						onclick={() => activeTab = 'bodegas'}
						class={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-xs font-medium transition-all duration-200
							${activeTab === 'bodegas'
								? 'bg-[#253166] text-white shadow-sm dark:bg-blue-600'
								: 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
					>
						<Warehouse class="h-4 w-4" />
						<span>Bodegas</span>
					</button>
				</nav>
		</div>

		<!-- Estado operativo Meta/Canales -->
		<div class="rounded-lg bg-muted/60 p-3.5 border">
			<div class="flex items-center gap-2">
				<div class="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
				<span class="text-[10px] font-medium text-muted-foreground">Canales Meta Listos</span>
			</div>
		</div>
	</aside>

	<!-- Visualización del Módulo Activo -->
	<div class="p-5 lg:p-6 bg-background">
		{#if activeTab === 'dashboard'}
			<CreatorDashboard bind:posts {catalogos} {tokenStats} />
		{:else if activeTab === 'schedule'}
			<CreatorCalendar bind:posts {catalogos} />
		{:else if activeTab === 'review'}
			<ReviewTab bind:posts {catalogos} />
		{:else if activeTab === 'metrics'}
			<MetricsTab bind:posts {catalogos} />
		{:else if activeTab === 'meta-hub'}
			<MetaHubTab bind:posts {catalogos} />
		{:else if activeTab === 'prompts'}
			<PromptsMarcas {data} />
		{:else if activeTab === 'assets'}
			<AssetsTab {catalogos} />
		{:else if activeTab === 'bodegas'}
			<BodegasTab />
		{/if}
	</div>

</div>