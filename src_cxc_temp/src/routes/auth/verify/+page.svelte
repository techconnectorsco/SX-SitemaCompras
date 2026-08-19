<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { AUTH_PATHS } from '$lib/features/auth/config/auth';
	import { Mail, CheckCircle2, RefreshCw, ArrowLeft, ExternalLink } from 'lucide-svelte';
	import { siteConfig } from '$lib/config/site';

	let { data } = $props();
	let { email } = $derived(data);
	let currentEmail = $state('');

	$effect(() => {
		if (typeof window !== 'undefined') {
			const urlParams = new URL(window.location.href).searchParams;
			const urlEmail = urlParams.get('email');

			if (urlEmail) {
				currentEmail = urlEmail;
				return;
			}
		}

		if (email) {
			currentEmail = email;
		}
	});

	let resending = $state(false);
	let resendSuccess = $state(false);
	let resendError = $state('');

	function getEmailProviderInfo(email: string) {
		const domain = email.split('@')[1]?.toLowerCase();

		if (!domain) return { name: 'Correo', url: '' };

		if (domain.includes('gmail')) {
			return { name: 'Gmail', url: 'https://mail.google.com' };
		}

		if (
			domain.includes('outlook') ||
			domain.includes('hotmail') ||
			domain.includes('live') ||
			domain.includes('msn')
		) {
			return { name: 'Outlook', url: 'https://outlook.live.com' };
		}

		if (domain.includes('yahoo')) {
			return { name: 'Yahoo Mail', url: 'https://mail.yahoo.com' };
		}

		if (domain.includes('icloud') || domain.includes('me.com') || domain.includes('mac.com')) {
			return { name: 'iCloud Mail', url: 'https://www.icloud.com/mail' };
		}

		if (domain.includes('aol')) {
			return { name: 'AOL Mail', url: 'https://mail.aol.com' };
		}

		if (domain.includes('proton') || domain.includes('protonmail')) {
			return { name: 'ProtonMail', url: 'https://mail.proton.me' };
		}

		return { name: 'Correo', url: '' };
	}

	function openEmailProvider() {
		const { url } = getEmailProviderInfo(currentEmail);
		if (url) {
			window.open(url, '_blank');
		}
	}

	const handleSubmit = () => {
		resending = true;
		resendError = '';

		return async ({ result }: { result: { type: string; data?: Record<string, any> } }) => {
			resending = false;

			if (result.type === 'failure') {
				const data = result.data as { message?: string };
				resendError = data?.message || 'Error al reenviar el correo de verificación';
				return;
			}

			if (result.type === 'success') {
				resendSuccess = true;
				resendError = '';
				setTimeout(() => {
					resendSuccess = false;
				}, 5000);
			}
		};
	};
</script>

