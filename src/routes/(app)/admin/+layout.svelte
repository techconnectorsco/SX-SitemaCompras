<script lang="ts">
	import { page } from '$app/state';
	import { ShoppingCart, Clapperboard } from 'lucide-svelte';

	let { children } = $props();

	const comprasActivo = $derived(page.url.pathname.startsWith('/admin/compras'));
	const contenidoActivo = $derived(page.url.pathname.startsWith('/admin/content-creator'));
</script>

<div class="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 px-2 py-3 sm:px-5 sm:py-5">
		<div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-950">
		<div class="flex min-h-0 flex-1 flex-col lg:flex-row">
			<aside class="shrink-0 overflow-y-auto border-b border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 lg:w-64 lg:border-b-0 lg:border-r lg:p-4">
				<p class="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Módulos</p>
				<nav aria-label="Módulos de administración" class="flex gap-2 overflow-x-auto lg:flex-col">
					<a
						href="/admin/compras"
						aria-current={comprasActivo ? 'page' : undefined}
						class={`flex min-w-44 items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors lg:min-w-0 ${comprasActivo ? 'bg-[#253166] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`}
					>
						<ShoppingCart class="h-4 w-4" />
						Compras
					</a>
						<a
							href="/admin/content-creator"
							aria-current={contenidoActivo ? 'page' : undefined}
							class={`flex min-w-52 items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors lg:min-w-0 ${contenidoActivo ? 'bg-[#253166] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`}
						>
							<Clapperboard class="h-4 w-4" />
							<span class="flex-1">Creador de contenido</span>
						</a>
				</nav>
			</aside>

			<div class="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
				{@render children()}
			</div>
		</div>
	</div>
</div>
