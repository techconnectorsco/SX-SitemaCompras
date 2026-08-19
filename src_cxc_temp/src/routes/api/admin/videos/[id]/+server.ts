import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PATCH - Actualizar video
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { supabase } = locals;
	const { id } = params;
	
	const body = await request.json();
	
	const { data, error } = await supabase
		.from('videos_publi')
		.update({
			empresa: body.empresa,
			link_youtube: body.link_youtube,
			es_visible: body.es_visible
		})
		.eq('id', id)
		.select()
		.single();
	
	if (error) {
		return json({ error: error.message }, { status: 500 });
	}
	
	return json(data);
};

// DELETE - Eliminar video
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { supabase } = locals;
	const { id } = params;
	
	const { error } = await supabase
		.from('videos_publi')
		.delete()
		.eq('id', id);
	
	if (error) {
		return json({ error: error.message }, { status: 500 });
	}
	
	return json({ success: true });
};
