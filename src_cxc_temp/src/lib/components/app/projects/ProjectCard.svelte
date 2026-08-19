<script lang="ts">
	import type { ProyectoSoftware } from '$lib/types/database';
	import { ExternalLink, Globe, Code } from 'lucide-svelte';

	let { proyecto }: { proyecto: ProyectoSoftware } = $props();

	const estadoColor: Record<string, string> = {
		Activo: 'text-green-600 bg-green-50 border-green-200',
		Mantenimiento: 'text-amber-600 bg-amber-50 border-amber-200',
		Desarrollo: 'text-blue-600 bg-blue-50 border-blue-200',
		Inactivo: 'text-gray-600 bg-gray-50 border-gray-200'
	};
</script>

<div class="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-200">
	<div class="flex items-start justify-between mb-4">
		<div class="flex-1">
			<div class="flex items-center gap-2 mb-2">
				<Globe class="w-5 h-5 text-primary" />
				<h3 class="font-bold text-foreground text-lg">{proyecto.nombre}</h3>
			</div>
			{#if proyecto.descripcion}
				<p class="text-sm text-muted-foreground mb-3">{proyecto.descripcion}</p>
			{/if}
		</div>
		{#if proyecto.estado}
			<span
				class="px-3 py-1 rounded-lg border text-xs font-semibold {estadoColor[proyecto.estado] || estadoColor.Inactivo}"
			>
				{proyecto.estado}
			</span>
		{/if}
	</div>

	{#if proyecto.tecnologias && proyecto.tecnologias.length > 0}
		<div class="flex flex-wrap gap-2 mb-4">
			{#each proyecto.tecnologias as tech}
				<span class="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
					{tech}
				</span>
			{/each}
		</div>
	{/if}

	{#if proyecto.tipo}
		<div class="mb-4">
			<span class="text-xs text-muted-foreground">Tipo: </span>
			<span class="text-xs font-medium text-foreground">{proyecto.tipo}</span>
		</div>
	{/if}

	{#if proyecto.url_acceso}
		<a
			href={proyecto.url_acceso}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
		>
			<ExternalLink class="w-4 h-4" />
			Abrir aplicación
		</a>
	{:else}
		<div class="text-xs text-muted-foreground">URL no disponible</div>
	{/if}
</div>
