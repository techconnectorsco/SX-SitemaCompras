<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import { toast } from 'svelte-sonner';

	let loading = $state(false);

	async function signInWithGoogle() {
		loading = true;

		try {
			const supabase = $page.data.supabase;

			if (!supabase) {
				toast.error('Error de configuración');
				loading = false;
				return;
			}
			const rutaActual = window.location.pathname;
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					// Agregamos '?next=...' a la URL de callback
                    // encodeURIComponent es vital por si la ruta tiene caracteres especiales
                    redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(rutaActual)}`
				}
			});

			if (error) {
				console.error('Error:', error.message);
				toast.error('Error al conectar con Google');
				loading = false;
			}
		} catch (err: any) {
			console.error('Error inesperado:', err);
			toast.error('Ocurrió un error inesperado');
			loading = false;
		}
	}
</script>

<Button
	type="button"
	variant="outline"
	class="w-full flex items-center justify-center gap-3 py-2.5 border-2 border-input hover:border-ring hover:bg-accent rounded-lg transition-all font-medium text-foreground"
	onclick={signInWithGoogle}
	disabled={loading}
>
	{#if loading}
		<Spinner class="w-5 h-5" />
		<span>Conectando...</span>
	{:else}
		<img
			src="https://authjs.dev/img/providers/google.svg"
			alt="Google"
			class="w-5 h-5"
		/>
		<span>Continuar con Google</span>
	{/if}
</Button>