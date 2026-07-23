<script lang="ts">
	import type { MensajeUI } from './tipos';

	interface Props {
		mensaje: MensajeUI;
	}
	let { mensaje }: Props = $props();

	const esUsuario = $derived(mensaje.rol === 'usuario');

	const costoFmt = $derived(
		mensaje.costo
			? new Intl.NumberFormat('es-CR', {
					style: 'currency',
					currency: mensaje.costo.moneda,
					minimumFractionDigits: 4,
					maximumFractionDigits: 4
				}).format(mensaje.costo.precioFinal)
			: ''
	);

	/** Escapa HTML para evitar cualquier inyección (el texto se trata como datos). */
	function escapar(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	/** Formato en línea: **negrita**, *itálica*, `código`. */
	function inline(s: string): string {
		let t = escapar(s);
		t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
		t = t.replace(/`(.+?)`/g, '<code>$1</code>');
		// Itálica con _texto_ (evita tocar nombres con guion bajo internos).
		t = t.replace(/(^|\s)_(.+?)_(\s|$)/g, '$1<em>$2</em>$3');
		return t;
	}

	/**
	 * Convierte el Markdown simple que produce la IA en HTML seguro.
	 * Soporta: títulos (#, ##), listas con viñetas (*, -), listas numeradas (1.),
	 * negritas, código en línea y párrafos.
	 */
	function aHtml(texto: string): string {
		const lineas = texto.replace(/\r\n/g, '\n').split('\n');
		const out: string[] = [];
		let enUl = false;
		let enOl = false;

		const cerrarListas = () => {
			if (enUl) {
				out.push('</ul>');
				enUl = false;
			}
			if (enOl) {
				out.push('</ol>');
				enOl = false;
			}
		};

		for (const linRaw of lineas) {
			const lin = linRaw.trimEnd();
			if (!lin.trim()) {
				cerrarListas();
				continue;
			}

			// Títulos: ## Texto / # Texto
			const tit = lin.match(/^(#{1,3})\s+(.*)$/);
			if (tit) {
				cerrarListas();
				const nivel = tit[1].length;
				out.push(`<div class="h h${nivel}">${inline(tit[2])}</div>`);
				continue;
			}

			// Lista con viñeta: *, - o •
			const vi = lin.match(/^\s*[\*\-•]\s+(.*)$/);
			if (vi) {
				if (!enUl) {
					cerrarListas();
					out.push('<ul>');
					enUl = true;
				}
				out.push(`<li>${inline(vi[1])}</li>`);
				continue;
			}

			// Lista numerada: 1. Texto
			const nu = lin.match(/^\s*\d+\.\s+(.*)$/);
			if (nu) {
				if (!enOl) {
					cerrarListas();
					out.push('<ol>');
					enOl = true;
				}
				out.push(`<li>${inline(nu[1])}</li>`);
				continue;
			}

			// Párrafo normal.
			cerrarListas();
			out.push(`<p>${inline(lin)}</p>`);
		}
		cerrarListas();
		return out.join('');
	}

	// El usuario ve su propio texto plano; la IA se renderiza con formato.
	const html = $derived(esUsuario ? escapar(mensaje.texto) : aHtml(mensaje.texto));

	let copiado = $state(false);
	async function copiar() {
		try {
			await navigator.clipboard.writeText(mensaje.texto);
			copiado = true;
			setTimeout(() => (copiado = false), 1500);
		} catch {
			// Si el navegador no permite clipboard, no hacemos nada.
		}
	}
</script>

<div class="fila" class:usuario={esUsuario}>
	<div class="burbuja" class:usuario={esUsuario} class:error={mensaje.error}>
		{#if esUsuario}
			<p class="texto">{mensaje.texto}</p>
		{:else}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="texto md">{@html html}</div>
		{/if}

		{#if mensaje.costo}
			<div class="meta" title="Tokens y costo de esta respuesta">
				<span>{mensaje.costo.tokensTotal.toLocaleString('es-CR')} tokens</span>
				<span class="sep">·</span>
				<span>{costoFmt}</span>
				<button
					class="copiar"
					onclick={copiar}
					title="Copiar respuesta"
					aria-label="Copiar respuesta"
				>
					{copiado ? '✓ Copiado' : 'Copiar'}
				</button>
			</div>
		{:else if !esUsuario && !mensaje.error}
			<div class="meta">
				<button
					class="copiar"
					onclick={copiar}
					title="Copiar respuesta"
					aria-label="Copiar respuesta"
				>
					{copiado ? '✓ Copiado' : 'Copiar'}
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.fila {
		display: flex;
		justify-content: flex-start;
		margin-bottom: 0.6rem;
	}
	.fila.usuario {
		justify-content: flex-end;
	}
	.burbuja {
		max-width: 85%;
		padding: 0.6rem 0.85rem;
		border-radius: 12px;
		background: #fff;
		color: #0f172a;
		border: 1px solid #e8edf3;
		border-bottom-left-radius: 4px;
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
	}
	.burbuja.usuario {
		background: #1d4ed8;
		color: #fff;
		border: none;
		border-bottom-left-radius: 12px;
		border-bottom-right-radius: 4px;
	}
	.burbuja.error {
		background: #fef2f2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}
	.texto {
		margin: 0;
		word-break: break-word;
		font-size: 0.9rem;
		line-height: 1.55;
	}
	.burbuja.usuario .texto {
		white-space: pre-wrap;
	}

	/* Formato del Markdown renderizado (solo respuestas de la IA). */
	.md :global(p) {
		margin: 0 0 0.5rem 0;
	}
	.md :global(p:last-child) {
		margin-bottom: 0;
	}
	.md :global(strong) {
		font-weight: 600;
		color: #0b2a6b;
	}
	.md :global(em) {
		font-style: italic;
	}
	.md :global(code) {
		background: #eef2f7;
		border-radius: 4px;
		padding: 0.05rem 0.3rem;
		font-family: 'Consolas', monospace;
		font-size: 0.82rem;
	}
	.md :global(ul),
	.md :global(ol) {
		margin: 0.25rem 0 0.6rem 0;
		padding-left: 1.15rem;
	}
	.md :global(li) {
		margin-bottom: 0.28rem;
		line-height: 1.5;
	}
	.md :global(.h) {
		font-weight: 600;
		color: #0b2a6b;
		margin: 0.4rem 0 0.3rem 0;
	}
	.md :global(.h1) {
		font-size: 1rem;
	}
	.md :global(.h2),
	.md :global(.h3) {
		font-size: 0.92rem;
	}
	.meta {
		margin-top: 0.5rem;
		padding-top: 0.4rem;
		border-top: 1px solid rgba(100, 116, 139, 0.15);
		font-size: 0.68rem;
		opacity: 0.7;
		display: flex;
		gap: 0.3rem;
	}
	.sep {
		opacity: 0.5;
	}
	.copiar {
		margin-left: auto;
		background: none;
		border: none;
		color: #1d4ed8;
		font-size: 0.68rem;
		cursor: pointer;
		padding: 0;
		opacity: 0.8;
	}
	.copiar:hover {
		opacity: 1;
		text-decoration: underline;
	}
</style>
