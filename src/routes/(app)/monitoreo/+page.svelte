<script lang="ts">
	/**
	 * Kit de Monitoreo.
	 *
	 * El panel lo genera el monitoring-kit como HTML independiente: trae sus
	 * propias ~900 líneas de CSS con un reset `*` y reglas sobre `body`, y no
	 * carga Tailwind ni el runtime de Svelte. Por eso se embebe en un iframe,
	 * que lo aísla de `app.css` — el mismo patrón que el kit ya usa para su
	 * monitor de recursos.
	 *
	 * `?embed=1` le quita su cabecera y su pie: la navbar la pone el layout de
	 * `(app)`, y los accesos y acciones que vivían en esa cabecera se reubican
	 * dentro de la propia vista conservando sus handlers.
	 *
	 * Al colgar de `(app)` queda protegido por el guard de sesión, igual que el
	 * resto de los módulos.
	 */
	import { mode } from 'mode-watcher';
	import { siteConfig } from '$lib/config/site';

	let iframe = $state<HTMLIFrameElement | null>(null);
	/** Alto de reserva hasta que se puede medir el contenido real. */
	let alto = $state(900);
	let observador: ResizeObserver | undefined;

	/**
	 * El iframe crece hasta el alto de su contenido para que scrollee la página
	 * y no aparezca una segunda barra. Es del mismo origen, así que el alto se
	 * mide directamente sobre su documento.
	 *
	 * Las tablas y el visor JSON tienen su propio `max-height` con scroll
	 * interno, así que el documento no crece sin límite y sus encabezados
	 * `sticky` siguen funcionando.
	 */
	function alMontarIframe() {
		const doc = iframe?.contentDocument;
		if (!doc?.documentElement) return;

		const medir = () => {
			const h = doc.documentElement.scrollHeight;
			if (h > 0) alto = h;
		};
		medir();

		// El documento se reemplaza si el iframe vuelve a navegar: se descarta el
		// observer anterior para no dejarlo colgado.
		observador?.disconnect();
		observador = new ResizeObserver(medir);
		observador.observe(doc.documentElement);
	}

	$effect(() => () => observador?.disconnect());

	/**
	 * Red de seguridad para el tema: el documento embebido ya escucha el evento
	 * `storage`, pero este aviso directo cubre el caso de que el navegador no lo
	 * entregue entre contextos.
	 */
	$effect(() => {
		const actual = mode.current;
		iframe?.contentWindow?.postMessage({ type: 'sx-theme', mode: actual }, location.origin);
	});
</script>

<svelte:head>
	<title>Kit de Monitoreo - {siteConfig.title}</title>
</svelte:head>

<iframe
	bind:this={iframe}
	onload={alMontarIframe}
	class="panel-monitoreo"
	src="/health/dashboard?embed=1"
	title="Panel de monitoreo del sistema"
	style="height:{alto}px"
></iframe>

<style>
	/*
	 * El panel va a sangre. `(app)/+layout.svelte` envuelve el contenido en un
	 * contenedor con padding (`p-2 sm:p-5 sm:py-0 md:pt-5`); sin cancelarlo, en
	 * modo oscuro se ve un marco del fondo de la app (#03060B, casi negro)
	 * alrededor del panel, que es azul noche.
	 *
	 * Los márgenes negativos replican ese padding y el ancho lo recupera con
	 * calc(). Un iframe es un elemento reemplazado: `width: auto` NO se estira
	 * al contenedor como haría un bloque normal, sino que cae a su ancho
	 * intrínseco de 300px. Por eso el ancho se declara explícito.
	 *
	 * El margen superior negativo no tapa el breadcrumb: solo sube el iframe
	 * hasta el borde del contenedor, que es donde termina aquel.
	 */
	.panel-monitoreo {
		display: block;
		border: 0;
		width: calc(100% + 1rem); /* p-2 → 0.5rem por lado */
		margin: -0.5rem;
	}
	@media (min-width: 640px) {
		.panel-monitoreo {
			/* sm:p-5 sm:py-0 → 1.25rem a los lados, 0 arriba y abajo */
			width: calc(100% + 2.5rem);
			margin: 0 -1.25rem;
		}
	}
	@media (min-width: 768px) {
		.panel-monitoreo {
			/* md:pt-5 → vuelve el padding superior */
			width: calc(100% + 2.5rem);
			margin: -1.25rem -1.25rem 0;
		}
	}
</style>
