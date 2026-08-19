<script lang="ts">
    import { loginSchema } from '$lib/features/auth/schemas/auth';
    import type { SuperValidated, Infer } from 'sveltekit-superforms';
    import { superForm } from 'sveltekit-superforms';
    import { zodClient } from 'sveltekit-superforms/adapters';
    import AuthForm from './AuthForm.svelte';
    import { AUTH_PATHS } from '$lib/features/auth/config/auth';
    import { siteConfig } from '$lib/config/site';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';

    // 2. DEFINIR TIPOS AFUERA PARA EVITAR EL ERROR DE TS
    interface Props {
        data: { form: SuperValidated<Infer<typeof loginSchema>> };
        successMessage?: string | null;
        redirectOnSuccess?: boolean;
    }

    let {
        data,
        successMessage = null,
        redirectOnSuccess = false
    }: Props = $props();

    const form = superForm(data.form, {
        validators: zodClient(loginSchema),
        validationMethod: 'onsubmit',
        onResult: async ({ result }) => {
            if (result.type === 'success') {
                if (redirectOnSuccess) {
                    await goto('/');
                }
            }
        }
    });

    const { enhance, message, submitting, form: formData } = form;

    // 3. OBTENER URL DE FORMA REACTIVA (RUNES)
    // En $app/state, 'page' es un objeto reactivo, no un store ($).
    let redirectUrl = $derived(page.url.searchParams.get('redirect'));
</script>

<div class="flex min-h-screen items-center justify-center px-4 py-12 bg-gradient-to-br from-background to-muted">
    <div class="w-full max-w-md space-y-8">
        
        <div class="text-center space-y-3">
            <div class="flex justify-center mb-4">
                <a href="/" class="inline-block">
                    <img 
                        src={siteConfig.logo} 
                        alt={siteConfig.title}
                        class="h-16 w-auto"
                    />
                </a>
            </div>
            <h1 class="text-3xl font-bold text-foreground">
                ¡Bienvenido de nuevo! 👋
            </h1>
            <p class="text-base text-muted-foreground">
                Inicia sesión para acceder a tu cuenta de {siteConfig.title}
            </p>
        </div>

        <div class="bg-card rounded-2xl shadow-lg border border-border p-8">
            <AuthForm
                title=""
                description=""
                {form}
                {formData}
                
                formAction={redirectUrl ? `?/login&redirect=${encodeURIComponent(redirectUrl)}` : '?/login'}
                
                buttonText="Iniciar sesión"
                submitting={$submitting}
                message={$message}
                {successMessage}
                showForgotPassword={true}
                footerText="¿No tienes cuenta?"
                footerLinkText="Regístrate aquí"
                footerLinkHref={AUTH_PATHS.REGISTER}
                {enhance}
            />
        </div>

        <div class="text-center">
            <div class="inline-flex items-center gap-2 text-sm text-muted-foreground bg-card px-4 py-2 rounded-full shadow-sm border border-border">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>¿Necesitas ayuda?</span>
                <a 
                    href="/auth/reset" 
                    class="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                    Recuperar contraseña
                </a>
            </div>
        </div>

        <div class="text-center space-y-3">
            <div class="text-sm text-muted-foreground">
                Al continuar, aceptas nuestros
                <a href="/terminos" class="text-blue-600 hover:text-blue-700 font-medium">Términos de Servicio</a>
                y
                <a href="/privacidad" class="text-blue-600 hover:text-blue-700 font-medium">Política de Privacidad</a>
            </div>
        </div>
    </div>
</div>