<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import { toast } from 'svelte-sonner';
	import { Mail, Lock, ShieldCheck } from 'lucide-svelte';

	let {
		title,
		description,
		form,
		formAction,
		formData,
		buttonText,
		submitting,
		message,
		successMessage = null,
		showForgotPassword = false,
		showPasswordToggle = false,
		footerText,
		footerLinkText,
		footerLinkHref,
		enhance
	} = $props();

	// Mostrar mensajes estilo toast
	$effect(() => {
		if (message) toast.error(message, { duration: 4000 });
		if (successMessage) toast.success(successMessage, { duration: 4000 });
	});

	// Detectar si esta acción es de registro
	const isRegister = formAction.includes('register');
</script>

<!-- Formulario sin card, más amplio y espacioso -->
<div class="w-full space-y-6">
	<!-- Header (opcional, solo si title no está vacío) -->
	{#if title}
		<div class="space-y-2">
			<h2 class="text-2xl font-bold text-foreground">{title}</h2>
			{#if description}
				<p class="text-sm text-muted-foreground">{description}</p>
			{/if}
		</div>
	{/if}

	<form
		method="POST"
		action={formAction}
		class="space-y-5"
		use:enhance
		onsubmit={(e) => {
			console.log('[AuthForm] Formulario enviado');
			console.log('[AuthForm] Acción:', formAction);
			console.log('[AuthForm] URL actual:', window.location.href);
			console.log('[AuthForm] Atributo action real:', e.currentTarget.action);
		}}
	>
		<!-- Email -->
		<div class="space-y-2">
			<Form.Field {form} name="email">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label class="text-sm font-medium text-foreground flex items-center gap-2">
							<Mail class="h-4 w-4 text-[#0D1E3D] dark:text-[#1A73C2]" />
							Correo Electrónico
						</Form.Label>
						<Input
							{...props}
							type="email"
							placeholder="tu@ejemplo.com"
							class="mt-2 h-12 text-base border-gray-300 dark:border-gray-700 focus:border-[#0D1E3D] dark:focus:border-[#1A73C2] focus:ring-[#0D1E3D] dark:focus:ring-[#1A73C2]"
							disabled={submitting}
							bind:value={$formData.email}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors class="text-xs mt-1.5" />
			</Form.Field>
		</div>

		<!-- Password y Confirm Password - Grid de 2 columnas si es registro -->
		{#if isRegister}
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<!-- Password -->
				<div class="space-y-2">
					<Form.Field {form} name="password">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label class="text-sm font-medium text-foreground flex items-center gap-2">
									<Lock class="h-4 w-4 text-[#0D1E3D] dark:text-[#1A73C2]" />
									Contraseña
								</Form.Label>
								<Input
									{...props}
									type="password"
									placeholder="••••••••"
									class="mt-2 h-12 text-base border-gray-300 dark:border-gray-700 focus:border-[#0D1E3D] dark:focus:border-[#1A73C2] focus:ring-[#0D1E3D] dark:focus:ring-[#1A73C2]"
									disabled={submitting}
									bind:value={$formData.password}
								/>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors class="text-xs mt-1.5" />
					</Form.Field>
				</div>

				<!-- Confirm Password -->
				<div class="space-y-2">
					<Form.Field {form} name="confirmPassword">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label class="text-sm font-medium text-foreground flex items-center gap-2">
									<ShieldCheck class="h-4 w-4 text-[#0D1E3D] dark:text-[#1A73C2]" />
									Confirmar
								</Form.Label>
								<Input
									{...props}
									type="password"
									placeholder="••••••••"
									class="mt-2 h-12 text-base border-gray-300 dark:border-gray-700 focus:border-[#0D1E3D] dark:focus:border-[#1A73C2] focus:ring-[#0D1E3D] dark:focus:ring-[#1A73C2]"
									disabled={submitting}
									bind:value={$formData.confirmPassword}
								/>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors class="text-xs mt-1.5" />
					</Form.Field>
				</div>
			</div>
		{:else}
			<!-- Password solo (para login) -->
			<div class="space-y-2">
				<Form.Field {form} name="password">
					<Form.Control>
						{#snippet children({ props })}
							<div class="flex justify-between items-center">
								<Form.Label class="text-sm font-medium text-foreground flex items-center gap-2">
									<Lock class="h-4 w-4 text-[#0D1E3D] dark:text-[#1A73C2]" />
									Contraseña
								</Form.Label>
							</div>

							<Input
								{...props}
								type="password"
								placeholder="••••••••"
								class="mt-2 h-12 text-base border-gray-300 dark:border-gray-700 focus:border-[#0D1E3D] dark:focus:border-[#1A73C2] focus:ring-[#0D1E3D] dark:focus:ring-[#1A73C2]"
								disabled={submitting}
								bind:value={$formData.password}
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors class="text-xs mt-1.5" />
				</Form.Field>
			</div>
		{/if}

		<!-- Submit button -->
		<Button 
			type="submit" 
			class="w-full h-12 text-base font-semibold bg-[#0D1E3D] hover:bg-[#0D1E3D]/90 dark:bg-[#0D1E3D] dark:hover:bg-[#0D1E3D]/80 transition-all" 
			disabled={submitting}
		>
			{#if submitting}
				<span class="flex items-center justify-center gap-2">
					<Spinner class="h-5 w-5" />
					<span>Procesando...</span>
				</span>
			{:else}
				{buttonText}
			{/if}
		</Button>

		<!-- Divider para login social -->
		<div class="relative my-6">
			<div class="absolute inset-0 flex items-center">
				<span class="w-full border-t border-gray-300 dark:border-gray-700"></span>
			</div>
			<div class="relative flex justify-center text-xs uppercase">
				<span class="bg-white dark:bg-gray-950 px-4 text-muted-foreground font-medium">
					O continuar con
				</span>
			</div>
		</div>
		<!-- Google Sign-In Button -->
	</form>

	<!-- Footer link -->
	<div class="text-center text-sm text-muted-foreground pt-4">
		{footerText}{' '}
		<a 
			href={footerLinkHref} 
			class="font-medium text-[#0D1E3D] hover:text-[#1A73C2] dark:text-[#1A73C2] dark:hover:text-[#1A73C2]/80 transition-colors"
		>
			{footerLinkText}
		</a>
	</div>
</div>