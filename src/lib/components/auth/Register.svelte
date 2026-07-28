<script lang="ts">
	/**
	 * @module RegisterPage
	 * @description Componente de registro de usuarios para el sistema SoporteXperto.
	 * Utiliza SuperForms + AuthForm para validación y envío del formulario.
	 */

	import { registerSchema, type RegisterSchema } from '$lib/features/auth/schemas/auth-schema';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import AuthForm from './AuthForm.svelte';
	import { siteConfig } from '$lib/config/site';
	import MainNav from '$lib/components/app/nav/main-nav.svelte';
	import Footer from '$lib/components/app/nav/footer.svelte';
	import { ShieldCheck, Info } from 'lucide-svelte';

	let props = $props<{
		data: {
			form: SuperValidated<Infer<RegisterSchema>>;
		};
	}>();

	const form = superForm(props.data.form, {
		validators: zodClient(registerSchema),
		validationMethod: 'auto',
		resetForm: false,
		invalidateAll: false,
		applyAction: true,

		onSubmit: () => {
			console.log('[Register] Enviando formulario...');
		},

		onResult: ({ result }) => {
			console.log('[Register] Resultado:', result);
		},

		onError: ({ result }) => {
			console.error('[Register] Error:', result);
		}
	});

	const { enhance, submitting, form: formData, errors, message } = form;

	$effect(() => {
		console.log('[Register] Errores:', $errors);
		console.log('[Register] Mensaje:', $message);
	});
</script>

<!-- ✅ Contenedor principal con altura exacta de viewport -->
<div class="h-screen flex flex-col">
	<!-- Navbar superior -->
	<MainNav />

	<!-- Contenedor principal - permite scroll si es necesario -->
	<div class="flex-1 flex items-center justify-center bg-linear-to-br from-white to-slate-50 dark:from-gray-950 dark:to-gray-900 overflow-auto">
		<!-- Formulario de Register -->
		<div class="w-full max-w-lg px-6 py-6">
			<!-- Logo y Header -->
			<div class="space-y-3">
				<!-- Logo SoporteXperto -->
				<div class="flex items-center gap-3">
					<img 
						src="/logo-soportexperto.png" 
						alt="SoporteXperto Logo" 
						class="h-12 w-auto"
					/>
				</div>

				<!-- Título y Badge en línea -->
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-[#0D1E3D] dark:text-white">
							Crear Cuenta
						</h1>
						<p class="text-sm text-muted-foreground mt-1">
							Solicita acceso al sistema
						</p>
					</div>
					
					<!-- Badge de seguridad -->
					<div class="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-medium">
						<ShieldCheck class="h-3.5 w-3.5" />
						<span>SSL</span>
					</div>
				</div>
			</div>

			<!-- Info box: Proceso de aprobación -->
			<div class="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5">
				<div class="flex gap-2">
					<Info class="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
					<p class="text-xs text-blue-800 dark:text-blue-200">
						<span class="font-medium">Aprobación requerida:</span> Tu cuenta será revisada por un administrador.
					</p>
				</div>
			</div>

			<!-- Formulario -->
			<div class="mt-4">
				<AuthForm
					title=""
					description=""
					{form}
					{formData}
					formAction="/auth?/register"
					buttonText="Crear Cuenta"
					submitting={$submitting}
					message={$message}
					footerText="¿Ya tienes una cuenta?"
					footerLinkText="Inicia sesión"
					footerLinkHref="/auth?mode=login"
					{enhance}
					showPasswordToggle={true}
				/>
			</div>

			<!-- Footer: Términos y Contacto -->
			<div class="mt-3 space-y-2 text-xs text-muted-foreground">
				<div class="text-center pt-2 border-t">
					Al registrarte aceptas{' '}
					<a 
						href="/terms" 
						class="text-[#0D1E3D] hover:underline transition-colors"
					>
						Términos
					</a>
					{' '}y{' '}
					<a 
						href="/privacy" 
						class="text-[#0D1E3D] hover:underline transition-colors"
					>
						Privacidad
					</a>
				</div>
				<div class="text-center">
					Contacto:{' '}
					<a 
						href="mailto:{siteConfig.contact.email}" 
						class="text-[#0D1E3D] hover:underline transition-colors"
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