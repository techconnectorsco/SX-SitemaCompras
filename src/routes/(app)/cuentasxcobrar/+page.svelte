<script lang="ts">
	import CxcPanel from '$lib/cxc/cxcpanel.svelte';
	import GraficosCxc from '$lib/cxc/graficos_cxc.svelte';
	import { soporteXpertoBrand } from '$lib/brand/soportexperto';

	const brand = soporteXpertoBrand;
</script>

<CxcPanel {brand} apiBase="/cuentasxcobrar/api" />

<div class="mx-auto max-w-5xl px-4 py-2">
	<div class="flex items-center gap-3">
		<div class="h-px flex-1 bg-border"></div>
		<span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
			Dashboard de RPAs
		</span>
		<div class="h-px flex-1 bg-border"></div>
	</div>
</div>

<GraficosCxc {brand} />

<!-- ══ PIE DE MARCA ═══════════════════════════════════════════════════════ -->
<div
	style="
		--bp:        {brand.css.primary};
		--bp-hover:  {brand.css.primaryHover};
		--bp-light:  {brand.css.primaryLight};
		--bp-border: {brand.css.primaryBorder};
	"
>
	<div class="mx-auto max-w-5xl px-4 pb-8 pt-2">
		<div class="cxc-footer flex flex-col items-center justify-between gap-2 rounded-xl border px-5 py-4 sm:flex-row"
			style="border-color: var(--bp-border); background-color: var(--bp-light);">
			<div class="flex items-center gap-3">
				{#if brand.logoUrl}
					<img src={brand.logoUrl} alt={brand.nombreCliente} class="h-5 w-auto opacity-60" />
				{/if}
				<span class="text-xs font-medium text-muted-foreground">
					{brand.nombreCliente} · Portal CxC
				</span>
			</div>
			<span class="text-[10px] text-muted-foreground/50 text-center sm:text-right">
				© 2026 SX - SoporteXperto. Todos los derechos reservados.
			</span>
		</div>
	</div>
</div>

<style>
	:global(.dark) .cxc-footer {
		background-color: rgba(255, 255, 255, 0.05) !important;
		border-color: rgba(255, 255, 255, 0.1) !important;
	}
</style>
