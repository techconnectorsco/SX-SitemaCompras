<script lang="ts">
	import ChatButton from './ChatButton.svelte';
	import ChatHeader from './ChatHeader.svelte';
	import ChatBubble from './ChatBubble.svelte';
	import ChatInput from './ChatInput.svelte';
	import { chatStore } from './chat-store.svelte';
	import type { MensajeUI, RespuestaApi, ContextoPantalla } from './tipos';

	interface Props {
		/** Si el usuario está autenticado. Si es false, el chat no se muestra. */
		autenticado?: boolean;
		/** Contexto opcional: si el popup se abre dentro de un PROC o SKU. */
		codigoProcesamiento?: string;
		codigoSku?: string;
		titulo?: string;
	}
	let {
		autenticado = true,
		codigoProcesamiento,
		codigoSku,
		titulo = 'Bitta'
	}: Props = $props();

	const TIMEOUT_MS = 120000; // 120s: una consulta con varias herramientas puede tardar.
	const MAX_CARACTERES = 1000;

	let abierto = $state(false);
	let cargando = $state(false);
	let enLinea = $state(true);
	let contenedor: HTMLDivElement | null = $state(null);
	let textoSugerido = $state(''); // para precargar el input desde una sugerencia
	let controlador: AbortController | null = null;

	// El estado de los mensajes vive en el store (sobrevive cambios de ruta).
	const contexto: ContextoPantalla = $derived({
		codigoProcesamiento,
		codigoSku,
		ruta: typeof window !== 'undefined' ? window.location.pathname : undefined
	});

	// Sugerencias: 1 contextual (si hay SKU) + 3 fijas que siempre funcionan.
	const sugerencias = $derived.by(() => {
		const fijas = [
			{ texto: '¿Qué compras debo priorizar hoy?', enviar: true },
			{ texto: '¿Dónde tengo mayor riesgo de quiebre?', enviar: true },
			{ texto: '¿Dónde estoy inmovilizando dinero?', enviar: true }
		];
		if (codigoSku) {
			// Contextual: rellena el campo (no envía) para que el usuario confirme.
			return [
				{ texto: `Analizá el SKU ${codigoSku} y dame tu recomendación`, enviar: false },
				...fijas.slice(0, 3)
			];
		}
		return fijas;
	});

	function toggle() {
		abierto = !abierto;
		if (abierto && !chatStore.historialCargado) {
			chatStore.historialCargado = true;
			cargarHistorial();
		}
	}

	function usarSugerencia(s: { texto: string; enviar: boolean }) {
		if (s.enviar) {
			enviar(s.texto);
		} else {
			// Precarga el campo de texto para que el usuario edite y confirme.
			textoSugerido = s.texto;
		}
	}

	/** Carga el historial reciente (24h) y lo muestra como mensajes previos. */
	async function cargarHistorial() {
		try {
			const r = await fetch('/api/ia');
			if (!r.ok) return;
			const data = await r.json();
			if (!data?.historial?.length) return;
			const previos: MensajeUI[] = [];
			for (const h of data.historial) {
				if (h.pregunta) previos.push({ rol: 'usuario', texto: h.pregunta });
				if (h.respuesta) previos.push({ rol: 'modelo', texto: h.respuesta });
			}
			chatStore.mensajes = [...previos, ...chatStore.mensajes];
		} catch {
			// Si falla, el chat sigue funcionando sin historial.
		}
	}

	$effect(() => {
		// Auto-scroll inteligente: solo baja si el usuario ya está cerca del fondo.
		if (chatStore.mensajes.length && contenedor) {
			const cerca = contenedor.scrollHeight - contenedor.scrollTop - contenedor.clientHeight < 120;
			if (cerca) contenedor.scrollTop = contenedor.scrollHeight;
		}
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const on = () => (enLinea = true);
		const off = () => (enLinea = false);
		enLinea = navigator.onLine;
		window.addEventListener('online', on);
		window.addEventListener('offline', off);
		return () => {
			window.removeEventListener('online', on);
			window.removeEventListener('offline', off);
		};
	});

	function detener() {
		controlador?.abort();
	}

	async function enviar(texto: string) {
		if (!enLinea) {
			chatStore.mensajes = [
				...chatStore.mensajes,
				{ rol: 'usuario', texto },
				{
					rol: 'modelo',
					texto: 'Estás sin conexión a internet. Revisá tu red e intentá de nuevo.',
					error: true,
					reintentar: texto
				}
			];
			return;
		}

		chatStore.mensajes = [...chatStore.mensajes, { rol: 'usuario', texto }];
		cargando = true;

		const historial = chatStore.mensajes
			.slice(0, -1)
			.filter((m) => !m.error)
			.map((m) => ({ rol: m.rol, texto: m.texto }));

		controlador = new AbortController();
		const timeout = setTimeout(() => controlador?.abort(), TIMEOUT_MS);

		try {
			const r = await fetch('/api/ia', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mensaje: texto,
					contexto,
					historial,
					conversacionId: chatStore.conversacionId
				}),
				signal: controlador.signal
			});

			const data: RespuestaApi = await r.json();

			chatStore.mensajes = [
				...chatStore.mensajes,
				{
					rol: 'modelo',
					texto: data.respuesta || 'No recibí respuesta.',
					costo: data.costo,
					error: !data.ok,
					reintentar: !data.ok ? texto : undefined
				}
			];

			if (data.costo) {
				chatStore.costoSesion += data.costo.precioFinal;
				chatStore.moneda = data.costo.moneda;
			}
		} catch (e) {
			const abortado = e instanceof DOMException && e.name === 'AbortError';
			chatStore.mensajes = [
				...chatStore.mensajes,
				{
					rol: 'modelo',
					texto: abortado
						? 'La consulta se detuvo o tardó demasiado. Podés intentar de nuevo.'
						: 'No pude conectar con el servidor. Intentá de nuevo.',
					error: true,
					reintentar: texto
				}
			];
		} finally {
			clearTimeout(timeout);
			controlador = null;
			cargando = false;
		}
	}

	function reintentar(texto: string) {
		// Quitar el último mensaje de error antes de reintentar.
		const m = [...chatStore.mensajes];
		if (m.length && m[m.length - 1].error) m.pop();
		// Quitar también la pregunta que quedó sin responder, para no duplicar.
		if (m.length && m[m.length - 1].rol === 'usuario' && m[m.length - 1].texto === texto) m.pop();
		chatStore.mensajes = m;
		enviar(texto);
	}
