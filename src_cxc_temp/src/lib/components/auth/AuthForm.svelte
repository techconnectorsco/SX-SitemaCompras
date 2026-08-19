<!-- ============================================================ -->
<!-- ARCHIVO: src/lib/components/auth/AuthForm.svelte              -->


<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import GoogleSignIn from './GoogleSignIn.svelte';
	import { toast } from 'svelte-sonner';
	import type { Snippet } from 'svelte';

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
		enhance,
		extraFields
	} = $props<{
		title: string;
		description: string;
		form: any;
		formAction: string;
		formData: any;
		buttonText: string;
		submitting: boolean;
		message: string | null;
		successMessage?: string | null;
		showForgotPassword?: boolean;
		showPasswordToggle?: boolean;
		footerText: string;
		footerLinkText: string;
		footerLinkHref: string;
		enhance: (node: HTMLFormElement) => void;
		extraFields?: Snippet;
	}>();

	$effect(() => {
		if (message) toast.error(message, { duration: 4000 });
		if (successMessage) toast.success(successMessage, { duration: 4000 });
	});
</script>

<div class="w-full space-y-6">
	<!-- Encabezado (solo si hay título) -->
	{#if title}
		<div class="flex flex-col space-y-2 text-center">
			<h1 class="text-2xl font-bold text-foreground">{title}</h1>
			{#if description}
				<p class="text-sm text-muted-foreground">{description}</p>
			{/if}
		</div>
	{/if}

	<!-- Formulario -->
	<form
		method="POST"
		action={formAction}
		class="space-y-4"
		use:enhance
	>
		<!-- Campo Email -->
		<div class="space-y-2">
			<Form.Field {form} name="email">
				<Form.Control>
					{#snippet children({ props }: { props: any })}
						<Form.Label class="text-sm font-medium text-foreground">
							Correo electrónico
						</Form.Label>
						<Input
							{...props}
							type="email"
							placeholder="correo@ejemplo.com"
							class="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
							disabled={submitting}
							bind:value={$formData.email}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors class="text-xs text-destructive mt-1" />
			</Form.Field>
		</div>

		<!-- Campo Contraseña -->
		<div class="space-y-2">
			<Form.Field {form} name="password">
				<Form.Control>
					{#snippet children({ props }: { props: any })}
						<div class="flex justify-between items-center">
							<Form.Label class="text-sm font-medium text-foreground">
								Contraseña
							</Form.Label>
							{#if showForgotPassword}
								<a 
									href="/auth/reset" 
									class="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
								>
									¿Olvidaste tu contraseña?
								</a>
							{/if}
						</div>
						<Input
							{...props}
							type="password"
							placeholder="••••••••"
							class="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
							disabled={submitting}
							bind:value={$formData.password}
							{showPasswordToggle}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors class="text-xs text-destructive mt-1" />
			</Form.Field>
		</div>

		<!-- ============================================ -->
		<!-- CAMPOS EXTRA (inyectados por Register.svelte) -->
		<!-- ============================================ -->
		{#if extraFields}
			{@render extraFields()}
		{/if}

		<!-- Botón de Submit -->
		<Button 
			type="submit" 
			class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
			disabled={submitting}
		>
			{#if submitting}
				<span class="flex items-center justify-center gap-2">
					<Spinner class="w-4 h-4" />
					<span>Procesando...</span>
				</span>
			{:else}
				{buttonText}
			{/if}
		</Button>

		<!-- Divisor -->
		<div class="relative my-6">
			<div class="absolute inset-0 flex items-center">
				<span class="w-full border-t border-border"></span>
			</div>
			<div class="relative flex justify-center text-xs">
				<span class="bg-card px-3 text-muted-foreground font-medium">O continúa con</span>
			</div>
		</div>

		<!-- Login con Google -->
		<div class:opacity-50={submitting} class:pointer-events-none={submitting}>
			<GoogleSignIn />
		</div>
	</form>

	<!-- Footer -->
	{#if footerText && footerLinkText}
		<div class="text-center text-sm text-muted-foreground">
			{footerText}
			<a 
				href={footerLinkHref} 
				class="text-blue-600 hover:text-blue-700 font-medium ml-1 transition-colors"
			>
				{footerLinkText}
			</a>
		</div>
	{/if}
</div>