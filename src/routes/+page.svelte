<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import MainNav from '$lib/components/app/nav/main-nav.svelte';
	import { AUTH_PATHS } from '$lib/features/auth/config/auth';
	import { siteConfig } from '$lib/config/site';
	import Footer from '$lib/components/app/nav/footer.svelte';
	import {
		TrendingUp,
		Package,
		BarChart3,
		Shield,
		Zap,
		Target,
		ChevronRight,
		CheckCircle2,
		AlertTriangle,
		Clock,
		Sparkles
	} from 'lucide-svelte';

	// Estado para datos dinámicos
	let isLoading = true;
	let stats: any = null;

	onMount(async () => {
		try {
			const response = await fetch('/api/public/landing-stats');
			if (response.ok) {
				const data = await response.json();
				if (data.hayDatos) {
					stats = data;
				}
			}
		} catch (err) {
			console.log('Usando valores por defecto');
		} finally {
			isLoading = false;
		}
	});

	// Helper para formatear números
	const formatNumber = (num: number) => num?.toLocaleString('es-CR') || '0';

	// Calcular altura de barras ABC
	const getBarHeight = (value: number, max: number) => {
		if (!max || !value) return '20%';
		return `${Math.max((value / max) * 100, 10)}%`;
	};

	// Obtener el máximo del ABC para escalar barras
	$: maxABC = stats?.distribucionABC
		? Math.max(...(Object.values(stats.distribucionABC) as number[]))
		: 100;

	// Formatear fecha del último procesamiento
	$: fechaProcesamiento = stats?.ultimoProcesamiento?.fecha
		? new Date(stats.ultimoProcesamiento.fecha).toLocaleDateString('es-CR', {
				day: '2-digit',
				month: 'short',
				year: 'numeric'
			})
		: null;
</script>

<svelte:head>
	<title>{siteConfig.title} - Centro de Operaciones Inteligentes</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col bg-linear-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900"
