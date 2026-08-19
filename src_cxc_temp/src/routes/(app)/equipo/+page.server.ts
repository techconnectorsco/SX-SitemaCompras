import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	const { data: equipo } = await supabase
		.from('equipo')
		.select('id, nombre, cargo, descripcion, email, foto_url, color, orden, redes_sociales')
		.eq('esta_activo', true)
		.eq('visible', true)
		.order('orden', { ascending: true });

	return {
		session,
		user,
		equipo: equipo ?? []
	};
};