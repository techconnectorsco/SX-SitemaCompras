import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	const [
		{ data: automatizaciones },
		{ data: proyectos },
		{ data: ejecuciones }
	] = await Promise.all([
		supabase
			.from('automatizaciones')
			.select('id, esta_activa'),
		supabase
			.from('proyectos_software')
			.select('id'),
		supabase
			.from('ejecuciones')
			.select('id, estado, fecha_inicio, automatizaciones(nombre)')
			.order('fecha_inicio', { ascending: true })
	]);

	// ── KPIs ──────────────────────────────────────────────────────
	const rpasActivos         = automatizaciones?.filter(a => a.esta_activa).length ?? 0;
	const proyectosCulminados = proyectos?.length ?? 0;
	const totalEjecuciones    = ejecuciones?.length ?? 0;
	const exitosas = ejecuciones?.filter(e =>
		['exitoso', 'Exitoso', 'success', 'ok', 'OK'].includes(e.estado ?? '')
	).length ?? 0;
	const tasaExito = totalEjecuciones > 0
		? Math.round((exitosas / totalEjecuciones) * 100)
		: 0;

	// ── Chart 1: Actividad mensual por automatización ─────────────
	const seriesMap: Record<string, Record<string, number>> = {};
	const monthsSet = new Set<string>();

	ejecuciones?.forEach((e: any) => {
		const autoName: string | undefined = e.automatizaciones?.nombre;
		if (!autoName || !e.fecha_inicio) return;
		const month = (e.fecha_inicio as string).slice(0, 7);
		monthsSet.add(month);
		if (!seriesMap[autoName]) seriesMap[autoName] = {};
		seriesMap[autoName][month] = (seriesMap[autoName][month] ?? 0) + 1;
	});

	const months = [...monthsSet].sort();
	const chartData = {
		months,
		series: Object.entries(seriesMap).map(([name, d]) => ({
			name,
			data: months.map(m => d[m] ?? 0)
		}))
	};

	// ── Chart 2: Heatmap — últimas 52 semanas ────────────────────
	const dailyMap: Record<string, number> = {};
	ejecuciones?.forEach((e: any) => {
		if (!e.fecha_inicio) return;
		const day = (e.fecha_inicio as string).slice(0, 10);
		dailyMap[day] = (dailyMap[day] ?? 0) + 1;
	});

	// Construir grilla de 52 semanas hacia atrás desde hoy
	const today = new Date();
	const heatmapCells: { date: string; count: number; week: number; dow: number }[] = [];
	for (let w = 51; w >= 0; w--) {
		for (let d = 0; d <= 6; d++) {
			const date = new Date(today);
			date.setDate(today.getDate() - (w * 7 + (6 - d)));
			const dateStr = date.toISOString().slice(0, 10);
			heatmapCells.push({
				date: dateStr,
				count: dailyMap[dateStr] ?? 0,
				week: 51 - w,
				dow: d
			});
		}
	}
	const heatmapMax = Math.max(...heatmapCells.map(c => c.count), 1);

	// ── Chart 3: Scatter — hora vs día de semana ─────────────────
	const scatterPoints: { hour: number; dow: number; auto: string }[] = [];
	ejecuciones?.forEach((e: any) => {
		const autoName: string | undefined = e.automatizaciones?.nombre;
		if (!autoName || !e.fecha_inicio) return;
		const dt = new Date(e.fecha_inicio as string);
		scatterPoints.push({
			hour: dt.getUTCHours(),
			dow:  dt.getUTCDay(),   // 0=Sun, 6=Sat
			auto: autoName
		});
	});

	// ── Chart 4: Acumulado por automatización ────────────────────
	const cumulativeSeries = Object.entries(seriesMap).map(([name, d]) => {
		let cum = 0;
		const data = months.map(m => {
			cum += d[m] ?? 0;
			return cum;
		});
		return { name, data };
	});

	return {
		session,
		user,
		rpasActivos,
		proyectosCulminados,
		totalEjecuciones,
		tasaExito,
		chartData,
		heatmapCells,
		heatmapMax,
		scatterPoints,
		cumulativeSeries
	};
};