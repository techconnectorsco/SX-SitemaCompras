<script lang="ts">
	interface Props {
		abierto: boolean;
		onToggle: () => void;
	}
	let { abierto, onToggle }: Props = $props();
</script>

<button
	class="boton-chat"
	class:abierto
	onclick={onToggle}
	aria-label={abierto ? 'Cerrar BettiIA' : 'Abrir BettiIA'}
	title={abierto ? 'Cerrar BettiIA' : 'Abrir BettiIA'}
>
	{#if abierto}
		<svg
			viewBox="0 0 24 24"
			width="24"
			height="24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
		</svg>
	{:else}
		<img src="/ia-chat/betti-ia.png" alt="" class="avatar" />
	{/if}
</button>

<style>
	.boton-chat {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		border: none;
		background: #1A73C2;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
		z-index: 1000;
		transition:
			transform 0.15s ease,
			background 0.15s ease;
	}
	.boton-chat:hover {
		background: #1e40af;
		transform: scale(1.05);
	}
	.avatar {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
	}
	.boton-chat {
		padding: 0;
		overflow: hidden;
	}
	.boton-chat.abierto {
		background: #f10101;
	}
</style>
