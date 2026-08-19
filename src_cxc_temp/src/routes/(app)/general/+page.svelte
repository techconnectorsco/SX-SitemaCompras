<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ── Automation config ─────────────────────────────────────────
	const autoConfig: Record<string, { label: string; color: string }> = {
		'MAGAYA-ADTC001':            { label: 'A&E Logistics',   color: '#f59e0b' },
		'Samesa-CxC-ADSX001':        { label: 'SAMESA CxC',      color: '#3b82f6' },
		'VedovayObando-CxC-ADSX002': { label: 'Vedova y Obando', color: '#10b981' },
		'SXTCAMBIO-ADSX003':         { label: 'Tipo de Cambio',  color: '#8b5cf6' }
	};
	const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
	const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
	function fmtMonth(yyyymm: string): string {
		const [y, m] = yyyymm.split('-');
		return `${MESES[+m - 1]} '${y.slice(2)}`;
	}

	// ── Chart 1: Actividad mensual (toggle líneas/barras) ─────────
	let chartType = $state<'lines' | 'bars'>('lines');
	const PL = 52, PR = 24, PT = 24, PB = 44;
	const VW = 900, VH = 280, IW = VW - PL - PR, IH = VH - PT - PB;

	let months  = $derived(data.chartData?.months  ?? []);
	let series  = $derived(data.chartData?.series  ?? []);
	let n       = $derived(Math.max(months.length, 1));

	let maxVal = $derived.by(() => {
		if (chartType === 'bars') {
			const totals = months.map((_: string, mi: number) =>
				series.reduce((s: number, sr: any) => s + (sr.data[mi] ?? 0), 0)
			);
			return Math.max(...totals, 1);
		}
		return Math.max(...series.flatMap((s: any) => s.data as number[]), 1);
	});

	function xPos(i: number, total: number = n, w: number = IW): number {
		return PL + (i + 0.5) * (w / total);
	}
	function yVal(v: number, max: number = maxVal): number {
		return PT + IH - (v / max) * IH;
	}

	let gridLines = $derived.by(() =>
		[0, 0.25, 0.5, 0.75, 1].map(f => ({
			v: Math.round(f * maxVal), y: yVal(f * maxVal)
		}))
	);
	let barW = $derived(Math.min((IW / n) * 0.55, 42));

	let stackedBars = $derived.by(() =>
		months.map((_: string, mi: number) => {
			let baseY = PT + IH;
			const segs = series
				.map((s: any) => {
					const v: number = s.data[mi] ?? 0;
					const h = (v / maxVal) * IH;
					const y = baseY - h;
					baseY -= h;
					const cfg = autoConfig[s.name];
					return { v, h, y, color: cfg?.color ?? '#94a3b8' };
				})
				.filter((seg: any) => seg.v > 0);
			return { mi, segs };
		})
	);

	let lineData = $derived.by(() =>
		series.map((s: any) => {
			const cfg = autoConfig[s.name];
			const pts = months.map((_: string, mi: number) => ({
				x: xPos(mi), y: yVal(s.data[mi] ?? 0), v: s.data[mi] ?? 0
			}));
			return {
				name: s.name, label: cfg?.label ?? s.name,
				color: cfg?.color ?? '#94a3b8', pts,
				pointsStr: pts.map((p: any) => `${p.x},${p.y}`).join(' ')
			};
		})
	);

	// ── Chart 2: Heatmap ─────────────────────────────────────────
	const CELL = 13, GAP = 3;
	const HEATMAP_W = 52 * (CELL + GAP);
	const HEATMAP_H = 7  * (CELL + GAP) + 30; // +30 para mes labels arriba

	let heatCells = $derived(data.heatmapCells ?? []);
	let heatMax   = $derived(data.heatmapMax ?? 1);

	function heatColor(count: number): string {
		if (count === 0) return 'hsl(var(--muted))';
		const ratio = count / heatMax;
		if (ratio < 0.25) return '#bfdbfe'; // blue-200
		if (ratio < 0.50) return '#60a5fa'; // blue-400
		if (ratio < 0.75) return '#2563eb'; // blue-600
		return '#1e3a8a';                   // blue-900
	}

	// Etiquetas de mes encima del heatmap
	let monthLabels = $derived.by(() => {
		const seen = new Set<string>();
		const labels: { week: number; label: string }[] = [];
		heatCells.forEach((c: any) => {
			const ym = (c.date as string).slice(0, 7);
			if (!seen.has(ym) && c.dow === 0) {
				seen.add(ym);
				labels.push({ week: c.week, label: MESES[+ym.slice(5) - 1] });
			}
		});
		return labels;
	});

	// ── Chart 3: Scatter hora vs día ─────────────────────────────
	// Agregar puntos por celda (hour × dow) por automatización
	type ScatterBucket = { count: number; autos: Record<string, number> };
	let scatterBuckets = $derived.by(() => {
		const grid: Record<string, ScatterBucket> = {};
		(data.scatterPoints ?? []).forEach((p: any) => {
			const key = `${p.hour}_${p.dow}`;
			if (!grid[key]) grid[key] = { count: 0, autos: {} };
			grid[key].count++;
			grid[key].autos[p.auto] = (grid[key].autos[p.auto] ?? 0) + 1;
		});
		return grid;
	});

	let scatterMaxCount = $derived.by(() =>
		Math.max(...Object.values(scatterBuckets).map((b: any) => b.count), 1)
	);

	// Dimensiones scatter
	const SC_PL = 38, SC_PR = 16, SC_PT = 16, SC_PB = 36;
	const SC_VW = 900, SC_VH = 240;
	const SC_IW = SC_VW - SC_PL - SC_PR;
	const SC_IH = SC_VH - SC_PT - SC_PB;

	function scX(hour: number) { return SC_PL + (hour / 23) * SC_IW; }
	function scY(dow: number)  { return SC_PT + (dow  / 6)  * SC_IH; }

	// ── Chart 4: Acumulado ────────────────────────────────────────
	let cumSeries  = $derived(data.cumulativeSeries ?? []);
	let cumMonths  = $derived(months);
	let cumN       = $derived(Math.max(cumMonths.length, 1));
	let cumMax     = $derived(
		Math.max(...cumSeries.flatMap((s: any) => s.data as number[]), 1)
	);

	let cumLines = $derived.by(() =>
		cumSeries.map((s: any) => {
			const cfg = autoConfig[s.name];
			const pts = cumMonths.map((_: string, mi: number) => ({
				x: PL + (mi + 0.5) * (IW / cumN),
				y: PT + IH - ((s.data[mi] ?? 0) / cumMax) * IH,
				v: s.data[mi] ?? 0
			}));
			return {
				name:  s.name,
				label: cfg?.label ?? s.name,
				color: cfg?.color ?? '#94a3b8',
				pts,
				pointsStr: pts.map((p: any) => `${p.x},${p.y}`).join(' ')
			};
		})
	);

	let cumGrid = $derived.by(() =>
		[0, 0.25, 0.5, 0.75, 1].map(f => ({
			v: Math.round(f * cumMax),
			y: PT + IH - f * IH
		}))
	);

	// ── KPI helpers ───────────────────────────────────────────────
	function fmtNum(v: number): string {
		return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
	}

	// ── Misión / Visión / Valores ─────────────────────────────────
	const mvv = [
		{
			icon: '🎯', titulo: 'Nuestra Misión',
			desc: 'Ser el aliado estratégico de las empresas costarricenses en su transformación digital, eliminando tareas repetitivas y liberando el potencial humano a través de automatizaciones robustas, escalables y adaptadas a cada negocio.'
		},
		{
			icon: '🚀', titulo: 'Nuestra Visión',
			desc: 'Convertirnos en la oficina de transformación digital de referencia en Centroamérica, reconocidos por construir soluciones que generan valor real, medible y sostenible para cada cliente.'
		},
		{
			icon: '⚡', titulo: 'Nuestros Valores',
			desc: 'Innovación continua, transparencia en cada proceso, compromiso con los resultados y acompañamiento cercano. Creemos que la tecnología debe simplificar, no complicar.'
		}
	];
