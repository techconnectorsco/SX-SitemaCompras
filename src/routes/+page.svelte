<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import MainNav from '$lib/components/app/nav/main-nav.svelte';
	import { AUTH_PATHS } from '$lib/features/auth/config/auth';
	import { siteConfig } from '$lib/config/site';
	import Footer from '$lib/components/app/nav/footer.svelte';
	import { 
		TrendingUp, 
		Package, 
		BarChart3,
		Zap, 
		ChevronRight,
		CheckCircle2,
		Sparkles,
		Layers,
		Share2,
		Tag
	} from 'lucide-svelte';
</script>

<svelte:head>
	<title>{siteConfig.title} - Centro de Operaciones Inteligentes</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-linear-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
	<MainNav />
	
	<main class="flex-1">
		<!-- Hero Section -->
		<section class="relative overflow-hidden py-20 lg:py-10">
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
								class="h-16 w-auto"
							/>
							<div class="h-12 w-px bg-linear-to-b from-[#0D1E3D] to-[#1A73C2]"></div>
							<div>
								<p class="text-sm font-medium text-[#0D1E3D] dark:text-blue-400">
									Sistema Inteligente
								</p>
								<p class="text-xs text-muted-foreground">
									Grupo SoporteXperto
								</p>
							</div>
						</div>

						<!-- Headline -->
						<div class="space-y-4">
							<h1 class="text-4xl lg:text-6xl font-bold text-[#0D1E3D] dark:text-white leading-tight">
								Centro de Operaciones
								<span class="block text-transparent bg-clip-text bg-linear-to-r from-[#0D1E3D] to-[#1A73C2]">
									Inteligentes
								</span>
							</h1>
							<p class="text-lg text-muted-foreground max-w-xl">
								Herramientas inteligentes que combinan automatización de compras, forecast predictivo y creación de contenido con IA para potenciar tu operación.
							</p>
						</div>

						<!-- Features list -->
						<div class="space-y-3">
							<div class="flex items-center gap-3">
								<div class="shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
									<CheckCircle2 class="h-4 w-4 text-green-600" />
								</div>
								<p class="text-sm text-muted-foreground">
									Asistente de compras con forecast predictivo
								</p>
							</div>
							<div class="flex items-center gap-3">
								<div class="shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
									<CheckCircle2 class="h-4 w-4 text-green-600" />
								</div>
								<p class="text-sm text-muted-foreground">
									Creación de contenido impulsada por IA
								</p>
							</div>
							<div class="flex items-center gap-3">
								<div class="shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
									<CheckCircle2 class="h-4 w-4 text-green-600" />
								</div>
								<p class="text-sm text-muted-foreground">
									Gestión multi-marca y publicación en redes sociales
								</p>
							</div>
						</div>

						<!-- CTA Buttons -->
						<div class="flex flex-col sm:flex-row gap-4">
							<Button 
								href={AUTH_PATHS.LOGIN} 
								size="lg" 
								class="text-base px-8 py-6 bg-[#0D1E3D] hover:bg-[#0D1E3D]/90 dark:bg-[#0D1E3D] dark:hover:bg-[#0D1E3D]/80"
							>
								Acceder al Sistema
								<ChevronRight class="ml-2 h-5 w-5" />
							</Button>
							<Button 
								href="/AsistenteCompras" 
								size="lg" 
								variant="outline"
								class="text-base px-8 py-6 border-[#0D1E3D] text-[#0D1E3D] hover:bg-[#0D1E3D]/5"
							>
								<BarChart3 class="mr-2 h-5 w-5" />
								Asistente de Compras
							</Button>
							<Button 
								href="/contentCreator" 
								size="lg" 
								variant="outline"
								class="text-base px-8 py-6 border-[#0D1E3D] text-[#0D1E3D] hover:bg-[#0D1E3D]/5"
							>
								<Sparkles class="mr-2 h-5 w-5" />
								Community Manager
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
						<div class="relative w-full max-w-lg">
							<!-- Decorative circles -->
							<div class="absolute -top-4 -right-4 w-72 h-72 bg-linear-to-br from-[#0D1E3D]/10 to-[#1A73C2]/10 rounded-full blur-2xl"></div>
							<div class="absolute -bottom-4 -left-4 w-72 h-72 bg-linear-to-tr from-[#1A73C2]/10 to-[#0D1E3D]/10 rounded-full blur-2xl"></div>
							
							<!-- Platform Preview -->
							<div class="relative z-10 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700 space-y-6">
								<div class="flex items-center gap-3 border-b pb-4">
									<div class="w-10 h-10 rounded-lg bg-[#1A73C2]/10 flex items-center justify-center">
										<Layers class="h-5 w-5 text-[#1A73C2]" />
									</div>
									<div>
										<p class="font-semibold text-sm">Plataforma SoporteXperto</p>
										<p class="text-xs text-muted-foreground">Centro de Operaciones Inteligentes</p>
									</div>
								</div>

								<div class="space-y-4">
									<!-- Módulo 1 -->
									<div class="p-4 rounded-xl border bg-gray-50 dark:bg-gray-900/50 hover:border-[#0D1E3D]/50 transition-colors">
										<div class="flex items-start justify-between">
											<div class="flex items-center gap-3">
												<div class="w-8 h-8 rounded bg-[#0D1E3D]/10 flex items-center justify-center">
													<BarChart3 class="h-4 w-4 text-[#0D1E3D]" />
												</div>
												<div>
													<p class="text-sm font-semibold text-[#0D1E3D] dark:text-white">Asistente de Compras</p>
													<p class="text-xs text-muted-foreground mt-1">Forecast · SKUs · Alertas</p>
												</div>
											</div>
											<div class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-600 text-[10px] font-medium">
												<div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
												Operativo
											</div>
										</div>
									</div>

									<!-- Módulo 2 -->
									<div class="p-4 rounded-xl border bg-gray-50 dark:bg-gray-900/50 hover:border-[#1A73C2]/50 transition-colors">
										<div class="flex items-start justify-between">
											<div class="flex items-center gap-3">
												<div class="w-8 h-8 rounded bg-[#1A73C2]/10 flex items-center justify-center">
													<Sparkles class="h-4 w-4 text-[#1A73C2]" />
												</div>
												<div>
													<p class="text-sm font-semibold text-[#0D1E3D] dark:text-white">Creador de Contenido</p>
													<p class="text-xs text-muted-foreground mt-1">IA · Redes · Meta Ads</p>
												</div>
											</div>
											<div class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-600 text-[10px] font-medium">
												<div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
												Activo
											</div>
										</div>
									</div>
								</div>

								<div class="grid grid-cols-2 gap-4 pt-4 border-t">
									<div class="flex items-center gap-2">
										<Layers class="h-4 w-4 text-muted-foreground" />
										<span class="text-xs font-medium text-muted-foreground">2 Módulos</span>
									</div>
									<div class="flex items-center gap-2">
										<Zap class="h-4 w-4 text-[#1A73C2]" />
										<span class="text-xs font-medium text-muted-foreground">Powered by SoporteXperto AI</span>
									</div>
								</div>
							</div>
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
						Módulos especializados que integran automatización, inteligencia artificial y gestión operativa
					</p>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					<!-- Feature 1: Creación de Contenido con IA -->
					<div class="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#0D1E3D]/50 transition-all hover:shadow-lg">
						<div class="w-12 h-12 rounded-lg bg-[#0D1E3D]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
							<Sparkles class="h-6 w-6 text-[#0D1E3D]" />
						</div>
						<h3 class="text-xl font-semibold mb-2 text-[#0D1E3D] dark:text-white">
							Creación de Contenido con IA
						</h3>
						<p class="text-muted-foreground">
							Genera copy, hashtags y estrategias de publicación con inteligencia artificial para todas tus marcas.
						</p>
					</div>

					<!-- Feature 2: Indicadores en Tiempo Real -->
					<div class="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#1A73C2]/50 transition-all hover:shadow-lg">
						<div class="w-12 h-12 rounded-lg bg-[#1A73C2]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
							<BarChart3 class="h-6 w-6 text-[#1A73C2]" />
						</div>
						<h3 class="text-xl font-semibold mb-2 text-[#0D1E3D] dark:text-white">
							Indicadores en Tiempo Real
						</h3>
						<p class="text-muted-foreground">
							KPIs semanales, mensuales, trimestrales y anuales con análisis por bodega y sucursal.
						</p>
					</div>

					<!-- Feature 3: Gestión de Inventarios -->
					<div class="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#0D1E3D]/50 transition-all hover:shadow-lg">
						<div class="w-12 h-12 rounded-lg bg-[#0D1E3D]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
							<Package class="h-6 w-6 text-[#0D1E3D]" />
						</div>
						<h3 class="text-xl font-semibold mb-2 text-[#0D1E3D] dark:text-white">
							Gestión de Inventarios
						</h3>
						<p class="text-muted-foreground">
							Control de inventarios mínimos, alertas de stock bajo y análisis de rotación por sucursal.
						</p>
					</div>

					<!-- Feature 4: Gestión Multi-Marca -->
					<div class="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#1A73C2]/50 transition-all hover:shadow-lg">
						<div class="w-12 h-12 rounded-lg bg-[#1A73C2]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
							<Tag class="h-6 w-6 text-[#1A73C2]" />
						</div>
						<h3 class="text-xl font-semibold mb-2 text-[#0D1E3D] dark:text-white">
							Gestión Multi-Marca
						</h3>
						<p class="text-muted-foreground">
							Administra múltiples marcas con prompts personalizados, brand assets y estrategias diferenciadas.
						</p>
					</div>

					<!-- Feature 5: Alertas Inteligentes -->
					<div class="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#0D1E3D]/50 transition-all hover:shadow-lg">
						<div class="w-12 h-12 rounded-lg bg-[#0D1E3D]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
							<Zap class="h-6 w-6 text-[#0D1E3D]" />
						</div>
						<h3 class="text-xl font-semibold mb-2 text-[#0D1E3D] dark:text-white">
							Alertas Inteligentes
						</h3>
						<p class="text-muted-foreground">
							Notificaciones automáticas por producto, lead time y umbrales personalizados.
						</p>
					</div>

					<!-- Feature 6: Meta Hub & Publicación -->
					<div class="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#1A73C2]/50 transition-all hover:shadow-lg">
						<div class="w-12 h-12 rounded-lg bg-[#1A73C2]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
							<Share2 class="h-6 w-6 text-[#1A73C2]" />
						</div>
						<h3 class="text-xl font-semibold mb-2 text-[#0D1E3D] dark:text-white">
							Meta Hub & Publicación
						</h3>
						<p class="text-muted-foreground">
							Publica directamente en Facebook e Instagram, gestiona pautas y monitorea el rendimiento de tus campañas.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- CTA Section -->
		<section class="py-20 bg-linear-to-br from-[#0D1E3D] to-[#0D1E3D]/90 text-white">
			<div class="container mx-auto px-4 text-center">
				<div class="max-w-3xl mx-auto space-y-6">
					<h2 class="text-3xl lg:text-4xl font-bold">
						¿Listo para Transformar tu Operación?
					</h2>
					<p class="text-lg text-blue-100">
						Accede a la plataforma y potencia tus procesos de compras y creación de contenido con inteligencia artificial.
					</p>
					<div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
						<Button 
							href={AUTH_PATHS.REGISTER} 
							size="lg" 
							variant="secondary"
							class="text-base px-8 py-6 bg-white text-[#0D1E3D] hover:bg-gray-100"
						>
							Solicitar Acceso
							<ChevronRight class="ml-2 h-5 w-5" />
						</Button>
						<Button 
							href="mailto:{siteConfig.contact.email}" 
							size="lg" 
							variant="secondary"
							class="text-base px-8 py-6 bg-white text-[#0D1E3D] hover:bg-gray-100"
						>
							Contactar Soporte
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