<script lang="ts">
	interface Props {
		titulo?: string;
		costoSesion: number;
		moneda: string;
		onCerrar: () => void;
		/** Avatar del robot para el encabezado. */
		avatar?: string;
	}
	let {
		titulo = 'Asistente de IA',
		costoSesion,
		moneda = 'USD',
		onCerrar,
		avatar = '/ia-chat/robot-abrir.png'
	}: Props = $props();

	const costoFmt = $derived(
		new Intl.NumberFormat('es-CR', {
			style: 'currency',
			currency: moneda,
			minimumFractionDigits: 4,
			maximumFractionDigits: 4
		}).format(costoSesion)
	);
</script>

<header class="encabezado">
	<div class="izq">
		<img src={avatar} alt="" class="avatar" />
		<div class="info">
			<span class="titulo">{titulo}</span>
			<span class="costo" title="Costo acumulado de esta sesión">{costoFmt}</span>
		</div>
	</div>
	<button class="cerrar" onclick={onCerrar} aria-label="Cerrar">
		<svg
			viewBox="0 0 24 24"
			width="20"
			height="20"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
		</svg>
	</button>
</header>

<style>
	.encabezado {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.65rem 0.9rem;
		background: #fe6a01;
		color: #fff;
		border-top-left-radius: 12px;
		border-top-right-radius: 12px;
	}
	.izq {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.avatar {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		object-fit: cover;
		background: #2348c8;
		flex-shrink: 0;
		border: 1.5px solid rgba(255, 255, 255, 0.25);
	}
	.info {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
	}
	.titulo {
		font-weight: 600;
		font-size: 0.95rem;
	}
	.costo {
		font-size: 0.72rem;
		opacity: 0.85;
	}
	.cerrar {
		background: transparent;
		border: none;
		color: #fff;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
	}
	.cerrar:hover {
		opacity: 0.8;
	}
</style>
