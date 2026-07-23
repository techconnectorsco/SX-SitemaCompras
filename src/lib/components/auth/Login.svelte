<script lang="ts">
	/**
	 * @module LoginPage
	 * @description Componente de inicio de sesión para el sistema VYO.
	 * Utiliza AuthForm para renderizar el formulario e integra SvelteKit SuperForms para validación del lado del cliente.
	 */
	import { loginSchema } from '$lib/features/auth/schemas/auth-schema';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import AuthForm from './AuthForm.svelte';
	import { AUTH_PATHS } from '$lib/features/auth/config/auth';
	import { siteConfig } from '$lib/config/site';
	import MainNav from '$lib/components/app/nav/main-nav.svelte';
	import Footer from '$lib/components/app/nav/footer.svelte';
	import { ShieldCheck } from 'lucide-svelte';

	let {
		data,
		successMessage = null
	} = $props<{
		data: { form: SuperValidated<Infer<typeof loginSchema>> };
		successMessage?: string | null;
	}>();

	const form = superForm(data.form, {
		validators: zodClient(loginSchema),
		validationMethod: 'onsubmit'
	});

	const { enhance, message, submitting, form: formData } = form;
</script>

<!-- ✅ Contenedor principal con altura exacta de viewport -->
<div class="h-screen flex flex-col">
	<!-- Navbar superior -->
	<MainNav />

	<!-- Contenedor principal - flex-1 sin overflow -->
	<div class="flex-1 flex items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-gray-950 dark:to-gray-900 overflow-hidden">
		<!-- Formulario de Login más ancho -->
		<div class="w-full max-w-lg px-6 py-4">
			<!-- Logo y Header -->
			<div class="space-y-4">
				<!-- Logo VYO -->
				<div class="flex items-center gap-3">
					<img 
						src="/grupovyo-removebg-preview.png" 
						alt="Grupo VYO Logo" 
						class="h-12 w-auto"
					/>
				</div>

				<!-- Título y Badge en línea -->
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-[#253166] dark:text-white">
							Bienvenido
						</h1>
						<p class="text-sm text-muted-foreground mt-1">
							Ingresa tus credenciales para acceder al sistema
						</p>
					</div>
					
					<!-- Badge de seguridad -->
					<div class="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-medium">
						<ShieldCheck class="h-3.5 w-3.5" />
						<span>SSL</span>
					</div>
				</div>
			</div>

			<!-- Formulario -->
			<div class="mt-6">
				<AuthForm
					title=""
					description=""
					{form}
					{formData}
					formAction="?/login"
					buttonText="Iniciar Sesión"
					submitting={$submitting}
					message={$message}
					{successMessage}
					showForgotPassword={true}
					footerText="¿No tienes una cuenta?"
					footerLinkText="Solicitar acceso"
					footerLinkHref={AUTH_PATHS.REGISTER}
					{enhance}
				/>
			</div>

			<!-- Footer de ayuda -->
			<!-- Footer de ayuda -->
<div class="mt-4 flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
	<div>
		¿Olvidaste tu contraseña? Contacta al administrador
	</div>
	<div>
		<a 
			href="mailto:{siteConfig.contact.email}" 
			class="text-[#253166] hover:underline transition-colors"
		>
			{siteConfig.contact.email}
		</a>
	</div>
</div>
		</div>
	</div>

	<!-- Footer inferior -->
	<Footer />
</div>