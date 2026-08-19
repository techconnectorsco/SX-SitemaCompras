<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let logs        = $derived(data.logs        ?? []);
	let totalCount  = $derived(data.totalCount  ?? 0);
	let stats       = $derived(data.stats       ?? { total: 0, exitosas: 0, errores: 0, pendientes: 0 });
	let automations = $derived(data.automations ?? []);

	// ── Filtros ───────────────────────────────────────────────────
	let estadoFilter = $state<string>('ALL');
	let autoFilter   = $state('ALL');
	let search       = $state('');

	let filteredLogs = $derived.by(() =>
		logs.filter((l: any) => {
			const matchEstado = estadoFilter === 'ALL' || normalizeEstado(l.estado) === estadoFilter;
			const matchAuto   = autoFilter   === 'ALL' || l.autoNombre === autoFilter;
			const matchSearch = search === '' ||
				l.autoNombre.toLowerCase().includes(search.toLowerCase()) ||
				l.clienteNombre.toLowerCase().includes(search.toLowerCase());
			return matchEstado && matchAuto && matchSearch;
		})
	);

	// ── Normalizar estados ────────────────────────────────────────
	function normalizeEstado(estado: string): string {
		const e = estado.toLowerCase();
		if (['exitoso','success','ok'].includes(e))           return 'SUCCESS';
		if (['error','failed','fallo'].includes(e))           return 'ERROR';
		if (['advertencia','warning','warn'].includes(e))     return 'WARNING';
		if (['pendiente','running','en_proceso'].includes(e)) return 'RUNNING';
		return 'INFO';
	}

	// ── Config visual ─────────────────────────────────────────────
	type LevelCfg = { label: string; tooltip: string; text: string; badge: string; dot: string };
	const levelCfg: Record<string, LevelCfg> = {
		SUCCESS: {
			label:   'EXITOSO',
			tooltip: 'Proceso completado sin problemas. Todos los registros fueron procesados correctamente.',
			text:    'text-emerald-400',
			badge:   'bg-emerald-900/60 text-emerald-400',
			dot:     'bg-emerald-500'
		},
		ERROR: {
			label:   'ERROR',
			tooltip: 'El proceso falló. Ocurrió un error inesperado que detuvo la ejecución.',
			text:    'text-red-400',
			badge:   'bg-red-900/60 text-red-400',
			dot:     'bg-red-500'
		},
		WARNING: {
			label:   'ADVERTENCIA',
			tooltip: 'Proceso completado con advertencias. Algunos correos no pudieron ser enviados por dirección inválida u otro error de entrega.',
			text:    'text-amber-400',
			badge:   'bg-amber-900/50 text-amber-400',
			dot:     'bg-amber-500'
		},
		RUNNING: {
			label:   'EN CURSO',
			tooltip: 'El proceso está actualmente en ejecución.',
			text:    'text-blue-400',
			badge:   'bg-blue-900/60 text-blue-400',
			dot:     'bg-blue-500'
		},
		INFO: {
			label:   'INFO',
			tooltip: 'Estado informativo o no clasificado.',
			text:    'text-slate-400',
			badge:   'bg-slate-800 text-slate-300',
			dot:     'bg-slate-500'
		},
	};

	function getCfg(estado: string): LevelCfg {
		return levelCfg[normalizeEstado(estado)] ?? levelCfg['INFO'];
	}

	// ── Helpers ───────────────────────────────────────────────────
	function fmtFecha(iso: string): string {
		const d    = new Date(iso);
		const hoy  = new Date();
		const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
		const time = d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
		if (d.toDateString() === hoy.toDateString())  return time;
		if (d.toDateString() === ayer.toDateString()) return `ayer ${time}`;
		return d.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit' }) + ` ${time}`;
	}

	function abrevAuto(nombre: string): string {
		if (nombre.length <= 32) return nombre;
		return nombre.slice(0, 30) + '…';
	}

	const filterTabs = [
		{ label: 'Todos',       value: 'ALL'     },
		{ label: 'Exitosos',    value: 'SUCCESS' },
		{ label: 'Errores',     value: 'ERROR'   },
		{ label: 'Advertencia', value: 'WARNING' },
		{ label: 'En curso',    value: 'RUNNING' },
	];

	function fmtNum(v: number): string {
		return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
	}
</script>

