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
	aria-label={abierto ? 'Cerrar asistente' : 'Abrir asistente'}
	title={abierto ? 'Cerrar asistente' : 'Abrir asistente'}
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
		<svg
			viewBox="0 0 24 24"
			width="24"
			height="24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path
				d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
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
	.boton-chat.abierto {
		background: #f10101;
	}
</style>
