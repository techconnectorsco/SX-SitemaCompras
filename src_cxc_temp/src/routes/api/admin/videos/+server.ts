import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET - Obtener todos los videos (para admin)
export const GET: RequestHandler = async ({ locals, url }) => {
	const { supabase } = locals;
	
	// Obtener parámetro para filtrar solo visibles (para página pública)
	const onlyVisible = url.searchParams.get('visible') === 'true';
	
	let query = supabase
		.from('videos_publi')
		.select('*')
		.order('id', { ascending: false });
	
	if (onlyVisible) {
		query = query.eq('es_visible', true);
	}
	
	const { data, error } = await query;
	
	if (error) {
		return json({ error: error.message }, { status: 500 });
	}
	
	return json(data);
};

// POST - Crear nuevo video
export const POST: RequestHandler = async ({ request, locals }) => {
	const { supabase } = locals;
	
	const body = await request.json();
	
	const { data, error } = await supabase
		.from('videos_publi')
		.insert({
			empresa: body.empresa,
			link_youtube: body.link_youtube,
			es_visible: body.es_visible ?? true
		})
		.select()
		.single();
	
	if (error) {
		return json({ error: error.message }, { status: 500 });
	}
	
	return json(data, { status: 201 });
};
