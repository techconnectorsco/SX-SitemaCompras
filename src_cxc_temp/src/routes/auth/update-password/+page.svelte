<script lang="ts">
	import type { PageData } from './$types';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { updatePasswordSchema, type UpdatePasswordSchema } from '$lib/features/auth/schemas/auth';
	import { type SuperValidated, type Infer, superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { Spinner } from '$lib/components/ui/spinner';
	import { Key, Lock, Shield, CheckCircle2 } from 'lucide-svelte';
	import { siteConfig } from '$lib/config/site';

	let props = $props<{ data: { form: SuperValidated<Infer<typeof updatePasswordSchema>> } }>();

	const form = superForm<Infer<typeof updatePasswordSchema>>(props.data.form, {
		validators: zodClient(updatePasswordSchema),
		validationMethod: 'auto'
	});

	const { enhance, message, form: formData, submitting } = form;

	// Validador de fuerza de contraseña
	let passwordStrength = $derived.by(() => {
		const password = $formData.password || '';
		let strength = 0;
		
		if (password.length >= 8) strength++;
		if (password.length >= 12) strength++;
		if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
		if (/\d/.test(password)) strength++;
		if (/[^a-zA-Z0-9]/.test(password)) strength++;
		
		return {
			score: strength,
			label: strength === 0 ? '' : 
				   strength <= 2 ? 'Débil' : 
				   strength <= 3 ? 'Media' : 
				   strength <= 4 ? 'Fuerte' : 'Muy Fuerte',
			color: strength === 0 ? '' :
				   strength <= 2 ? 'bg-red-500' :
				   strength <= 3 ? 'bg-yellow-500' :
				   strength <= 4 ? 'bg-blue-500' : 'bg-green-500'
		};
	});
</script>

<!-- Contenedor principal con gradiente -->
<div class="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-purple-50 to-blue-50">
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
			<!-- Header con gradiente morado -->
			<div class="bg-gradient-to-br from-purple-50 to-indigo-50 border-b border-purple-100 px-8 py-10">
				<div class="flex flex-col items-center text-center space-y-4">
					<!-- Icono de llave -->
					<div class="bg-purple-500 rounded-2xl p-5 shadow-xl">
						<Key class="w-14 h-14 text-white" />
					</div>
					
					<!-- Título -->
					<div class="space-y-2">
						<h1 class="text-3xl font-bold text-gray-900">
							Nueva Contraseña
						</h1>
						<p class="text-lg text-gray-700">
							Crea una contraseña segura para tu cuenta
						</p>
					</div>
				</div>
			</div>

			<!-- Contenido -->
			<div class="px-8 py-8 space-y-6">
				<!-- Mensaje de error -->
				{#if $message}
					<div class="bg-red-50 border border-red-200 rounded-xl p-4">
						<p class="text-sm text-red-700 font-medium">
							{$message}
						</p>
					</div>
				{/if}

				<!-- Formulario -->
				<form method="POST" use:enhance class="space-y-6">
					<!-- Campo Nueva Contraseña -->
					<div class="space-y-2">
						<Form.Field {form} name="password">
							<Form.Control>
								{#snippet children({ props })}
									<Form.Label class="text-sm font-medium text-gray-700">
										Nueva Contraseña
									</Form.Label>
									<div class="relative">
										<div class="absolute left-3 top-1/2 -translate-y-1/2">
											<Lock class="w-5 h-5 text-gray-400" />
										</div>
										<Input
											{...props}
											type="password"
											bind:value={$formData.password}
											autocomplete="new-password"
											placeholder="••••••••"
											class="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
											disabled={$submitting}
										/>
									</div>
								{/snippet}
							</Form.Control>
							<Form.FieldErrors class="text-xs text-red-600 mt-1" />
						</Form.Field>

						<!-- Indicador de fuerza de contraseña -->
						{#if $formData.password}
							<div class="space-y-2">
								<div class="flex items-center justify-between text-xs">
									<span class="text-gray-600">Fuerza de la contraseña:</span>
									<span class="font-medium" class:text-red-600={passwordStrength.score <= 2} class:text-yellow-600={passwordStrength.score === 3} class:text-blue-600={passwordStrength.score === 4} class:text-green-600={passwordStrength.score === 5}>
										{passwordStrength.label}
									</span>
								</div>
								<div class="flex gap-1 h-2">
									{#each Array(5) as _, i}
										<div 
											class="flex-1 rounded-full transition-all {i < passwordStrength.score ? passwordStrength.color : 'bg-gray-200'}"
										></div>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<!-- Campo Confirmar Contraseña -->
					<div class="space-y-2">
						<Form.Field {form} name="confirmPassword">
							<Form.Control>
								{#snippet children({ props })}
									<Form.Label class="text-sm font-medium text-gray-700">
										Confirmar Contraseña
									</Form.Label>
									<div class="relative">
										<div class="absolute left-3 top-1/2 -translate-y-1/2">
											<Shield class="w-5 h-5 text-gray-400" />
										</div>
										<Input
											{...props}
											type="password"
											bind:value={$formData.confirmPassword}
											autocomplete="new-password"
											placeholder="••••••••"
											class="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
											showPasswordToggle
											disabled={$submitting}
										/>
									</div>
								{/snippet}
							</Form.Control>
							<Form.FieldErrors class="text-xs text-red-600 mt-1" />
						</Form.Field>
					</div>

					<!-- Requisitos de contraseña -->
						<div class="bg-purple-50 border border-purple-200 rounded-xl p-4">
							<div class="flex gap-3">
								<Shield class="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
								<div class="space-y-2 text-sm">
									<p class="font-medium text-purple-900">
										Tu contraseña debe contener:
									</p>
									<ul class="text-purple-700 space-y-1">
										<li class="flex items-center gap-2">
											<CheckCircle2 class="w-4 h-4 {($formData.password?.length >= 8) ? 'text-green-600' : 'text-gray-400'}" />
											<span class:line-through={$formData.password?.length >= 8}>Mínimo 8 caracteres</span>
										</li>
										<li class="flex items-center gap-2">
											<CheckCircle2 class="w-4 h-4 {/[A-Z]/.test($formData.password || '') ? 'text-green-600' : 'text-gray-400'}" />
											<span class:line-through={/[A-Z]/.test($formData.password || '')}>Al menos una mayúscula</span>
										</li>
										<li class="flex items-center gap-2">
											<CheckCircle2 class="w-4 h-4 {/[a-z]/.test($formData.password || '') ? 'text-green-600' : 'text-gray-400'}" />
											<span class:line-through={/[a-z]/.test($formData.password || '')}>Al menos una minúscula</span>
										</li>
										<li class="flex items-center gap-2">
											<CheckCircle2 class="w-4 h-4 {/\d/.test($formData.password || '') ? 'text-green-600' : 'text-gray-400'}" />
											<span class:line-through={/\d/.test($formData.password || '')}>Al menos un número</span>
										</li>
									</ul>
								</div>
							</div>
						</div>

					<!-- Botón Submit -->
					<Button 
						type="submit"
						class="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-lg transition-colors shadow-sm disabled:opacity-60"
						disabled={$submitting}
					>
						{#if $submitting}
							<span class="flex items-center justify-center gap-2">
								<Spinner class="w-4 h-4" />
								<span>Actualizando contraseña...</span>
							</span>
						{:else}
							Actualizar Contraseña
						{/if}
					</Button>
				</form>
			</div>
		</div>

		<!-- Información de seguridad -->
		<div class="text-center">
			<div class="inline-flex items-center gap-2 text-xs text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
				<Lock class="w-4 h-4 text-purple-600" />
				<span>Tu contraseña está encriptada y protegida</span>
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