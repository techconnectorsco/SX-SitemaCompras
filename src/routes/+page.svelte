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
								Gestión Inteligente de
								<span
									class="block text-transparent bg-clip-text bg-linear-to-r from-[#0D1E3D] to-[#1A73C2]"
								>
									Compras y Forecast
								</span>
							</h1>
							<p class="text-lg text-muted-foreground max-w-xl">
								Automatización del proceso de compras para más de
								{#if isLoading}
									<span
										class="inline-block w-16 h-5 bg-gray-200 dark:bg-gray-700 animate-pulse rounded align-middle"
									></span>
								{:else}
									<span class="font-semibold text-[#0D1E3D] dark:text-white"
										>{stats ? formatNumber(stats.totalSKUs) : '1,500'}</span
									>
								{/if}
								SKUs con reglas de negocio estructuradas y análisis predictivo basado en datos históricos.
							</p>
						</div>

						<!-- Features list -->
						<div class="space-y-3">
							<div class="flex items-center gap-3">
								<div
									class="shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center"
								>
									<CheckCircle2 class="h-4 w-4 text-green-600" />
								</div>
								<p class="text-sm text-muted-foreground">
									Asistente de compras con forecast predictivo
								</p>
							</div>
							<div class="flex items-center gap-3">
								<div
									class="shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center"
								>
									<CheckCircle2 class="h-4 w-4 text-green-600" />
								</div>
								<p class="text-sm text-muted-foreground">Creación de contenido impulsada por IA</p>
							</div>
							<div class="flex items-center gap-3">
								<div
									class="shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center"
								>
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
								class="text-base px-8 py-6 border-[#253166] text-[#253166] hover:bg-[#253166]/5"
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

						<!-- Stats -->
						<div class="grid grid-cols-3 gap-6 pt-8 border-t">
							<div>
								{#if isLoading}
									<div class="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
								{:else}
									<p class="text-3xl font-bold text-[#0D1E3D] dark:text-white">
										{stats ? formatNumber(stats.totalSKUs) : '1,500+'}
									</p>
								{/if}
								<p class="text-sm text-muted-foreground">SKUs Gestionados</p>
							</div>
							<div>
								<p class="text-3xl font-bold text-[#0D1E3D] dark:text-white">6 Años</p>
								<p class="text-sm text-muted-foreground">Historial Analizado</p>
							</div>
							<div>
								<p class="text-3xl font-bold text-[#0D1E3D] dark:text-white">24/7</p>
								<p class="text-sm text-muted-foreground">Disponibilidad</p>
							</div>
						</div>
					</div>

					<!-- Right Column: Visual Element -->
					<div class="hidden lg:flex items-center justify-center relative">
						<div class="relative w-full max-w-lg">
							<!-- Decorative circles -->
							<div
								class="absolute -top-4 -right-4 w-72 h-72 bg-linear-to-br from-[#0D1E3D]/10 to-[#1A73C2]/10 rounded-full blur-2xl"
							></div>
							<div
								class="absolute -bottom-4 -left-4 w-72 h-72 bg-linear-to-tr from-[#1A73C2]/10 to-[#0D1E3D]/10 rounded-full blur-2xl"
							></div>

							<!-- Dashboard Card -->
							<div
								class="relative z-10 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700"
							>
								<div class="space-y-6">
									<!-- Header -->
									<div class="flex items-center justify-between pb-4 border-b">
										<div class="flex items-center gap-3">
											<div
												class="w-10 h-10 rounded-lg bg-[#0D1E3D]/10 flex items-center justify-center"
											>
												<BarChart3 class="h-5 w-5 text-[#0D1E3D]" />
											</div>
											<div
												class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-600 text-[10px] font-medium"
											>
												<div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
												Operativo
											</div>
										</div>
									</div>

									<!-- Gráfico ABC -->
									<!-- Gráfico ABC -->
									<div class="space-y-2">
										<div class="flex justify-between text-xs text-muted-foreground">
											<span>Distribución ABC</span>
											{#if stats?.totalSKUs}
												<span class="text-[#0D1E3D] font-medium"
													>{formatNumber(stats.totalSKUs)} SKUs</span
												>
											{/if}
										</div>
										<div
											class="h-36 bg-gradient-to-t from-[#0D1E3D]/10 to-[#1A73C2]/5 rounded-lg p-3"
										>
											{#if stats?.distribucionABC}
												{@const abcData = stats.distribucionABC}
												{@const maxVal = Math.max(
													abcData.A || 1,
													abcData.B || 1,
													abcData.C || 1,
													abcData.D || 1,
													abcData.E || 1
												)}
												<div class="flex items-end justify-between gap-2 h-full">
													<!-- Barra A -->
													<div class="flex-1 flex flex-col items-center h-full">
														<div class="flex-1 w-full flex items-end">
															<div
																class="w-full bg-[#0D1E3D] rounded-t"
																style="height: {Math.max((abcData.A / maxVal) * 100, 8)}%"
															></div>
														</div>
														<span
															class="text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-1"
															>A</span
														>
													</div>
													<!-- Barra B -->
													<div class="flex-1 flex flex-col items-center h-full">
														<div class="flex-1 w-full flex items-end">
															<div
																class="w-full bg-[#0D1E3D]/80 rounded-t"
																style="height: {Math.max((abcData.B / maxVal) * 100, 8)}%"
															></div>
														</div>
														<span
															class="text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-1"
															>B</span
														>
													</div>
													<!-- Barra C -->
													<div class="flex-1 flex flex-col items-center h-full">
														<div class="flex-1 w-full flex items-end">
															<div
																class="w-full bg-[#1A73C2] rounded-t"
																style="height: {Math.max((abcData.C / maxVal) * 100, 8)}%"
															></div>
														</div>
														<span
															class="text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-1"
															>C</span
														>
													</div>
													<!-- Barra D -->
													<div class="flex-1 flex flex-col items-center h-full">
														<div class="flex-1 w-full flex items-end">
															<div
																class="w-full bg-[#1A73C2]/80 rounded-t"
																style="height: {Math.max((abcData.D / maxVal) * 100, 8)}%"
															></div>
														</div>
														<span
															class="text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-1"
															>D</span
														>
													</div>
													<!-- Barra E -->
													<div class="flex-1 flex flex-col items-center h-full">
														<div class="flex-1 w-full flex items-end">
															<div
																class="w-full bg-gray-400 rounded-t"
																style="height: {Math.max((abcData.E / maxVal) * 100, 8)}%"
															></div>
														</div>
														<span
															class="text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-1"
															>E</span
														>
													</div>
												</div>
											{:else}
												<!-- Placeholder estático cuando no hay datos -->
												<div class="flex items-end justify-between gap-2 h-full">
													<div class="flex-1 flex flex-col items-center h-full">
														<div class="flex-1 w-full flex items-end">
															<div class="w-full h-[70%] bg-[#0D1E3D] rounded-t"></div>
														</div>
														<span
															class="text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-1"
															>A</span
														>
													</div>
													<div class="flex-1 flex flex-col items-center h-full">
														<div class="flex-1 w-full flex items-end">
															<div class="w-full h-[55%] bg-[#0D1E3D]/80 rounded-t"></div>
														</div>
														<span
															class="text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-1"
															>B</span
														>
													</div>
													<div class="flex-1 flex flex-col items-center h-full">
														<div class="flex-1 w-full flex items-end">
															<div class="w-full h-[90%] bg-[#1A73C2] rounded-t"></div>
														</div>
														<span
															class="text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-1"
															>C</span
														>
													</div>
													<div class="flex-1 flex flex-col items-center h-full">
														<div class="flex-1 w-full flex items-end">
															<div class="w-full h-[40%] bg-[#1A73C2]/80 rounded-t"></div>
														</div>
														<span
															class="text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-1"
															>D</span
														>
													</div>
													<div class="flex-1 flex flex-col items-center h-full">
														<div class="flex-1 w-full flex items-end">
															<div class="w-full h-[25%] bg-gray-400 rounded-t"></div>
														</div>
														<span
															class="text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-1"
															>E</span
														>
													</div>
												</div>
											{/if}
										</div>
									</div>

									<!-- Métricas -->
									<div class="grid grid-cols-2 gap-4">
										<div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
											<div class="flex items-center gap-2 mb-2">
												<Package class="h-4 w-4 text-[#1A73C2]" />
												<p class="text-xs text-muted-foreground">SKUs Activos</p>
											</div>
											{#if isLoading}
												<div
													class="h-6 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
												></div>
											{:else}
												<p class="text-lg font-bold text-[#0D1E3D] dark:text-white">
													{stats ? formatNumber(stats.skusActivos) : '1,523'}
												</p>
											{/if}
										</div>
										<div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
											<div class="flex items-center gap-2 mb-2">
												{#if stats?.stockCritico > 0}
													<AlertTriangle class="h-4 w-4 text-[#1A73C2]" />
													<p class="text-xs text-muted-foreground">Stock Crítico</p>
												{:else}
													<TrendingUp class="h-4 w-4 text-green-500" />
													<p class="text-xs text-muted-foreground">Requieren Pedido</p>
												{/if}
											</div>
											{#if isLoading}
												<div
													class="h-6 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
												></div>
											{:else}
												<p
													class="text-lg font-bold {stats?.stockCritico > 0
														? 'text-[#1A73C2]'
														: 'text-[#0D1E3D] dark:text-white'}"
												>
													{#if stats?.stockCritico > 0}
														{formatNumber(stats.stockCritico)}
													{:else if stats?.requierenPedido}
														{formatNumber(stats.requierenPedido)}
													{:else}
														0
													{/if}
												</p>
											{/if}
										</div>
									</div>

									<!-- Top Líneas (si hay datos) -->
									{#if stats?.topLineas && stats.topLineas.length > 0}
										<div class="pt-4 border-t">
											<p class="text-xs text-muted-foreground mb-2">Top Líneas</p>
											<div class="flex flex-wrap gap-2">
												{#each stats.topLineas as linea}
													<span
														class="px-2 py-1 text-xs bg-[#0D1E3D]/10 text-[#0D1E3D] dark:bg-[#0D1E3D]/20 dark:text-blue-300 rounded-full"
													>
														{linea.linea} ({formatNumber(linea.cantidad)})
													</span>
												{/each}
											</div>
										</div>
									{/if}
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
						Módulos especializados que integran automatización, inteligencia artificial y gestión
						operativa
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
							Integración Exactus
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
							Historial Analítico
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
