<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import AuthForm from './AuthForm.svelte';
	import { loginSchema } from '$lib/features/auth/schemas/auth';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { AUTH_PATHS } from '$lib/features/auth/config/auth';
	import { User } from "lucide-svelte";
	import { invalidateAll } from '$app/navigation';
	
	let { data = { form: {} }, successMessage = null } = $props<{
		data?: any;
		successMessage?: string | null;
	}>();
	
	let open = $state(false);
	
	const form = superForm(data.form ?? { email: '', password: '' }, {
		validators: zodClient(loginSchema),
		validationMethod: 'onsubmit',
		resetForm: true,
		// 🔥 AQUÍ ESTÁ LA CLAVE PARA EL MODAL:
        onResult: async ({ result }) => {
            // Como el servidor ahora devuelve 'success' (200) y no redirect:
            if (result.type === 'success') {
                open = false;       // 1. Cerramos el modal
                await invalidateAll(); // 2. Recargamos la sesión (el usuario aparece logueado)
                // 3. NO hacemos goto. El usuario se queda en la misma página.
            }
        }
	});
	
	const { enhance, message, submitting, form: formData } = form;
</script>

<Dialog.Root bind:open>
	<!-- Trigger Button -->
	<Dialog.Trigger 
	class="p-2 rounded-full hover:bg-accent transition-all duration-200"
		aria-label="Iniciar sesión"
	>
		<User class="w-6 h-6 text-blue-600" />
	</Dialog.Trigger>

	<!-- Modal -->
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
		<Dialog.Content
			class="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
				   bg-card rounded-2xl shadow-2xl max-w-md w-[calc(100%-2rem)] sm:w-full
				   max-h-[90vh] overflow-y-auto"
		>
			<!-- Header del Modal -->
			<div class="sticky top-0 bg-card border-b border-border px-6 py-4 rounded-t-2xl">
				<Dialog.Title class="text-2xl font-bold text-foreground">
					Iniciar Sesión
				</Dialog.Title>
				<Dialog.Description class="text-sm text-muted-foreground mt-1">
					Accede a tu cuenta de SX - SoporteXperto
				</Dialog.Description>

			</div>

			<!-- Contenido del Formulario -->
			<div class="px-6 py-6">
				<AuthForm
					title=""
					description=""
					{form}
					{formData}
					formAction="/auth?/login"
					buttonText="Iniciar sesión"
					submitting={$submitting}
					message={$message}
					{successMessage}
					showForgotPassword={true}
					footerText="¿No tienes cuenta?"
					footerLinkText="Regístrate"
					footerLinkHref={AUTH_PATHS.REGISTER}
					{enhance}
				/>

				<!-- Ayuda adicional -->
				<div class="text-center text-xs text-muted-foreground mt-6 pt-6 border-t border-border">
					¿Necesitas ayuda?
					<a 
						href="/auth/reset" 
						class="text-blue-600 hover:text-blue-700 font-medium ml-1 transition-colors"
					>
						Recuperar contraseña
					</a>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>