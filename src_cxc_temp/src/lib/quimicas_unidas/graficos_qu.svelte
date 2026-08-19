<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Chart,
		CategoryScale,
		LinearScale,
		BarController,
		BarElement,
		LineController,
		LineElement,
		PointElement,
		Tooltip,
		Legend
	} from 'chart.js';
	import type { BrandConfig } from '$lib/brand/types';

	let { brand }: { brand: BrandConfig } = $props();

	Chart.register(
		CategoryScale,
		LinearScale,
		BarController,
		BarElement,
		LineController,
		LineElement,
		PointElement,
		Tooltip,
		Legend
	);

	Chart.defaults.color = '#64748b';
	Chart.defaults.elements.bar.borderRadius = 6;
	Chart.defaults.elements.line.borderWidth = 2.5;
	Chart.defaults.elements.point.radius = 3;

	// ── Types ──────────────────────────────────────────────────────────────
	interface MetricasCxc {
		tiempo_ejecucion?: number;
		total_clientes?: number;
		clientes_procesados?: number;
		clientes_omitidos_N?: number;
		clientes_sin_documentos?: number;
		clientes_sin_correo?: number;
		total_documentos_procesados?: number | null;
		reportes_generados?: number;
		emails_exitosos?: number;
		emails_fallidos?: number;
		monto_total_usd?: number;
		monto_total_colones?: number;
		monto_vencido_usd?: number;
		monto_vencido_colones?: number;
		tipo_ejecucion?: string;
		fuente?: string;
	}

	interface MetricasGiras {
		tiempo_ejecucion?: number;
		total_clientes?: number;
		clientes_evaluados?: number;
		total_agentes?: number;
		agentes_procesados?: number;
		reportes_generados?: number;
		total_documentos_procesados?: number | null;
		emails_exitosos?: number;
		emails_fallidos?: number;
		monto_total_usd?: number;
		monto_total_colones?: number;
		monto_vencido_usd?: number;
		monto_vencido_colones?: number;
		tipo_ejecucion?: string;
		fuente?: string;
	}

	interface Ejec {
		id: string;
		automatizacion_id: string;
		fecha_inicio: string;
		fecha_fin: string | null;
		estado: string;
		metricas: MetricasCxc | MetricasGiras | null;
	}

	// ── State ──────────────────────────────────────────────────────────────
	let activeTab  = $state<'cxc' | 'giras'>('cxc');
	let modoCxc    = $state<'historico' | 'una'>('historico');
	let modoGiras  = $state<'historico' | 'una'>('historico');
	let cargando   = $state(true);
	let errorMsg   = $state<string | null>(null);
	let ejecCxc    = $state<Ejec[]>([]);
	let ejecGiras  = $state<Ejec[]>([]);
	let selCxc     = $state('');
	let selGiras   = $state('');

	// ── Derived ────────────────────────────────────────────────────────────
	const mCxcSel = $derived(
		((ejecCxc.find((e) => e.id === selCxc) ?? ejecCxc[0])?.metricas as MetricasCxc | null) ?? null
	);
	const mGirasSel = $derived(
		((ejecGiras.find((e) => e.id === selGiras) ?? ejecGiras[0])
			?.metricas as MetricasGiras | null) ?? null
	);

	// ── Helpers ────────────────────────────────────────────────────────────
	const fmtN = (n: number | null | undefined) =>
		n == null ? '—' : new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(n);

	const fmtM = (n: number | null | undefined, cur: 'USD' | 'CRC') => {
		if (n == null) return '—';
		const s = new Intl.NumberFormat('es-CR', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(n);
		return cur === 'USD' ? `$${s}` : `CRC ${s}`;
	};

	const fmtDur = (s: number | null | undefined) =>
		s == null
			? '—'
			: s < 60
				? `${s.toFixed(0)}s`
				: s < 3600
					? `${(s / 60).toFixed(1)}m`
					: `${(s / 3600).toFixed(1)}h`;

	const fmtPct = (a: number | null | undefined, b: number | null | undefined) =>
		!a || !b ? '—' : `${((a / b) * 100).toFixed(1)}%`;

	const fmtF = (iso: string) =>
		new Date(iso).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: '2-digit' });

	// ── Colors — derivados del brand ───────────────────────────────────────
	const C = $derived({
		indigo:   brand.css.primary,
		indigoBg: brand.css.primary + 'e6',
		amber:    brand.css.secondary    ?? 'rgb(217,119,6)',
		amberBg:  brand.css.secondaryBg ?? 'rgba(217,119,6,0.9)',
		green:    'rgb(22,163,74)',
		greenBg:  'rgba(22,163,74,0.85)',
		greyBg:   'rgba(100,116,139,0.45)',
		slate:    'rgba(148,163,184,0.25)',
		txt:      '#64748b'
	});

	// ── Focus helpers ──────────────────────────────────────────────────────
	function focusIn(e: FocusEvent) {
		const el = e.currentTarget as HTMLElement;
		el.style.borderColor = brand.css.primary;
		el.style.boxShadow = `0 0 0 2px ${brand.css.primaryRing}`;
	}
	function focusOut(e: FocusEvent) {
		const el = e.currentTarget as HTMLElement;
		el.style.borderColor = '';
		el.style.boxShadow = '';
	}

	// ── KPIs ───────────────────────────────────────────────────────────────
	const kpiCxc = $derived.by(() => {
		const arr = ejecCxc.map((e) => e.metricas as MetricasCxc).filter(Boolean);
		if (!arr.length) return null;
		const last = arr[0];
		return {
			total:    arr.length,
			avgDur:   arr.reduce((s, m) => s + (m?.tiempo_ejecucion ?? 0), 0) / arr.length,
			emails:   arr.reduce((s, m) => s + (m?.emails_exitosos ?? 0), 0),
			lastUsd:  last?.monto_total_usd,
			lastCrc:  last?.monto_total_colones,
			lastVUsd: last?.monto_vencido_usd,
			lastVCrc: last?.monto_vencido_colones
		};
	});

	const kpiGiras = $derived.by(() => {
		const arr = ejecGiras.map((e) => e.metricas as MetricasGiras).filter(Boolean);
		if (!arr.length) return null;
		const last = arr[0];
		return {
			total:    arr.length,
			avgDur:   arr.reduce((s, m) => s + (m?.tiempo_ejecucion ?? 0), 0) / arr.length,
			reportes: arr.reduce((s, m) => s + (m?.reportes_generados ?? 0), 0),
			emails:   arr.reduce((s, m) => s + (m?.emails_exitosos ?? 0), 0),
			lastUsd:  last?.monto_total_usd,
			lastCrc:  last?.monto_total_colones,
			lastVUsd: last?.monto_vencido_usd,
			lastVCrc: last?.monto_vencido_colones
		};
	});

	const sc = $derived({
		x: { grid: { color: C.slate }, ticks: { color: C.txt, font: { size: 11 } } },
		y: { grid: { color: C.slate }, ticks: { color: C.txt, font: { size: 11 } } }
	});

	// ── Chart factory ──────────────────────────────────────────────────────
	function mk(canvas: HTMLCanvasElement | null, cfg: any) {
		if (!canvas) return;
		const ch = new Chart(canvas, cfg);
		return () => ch.destroy();
	}

	// ── Canvas refs ────────────────────────────────────────────────────────
	let cFunnel = $state<HTMLCanvasElement | null>(null);
	let cCxcUsd = $state<HTMLCanvasElement | null>(null);
	let cCxcCrc = $state<HTMLCanvasElement | null>(null);
	let cHUsd   = $state<HTMLCanvasElement | null>(null);
	let cHCrc   = $state<HTMLCanvasElement | null>(null);
	let cHTasa  = $state<HTMLCanvasElement | null>(null);
	let cHDur   = $state<HTMLCanvasElement | null>(null);
	let cGUsd   = $state<HTMLCanvasElement | null>(null);
	let cGCrc   = $state<HTMLCanvasElement | null>(null);
	let cGHUsd  = $state<HTMLCanvasElement | null>(null);
	let cGHCrc  = $state<HTMLCanvasElement | null>(null);
	let cGHRep  = $state<HTMLCanvasElement | null>(null);
	let cGHAg   = $state<HTMLCanvasElement | null>(null);

	// ── Chart effects ──────────────────────────────────────────────────────
	$effect(() => {
		const m = mCxcSel;
		return mk(cFunnel, {
			type: 'bar',
			data: {
				labels: ['Total', 'Omitidos', 'Sin docs', 'Sin correo', 'Procesados', 'Emails OK'],
				datasets: [{ label: 'Clientes', data: [m?.total_clientes, m?.clientes_omitidos_N, m?.clientes_sin_documentos, m?.clientes_sin_correo, m?.clientes_procesados, m?.emails_exitosos], backgroundColor: [C.indigoBg, C.greyBg, C.greyBg, C.greyBg, C.indigoBg, C.greenBg] }]
			},
			options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: sc }
		});
	});
	$effect(() => {
		const m = mCxcSel;
		return mk(cCxcUsd, { type: 'bar', data: { labels: ['Cartera USD'], datasets: [{ label: 'Total', data: [m?.monto_total_usd], backgroundColor: C.indigoBg }, { label: 'Vencido', data: [m?.monto_vencido_usd], backgroundColor: C.amberBg }] }, options: { responsive: true, plugins: { legend: { labels: { color: C.txt } } }, scales: sc } });
	});
	$effect(() => {
		const m = mCxcSel;
		return mk(cCxcCrc, { type: 'bar', data: { labels: ['Cartera CRC'], datasets: [{ label: 'Total', data: [m?.monto_total_colones], backgroundColor: C.indigoBg }, { label: 'Vencido', data: [m?.monto_vencido_colones], backgroundColor: C.amberBg }] }, options: { responsive: true, plugins: { legend: { labels: { color: C.txt } } }, scales: sc } });
	});
	$effect(() => {
		const d = [...ejecCxc].reverse();
		return mk(cHUsd, { type: 'line', data: { labels: d.map((e) => fmtF(e.fecha_inicio)), datasets: [{ label: 'Cartera USD', data: d.map((e) => (e.metricas as MetricasCxc)?.monto_total_usd), borderColor: C.indigo, tension: 0.3, fill: false }, { label: 'Vencido USD', data: d.map((e) => (e.metricas as MetricasCxc)?.monto_vencido_usd), borderColor: C.amber, tension: 0.3, fill: false }] }, options: { responsive: true, plugins: { legend: { labels: { color: C.txt } } }, scales: sc } });
	});
	$effect(() => {
		const d = [...ejecCxc].reverse();
		return mk(cHCrc, { type: 'line', data: { labels: d.map((e) => fmtF(e.fecha_inicio)), datasets: [{ label: 'Cartera CRC', data: d.map((e) => (e.metricas as MetricasCxc)?.monto_total_colones), borderColor: C.indigo, tension: 0.3, fill: false }, { label: 'Vencido CRC', data: d.map((e) => (e.metricas as MetricasCxc)?.monto_vencido_colones), borderColor: C.amber, tension: 0.3, fill: false }] }, options: { responsive: true, plugins: { legend: { labels: { color: C.txt } } }, scales: sc } });
	});
	$effect(() => {
		const d = [...ejecCxc].reverse();
		return mk(cHTasa, { type: 'line', data: { labels: d.map((e) => fmtF(e.fecha_inicio)), datasets: [{ label: 'Tasa envío (%)', data: d.map((e) => { const m = e.metricas as MetricasCxc; if (!m?.emails_exitosos || !m?.clientes_procesados) return null; return +((m.emails_exitosos / m.clientes_procesados) * 100).toFixed(1); }), borderColor: C.green, tension: 0.3, fill: false }] }, options: { responsive: true, plugins: { legend: { labels: { color: C.txt } } }, scales: { ...sc, y: { ...sc.y, min: 0, max: 100 } } } });
	});
	$effect(() => {
		const d = [...ejecCxc].reverse();
		return mk(cHDur, { type: 'bar', data: { labels: d.map((e) => fmtF(e.fecha_inicio)), datasets: [{ label: 'Duración (seg)', data: d.map((e) => (e.metricas as MetricasCxc)?.tiempo_ejecucion), backgroundColor: C.indigoBg }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: sc } });
	});
	$effect(() => {
		const m = mGirasSel;
		return mk(cGUsd, { type: 'bar', data: { labels: ['Cartera USD'], datasets: [{ label: 'Total', data: [m?.monto_total_usd], backgroundColor: C.indigoBg }, { label: 'Vencido', data: [m?.monto_vencido_usd], backgroundColor: C.amberBg }] }, options: { responsive: true, plugins: { legend: { labels: { color: C.txt } } }, scales: sc } });
	});
	$effect(() => {
		const m = mGirasSel;
		return mk(cGCrc, { type: 'bar', data: { labels: ['Cartera CRC'], datasets: [{ label: 'Total', data: [m?.monto_total_colones], backgroundColor: C.indigoBg }, { label: 'Vencido', data: [m?.monto_vencido_colones], backgroundColor: C.amberBg }] }, options: { responsive: true, plugins: { legend: { labels: { color: C.txt } } }, scales: sc } });
	});
	$effect(() => {
		const d = [...ejecGiras].reverse();
		return mk(cGHUsd, { type: 'line', data: { labels: d.map((e) => fmtF(e.fecha_inicio)), datasets: [{ label: 'Cartera USD', data: d.map((e) => (e.metricas as MetricasGiras)?.monto_total_usd), borderColor: C.indigo, tension: 0.3, fill: false }, { label: 'Vencido USD', data: d.map((e) => (e.metricas as MetricasGiras)?.monto_vencido_usd), borderColor: C.amber, tension: 0.3, fill: false }] }, options: { responsive: true, plugins: { legend: { labels: { color: C.txt } } }, scales: sc } });
	});
	$effect(() => {
		const d = [...ejecGiras].reverse();
		return mk(cGHCrc, { type: 'line', data: { labels: d.map((e) => fmtF(e.fecha_inicio)), datasets: [{ label: 'Cartera CRC', data: d.map((e) => (e.metricas as MetricasGiras)?.monto_total_colones), borderColor: C.indigo, tension: 0.3, fill: false }, { label: 'Vencido CRC', data: d.map((e) => (e.metricas as MetricasGiras)?.monto_vencido_colones), borderColor: C.amber, tension: 0.3, fill: false }] }, options: { responsive: true, plugins: { legend: { labels: { color: C.txt } } }, scales: sc } });
	});
	$effect(() => {
		const d = [...ejecGiras].reverse();
		return mk(cGHRep, { type: 'bar', data: { labels: d.map((e) => fmtF(e.fecha_inicio)), datasets: [{ label: 'Reportes generados', data: d.map((e) => (e.metricas as MetricasGiras)?.reportes_generados), backgroundColor: C.indigoBg }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: sc } });
	});
	$effect(() => {
		const d = [...ejecGiras].reverse();
		return mk(cGHAg, { type: 'bar', data: { labels: d.map((e) => fmtF(e.fecha_inicio)), datasets: [{ label: 'Agentes activos', data: d.map((e) => (e.metricas as MetricasGiras)?.total_agentes), backgroundColor: C.greenBg }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: sc } });
	});

	// ── Data load ──────────────────────────────────────────────────────────
	onMount(async () => {
		try {
			const res = await fetch('/quimicas_unidas/api/ejecuciones');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const porFecha = (a: Ejec, b: Ejec) =>
				new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime();
			ejecCxc   = (data.cxc   ?? []).sort(porFecha);
			ejecGiras = (data.giras ?? []).sort(porFecha);
			if (ejecCxc.length)   selCxc   = ejecCxc[0].id;
			if (ejecGiras.length) selGiras = ejecGiras[0].id;
		} catch {
			errorMsg = 'No se pudo cargar el historial de ejecuciones.';
		} finally {
			cargando = false;
		}
	});
</script>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
{#snippet kpi(label: string, value: string, sub?: string)}
	<div class="kpi-card rounded-xl border border-border bg-muted/50 p-4 transition-all duration-200">
		<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
		<p class="mt-1 whitespace-nowrap text-lg font-bold tabular-nums leading-tight text-foreground">{value}</p>
		{#if sub}<p class="mt-0.5 text-xs text-muted-foreground">{sub}</p>{/if}
	</div>
{/snippet}

{#snippet toggleModo(modo: 'historico' | 'una', set: (m: 'historico' | 'una') => void)}
	<div class="inline-flex rounded-lg border border-border bg-muted p-1">
		<button
			type="button"
			onclick={() => set('historico')}
			class="rounded-md px-3 py-1.5 text-xs font-medium transition"
			style={modo === 'historico'
				? `background-color: var(--brand-primary); color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);`
				: ''}
			class:text-muted-foreground={modo !== 'historico'}
			class:hover:text-foreground={modo !== 'historico'}
		>Histórico</button>
		<button
			type="button"
			onclick={() => set('una')}
			class="rounded-md px-3 py-1.5 text-xs font-medium transition"
			style={modo === 'una'
				? `background-color: var(--brand-primary); color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);`
				: ''}
			class:text-muted-foreground={modo !== 'una'}
			class:hover:text-foreground={modo !== 'una'}
		>Una ejecución</button>
	</div>
{/snippet}

{#snippet estadoBadge(estado: string)}
	<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold {
		['exitoso','Exitoso','ok','OK','success'].includes(estado)
			? 'bg-green-600 text-white'
			: ['error','Error','ERROR','failed'].includes(estado)
				? 'bg-red-600 text-white'
				: 'bg-slate-500 text-white'
	}">{estado}</span>
{/snippet}

{#snippet chartCard(title: string)}
	<div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
		<div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light);">
			<div class="h-3 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
			<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">{title}</p>
		</div>
		<div class="p-4">
			{@render children()}
		</div>
	</div>
{/snippet}

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<div class="mx-auto max-w-5xl px-4 py-8"
	style="
		--brand-primary:        {brand.css.primary};
		--brand-primary-hover:  {brand.css.primaryHover};
		--brand-primary-light:  {brand.css.primaryLight};
		--brand-primary-border: {brand.css.primaryBorder};
		--brand-primary-text:   {brand.css.primaryText};
		--brand-primary-ring:   {brand.css.primaryRing};
	"
>
	<!-- Header de sección -->
	<div class="mb-6 flex items-center gap-3">
		<div class="h-6 w-1.5 rounded-full" style="background-color: var(--brand-primary)"></div>
		<div>
			<h2 class="text-xl font-bold text-foreground">Dashboard de RPAs</h2>
			<p class="mt-0.5 text-sm text-muted-foreground">
				Historial y métricas de las automatizaciones de {brand.nombreCliente}.
			</p>
		</div>
	</div>

	{#if cargando}
		<div class="flex items-center justify-center py-16 text-sm text-muted-foreground">
			Cargando historial…
		</div>
	{:else if errorMsg}
		<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
			{errorMsg}
		</div>
	{:else}
		<!-- Tab selector con color de marca en activo -->
		<div class="mb-6 flex gap-1 rounded-xl border border-border bg-muted p-1 w-fit">
			<button
				type="button"
				onclick={() => (activeTab = 'cxc')}
				class="rounded-lg px-5 py-2 text-sm font-semibold transition"
				style={activeTab === 'cxc'
					? `background-color: var(--brand-primary); color: white; box-shadow: 0 1px 4px rgba(0,0,0,0.2);`
					: ''}
				class:text-muted-foreground={activeTab !== 'cxc'}
				class:hover:text-foreground={activeTab !== 'cxc'}
			>Estados de Cuenta (CxC)</button>
			<button
				type="button"
				onclick={() => (activeTab = 'giras')}
				class="rounded-lg px-5 py-2 text-sm font-semibold transition"
				style={activeTab === 'giras'
					? `background-color: var(--brand-primary); color: white; box-shadow: 0 1px 4px rgba(0,0,0,0.2);`
					: ''}
				class:text-muted-foreground={activeTab !== 'giras'}
				class:hover:text-foreground={activeTab !== 'giras'}
			>Giras de Agentes</button>
		</div>

		<!-- ══════════════ TAB CXC ══════════════ -->
		{#if activeTab === 'cxc'}
			{#if ejecCxc.length === 0}
				<div class="rounded-xl border border-border bg-muted/40 py-16 text-center text-sm text-muted-foreground">
					Aún no hay ejecuciones registradas para el RPA de Estados de Cuenta.
				</div>
			{:else}
				<div class="mb-5 flex flex-wrap items-center gap-4">
					{@render toggleModo(modoCxc, (m) => (modoCxc = m))}
					{#if modoCxc === 'una'}
						<select
							bind:value={selCxc}
							class="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none transition-all"
							onfocus={focusIn}
							onblur={focusOut}
						>
							{#each ejecCxc as e}
								<option value={e.id}>{fmtF(e.fecha_inicio)} — {e.estado}</option>
							{/each}
						</select>
					{/if}
				</div>

				{#if modoCxc === 'una'}
					{@const m = mCxcSel}
					<div class="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
						{@render kpi('Cartera USD', fmtM(m?.monto_total_usd, 'USD'))}
						{@render kpi('Cartera CRC', fmtM(m?.monto_total_colones, 'CRC'))}
					</div>
					<div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
						{@render kpi('% Vencido USD', fmtPct(m?.monto_vencido_usd, m?.monto_total_usd))}
						{@render kpi('% Vencido CRC', fmtPct(m?.monto_vencido_colones, m?.monto_total_colones))}
						{@render kpi('Tasa de envío', fmtPct(m?.emails_exitosos, m?.clientes_procesados), `${fmtN(m?.emails_exitosos)} de ${fmtN(m?.clientes_procesados)}`)}
						{@render kpi('Duración', fmtDur(m?.tiempo_ejecucion))}
					</div>
					<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
						<div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
							<div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light);">
								<div class="h-3 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
								<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">Embudo de clientes</p>
							</div>
							<div class="p-4"><canvas bind:this={cFunnel}></canvas></div>
						</div>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
								<div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light);">
									<div class="h-3 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
									<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">Cartera vs Vencido · USD</p>
								</div>
								<div class="p-4"><canvas bind:this={cCxcUsd}></canvas></div>
							</div>
							<div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
								<div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light);">
									<div class="h-3 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
									<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">Cartera vs Vencido · CRC</p>
								</div>
								<div class="p-4"><canvas bind:this={cCxcCrc}></canvas></div>
							</div>
						</div>
					</div>
					<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
						{@render kpi('Clientes totales', fmtN(m?.total_clientes))}
						{@render kpi('Procesados', fmtN(m?.clientes_procesados))}
						{@render kpi('Emails fallidos', fmtN(m?.emails_fallidos))}
						{@render kpi('Documentos', m?.total_documentos_procesados != null ? fmtN(m.total_documentos_procesados) : '—')}
					</div>
				{/if}

				{#if modoCxc === 'historico'}
					{@const k = kpiCxc}
					<div class="mb-3 grid grid-cols-3 gap-3">
						{@render kpi('Ejecuciones', fmtN(k?.total))}
						{@render kpi('Duración prom.', fmtDur(k?.avgDur))}
						{@render kpi('Emails totales', fmtN(k?.emails))}
					</div>
					<div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{@render kpi('Última cartera USD', fmtM(k?.lastUsd, 'USD'))}
						{@render kpi('Último vencido USD', fmtM(k?.lastVUsd, 'USD'))}
						{@render kpi('Última cartera CRC', fmtM(k?.lastCrc, 'CRC'))}
						{@render kpi('Último vencido CRC', fmtM(k?.lastVCrc, 'CRC'))}
					</div>
					<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
						<div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
							<div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light);">
								<div class="h-3 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
								<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">Tendencia cartera USD</p>
							</div>
							<div class="p-4"><canvas bind:this={cHUsd}></canvas></div>
						</div>
						<div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
							<div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light);">
								<div class="h-3 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
								<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">Tendencia cartera CRC</p>
							</div>
							<div class="p-4"><canvas bind:this={cHCrc}></canvas></div>
						</div>
						<div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
							<div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light);">
								<div class="h-3 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
								<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">Tasa de envío histórica (%)</p>
							</div>
							<div class="p-4"><canvas bind:this={cHTasa}></canvas></div>
						</div>
						<div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
							<div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light);">
								<div class="h-3 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
								<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">Duración por corrida (seg)</p>
							</div>
							<div class="p-4"><canvas bind:this={cHDur}></canvas></div>
						</div>
					</div>
					<div class="mt-6 overflow-hidden rounded-xl border border-border shadow-sm">
						<table class="w-full text-sm">
							<thead class="text-[11px] font-bold uppercase tracking-wide text-white"
								style="background-color: var(--brand-primary);">
								<tr>
									<th class="px-4 py-3 text-left">Fecha</th>
									<th class="px-4 py-3 text-center">Estado</th>
									<th class="px-4 py-3 text-right">Procesados</th>
									<th class="px-4 py-3 text-right">Emails OK</th>
									<th class="px-4 py-3 text-right">Cartera USD</th>
									<th class="px-4 py-3 text-right">Cartera CRC</th>
									<th class="px-4 py-3 text-right">Duración</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border">
								{#each ejecCxc as e}
									{@const m = e.metricas as MetricasCxc}
									<tr class="transition-colors"
										onmouseenter={(ev) => { (ev.currentTarget as HTMLElement).style.backgroundColor = 'var(--brand-primary-light)'; }}
										onmouseleave={(ev) => { (ev.currentTarget as HTMLElement).style.backgroundColor = ''; }}>
										<td class="px-4 py-2.5 text-sm text-foreground">{fmtF(e.fecha_inicio)}</td>
										<td class="px-4 py-2.5 text-center">{@render estadoBadge(e.estado)}</td>
										<td class="px-4 py-2.5 text-right text-muted-foreground">{fmtN(m?.clientes_procesados)}</td>
										<td class="px-4 py-2.5 text-right text-muted-foreground">{fmtN(m?.emails_exitosos)}</td>
										<td class="px-4 py-2.5 text-right text-muted-foreground">{fmtM(m?.monto_total_usd, 'USD')}</td>
										<td class="px-4 py-2.5 text-right text-muted-foreground">{fmtM(m?.monto_total_colones, 'CRC')}</td>
										<td class="px-4 py-2.5 text-right text-muted-foreground">{fmtDur(m?.tiempo_ejecucion)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			{/if}
		{/if}

		<!-- ══════════════ TAB GIRAS ══════════════ -->
		{#if activeTab === 'giras'}
			{#if ejecGiras.length === 0}
				<div class="rounded-xl border border-border bg-muted/40 py-16 text-center text-sm text-muted-foreground">
					Aún no hay ejecuciones registradas para el RPA de Giras de Agentes.
				</div>
			{:else}
				<div class="mb-5 flex flex-wrap items-center gap-4">
					{@render toggleModo(modoGiras, (m) => (modoGiras = m))}
					{#if modoGiras === 'una'}
						<select
							bind:value={selGiras}
							class="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none transition-all"
							onfocus={focusIn}
							onblur={focusOut}
						>
							{#each ejecGiras as e}
								<option value={e.id}>{fmtF(e.fecha_inicio)} — {e.estado}</option>
							{/each}
						</select>
					{/if}
				</div>

				{#if modoGiras === 'una'}
					{@const m = mGirasSel}
					<div class="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
						{@render kpi('Agentes activos', fmtN(m?.total_agentes))}
						{@render kpi('Reportes', fmtN(m?.reportes_generados))}
						{@render kpi('Documentos', m?.total_documentos_procesados != null ? fmtN(m.total_documentos_procesados) : '—')}
						{@render kpi('Duración', fmtDur(m?.tiempo_ejecucion))}
					</div>
					<div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{@render kpi('Cartera USD', fmtM(m?.monto_total_usd, 'USD'))}
						{@render kpi('Cartera CRC', fmtM(m?.monto_total_colones, 'CRC'))}
						{@render kpi('Vencido USD', fmtM(m?.monto_vencido_usd, 'USD'))}
					</div>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
							<div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light);">
								<div class="h-3 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
								<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">Cartera vs Vencido · USD</p>
							</div>
							<div class="p-4"><canvas bind:this={cGUsd}></canvas></div>
						</div>
						<div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
							<div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light);">
								<div class="h-3 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
								<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">Cartera vs Vencido · CRC</p>
							</div>
							<div class="p-4"><canvas bind:this={cGCrc}></canvas></div>
						</div>
					</div>
				{/if}

				{#if modoGiras === 'historico'}
					{@const k = kpiGiras}
					<div class="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
						{@render kpi('Ejecuciones', fmtN(k?.total))}
						{@render kpi('Duración prom.', fmtDur(k?.avgDur))}
						{@render kpi('Reportes totales', fmtN(k?.reportes))}
						{@render kpi('Emails totales', fmtN(k?.emails))}
					</div>
					<div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{@render kpi('Última cartera USD', fmtM(k?.lastUsd, 'USD'))}
						{@render kpi('Último vencido USD', fmtM(k?.lastVUsd, 'USD'))}
						{@render kpi('Última cartera CRC', fmtM(k?.lastCrc, 'CRC'))}
					</div>
					<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
						<div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
							<div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light);">
								<div class="h-3 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
								<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">Tendencia cartera USD</p>
							</div>
							<div class="p-4"><canvas bind:this={cGHUsd}></canvas></div>
						</div>
						<div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
							<div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light);">
								<div class="h-3 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
								<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">Tendencia cartera CRC</p>
							</div>
							<div class="p-4"><canvas bind:this={cGHCrc}></canvas></div>
						</div>
						<div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
							<div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light);">
								<div class="h-3 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
								<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">Reportes generados por corrida</p>
							</div>
							<div class="p-4"><canvas bind:this={cGHRep}></canvas></div>
						</div>
						<div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
							<div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light);">
								<div class="h-3 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
								<p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">Agentes activos por corrida</p>
							</div>
							<div class="p-4"><canvas bind:this={cGHAg}></canvas></div>
						</div>
					</div>
					<div class="mt-6 overflow-hidden rounded-xl border border-border shadow-sm">
						<table class="w-full text-sm">
							<thead class="text-[11px] font-bold uppercase tracking-wide text-white"
								style="background-color: var(--brand-primary);">
								<tr>
									<th class="px-4 py-3 text-left">Fecha</th>
									<th class="px-4 py-3 text-center">Estado</th>
									<th class="px-4 py-3 text-right">Agentes</th>
									<th class="px-4 py-3 text-right">Reportes</th>
									<th class="px-4 py-3 text-right">Cartera USD</th>
									<th class="px-4 py-3 text-right">Cartera CRC</th>
									<th class="px-4 py-3 text-right">Duración</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border">
								{#each ejecGiras as e}
									{@const m = e.metricas as MetricasGiras}
									<tr class="transition-colors"
										onmouseenter={(ev) => { (ev.currentTarget as HTMLElement).style.backgroundColor = 'var(--brand-primary-light)'; }}
										onmouseleave={(ev) => { (ev.currentTarget as HTMLElement).style.backgroundColor = ''; }}>
										<td class="px-4 py-2.5 text-foreground">{fmtF(e.fecha_inicio)}</td>
										<td class="px-4 py-2.5 text-center">{@render estadoBadge(e.estado)}</td>
										<td class="px-4 py-2.5 text-right text-muted-foreground">{fmtN(m?.total_agentes)}</td>
										<td class="px-4 py-2.5 text-right text-muted-foreground">{fmtN(m?.reportes_generados)}</td>
										<td class="px-4 py-2.5 text-right text-muted-foreground">{fmtM(m?.monto_total_usd, 'USD')}</td>
										<td class="px-4 py-2.5 text-right text-muted-foreground">{fmtM(m?.monto_total_colones, 'CRC')}</td>
										<td class="px-4 py-2.5 text-right text-muted-foreground">{fmtDur(m?.tiempo_ejecucion)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			{/if}
		{/if}
	{/if}
</div>

<style>
	.kpi-card:hover {
		border-color: var(--brand-primary-border);
		box-shadow: 0 0 0 1px var(--brand-primary-border);
	}
</style>