<!-- Contenedor principal con gradiente -->
<div class="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 to-purple-50">
	<div class="w-full max-w-lg space-y-8 animate-fade-in-up">
		<!-- Logo -->
		<div class="flex justify-center">
			<a href="/" class="inline-block">
				<img 
					src={siteConfig.logo} 
					alt={siteConfig.title}
					class="h-16 w-auto"
				/>
			</a>
		</div>

		<!-- Card principal -->
		<div class="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
			<!-- Header con gradiente azul -->
			<div class="bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-100 px-8 py-10">
				<div class="flex flex-col items-center text-center space-y-4">
					<!-- Icono de email con badge -->
					<div class="relative">
						<div class="bg-blue-500 rounded-2xl p-5 shadow-xl">
							<Mail class="w-14 h-14 text-white" />
						</div>
						<!-- Badge de notificación -->
						<div class="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-4 border-white animate-pulse"></div>
					</div>
					
					<!-- Título -->
					<div class="space-y-2">
						<h1 class="text-3xl font-bold text-gray-900">
							Verifica tu Correo
						</h1>
						<p class="text-lg text-gray-700">
							Estás a un paso de completar tu registro
						</p>
					</div>
				</div>
			</div>

			<!-- Contenido -->
			<div class="px-8 py-8 space-y-6">
				<!-- Mensaje principal -->
				<div class="text-center space-y-3">
					<p class="text-gray-700">
						Te hemos enviado un correo de verificación a:
					</p>
					{#if currentEmail}
						<div class="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
							<p class="font-bold text-gray-900 break-all">
								{currentEmail}
							</p>
						</div>
					{/if}
					<p class="text-sm text-gray-600 leading-relaxed">
						Por favor, revisa tu bandeja de entrada y haz click en el enlace de verificación para activar tu cuenta.
					</p>
				</div>

				<!-- Información adicional -->
				<div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
					<div class="flex gap-3">
						<Mail class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
						<div class="space-y-2 text-sm">
							<p class="font-medium text-blue-900">
								Consejos útiles:
							</p>
							<ul class="text-blue-700 space-y-1 list-disc list-inside">
								<li>Revisa tu carpeta de spam o correo no deseado</li>
								<li>El enlace de verificación expira en 24 horas</li>
								<li>Si no lo encuentras, puedes solicitar uno nuevo abajo</li>
							</ul>
						</div>
					</div>
				</div>

				<!-- Botones de acción -->
				<div class="space-y-3 pt-2">
					{#if currentEmail}
						{@const provider = getEmailProviderInfo(currentEmail)}
						{#if provider.url}
							<Button
								onclick={openEmailProvider}
								class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
							>
								<ExternalLink class="w-4 h-4 mr-2" />
								Abrir {provider.name}
							</Button>
						{/if}
					{/if}

					<Button
						variant="outline"
						onclick={() => goto(AUTH_PATHS.LOGIN)}
						class="w-full border-gray-300 hover:bg-gray-50"
					>
						<ArrowLeft class="w-4 h-4 mr-2" />
						Volver al inicio de sesión
					</Button>
				</div>

				<!-- Separador -->
				<div class="relative pt-4">
					<div class="absolute inset-0 flex items-center">
						<span class="w-full border-t border-gray-200"></span>
					</div>
					<div class="relative flex justify-center text-xs">
						<span class="bg-white px-3 text-gray-500 font-medium">¿No recibiste el correo?</span>
					</div>
				</div>

				<!-- Sección de reenvío -->
				<div class="text-center space-y-3">
					<p class="text-sm text-gray-600">
						Si no encuentras el correo, podemos enviarte uno nuevo
					</p>
					
					<form method="POST" action="?/resend" use:enhance={handleSubmit}>
						<input type="hidden" name="email" value={currentEmail} />
						<Button
							type="submit"
							variant="outline"
							class="w-full border-blue-300 hover:bg-blue-50 text-blue-600 font-medium"
							disabled={resending || resendSuccess}
						>
							{#if resending}
								<span class="flex items-center justify-center gap-2">
									<RefreshCw class="w-4 h-4 animate-spin" />
									<span>Enviando...</span>
								</span>
							{:else if resendSuccess}
								<span class="flex items-center justify-center gap-2 text-green-600">
									<CheckCircle2 class="w-4 h-4" />
									<span>¡Correo enviado exitosamente!</span>
								</span>
							{:else}
								<span class="flex items-center justify-center gap-2">
									<RefreshCw class="w-4 h-4" />
									<span>Reenviar correo de verificación</span>
								</span>
							{/if}
						</Button>
					</form>

					{#if resendError}
						<div class="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
							<p class="text-sm text-red-700">
								{resendError}
							</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Ayuda adicional -->
		<div class="text-center">
			<div class="inline-flex items-center gap-2 text-xs text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
				<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span>¿Problemas para verificar?</span>
				<a 
					href="/contacto" 
					class="text-blue-600 hover:text-blue-700 font-medium transition-colors"
				>
					Contáctanos
				</a>
			</div>
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

	.animate-fade-in-up {
		animation: fade-in-up 0.6s ease-out;
	}
</style>