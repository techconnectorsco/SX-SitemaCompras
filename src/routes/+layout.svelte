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
	let isCompras = $derived($page.url.pathname.startsWith('/AsistenteCompras'));

	let chatProps = $derived(
		isCompras
			? {
					titulo: 'SoporteXperto IA',
					saludoPrincipal: 'SoporteXperto IA',
					saludoHtml:
						'<p>También puedo responder consultas generales y consultar la información interna que tengas autorizada.</p>',
					saludoSub: 'Elegí una pregunta o escribí la tuya:',
					opcionesSugeridas: [
						{ texto: 'Revisar parámetros de cálculo', enviar: true },
						{ texto: 'Ajustar filtros de forecast', enviar: true },
						{ texto: 'Verificar errores de datos', enviar: true }
					]
				}
			: {}
	);
</script>

<div class="relative flex min-h-screen flex-col">
	{@render children()}
</div>
<Toaster richColors duration={4000} />
<ModeWatcher />
<ChatWidget autenticado={!!$page.data.user} {...chatProps} />
