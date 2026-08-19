<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-svelte';
	import { siteConfig } from '$lib/config/site';

	let countdown = $state(5);
	let email = $derived($page.url.searchParams.get('email') ?? '');

	onMount(() => {
		const interval = setInterval(() => {
			countdown--;
			if (countdown === 0) {
				clearInterval(interval);
				goto('/');
			}
		}, 1000);

		return () => clearInterval(interval);
	});
</script>

<!-- Contenedor principal con gradiente celebratorio -->
<div class="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 relative overflow-hidden">
	<!-- Elementos decorativos de fondo -->
	<div class="absolute inset-0 overflow-hidden pointer-events-none">
		<div class="absolute top-20 left-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
		<div class="absolute top-40 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
		<div class="absolute -bottom-8 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
	</div>

	<!-- Contenido principal -->
	<div class="relative z-10 w-full max-w-lg space-y-8 animate-fade-in-up">
		<!-- Logo -->
		<div class="flex justify-center">
			<a href="/" class="inline-block">
				<img 
					src={siteConfig.logo} 
					alt={siteConfig.title}
					class="h-12 w-auto"
				/>
			</a>
		</div>

		<!-- Card principal -->
		<div class="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
			<!-- Header con gradiente verde -->
			<div class="bg-gradient-to-br from-green-50 to-emerald-50 border-b border-green-100 px-8 py-10">
				<div class="flex flex-col items-center text-center space-y-4">
					<!-- Icono de éxito animado -->
					<div class="relative">
						<div class="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
						<div class="relative bg-green-500 rounded-full p-5 shadow-xl">
							<CheckCircle2 class="w-14 h-14 text-white" />
						</div>
					</div>
					
					<!-- Título -->
					<div class="space-y-2">
						<div class="flex items-center justify-center gap-2">
							<Sparkles class="w-6 h-6 text-green-600 animate-pulse" />
							<h1 class="text-3xl font-bold text-gray-900">
								¡Verificación Exitosa!
							</h1>
							<Sparkles class="w-6 h-6 text-green-600 animate-pulse" />
						</div>
						<p class="text-lg text-gray-700">
							Tu cuenta está lista para usar
						</p>
					</div>
				</div>
			</div>

			<!-- Contenido -->
			<div class="px-8 py-8 space-y-6">
				<!-- Información del email -->
				<div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
					<p class="text-sm text-gray-600 text-center">
						La cuenta{' '}
						<span class="font-bold text-gray-900 break-all">{email}</span>
						{' '}ha sido verificada correctamente
					</p>
				</div>

				<!-- Beneficios de la cuenta verificada -->
				<div class="space-y-3">
					<p class="text-sm font-semibold text-gray-700 text-center">
						Ahora puedes disfrutar de:
					</p>
					<div class="grid gap-2">
						{#each [
							'Acceso completo a todas las funcionalidades',
							'Guardar y gestionar tus propiedades favoritas',
							'Recibir notificaciones de nuevas propiedades',
							'Contactar directamente con propietarios'
						] as benefit}
							<div class="flex items-center gap-3 bg-green-50 rounded-lg px-4 py-2 border border-green-100">
								<CheckCircle2 class="w-5 h-5 text-green-600 flex-shrink-0" />
								<span class="text-sm text-gray-700">{benefit}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Contador y botones -->
				<div class="space-y-4 pt-4">
					<!-- Contador -->
					<div class="text-center">
						<div class="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2">
							<div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
							<span class="text-sm text-blue-700">
								Redirigiendo en <span class="font-bold text-blue-900">{countdown}</span> segundos
							</span>
						</div>
					</div>

					<!-- Botones -->
					<div class="space-y-3">
						<Button
							onclick={() => goto('/')}
							class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 text-base shadow-lg hover:shadow-xl transition-all"
						>
							<span>Ir al Inicio</span>
							<ArrowRight class="w-5 h-5 ml-2" />
						</Button>

						<Button
							onclick={() => goto('/propiedades')}
							variant="outline"
							class="w-full border-gray-300 hover:bg-gray-50 font-medium"
						>
							Explorar Propiedades
						</Button>
					</div>
				</div>
			</div>
		</div>

		<!-- Mensaje adicional -->
		<div class="text-center">
			<p class="text-sm text-gray-600">
				¡Bienvenido a {siteConfig.title}! 🎉
			</p>
		</div>
	</div>
</div>

<style>
	@keyframes fade-in-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes blob {
		0%, 100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(30px, -50px) scale(1.1);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.9);
		}
	}

	.animate-fade-in-up {
		animation: fade-in-up 0.8s ease-out;
	}

	.animate-blob {
		animation: blob 7s infinite;
	}

	.animation-delay-2000 {
		animation-delay: 2s;
	}

	.animation-delay-4000 {
		animation-delay: 4s;
	}
</style>