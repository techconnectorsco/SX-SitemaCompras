<script>
	// import SidebarAdmin from '$lib/components/app/admin/SidebarAdmin.svelte';

	// 🔥 URL de tu proyecto en Vercel
	const VERCEL_PROJECT_URL = 'https://vercel.com/sito-dev-team/sito-sveltekit';
</script>

<div class="py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-foreground mb-2">Analítica</h1>
			<p class="text-muted-foreground">
				Métricas y estadísticas de rendimiento de SITO.CR
			</p>
		</div>

		<!-- Web Analytics Card -->
		<div class="bg-card rounded-xl shadow-sm border border-border p-8 mb-6">
			<div class="flex items-start gap-6">
				<div class="w-16 h-16 bg-blue-500/15 rounded-xl flex items-center justify-center shrink-0">
					<svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
					</svg>
				</div>
				<div class="flex-1">
					<h2 class="text-2xl font-bold text-foreground mb-2">📊 Web Analytics</h2>
					<p class="text-muted-foreground mb-4">
						Visualiza visitantes, páginas más vistas, referentes, geolocalización y datos demográficos de los usuarios.
					</p>
					<div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
						<p class="text-sm font-semibold text-blue-600 mb-2">Métricas disponibles:</p>
						<ul class="text-sm text-blue-600/80 space-y-1 ml-4 list-disc">
							<li>👥 Visitantes únicos y totales</li>
							<li>📄 Páginas más visitadas</li>
							<li>🔗 Principales referentes (de dónde vienen los usuarios)</li>
							<li>🌍 Geolocalización (país, ciudad)</li>
							<li>🖥️ Dispositivos, navegadores y sistemas operativos</li>
						</ul>
					</div>
					<a
						href="{VERCEL_PROJECT_URL}/analytics"
						target="_blank"
						class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
					>
						Ver Web Analytics
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
					</a>
				</div>
			</div>
		</div>

		<!-- Speed Insights Card -->
		<div class="bg-card rounded-xl shadow-sm border border-border p-8 mb-6">
			<div class="flex items-start gap-6">
				<div class="w-16 h-16 bg-purple-500/15 rounded-xl flex items-center justify-center shrink-0">
					<svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				</div>
				<div class="flex-1">
					<h2 class="text-2xl font-bold text-foreground mb-2">⚡ Speed Insights</h2>
					<p class="text-muted-foreground mb-4">
						Monitorea el rendimiento de carga, capacidad de respuesta y estabilidad visual de la plataforma.
					</p>
					<div class="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
						<p class="text-sm font-semibold text-purple-600 mb-2">Core Web Vitals:</p>
						<ul class="text-sm text-purple-600/80 space-y-1 ml-4 list-disc">
							<li><strong>LCP</strong> - Largest Contentful Paint (velocidad de carga)</li>
							<li><strong>FID</strong> - First Input Delay (capacidad de respuesta)</li>
							<li><strong>CLS</strong> - Cumulative Layout Shift (estabilidad visual)</li>
							<li><strong>FCP</strong> - First Contentful Paint</li>
							<li><strong>TTFB</strong> - Time to First Byte</li>
						</ul>
					</div>
					<a
						href="{VERCEL_PROJECT_URL}/speed-insights"
						target="_blank"
						class="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
					>
						Ver Speed Insights
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
					</a>
				</div>
			</div>
		</div>

		<!-- Deployment Info Card -->
		<div class="bg-card rounded-xl shadow-sm border border-border p-8">
			<div class="flex items-start gap-6">
				<div class="w-16 h-16 bg-green-500/15 rounded-xl flex items-center justify-center shrink-0">
					<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
					</svg>
				</div>
				<div class="flex-1">
					<h2 class="text-2xl font-bold text-foreground mb-2">🚀 Deployments</h2>
					<p class="text-muted-foreground mb-4">
						Historial de implementaciones, estado de builds y configuración del proyecto.
					</p>
					<a
						href="{VERCEL_PROJECT_URL}"
						target="_blank"
						class="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
					>
						Ver Dashboard Completo
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
					</a>
				</div>
			</div>
		</div>

		<!-- Info Footer -->
		<div class="mt-6 bg-muted rounded-xl p-6">
			<div class="flex items-start gap-3">
				<svg class="w-6 h-6 text-muted-foreground shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<div>
					<p class="text-sm text-foreground font-semibold mb-1">
						💡 ¿Cómo funciona?
					</p>
					<p class="text-sm text-muted-foreground">
						Vercel Analytics recopila datos automáticamente de todos los visitantes de SITO.CR.
						Las métricas se actualizan en tiempo real y están disponibles en el dashboard de Vercel.
						Los datos se almacenan de forma segura y cumplen con las regulaciones de privacidad.
					</p>
				</div>
			</div>
		</div>
</div>
