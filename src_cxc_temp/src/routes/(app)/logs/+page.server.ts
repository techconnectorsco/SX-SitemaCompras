import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	// Stats reales de toda la BD en paralelo
	const [
		{ count: totalCount },
		{ count: exitosasCount },
		{ count: erroresCount },
		{ count: pendientesCount },
		{ data: ejecuciones }
	] = await Promise.all([
		supabase.from('ejecuciones').select('*', { count: 'exact', head: true }),
		supabase.from('ejecuciones').select('*', { count: 'exact', head: true }).in('estado', ['Exitoso','exitoso','success','ok','OK']),
		supabase.from('ejecuciones').select('*', { count: 'exact', head: true }).in('estado', ['Error','error','ERROR','failed']),
		supabase.from('ejecuciones').select('*', { count: 'exact', head: true }).in('estado', ['pendiente','running','en_proceso']),
		supabase
			.from('ejecuciones')
			.select(`
				id, estado, fecha_inicio, fecha_fin, metricas,
				automatizaciones (
					nombre,
					clientes ( nombre )
				)
			`)
			.order('fecha_inicio', { ascending: false })
			.limit(50)
	]);

	// ── Helpers ───────────────────────────────────────────────────
	function fmtSeg(seg: number): string {
		if (seg < 60)   return `${seg.toFixed(1)}s`;
		if (seg < 3600) return `${(seg / 60).toFixed(1)}m`;
		return `${(seg / 3600).toFixed(1)}h`;
	}

	function parseDuracion(metricas: any): string | null {
		if (!metricas) return null;
		if (typeof metricas.duracion_ejecucion === 'string') {
			const match = metricas.duracion_ejecucion.match(/[\d.]+/);
			if (match) return fmtSeg(parseFloat(match[0]));
		}
		if (typeof metricas.tiempo_ejecucion === 'number') return fmtSeg(metricas.tiempo_ejecucion);
		return null;
	}

	const logs = (ejecuciones ?? []).map((e: any) => {
		const auto    = Array.isArray(e.automatizaciones) ? e.automatizaciones[0] : e.automatizaciones;
		const cliente = Array.isArray(auto?.clientes)     ? auto?.clientes[0]     : auto?.clientes;
		return {
			id:           e.id           as string,
			estado:       (e.estado      ?? 'desconocido') as string,
			fechaInicio:  e.fecha_inicio as string,
			autoNombre:   auto?.nombre    ?? '—',
			clienteNombre:cliente?.nombre ?? '—',
			duracion:     parseDuracion(e.metricas)
		};
	});

	const automations = [...new Set(logs.map(l => l.autoNombre))].filter(a => a !== '—');

	return {
		session,
		user,
		logs,
		totalCount: totalCount ?? 0,
		stats: {
			total:      totalCount      ?? 0,
			exitosas:   exitosasCount   ?? 0,
			errores:    erroresCount    ?? 0,
			pendientes: pendientesCount ?? 0
		},
		automations
	};
};