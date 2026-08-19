import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const ID_CXC   = '55d181a5-ac18-4f1c-8c1d-30493028f03d';
const ID_GIRAS = 'e167d49e-7f38-427e-8191-898e7688ad00';

export const GET: RequestHandler = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	if (!session) throw error(401, 'No autorizado');

	const { data, error: dbErr } = await locals.supabase
		.from('ejecuciones')
		.select('id, automatizacion_id, fecha_inicio, fecha_fin, estado, metricas')
		.in('automatizacion_id', [ID_CXC, ID_GIRAS])
		.order('fecha_inicio', { ascending: false })
		.limit(120);

	if (dbErr) throw error(500, 'Error al consultar ejecuciones');

	const rows = data ?? [];
	return json({
		cxc:   rows.filter((e) => e.automatizacion_id === ID_CXC),
		giras: rows.filter((e) => e.automatizacion_id === ID_GIRAS)
	});
};
