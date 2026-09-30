<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Clock, Mail, CheckCircle2, Shield } from 'lucide-svelte';
	import { siteConfig } from '$lib/config/site';
	import MainNav from '$lib/components/app/nav/main-nav.svelte';
	import Footer from '$lib/components/app/nav/footer.svelte';

	const email = $page.url.searchParams.get('email');
</script>

<!-- ✅ Contenedor principal con altura exacta de viewport -->
<div class="h-screen flex flex-col">
	<!-- Navbar superior -->
	<MainNav />

	<!-- Contenedor principal - flex-1 sin overflow -->
	<div class="flex-1 flex items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-gray-950 dark:to-gray-900 overflow-hidden">
		<!-- Card de pending -->
		<div class="w-full max-w-lg px-6 py-4">
			<!-- Logo y Header -->
			<div class="space-y-4">
			
				<!-- Icono principal con animación -->
				<div class="flex justify-center py-4">
					<div class="relative">
						<!-- Círculo animado de fondo -->
						<div class="absolute inset-0 bg-yellow-500/20 rounded-full animate-ping"></div>
						<div class="relative bg-yellow-500/10 p-6 rounded-full">
							<Clock class="h-16 w-16 text-yellow-600 dark:text-yellow-500" />
						</div>
					</div>
				</div>

				<!-- Título -->
				<div class="text-center space-y-2">
					<h1 class="text-3xl font-bold text-[#0D1E3D] dark:text-white">
						Cuenta Pendiente de Aprobación
					</h1>
					<p class="text-sm text-muted-foreground">
						¡Tu registro fue exitoso!
					</p>
				</div>
			</div>

			<!-- Email del usuario -->
			{#if email}
				<div class="mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
					<Mail class="h-4 w-4 text-blue-600 dark:text-blue-400" />
					<span class="text-sm font-medium text-blue-900 dark:text-blue-100">{email}</span>
				</div>
			{/if}

			<!-- Mensaje principal -->
			<div class="mt-5 space-y-4">
				<p class="text-sm text-center text-muted-foreground">
					Un administrador necesita aprobar tu cuenta antes de que puedas acceder al sistema.
					Recibirás una notificación por correo electrónico una vez que tu cuenta sea activada.
				</p>

				<!-- Pasos siguientes -->
				<div class="bg-linear-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 border">
					<div class="flex items-start gap-3 mb-3">
						<Shield class="h-5 w-5 text-[#0D1E3D] dark:text-[#1A73C2] flex-shrink-0 mt-0.5" />
						<div>
							<p class="text-sm font-semibold text-[#0D1E3D] dark:text-white mb-2">
								¿Qué sucede ahora?
							</p>
						</div>
					</div>
					
					<div class="space-y-2.5">
						<div class="flex items-start gap-3">
							<div class="flex-shrink-0 w-6 h-6 rounded-full bg-[#0D1E3D]/10 flex items-center justify-center">
								<span class="text-xs font-bold text-[#0D1E3D]">1</span>
							</div>
							<p class="text-xs text-muted-foreground">
								Un administrador revisará tu solicitud de acceso
							</p>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex-shrink-0 w-6 h-6 rounded-full bg-[#0D1E3D]/10 flex items-center justify-center">
								<span class="text-xs font-bold text-[#0D1E3D]">2</span>
							</div>
							<p class="text-xs text-muted-foreground">
								Recibirás un correo de confirmación cuando sea aprobada
							</p>
						</div>

						<div class="flex items-start gap-3">
							<div class="flex-shrink-0 w-6 h-6 rounded-full bg-[#0D1E3D]/10 flex items-center justify-center">
								<span class="text-xs font-bold text-[#0D1E3D]">3</span>
							</div>
							<p class="text-xs text-muted-foreground">
								Podrás iniciar sesión con tus credenciales
							</p>
						</div>
					</div>
				</div>

				<!-- Tiempo estimado -->
				<div class="flex items-center justify-center gap-2 text-xs text-muted-foreground">
					<CheckCircle2 class="h-4 w-4 text-green-600" />
					<span>Tiempo estimado de aprobación: 24-48 horas</span>
				</div>
			</div>

			<!-- Botones de acción -->
			<div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
	<Button
		href="/auth?mode=login"
		class="w-full h-11 text-sm font-semibold bg-[#0D1E3D] hover:bg-[#0D1E3D]/90"
	>
		Iniciar Sesión
	</Button>

	<Button
		href="/"
		variant="outline"
		class="w-full h-11 text-sm border-[#0D1E3D] text-[#0D1E3D] hover:bg-[#0D1E3D]/5"
	>
		Página Principal
	</Button>
</div>

			<!-- Footer de ayuda -->
			<div class="mt-4 text-center text-xs text-muted-foreground pt-3 border-t">
				¿Necesitas ayuda?{' '}
				<a 
					href="mailto:{siteConfig.contact.email}" 
					class="text-[#0D1E3D] font-medium hover:underline transition-colors"
				>
					Contactar Soporte
				</a>
			</div>
		</div>
	</div>

	<!-- Footer inferior -->
	<Footer />
</div>

<style>
	/* Animación de ping para el icono */
	@keyframes ping {
		75%, 100% {
			transform: scale(2);
			opacity: 0;
		}
	}

	.animate-ping {
		animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
	}
</style>