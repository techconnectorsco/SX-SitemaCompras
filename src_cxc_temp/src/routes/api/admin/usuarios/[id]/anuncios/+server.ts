import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;

		const { data: anuncios, error } = await supabase
			.from('anuncios')
			.select('id, titulo, precio, moneda, estado, publico, vistas_total, tipo_transaccion, created_at')
			.eq('user_id', id)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error al obtener anuncios:', error);
			return json({ error: 'Error al cargar anuncios' }, { status: 500 });
		}

		return json({
			success: true,
			anuncios
		});
	} catch (error: any) {
		console.error('💥 Error:', error);
		return json({ error: error.message }, { status: 500 });
	}
};