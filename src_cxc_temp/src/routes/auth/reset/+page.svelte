<script lang="ts">
	import type { PageData } from './$types';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { resetPasswordSchema } from '$lib/features/auth/schemas/auth';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { Spinner } from '$lib/components/ui/spinner';
	import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-svelte';
	import { AUTH_PATHS } from '$lib/features/auth/config/auth';
	import { siteConfig } from '$lib/config/site';

	let { data } = $props<{ data: PageData }>();

	const form = superForm(data.form, {
		validators: zodClient(resetPasswordSchema as any)
	});

	const { enhance, message, form: formData, submitting } = form;
</script>

<!-- Contenedor principal con gradiente -->
<div class="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-gray-50 to-blue-50">
	<div class="w-full max-w-md space-y-8">
		<!-- Logo y Header -->
		<div class="text-center space-y-3">
			<!-- Logo -->
			<div class="flex justify-center mb-4">
				<a href="/" class="inline-block">
					<img 
						src={siteConfig.logo} 
						alt={siteConfig.title}
						class="h-16 w-auto"
					/>
				</a>
			</div>

			<!-- Título -->
			<h1 class="text-3xl font-bold text-gray-900">
				¿Olvidaste tu contraseña?
			</h1>
			<p class="text-base text-gray-600">
				No te preocupes, te ayudaremos a recuperarla
			</p>
		</div>

		<!-- Card principal -->
		<div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
			{#if $message}
				<!-- Mensaje de éxito -->
				<div class="space-y-6">
					<!-- Icono de éxito -->
					<div class="flex justify-center">
						<div class="bg-green-100 rounded-full p-4">
							<CheckCircle2 class="w-12 h-12 text-green-600" />
						</div>
					</div>

					<!-- Contenido -->
					<div class="text-center space-y-3">
						<h2 class="text-xl font-bold text-gray-900">
							¡Correo Enviado!
						</h2>
						<p class="text-sm text-gray-600 leading-relaxed">
							Si existe una cuenta con este correo electrónico, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
						</p>
					</div>

					<!-- Información adicional -->
					<div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
						<div class="flex gap-3">
							<Mail class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
							<div class="space-y-1 text-sm">
								<p class="font-medium text-blue-900">
									Revisa tu bandeja de entrada
								</p>
								<p class="text-blue-700">
									No olvides revisar tu carpeta de spam o correo no deseado si no lo encuentras.
								</p>
							</div>
						</div>
					</div>

					<!-- Botón volver -->
					<Button
						variant="outline"
						class="w-full"
						onclick={() => window.location.href = AUTH_PATHS.LOGIN}
					>
						<ArrowLeft class="w-4 h-4 mr-2" />
						Volver al inicio de sesión
					</Button>
				</div>
			{:else}
				<!-- Formulario -->
				<form method="POST" use:enhance class="space-y-6">
					<!-- Campo Email -->
					<div class="space-y-2">
						<Form.Field {form} name="email">
							<Form.Control>
								{#snippet children({ props })}
									<Form.Label class="text-sm font-medium text-gray-700">
										Correo electrónico
									</Form.Label>
									<Input
										{...props}
										type="email"
										bind:value={$formData.email}
										autocomplete="email"
										placeholder="tu@correo.com"
										class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
										disabled={$submitting}
									/>
								{/snippet}
							</Form.Control>
							<Form.FieldErrors class="text-xs text-red-600 mt-1" />
						</Form.Field>
					</div>

					<!-- Información de ayuda -->
					<div class="bg-gray-50 border border-gray-200 rounded-xl p-4">
						<div class="flex gap-3">
							<Mail class="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
							<div class="text-sm text-gray-600">
								<p>
									Ingresa el correo electrónico asociado a tu cuenta. Te enviaremos un enlace seguro para crear una nueva contraseña.
								</p>
							</div>
						</div>
					</div>

					<!-- Botón Submit -->
					<Button 
						type="submit"
						class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-60"
						disabled={$submitting}
					>
						{#if $submitting}
							<span class="flex items-center justify-center gap-2">
								<Spinner class="w-4 h-4" />
								<span>Enviando enlace...</span>
							</span>
						{:else}
							Enviar enlace de recuperación
						{/if}
					</Button>
				</form>
			{/if}
		</div>

		<!-- Link para volver -->
		{#if !$message}
			<div class="text-center">
				
					<a href={AUTH_PATHS.LOGIN}
					class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors font-medium"
				>
					<ArrowLeft class="w-4 h-4" />
					Volver al inicio de sesión
				</a>
			</div>
		{/if}

		<!-- Ayuda adicional -->
		<div class="text-center">
			<div class="inline-flex items-center gap-2 text-xs text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
				<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span>¿Necesitas más ayuda?</span>
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