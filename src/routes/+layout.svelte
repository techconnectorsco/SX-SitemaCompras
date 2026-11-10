<script>
	//import '../globals.css';
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';
	import { ModeWatcher } from 'mode-watcher';
	import { ChatWidget } from '$lib/components/ia-chat';
	import { page } from '$app/stores';

	let { data, children } = $props();
	// Solo obtenemos el user de SQLite auth, no necesitamos listeners
	let { user } = $derived(data);
</script>

<div class="relative flex min-h-screen flex-col">
	{@render children()}
</div>
<Toaster richColors duration={4000} />
<ModeWatcher />
<ChatWidget autenticado={!!$page.data.user} />
