<script lang="ts">
	import type { Ejecucion } from '$lib/types/database';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import FileText from '@lucide/svelte/icons/file-text';

	let { ejecucion }: { ejecucion: Ejecucion } = $props();

	const estadoConfig = {
		Exitoso: {
			color: 'text-green-600 bg-green-50 border-green-200',
			icon: CheckCircle2,
			label: 'ÉXITO'
		},
		Advertencia: {
			color: 'text-amber-600 bg-amber-50 border-amber-200',
			icon: AlertCircle,
			label: 'ADVERTENCIA'
		},
		Error: {
			color: 'text-red-600 bg-red-50 border-red-200',
			icon: XCircle,
			label: 'ERROR'
		}
	};

	const config = estadoConfig[ejecucion.estado] ?? estadoConfig['Exitoso'];
	const Icon = config.icon;
	const fecha = new Date(ejecucion.fecha_inicio);
	const hora = fecha.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
	const fechaStr = fecha.toLocaleDateString('es-CR', { day: '2-digit', month: 'short' });
</script>

<div class="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors rounded-lg">
	<span
		class="w-2 h-2 rounded-full shrink-0 {
		ejecucion.estado === 'Exitoso'
			? 'bg-green-500'
			: ejecucion.estado === 'Advertencia'
				? 'bg-amber-500'
				: 'bg-red-500'
	}"
	></span>
	<span class="font-mono text-xs text-muted-foreground shrink-0 w-12 tabular-nums">{hora}</span>
	<span class="text-xs font-bold text-foreground shrink-0 w-48 truncate">
		{ejecucion.automatizacion?.nombre || 'Automatización'}
	</span>
	<span class="text-xs text-muted-foreground flex-1 truncate">
		{#if ejecucion.metricas}
			{#if ejecucion.metricas.emails_enviados}
				{ejecucion.metricas.emails_enviados} emails enviados
			{:else if ejecucion.metricas.documentos_procesados}
				{ejecucion.metricas.documentos_procesados} documentos procesados
			{:else if ejecucion.metricas.montos_procesados}
				${ejecucion.metricas.montos_procesados.toLocaleString()} procesados
			{:else if ejecucion.metricas.registros_procesados}
				{ejecucion.metricas.registros_procesados} registros procesados
			{:else}
				Ejecución completada
			{/if}
		{:else}
			Ejecución completada
		{/if}
	</span>
	<span class="text-xs text-muted-foreground shrink-0 hidden md:block w-24 text-right">
		{ejecucion.automatizacion?.cliente?.nombre || ''}
	</span>
	<div class="flex items-center gap-2 shrink-0">
		{#if ejecucion.log_salida}
			<a
				href={ejecucion.log_salida}
				target="_blank"
				rel="noopener noreferrer"
				class="p-1 hover:bg-muted rounded transition-colors"
				title="Ver log PDF"
			>
				<FileText class="w-3 h-3 text-muted-foreground" />
			</a>
		{/if}
		<span
			class="text-[10px] px-2 py-0.5 rounded-full font-semibold {config.color} border"
		>
			{config.label}
		</span>
	</div>
</div>