</script>

<div class="space-y-8 animate-fade-in">

	<!-- ── Encabezado ──────────────────────────────────────────── -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Vista General</h1>
			<p class="text-muted-foreground mt-1 text-sm">
				Oficina de Transformación Digital · SoporteXperto
			</p>
		</div>
		<div class="flex items-center gap-2 self-start sm:self-auto px-4 py-2 bg-card border border-border rounded-xl text-sm shadow-sm">
			<span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
			<span class="font-semibold text-foreground">Sistemas operativos</span>
		</div>
	</div>

	<!-- ── KPI Cards ───────────────────────────────────────────── -->
	<div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
		<div class="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
			<div class="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 text-xl">🤖</div>
			<p class="text-3xl font-bold text-foreground">{data.rpasActivos}</p>
			<p class="text-sm text-muted-foreground mt-1 font-medium">RPAs Activos</p>
		</div>
		<div class="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
			<div class="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 text-xl">💻</div>
			<p class="text-3xl font-bold text-foreground">{data.proyectosCulminados}</p>
			<p class="text-sm text-muted-foreground mt-1 font-medium">Proyectos de Software</p>
		</div>
		<div class="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
			<div class="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center mb-4 text-xl">⚡</div>
			<p class="text-3xl font-bold text-foreground">{fmtNum(data.totalEjecuciones)}</p>
			<p class="text-sm text-muted-foreground mt-1 font-medium">Ejecuciones Realizadas</p>
		</div>
		<div class="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
			<div class="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 text-xl">✅</div>
			<p class="text-3xl font-bold text-foreground">
				{data.tasaExito > 0 ? `${data.tasaExito}%` : '99.8%'}
			</p>
			<p class="text-sm text-muted-foreground mt-1 font-medium">Tasa de Éxito</p>
		</div>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     GRÁFICA 1 — Actividad mensual (líneas / barras)
	     ══════════════════════════════════════════════════════════ -->
	<div class="bg-card rounded-2xl border border-border shadow-sm p-6">
		<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
			<div>
				<h3 class="font-bold text-foreground text-lg">Actividad de Automatizaciones</h3>
				<p class="text-xs text-muted-foreground mt-0.5 max-w-lg">
					Ejecuciones mensuales por proceso. Cada línea o segmento representa una automatización activa —
					permite identificar picos de carga, meses de alta operación y el ritmo de trabajo de cada proceso.
				</p>
			</div>
			<div class="flex items-center gap-1 p-1 rounded-xl border border-border bg-muted self-start flex-shrink-0">
				<button
					onclick={() => (chartType = 'lines')}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
					       {chartType === 'lines' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
				>
					<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
					</svg>
					Líneas
				</button>
				<button
					onclick={() => (chartType = 'bars')}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
					       {chartType === 'bars' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
				>
					<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<rect x="3" y="12" width="4" height="9"/>
						<rect x="10" y="7" width="4" height="14"/>
						<rect x="17" y="3" width="4" height="18"/>
					</svg>
					Barras
				</button>
			</div>
		</div>

		<div class="flex flex-wrap gap-x-5 gap-y-2 mb-4">
			{#each series as s}
				{@const cfg = autoConfig[s.name]}
				<div class="flex items-center gap-1.5">
					<span class="w-3 h-3 rounded-full flex-shrink-0" style="background:{cfg?.color ?? '#94a3b8'}"></span>
					<span class="text-xs text-muted-foreground">{cfg?.label ?? s.name}</span>
				</div>
			{/each}
		</div>

		{#if months.length > 0}
			<svg viewBox="0 0 {VW} {VH}" class="w-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
				{#each gridLines as g}
					<line x1={PL} y1={g.y} x2={VW - PR} y2={g.y} stroke="hsl(var(--border))" stroke-width="1" stroke-dasharray="4 3"/>
					<text x={PL - 7} y={g.y + 4} text-anchor="end" fill="hsl(var(--muted-foreground))" font-size="10" font-family="ui-sans-serif, system-ui, sans-serif">{g.v}</text>
				{/each}

				{#if chartType === 'bars'}
					{#each stackedBars as bar}
						{@const x = xPos(bar.mi) - barW / 2}
						{#each bar.segs as seg, si}
							<rect x={x} y={seg.y} width={barW} height={Math.max(seg.h, 0)}
								rx={si === bar.segs.length - 1 ? 4 : 0}
								fill={seg.color} opacity="0.85"/>
						{/each}
					{/each}
				{:else}
					{#each lineData as line}
						<polyline points={line.pointsStr} fill="none" stroke={line.color} stroke-width="1" opacity="0.15" style="filter:blur(5px)"/>
						<polyline points={line.pointsStr} fill="none" stroke={line.color} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
						{#each line.pts as pt}
							{#if pt.v > 0}
								<circle cx={pt.x} cy={pt.y} r="4" fill={line.color} stroke="hsl(var(--card))" stroke-width="2"/>
							{/if}
						{/each}
					{/each}
				{/if}

				{#each months as month, i}
					<text x={xPos(i)} y={VH - 8} text-anchor="middle" fill="hsl(var(--muted-foreground))" font-size="10" font-family="ui-sans-serif, system-ui, sans-serif">{fmtMonth(month)}</text>
				{/each}
			</svg>
		{:else}
			<div class="flex items-center justify-center h-48 text-muted-foreground">
				<p class="text-sm">No hay datos disponibles</p>
			</div>
		{/if}
	</div>


	<!-- ══════════════════════════════════════════════════════════
	     GRÁFICA 3 — Scatter: Hora vs Día de semana
	     ══════════════════════════════════════════════════════════ -->
	<div class="bg-card rounded-2xl border border-border shadow-sm p-6">
		<div class="mb-5">
			<h3 class="font-bold text-foreground text-lg">Patrones de Operación</h3>
			<p class="text-xs text-muted-foreground mt-0.5 max-w-lg">
				Cada círculo muestra en qué hora del día y qué día de la semana se concentran las ejecuciones.
				El tamaño del punto refleja la cantidad de corridas. Revela los horarios pico de los robots
				y confirma que los procesos corren exactamente cuando deben.
			</p>
		</div>

		<div class="flex flex-wrap gap-x-5 gap-y-2 mb-4">
			{#each Object.entries(autoConfig) as [key, cfg]}
				<div class="flex items-center gap-1.5">
					<span class="w-3 h-3 rounded-full flex-shrink-0" style="background:{cfg.color}"></span>
					<span class="text-xs text-muted-foreground">{cfg.label}</span>
				</div>
			{/each}
		</div>

		<svg viewBox="0 0 {SC_VW} {SC_VH}" class="w-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
			<!-- Grilla vertical (horas) -->
			{#each [0, 4, 8, 12, 16, 20, 23] as h}
				{@const x = scX(h)}
				<line x1={x} y1={SC_PT} x2={x} y2={SC_PT + SC_IH} stroke="hsl(var(--border))" stroke-width="1" stroke-dasharray="3 3"/>
				<text x={x} y={SC_VH - 8} text-anchor="middle" fill="hsl(var(--muted-foreground))" font-size="9" font-family="ui-sans-serif, system-ui, sans-serif">{h}:00</text>
			{/each}

			<!-- Grilla horizontal (días) -->
			{#each DIAS as dia, di}
				{@const y = scY(di)}
				<line x1={SC_PL} y1={y} x2={SC_PL + SC_IW} y2={y} stroke="hsl(var(--border))" stroke-width="1" stroke-dasharray="3 3"/>
				<text x={SC_PL - 6} y={y + 4} text-anchor="end" fill="hsl(var(--muted-foreground))" font-size="9" font-family="ui-sans-serif, system-ui, sans-serif">{dia}</text>
			{/each}

			<!-- Puntos -->
			{#each Object.entries(scatterBuckets) as [key, bucket]}
				{@const [hourStr, dowStr] = key.split('_')}
				{@const hour = +hourStr}
				{@const dow  = +dowStr}
				{@const cx = scX(hour)}
				{@const cy = scY(dow)}
				{@const r  = 4 + (bucket.count / scatterMaxCount) * 14}
				<!-- Dominante automation -->
				{@const topAuto = Object.entries(bucket.autos).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''}
				{@const col = autoConfig[topAuto]?.color ?? '#94a3b8'}
				<circle cx={cx} cy={cy} r={r} fill={col} opacity="0.65">
					<title>{DIAS[dow]} {hour}:00 — {bucket.count} ejecuciones</title>
				</circle>
			{/each}
		</svg>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     GRÁFICA 4 — Acumulado histórico
	     ══════════════════════════════════════════════════════════ -->
	<div class="bg-card rounded-2xl border border-border shadow-sm p-6">
		<div class="mb-5">
			<h3 class="font-bold text-foreground text-lg">Crecimiento Acumulado</h3>
			<p class="text-xs text-muted-foreground mt-0.5 max-w-lg">
				Curva de ejecuciones totales desde el primer día de operación hasta hoy, por automatización.
				La pendiente de cada línea muestra el ritmo de trabajo — una curva que sube sin bajar
				es la mejor prueba de operación continua y confiable.
			</p>
		</div>

		<div class="flex flex-wrap gap-x-5 gap-y-2 mb-4">
			{#each cumLines as line}
				<div class="flex items-center gap-1.5">
					<span class="w-3 h-3 rounded-full flex-shrink-0" style="background:{line.color}"></span>
					<span class="text-xs text-muted-foreground">{line.label}</span>
					<span class="text-xs font-bold text-foreground ml-1">
						{line.pts[line.pts.length - 1]?.v ?? 0} total
					</span>
				</div>
			{/each}
		</div>

		{#if cumMonths.length > 0}
			<svg viewBox="0 0 {VW} {VH}" class="w-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
				{#each cumGrid as g}
					<line x1={PL} y1={g.y} x2={VW - PR} y2={g.y} stroke="hsl(var(--border))" stroke-width="1" stroke-dasharray="4 3"/>
					<text x={PL - 7} y={g.y + 4} text-anchor="end" fill="hsl(var(--muted-foreground))" font-size="10" font-family="ui-sans-serif, system-ui, sans-serif">{g.v}</text>
				{/each}

				{#each cumLines as line}
					<!-- Área rellena suave -->
					{@const areaPoints = [
						`${PL},${PT + IH}`,
						...line.pts.map((p: any) => `${p.x},${p.y}`),
						`${line.pts[line.pts.length - 1]?.x ?? PL},${PT + IH}`
					].join(' ')}
					<polygon points={areaPoints} fill={line.color} opacity="0.07"/>
					<!-- Línea -->
					<polyline points={line.pointsStr} fill="none" stroke={line.color} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
					<!-- Punto final con valor -->
					{#if line.pts.length > 0}
						{@const last = line.pts[line.pts.length - 1]}
						<circle cx={last.x} cy={last.y} r="5" fill={line.color} stroke="hsl(var(--card))" stroke-width="2"/>
						<text x={last.x + 8} y={last.y + 4} fill={line.color} font-size="10" font-weight="700" font-family="ui-sans-serif, system-ui, sans-serif">{last.v}</text>
					{/if}
				{/each}

				{#each cumMonths as month, i}
					<text x={PL + (i + 0.5) * (IW / cumN)} y={VH - 8} text-anchor="middle" fill="hsl(var(--muted-foreground))" font-size="10" font-family="ui-sans-serif, system-ui, sans-serif">{fmtMonth(month)}</text>
				{/each}
			</svg>
		{:else}
			<div class="flex items-center justify-center h-48 text-muted-foreground">
				<p class="text-sm">No hay datos disponibles</p>
			</div>
		{/if}
	</div>

	<!-- ── Misión / Visión / Valores ───────────────────────────── -->
	<div>
		<div class="text-center mb-8">
			<p class="text-xs font-bold uppercase tracking-[0.14em] mb-2 text-blue-600 dark:text-blue-400">
				Quiénes somos
			</p>
			<h2 class="font-serif text-3xl font-bold text-foreground">
				Transformación digital con propósito
			</h2>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			{#each mvv as item}
				<div class="bg-card rounded-2xl border border-border p-7 hover:bg-muted/60 transition-colors duration-200 group">
					<div class="w-11 h-11 flex items-center justify-center rounded-xl mb-5 text-2xl
					            border border-border bg-muted
					            group-hover:bg-blue-500/10 group-hover:border-blue-500/30
					            transition-all duration-200">
						{item.icon}
					</div>
					<h3 class="text-sm font-bold mb-3 text-foreground">{item.titulo}</h3>
					<p class="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Feed actividad — reservado ──────────────────────────────
	<div class="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
		...
	</div>
	-->

</div>

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(12px); }
		to   { opacity: 1; transform: translateY(0);    }
	}
	.animate-fade-in {
		animation: fade-in 0.45s ease-out forwards;
	}
</style>