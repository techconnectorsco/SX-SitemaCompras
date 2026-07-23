<script lang="ts">
	interface Props {
		cargando: boolean;
		maxCaracteres?: number;
		/** Texto a precargar en el campo (desde una sugerencia contextual). */
		precargar?: string;
		onEnviar: (texto: string) => void;
	}
	let { cargando, maxCaracteres = 1000, precargar = '', onEnviar }: Props = $props();

	let texto = $state('');
	let area: HTMLTextAreaElement | null = $state(null);

	// Cuando llega una precarga (sugerencia contextual), llenar el campo y enfocar.
	$effect(() => {
		if (precargar) {
			texto = precargar.slice(0, maxCaracteres);
			area?.focus();
		}
	});

	const restantes = $derived(maxCaracteres - texto.length);

	function enviar() {
		const t = texto.trim();
		if (!t || cargando) return;
		onEnviar(t);
		texto = '';
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			enviar();
		}
	}
</script>

<div class="entrada">
	<div class="campo">
		<textarea
			bind:this={area}
			bind:value={texto}
			onkeydown={onKeydown}
			placeholder="Escribí tu consulta…"
			rows="1"
			maxlength={maxCaracteres}
			disabled={cargando}
		></textarea>
		{#if texto.length > maxCaracteres * 0.8}
			<span class="contador" class:limite={restantes <= 0}>{restantes}</span>
		{/if}
	</div>
	<button onclick={enviar} disabled={cargando || !texto.trim()} aria-label="Enviar">
		{#if cargando}
			<span class="spinner"></span>
		{:else}
			<svg
				viewBox="0 0 24 24"
				width="20"
				height="20"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="m22 2-7 20-4-9-9-4 20-7z" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		{/if}
	</button>
</div>

<style>
	.entrada {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		padding: 0.6rem;
		border-top: 1px solid #e2e8f0;
		background: #fff;
		border-bottom-left-radius: 12px;
		border-bottom-right-radius: 12px;
	}
	.campo {
		flex: 1;
		position: relative;
		display: flex;
	}
	textarea {
		flex: 1;
		resize: none;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 0.5rem 0.6rem;
		font-size: 0.88rem;
		font-family: inherit;
		max-height: 120px;
		min-height: 38px;
	}
	textarea:focus {
		outline: none;
		border-color: #1d4ed8;
	}
	.contador {
		position: absolute;
		right: 0.5rem;
		bottom: 0.35rem;
		font-size: 0.68rem;
		color: #94a3b8;
		pointer-events: none;
	}
	.contador.limite {
		color: #dc2626;
	}
	button {
		flex-shrink: 0;
		width: 38px;
		height: 38px;
		border: none;
		border-radius: 8px;
		background: #1d4ed8;
		color: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	button:disabled {
		background: #cbd5e1;
		cursor: not-allowed;
	}
	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.4);
		border-top-color: #fff;
		border-radius: 50%;
		animation: girar 0.7s linear infinite;
	}
	@keyframes girar {
		to {
			transform: rotate(360deg);
		}
	}
</style>