</script>

{#if autenticado}
	<ChatButton {abierto} onToggle={toggle} />
{/if}

{#if autenticado && abierto}
	<div class="ventana">
		<ChatHeader
			{titulo}
			costoSesion={chatStore.costoSesion}
			moneda={chatStore.moneda}
			onCerrar={toggle}
		/>

		<div class="cuerpo" bind:this={contenedor}>
			{#if chatStore.mensajes.length === 0}
				<div class="vacio">
					<p class="saludo">Hola, soy tu asistente de compras.</p>
					<p class="sub">Elegí una pregunta o escribí la tuya:</p>
					<div class="sugerencias">
						{#each sugerencias as s (s.texto)}
							<button class="chip" onclick={() => usarSugerencia(s)}>{s.texto}</button>
						{/each}
					</div>
				</div>
			{:else if chatStore.historialCargado}
				<div class="aviso-historial">Mostrando tus consultas de las últimas 24 horas</div>
			{/if}

			{#each chatStore.mensajes as m, i (i)}
				<ChatBubble mensaje={m} />
				{#if m.error && m.reintentar}
					<div class="fila-reintento">
						<button class="btn-reintento" onclick={() => reintentar(m.reintentar!)}>
							↻ Reintentar
						</button>
					</div>
				{/if}
			{/each}

			{#if cargando}
				<div class="cargando-fila">
					<div class="escribiendo"><span></span><span></span><span></span></div>
					<button class="btn-detener" onclick={detener}>Detener</button>
				</div>
			{/if}
		</div>

		{#if !enLinea}
			<div class="offline">Sin conexión a internet</div>
		{/if}

		<ChatInput
			{cargando}
			maxCaracteres={MAX_CARACTERES}
			precargar={textoSugerido}
			onEnviar={enviar}
		/>
	</div>
{/if}

<style>
	.ventana {
		position: fixed;
		bottom: 5.5rem;
		right: 1.5rem;
		width: 380px;
		max-width: calc(100vw - 2rem);
		height: 560px;
		max-height: calc(100vh - 8rem);
		display: flex;
		flex-direction: column;
		background: #fff;
		border-radius: 12px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
		z-index: 1000;
		overflow: hidden;
	}
	.cuerpo {
		flex: 1;
		overflow-y: auto;
		padding: 0.8rem;
		background: #f8fafc;
	}
	.vacio {
		text-align: center;
		color: #64748b;
		margin-top: 1.5rem;
	}
	.saludo {
		font-size: 0.95rem;
		font-weight: 500;
		color: #334155;
	}
	.sub {
		font-size: 0.8rem;
		margin-top: 0.2rem;
		margin-bottom: 0.9rem;
	}
	.sugerencias {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: 0 0.5rem;
	}
	.chip {
		background: #fff;
		border: 1px solid #d6e0ee;
		color: #1d4ed8;
		border-radius: 10px;
		padding: 0.5rem 0.7rem;
		font-size: 0.82rem;
		cursor: pointer;
		text-align: left;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.chip:hover {
		background: #eff5ff;
		border-color: #1d4ed8;
	}
	.aviso-historial {
		text-align: center;
		font-size: 0.72rem;
		color: #94a3b8;
		padding: 0.3rem 0;
		margin-bottom: 0.5rem;
		border-bottom: 1px dashed #e2e8f0;
	}
	.fila-reintento {
		display: flex;
		justify-content: flex-start;
		margin: -0.3rem 0 0.6rem 0;
	}
	.btn-reintento {
		background: #fff;
		border: 1px solid #fecaca;
		color: #b91c1c;
		border-radius: 8px;
		padding: 0.3rem 0.7rem;
		font-size: 0.78rem;
		cursor: pointer;
	}
	.btn-reintento:hover {
		background: #fef2f2;
	}
	.cargando-fila {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.3rem 0.2rem;
	}
	.escribiendo {
		display: flex;
		gap: 4px;
	}
	.escribiendo span {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #2348c8;
		animation: parpadeo 1.2s infinite ease-in-out;
	}
	.escribiendo span:nth-child(2) {
		animation-delay: 0.2s;
	}
	.escribiendo span:nth-child(3) {
		animation-delay: 0.4s;
	}
	.btn-detener {
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
		color: #475569;
		border-radius: 8px;
		padding: 0.25rem 0.6rem;
		font-size: 0.75rem;
		cursor: pointer;
	}
	.btn-detener:hover {
		background: #e2e8f0;
	}
	.offline {
		background: #fef3c7;
		color: #92400e;
		text-align: center;
		font-size: 0.76rem;
		padding: 0.35rem;
	}
	@keyframes parpadeo {
		0%,
		80%,
		100% {
			opacity: 0.3;
		}
		40% {
			opacity: 1;
		}
	}
</style>
