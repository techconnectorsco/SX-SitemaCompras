
// ARCHIVO: src/routes/(app)/+layout.server.ts


import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { session, user } = await safeGetSession();

	let clienteId: string | null = null;
	let esAdmin = false;
	let perfilCompleto: any = null;

	if (user) {
		try {
			// Consultar perfil completo del usuario
			const { data: perfil, error } = await supabase
				.from('perfiles')
				.select('es_admin, esta_baneado, cliente_id, nombre_completo, empresa, cargo')
				.eq('id', user.id)
				.maybeSingle();

			if (!error && perfil) {
				perfilCompleto = perfil;

				// clienteId: primero de perfiles (fuente de verdad), fallback a user_metadata
				clienteId = perfil.cliente_id || user.user_metadata?.cliente_id || null;

				// esAdmin: perfiles es la fuente de verdad
				esAdmin =
					perfil.es_admin === true ||
					user.user_metadata?.es_admin === true ||
					(user.email?.includes('admin') ?? false);
			} else {
				// Si no hay perfil, usar user_metadata como fallback
				clienteId = user.user_metadata?.cliente_id || null;
				esAdmin =
					user.user_metadata?.es_admin === true ||
					(user.email?.includes('admin') ?? false);
			}
		} catch (err) {
			console.error('[app/+layout.server.ts] Error cargando perfil:', err);
			// Fallback a user_metadata
			clienteId = user.user_metadata?.cliente_id || null;
			esAdmin = user.user_metadata?.es_admin === true;
		}
	}

	return {
		session,
		user,
		clienteId,
		esAdmin,
		perfilCompleto
	};
};