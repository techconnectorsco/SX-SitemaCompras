<script lang="ts">
	import { page } from '$app/state';
	import { ArrowLeft, ClipboardList, FileSearch } from 'lucide-svelte';

	let { children } = $props();
	let panelContenido: HTMLDivElement;

	const esAuditoria = $derived(page.url.pathname === '/admin/compras/auditoria');

	$effect(() => {
		page.url.pathname;
		if (panelContenido) panelContenido.scrollTop = 0;
	});
</script>

<div class="shrink-0 border-b bg-white px-4 py-3 dark:bg-slate-900 sm:px-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-1" aria-label="Secciones de Compras">
			<a
				href="/admin/compras"
				aria-current={!esAuditoria ? 'page' : undefined}
				class={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${!esAuditoria ? 'bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
			>
				<ClipboardList class="h-4 w-4" />
				Administración
			</a>
			<a
				href="/admin/compras/auditoria"
				aria-current={esAuditoria ? 'page' : undefined}
				class={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${esAuditoria ? 'bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
			>
				<FileSearch class="h-4 w-4" />
				Auditoría
			</a>
		</div>
		<a
			href="/AsistenteCompras"
			class="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
		>
			<ArrowLeft class="h-4 w-4" />
			Volver a Compras
		</a>
	</div>
</div>

<div
	bind:this={panelContenido}
	tabindex="-1"
	class="min-h-0 flex-1 overflow-y-auto overscroll-contain focus:outline-none"
>
	{@render children()}
</div>
