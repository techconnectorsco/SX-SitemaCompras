<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle, Home, RefreshCw, HelpCircle } from 'lucide-svelte';
	import { siteConfig } from '$lib/config/site';
	
	const errorMessage = $page.url.searchParams.get('message') || 'Ocurrió un error durante la autenticación';
	
	// Mensajes de error comunes con soluciones
	const errorSolutions: Record<string, string> = {
		'invalid request: both auth code and code verifier should be non-empty': 'Hubo un problema con el proceso de autenticación. Por favor, intenta iniciar sesión nuevamente.',
		'User already registered': 'Ya existe una cuenta con este correo electrónico. Intenta iniciar sesión.',
		'Invalid login credentials': 'El correo o contraseña son incorrectos. Verifica tus datos e intenta nuevamente.',
		'Email not confirmed': 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.'
	};
	
	// Buscar solución para el error actual
	const suggestion = Object.entries(errorSolutions).find(([key]) => 
		errorMessage.toLowerCase().includes(key.toLowerCase())
	)?.[1];
</script>

<!-- Contenedor principal con gradiente -->
<div class="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-red-50 to-gray-50">
	<div class="w-full max-w-md space-y-6">
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

		<!-- Card de error -->
		<div class="bg-white rounded-2xl shadow-xl border-2 border-red-200 overflow-hidden">
			<!-- Header con color -->
			<div class="bg-red-50 border-b border-red-100 px-8 py-6">
				<div class="flex flex-col items-center text-center">
					<!-- Icono de error -->
					<div class="mb-4 rounded-full bg-red-100 p-4 ring-4 ring-red-50">
						<AlertCircle class="w-12 h-12 text-red-600" />
					</div>
					
					<!-- Título -->
					<h1 class="text-2xl font-bold text-gray-900 mb-2">
						Error de Autenticación
					</h1>
					
					<!-- Mensaje de error -->
					<div class="bg-white rounded-lg px-4 py-3 border border-red-200 max-w-sm">
						<p class="text-sm text-gray-700 font-medium">
							{errorMessage}
						</p>
					</div>
				</div>
			</div>

			<!-- Contenido -->
			<div class="px-8 py-6 space-y-6">
				<!-- Sugerencia si existe -->
				{#if suggestion}
					<div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
						<div class="flex gap-3">
							<HelpCircle class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
							<div class="space-y-1">
								<p class="text-sm font-medium text-blue-900">
									Sugerencia
								</p>
								<p class="text-sm text-blue-700">
									{suggestion}
								</p>
							</div>
						</div>
					</div>
				{/if}

				<!-- Acciones -->
				<div class="space-y-3">
					<Button 
						href="/auth?mode=login" 
						class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
					>
						<RefreshCw class="w-4 h-4 mr-2" />
						Intentar de Nuevo
					</Button>
					
					<Button 
						href="/" 
						variant="outline" 
						class="w-full border-gray-300 hover:bg-gray-50"
					>
						<Home class="w-4 h-4 mr-2" />
						Volver al Inicio
					</Button>
				</div>

				<!-- Separador -->
				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<span class="w-full border-t border-gray-200"></span>
					</div>
					<div class="relative flex justify-center text-xs">
						<span class="bg-white px-3 text-gray-500 font-medium">¿Necesitas ayuda?</span>
					</div>
				</div>

				<!-- Opciones de ayuda -->
				<div class="grid grid-cols-2 gap-3">
					<a 
						href="/auth/reset"
						class="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-center group"
					>
						<svg class="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
						</svg>
						<span class="text-xs font-medium text-gray-700 group-hover:text-blue-700">
							Recuperar<br/>Contraseña
						</span>
					</a>

					<a 
						href="/contacto"
						class="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-center group"
					>
						<svg class="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
						</svg>
						<span class="text-xs font-medium text-gray-700 group-hover:text-blue-700">
							Soporte<br/>Técnico
						</span>
					</a>
				</div>
			</div>
		</div>

		<!-- Información adicional -->
		<div class="text-center">
			<p class="text-xs text-gray-500">
				Si el problema persiste, por favor contacta a nuestro equipo de soporte
			</p>
		</div>
	</div>
</div>