>
	<MainNav />

	<main class="flex-1">
		<!-- Hero Section -->
		<section class="relative overflow-hidden py-8 lg:py-6">
			<!-- Background decoration -->
			<div class="absolute inset-0 -z-10">
				<div class="absolute top-0 right-0 w-96 h-96 bg-[#0D1E3D]/5 rounded-full blur-3xl"></div>
				<div class="absolute bottom-0 left-0 w-96 h-96 bg-[#1A73C2]/5 rounded-full blur-3xl"></div>
			</div>

			<div class="container mx-auto px-4">
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
					<!-- Left Column: Content -->
					<div class="space-y-8">
						<!-- Logo -->
						<div class="flex items-center gap-3">
							<img
								src="/logo-soportexperto.png"
								alt="SoporteXperto Logo"
								class="h-16 w-auto dark:hidden"
							/>
							<img
								src="/logo-soportexperto1.png"
								alt="SoporteXperto Logo"
								class="h-16 w-auto hidden dark:block"
							/>
							<div class="h-12 w-px bg-linear-to-b from-[#0D1E3D] to-[#1A73C2]"></div>
							<div>
								<p class="text-sm font-medium text-[#0D1E3D] dark:text-blue-400">
									Sistema Inteligente
								</p>
								<p class="text-xs text-muted-foreground">SoporteXperto</p>
							</div>
						</div>

						<!-- Headline -->
						<div class="space-y-4">
							<h1
								class="text-4xl lg:text-6xl font-bold text-[#0D1E3D] dark:text-white leading-tight"
							>
								<span class="whitespace-nowrap">Centro de Operaciones</span>
								<span
									class="block text-transparent bg-clip-text bg-linear-to-r from-[#0D1E3D] to-[#1A73C2]"
								>
									Inteligentes
								</span>
							</h1>
							<p class="text-lg text-muted-foreground max-w-xl">
								Plataforma Inteligente para el control y manejo híbrido de asistentes digitales.
							</p>
						</div>

						<!-- CTA Buttons -->
						<div class="flex flex-col sm:flex-row gap-4 flex-wrap">
							<Button
								href={AUTH_PATHS.LOGIN}
								size="lg"
								class="text-base px-8 py-6 bg-[#1A73C2] hover:bg-[#1A73C2]/90 text-white"
							>
								Acceder al Sistema
								<ChevronRight class="ml-2 h-5 w-5" />
							</Button>
							<Button
								href="/AsistenteCompras"
								size="lg"
								class="text-base px-8 py-6 bg-[#1A73C2] hover:bg-[#1A73C2]/90 text-white"
							>
								<BarChart3 class="mr-2 h-5 w-5" />
								Asistente de Compras
							</Button>
							<Button
								href="/contentCreator"
								size="lg"
								class="text-base px-8 py-6 bg-[#1A73C2] hover:bg-[#1A73C2]/90 text-white"
							>
								<Sparkles class="mr-2 h-5 w-5" />
								Community Manager
							</Button>
							<Button
								href="/cuentasxcobrar"
								size="lg"
								class="text-base px-8 py-6 bg-[#1A73C2] hover:bg-[#1A73C2]/90 text-white"
							>
								<Target class="mr-2 h-5 w-5" />
								Asistente CXC
							</Button>
							<Button
								href="http://facturacion.soportexperto.com:3003/inicio/"
								target="_blank"
								rel="noopener noreferrer"
								size="lg"
								class="text-base px-8 py-6 bg-[#1A73C2] hover:bg-[#1A73C2]/90 text-white"
							>
								<Package class="mr-2 h-5 w-5" />
								Facturación
							</Button>
							<Button
								href={AUTH_PATHS.REGISTER}
								size="lg"
								class="text-base px-8 py-6 bg-[#1A73C2] hover:bg-[#1A73C2]/90 text-white"
							>
								Solicitar Acceso
							</Button>
						</div>
					</div>

					<!-- Right Column: Visual Element -->
					<div class="hidden lg:flex items-center justify-center relative">
						<div class="relative w-full max-w-lg overflow-visible">
							<!-- Hero Image -->
							<img
								src="/hero_img.png"
								alt="Asistente IA"
								class="relative z-10 w-[115%] max-w-none h-auto object-cover -ml-4"
								style="-webkit-mask-image: linear-gradient(to bottom, black 80%, transparent 100%); mask-image: linear-gradient(to bottom, black 80%, transparent 100%);"
							/>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Features Section -->
		<section class="py-10 bg-white dark:bg-gray-900">
			<div class="container mx-auto px-4">
				<div class="text-center mb-12">
					<h2 class="text-3xl lg:text-4xl font-bold text-[#0D1E3D] dark:text-white mb-4">
						Características Principales
					</h2>
					<p class="text-muted-foreground max-w-2xl mx-auto">
						El módulo debe ser multiplataforma, no limitado a una sola.
					</p>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					<!-- Feature 1 -->
					<div
						class="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#0D1E3D]/50 transition-all hover:shadow-lg"
					>
						<div
							class="w-12 h-12 rounded-lg bg-[#0D1E3D]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
						>
							<TrendingUp class="h-6 w-6 text-[#0D1E3D]" />
						</div>
						<h3 class="text-xl font-semibold mb-2 text-[#0D1E3D] dark:text-white">
							Cálculo Automático
						</h3>
						<p class="text-muted-foreground">
							Genera copy, hashtags y estrategias de publicación con inteligencia artificial para
							todas tus marcas.
						</p>
					</div>

					<!-- Feature 2 -->
					<div
						class="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#1A73C2]/50 transition-all hover:shadow-lg"
					>
						<div
							class="w-12 h-12 rounded-lg bg-[#1A73C2]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
						>
							<BarChart3 class="h-6 w-6 text-[#1A73C2]" />
						</div>
						<h3 class="text-xl font-semibold mb-2 text-[#0D1E3D] dark:text-white">
							Indicadores en Tiempo Real
						</h3>
						<p class="text-muted-foreground">
							KPIs semanales, mensuales, trimestrales y anuales con análisis por bodega y sucursal.
						</p>
					</div>

					<!-- Feature 3 -->
					<div
						class="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#0D1E3D]/50 transition-all hover:shadow-lg"
					>
						<div
							class="w-12 h-12 rounded-lg bg-[#0D1E3D]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
						>
							<Package class="h-6 w-6 text-[#0D1E3D]" />
						</div>
						<h3 class="text-xl font-semibold mb-2 text-[#0D1E3D] dark:text-white">
							Gestión de Inventarios
						</h3>
						<p class="text-muted-foreground">
							Control de inventarios mínimos, alertas de stock bajo y análisis de rotación por
							sucursal.
						</p>
					</div>

					<!-- Feature 4 -->
					<div
						class="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#1A73C2]/50 transition-all hover:shadow-lg"
					>
						<div
							class="w-12 h-12 rounded-lg bg-[#1A73C2]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
						>
							<Shield class="h-6 w-6 text-[#1A73C2]" />
						</div>
						<h3 class="text-xl font-semibold mb-2 text-[#0D1E3D] dark:text-white">
							Múltiples ERPs
						</h3>
						<p class="text-muted-foreground">
							Administra múltiples marcas con prompts personalizados, brand assets y estrategias
							diferenciadas.
						</p>
					</div>

					<!-- Feature 5 -->
					<div
						class="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#0D1E3D]/50 transition-all hover:shadow-lg"
					>
						<div
							class="w-12 h-12 rounded-lg bg-[#0D1E3D]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
						>
							<Zap class="h-6 w-6 text-[#0D1E3D]" />
						</div>
						<h3 class="text-xl font-semibold mb-2 text-[#0D1E3D] dark:text-white">
							Alertas Inteligentes
						</h3>
						<p class="text-muted-foreground">
							Notificaciones automáticas por producto, lead time y umbrales personalizados.
						</p>
					</div>

					<!-- Feature 6 -->
					<div
						class="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#1A73C2]/50 transition-all hover:shadow-lg"
					>
						<div
							class="w-12 h-12 rounded-lg bg-[#1A73C2]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
						>
							<Target class="h-6 w-6 text-[#1A73C2]" />
						</div>
						<h3 class="text-xl font-semibold mb-2 text-[#0D1E3D] dark:text-white">
							Funcionalidades híbridas
						</h3>
						<p class="text-muted-foreground">
							Publica directamente en Facebook e Instagram, gestiona pautas y monitorea el
							rendimiento de tus campañas.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- CTA Section -->
		<section class="py-20 bg-linear-to-br from-[#0D1E3D] to-[#0D1E3D]/90 text-white">
			<div class="container mx-auto px-4 text-center">
				<div class="max-w-3xl mx-auto space-y-6">
					<h2 class="text-3xl lg:text-4xl font-bold">¿Listo para Transformar tu Operación?</h2>
					<p class="text-lg text-blue-100">
						Accede a la plataforma y potencia tus procesos de compras y creación de contenido con
						inteligencia artificial.
					</p>
					<div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
						<Button
							href="mailto:{siteConfig.contact.email}"
							size="lg"
							variant="secondary"
							class="text-base px-8 py-6 bg-white text-[#0D1E3D] hover:bg-gray-100"
						>
							Contactar SoporteXperto
						</Button>
					</div>
				</div>
			</div>
		</section>
	</main>

	<Footer />
</div>

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	main {
		animation: fadeIn 0.6s ease-out;
	}
</style>
