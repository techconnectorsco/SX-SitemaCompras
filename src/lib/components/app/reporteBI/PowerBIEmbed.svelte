<script>
	import PowerBIReport from './PowerBIReport.svelte';

	// URL 1: Procesamiento / Forecast
	const urlForecast =
		'https://app.powerbi.com/reportEmbed?reportId=53f899c0-7af2-49bd-bdfd-423677452dcb&autoAuth=true&ctid=22985f7d-d7a0-418b-b75d-2c99c9e1ad8c&actionBarEnabled=true&reportCopilotInEmbed=true';

	// URL 2: Pedidos
	const urlPedidos =
		'https://app.powerbi.com/reportEmbed?reportId=b49587dc-1360-418d-905f-368de6e13e36&autoAuth=true&ctid=22985f7d-d7a0-418b-b75d-2c99c9e1ad8c&actionBarEnabled=true&reportCopilotInEmbed=true';
</script>

<div class="dashboard-container">
	<PowerBIReport titulo="Proyección de Procesamiento y Forecast" url={urlForecast} altura={700} />

	<hr class="divider" />

	<PowerBIReport titulo="Gestión Detallada de Pedidos" url={urlPedidos} altura={800} />
</div>

<style>
	.dashboard-container {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		/* Esto permite que si el reporte es muy largo, el contenedor maneje el flujo */
		overflow-y: auto;
	}

	.divider {
		border: 0;
		height: 1px;
		background: #e5e7eb;
		margin: 2rem 0;
	}
</style>
