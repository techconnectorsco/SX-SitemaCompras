import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Segunda capa de seguridad: aunque el auth-guard ya bloqueó,
// aquí verificamos de nuevo y cargamos datos del usuario para la UI.
export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { session, user } = await safeGetSession();

	if (!session || !user) {
		throw redirect(303, '/auth?mode=login');
	}

	const { data: perfil } = await supabase
		.from('perfiles')
		.select('es_admin, es_qu, nombre_completo')
		.eq('id', user.id)
		.maybeSingle();

	if (!perfil?.es_admin && !perfil?.es_qu) {
		throw redirect(303, '/');
	}

	return {
		nombreUsuario: perfil?.nombre_completo ?? user.email ?? 'Usuario'
	};
};
