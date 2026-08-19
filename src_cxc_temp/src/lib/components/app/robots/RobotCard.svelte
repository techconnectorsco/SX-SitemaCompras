<script lang="ts">
	import type { Automatizacion } from '$lib/types/database';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import Clock from '@lucide/svelte/icons/clock';
	import FileText from '@lucide/svelte/icons/file-text';

	let { automatizacion }: { automatizacion: Automatizacion } = $props();

	const estadoColor = {
		Exitoso: 'text-green-600 bg-green-50 border-green-200',
		Advertencia: 'text-amber-600 bg-amber-50 border-amber-200',
		Error: 'text-red-600 bg-red-50 border-red-200',
		SinEjecucion: 'text-gray-600 bg-gray-50 border-gray-200'
	};

	const estadoIcon = {
		Exitoso: CheckCircle2,
		Advertencia: AlertCircle,
		Error: XCircle,
		SinEjecucion: Clock
	};

	const estado = automatizacion.ultima_ejecucion?.estado || 'SinEjecucion';
	const Icon = estadoIcon[estado as keyof typeof estadoIcon] ?? Clock;
	const fechaUltimaEjecucion = automatizacion.ultima_ejecucion
		? new Date(automatizacion.ultima_ejecucion.fecha_inicio).toLocaleString('es-CR', {
				day: '2-digit',
				month: 'short',
				hour: '2-digit',
				minute: '2-digit'
		  })
		: 'Nunca ejecutado';
</script>

<div
	class="bg-card border border-border rounded-xl p-5 hover:shadow-lg transition-all duration-200 {automatizacion.esta_activa
		? ''
		: 'opacity-60'}"
>
	<div class="flex items-start justify-between mb-3">
		<div class="flex-1">
			<div class="flex items-center gap-2 mb-1">
				<h3 class="font-bold text-foreground text-lg">{automatizacion.nombre}</h3>
				{#if !automatizacion.esta_activa}
					<span class="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">Inactivo</span>
				{/if}
			</div>
			{#if automatizacion.descripcion}
				<p class="text-sm text-muted-foreground mb-2">{automatizacion.descripcion}</p>
			{/if}
			<div class="flex items-center gap-4 text-xs text-muted-foreground">
				{#if automatizacion.tipo}
					<span class="px-2 py-0.5 bg-muted rounded">{automatizacion.tipo}</span>
				{/if}
				{#if automatizacion.frecuencia}
					<span class="flex items-center gap-1">
						<Clock class="w-3 h-3" />
						{automatizacion.frecuencia}
					</span>
				{/if}
			</div>
		</div>
		<div
			class="flex items-center gap-2 px-3 py-1.5 rounded-lg border {estadoColor[estado]} shrink-0"
		>
			<Icon class="w-4 h-4" />
			<span class="text-xs font-semibold">{estado}</span>
		</div>
	</div>

	<div class="border-t border-border pt-3 mt-3">
		<div class="flex items-center justify-between text-xs">
			<span class="text-muted-foreground">Última ejecución:</span>
			<span class="font-medium text-foreground">{fechaUltimaEjecucion}</span>
		</div>
		{#if automatizacion.ultima_ejecucion?.log_salida}
			<a
				href={automatizacion.ultima_ejecucion.log_salida}
				target="_blank"
				rel="noopener noreferrer"
				class="mt-2 flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
			>
				<FileText class="w-3 h-3" />
				Ver log PDF
			</a>
		{/if}
	</div>
</div>
