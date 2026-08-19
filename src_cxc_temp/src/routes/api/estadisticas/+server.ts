import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServices } from '$lib/services';
import { supabaseAdmin, getUserPerfil } from '$lib/server/supabase-admin';

export const GET: RequestHandler = async ({ locals, url }) => {
	const { safeGetSession } = locals;
	const { session, user } = await safeGetSession();

	if (!session || !user) {
		throw error(401, 'No autenticado');
	}

	const perfil = await getUserPerfil(user.id);
	const services = createServices(supabaseAdmin);
	const clienteId = user.user_metadata?.cliente_id || null;
	const esAdmin = perfil?.es_admin === true || user.user_metadata?.es_admin === true || user.email?.includes('admin');
	const clienteIdParam = url.searchParams.get('cliente_id');

	try {
		// Solo usuarios regulares pueden obtener estadísticas de su cliente
		// Administradores pueden especificar cliente_id en query param
		const targetClienteId = esAdmin ? clienteIdParam || clienteId : clienteId;

		if (!targetClienteId) {
			return json({ estadisticas: null });
		}

		const estadisticas = await services.automatizaciones.getEstadisticas(targetClienteId);
		return json({ estadisticas });
	} catch (err) {
		console.error('Error en GET /api/estadisticas:', err);
		throw error(500, 'Error al obtener estadísticas');
	}
};