<div class="space-y-6 animate-fade-in">

	<!-- ── Encabezado ──────────────────────────────────────────── -->
	<div>
		<p class="text-xs font-bold uppercase tracking-[0.14em] mb-1 text-blue-600 dark:text-blue-400">
			Sistema
		</p>
		<h1 class="text-3xl font-bold text-foreground">Bitácora de Ejecuciones</h1>
		<p class="text-muted-foreground mt-1 text-sm">
			Resumen de las 50 ejecuciones más recientes del sistema SX.
		</p>
	</div>

	<!-- ── Stats reales de toda la BD ──────────────────────────── -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
		{#each [
			{ label: 'Total histórico',  val: fmtNum(stats.total),      color: 'text-foreground'                        },
			{ label: 'Exitosas',         val: fmtNum(stats.exitosas),   color: 'text-emerald-600 dark:text-emerald-400' },
			{ label: 'Errores',          val: fmtNum(stats.errores),    color: 'text-red-600 dark:text-red-400'         },
			{ label: 'En curso',         val: fmtNum(stats.pendientes), color: 'text-blue-600 dark:text-blue-400'       },
		] as s}
			<div class="bg-card border border-border rounded-xl px-4 py-3 text-center">
				<p class="text-2xl font-extrabold {s.color}">{s.val}</p>
				<p class="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-0.5">{s.label}</p>
			</div>
		{/each}
	</div>

	<!-- ── Filtros ─────────────────────────────────────────────── -->
	<div class="flex flex-col gap-3">
		<div class="flex items-center gap-2 flex-wrap">
			{#each filterTabs as tab}
				<button
					onclick={() => (estadoFilter = tab.value)}
					class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
					       {estadoFilter === tab.value
					         ? 'bg-foreground text-background border-foreground'
					         : 'bg-card text-muted-foreground border-border hover:border-blue-500/40 hover:text-foreground'}"
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<div class="flex flex-col sm:flex-row gap-3">
			<div class="relative flex-1">
				<svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
				     fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
					      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
				</svg>
				<input
					type="text"
					placeholder="Buscar por proceso o empresa..."
					bind:value={search}
					class="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm
					       text-foreground placeholder:text-muted-foreground
					       focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50
					       transition-all"
				/>
			</div>
			<select
				bind:value={autoFilter}
				class="px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground
				       focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50
				       transition-all min-w-52"
			>
				<option value="ALL">Todas las automatizaciones</option>
				{#each automations as a}
					<option value={a}>{a}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- ── Terminal ────────────────────────────────────────────── -->
	<div class="rounded-2xl shadow-xl border border-slate-800 overflow-hidden" style="background:#0d1117">

		<!-- Barra title -->
		<div class="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-800"
		     style="background:#161b22">
			<div class="flex items-center gap-3 min-w-0">
				<div class="flex gap-1.5 shrink-0">
					<span class="w-3 h-3 rounded-full" style="background:#ff5f56"></span>
					<span class="w-3 h-3 rounded-full" style="background:#ffbd2e"></span>
					<span class="w-3 h-3 rounded-full" style="background:#27c93f"></span>
				</div>
				<span class="font-mono text-[10px] sm:text-xs truncate" style="color:rgba(255,255,255,.3)">
					<span class="hidden sm:inline">sx_execution_stream — </span>últimas {filteredLogs.length} de {fmtNum(totalCount)} ejecuciones
				</span>
			</div>
			<div class="flex items-center gap-1.5 shrink-0">
				<span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
				<span class="font-mono text-[11px] font-semibold text-emerald-500">LIVE</span>
			</div>
		</div>

		<!-- Cabecera columnas: solo en md+ -->
		<div class="hidden md:flex items-center gap-3 px-4 py-2 border-b font-mono text-[10px] font-bold uppercase tracking-widest"
		     style="background:#161b22; border-color:rgba(255,255,255,.04); color:rgba(255,255,255,.2)">
			<span class="w-2 shrink-0"></span>
			<span class="w-36 shrink-0">Fecha / Hora</span>
			<span class="w-28 shrink-0">Estado</span>
			<span class="w-36 shrink-0">Empresa</span>
			<span class="flex-1">Automatización</span>
			<span class="w-16 shrink-0 text-right">Duración</span>
		</div>

		<!-- Filas -->
		<div class="font-mono text-xs">
			{#if filteredLogs.length === 0}
				<div class="py-16 flex flex-col items-center justify-center"
				     style="color:rgba(255,255,255,.2)">
					<p class="text-base mb-1">( sin resultados )</p>
					<p class="text-xs" style="color:rgba(255,255,255,.12)">Prueba ajustando los filtros</p>
				</div>
			{:else}
				{#each filteredLogs as log}
					{@const cfg = getCfg(log.estado)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="cursor-default"
					     style="border-bottom:1px solid rgba(255,255,255,.03);"
					     onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.03)'}
					     onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
					>
						<!-- ── Layout mobile (< md) ── -->
						<div class="md:hidden flex items-start gap-2.5 px-4 py-3">
							<span class="w-2 h-2 rounded-full shrink-0 mt-1 {cfg.dot}"></span>
							<div class="flex-1 min-w-0">
								<!-- Fila 1: badge + empresa + duración -->
								<div class="flex items-center gap-2 mb-1">
									<span class="px-2 py-0.5 rounded text-[10px] font-bold shrink-0 {cfg.badge}">
										{cfg.label}
									</span>
									<span class="truncate text-[11px]" style="color:rgba(255,255,255,.45)">
										{log.clienteNombre}
									</span>
									<span class="ml-auto tabular-nums text-[10px] shrink-0" style="color:rgba(255,255,255,.25)">
										{log.duracion ?? '—'}
									</span>
								</div>
								<!-- Fila 2: nombre automatización -->
								<div class="truncate {cfg.text}" style="font-size:11px">
									{abrevAuto(log.autoNombre)}
								</div>
								<!-- Fila 3: fecha -->
								<div class="mt-0.5 tabular-nums text-[10px]" style="color:rgba(255,255,255,.25)">
									{fmtFecha(log.fechaInicio)}
								</div>
							</div>
						</div>

						<!-- ── Layout desktop (md+) ── -->
						<div class="hidden md:flex items-center gap-3 px-4 py-2.5">
							<span class="w-2 h-2 rounded-full shrink-0 {cfg.dot}"></span>

							<span class="w-36 shrink-0 tabular-nums" style="color:rgba(255,255,255,.35)">
								{fmtFecha(log.fechaInicio)}
							</span>

							<!-- Badge con tooltip -->
							<span class="relative w-28 shrink-0 group/badge">
								<span class="w-full px-2 py-0.5 rounded text-[10px] font-bold text-center block {cfg.badge}">
									{cfg.label}
								</span>
								<span class="absolute bottom-full left-0 mb-2 w-56 px-3 py-2.5
								             rounded-xl text-[11px] leading-relaxed font-sans font-normal
								             pointer-events-none z-50
								             opacity-0 group-hover/badge:opacity-100
								             translate-y-1 group-hover/badge:translate-y-0
								             transition-all duration-200 shadow-xl"
								      style="background:#1e2d3d; color:rgba(255,255,255,.85); border:1px solid rgba(255,255,255,.1)">
									{cfg.tooltip}
									<span class="absolute top-full left-4 border-4 border-transparent"
									      style="border-top-color:#1e2d3d"></span>
								</span>
							</span>

							<span class="w-36 shrink-0 truncate" style="color:rgba(255,255,255,.45)">
								{log.clienteNombre}
							</span>

							<span class="flex-1 truncate {cfg.text}">
								{abrevAuto(log.autoNombre)}
							</span>

							<span class="w-16 shrink-0 text-right tabular-nums" style="color:rgba(255,255,255,.25)">
								{log.duracion ?? '—'}
							</span>
						</div>
					</div>
				{/each}

				<!-- Cursor parpadeante al final -->
				{#if estadoFilter === 'ALL' && autoFilter === 'ALL' && search === ''}
					<div class="flex items-center gap-3 px-4 py-2.5">
						<span class="w-2 h-2 rounded-full shrink-0 bg-slate-700"></span>
						<span class="hidden md:inline w-36" style="color:rgba(255,255,255,.1)">—</span>
						<span class="hidden md:inline w-28"></span>
						<span class="hidden md:inline w-36"></span>
						<span style="color:rgba(255,255,255,.18)">Esperando nuevas ejecuciones</span>
						<span class="inline-block w-2 h-3.5 rounded-sm ml-1 animate-pulse"
						      style="background:rgba(255,255,255,.18)"></span>
					</div>
				{/if}
			{/if}
		</div>
	</div>

</div>

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(12px); }
		to   { opacity: 1; transform: translateY(0); }
	}
	.animate-fade-in { animation: fade-in 0.45s ease-out forwards; }
</style>