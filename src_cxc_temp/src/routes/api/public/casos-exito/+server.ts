
// ARCHIVO: src/routes/api/public/casos-exito/+server.ts


import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase-admin';

export const GET: RequestHandler = async () => {
	try {
		const { data, error } = await supabaseAdmin
			.from('casos_exito')
			.select('id, titulo, descripcion, industria, tipo_automatizacion, metricas_publicas, imagen_url, orden')
			.eq('esta_publicado', true)
			.order('orden', { ascending: true });

		if (error) {
			console.error('[api/public/casos-exito] Error:', error);
			return json({ casos: [] });
		}

		return json({ casos: data || [] });
	} catch (err) {
		console.error('[api/public/casos-exito] Error:', err);
		return json({ casos: [] });
	}
};