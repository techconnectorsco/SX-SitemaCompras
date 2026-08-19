<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';

	// SVELTE 5: Usamos $props para recibir la data y el slot (children)
	let { data, children } = $props();

	// Extraemos supabase and session de data
	let { supabase, session } = $derived(data);

	onMount(() => {
		// Escuchar cambios en la autenticación
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => subscription.unsubscribe();
	});
</script>

<ModeWatcher defaultMode="light" />

<div class="relative flex min-h-screen flex-col">
	{@render children()}
</div>

<Toaster richColors duration={4000} />