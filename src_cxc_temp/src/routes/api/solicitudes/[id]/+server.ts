// ARCHIVO: src/routes/api/solicitudes/[id]/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { SolicitudesService } from '$lib/services/solicitudes.service';

/**
 * PATCH /api/solicitudes/[id]
 * Admin aprueba o rechaza una solicitud
 *
 * Body: {
 *   accion: 'aprobar' | 'rechazar',
 *   notas?: string
 * }
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	try {
		const { session } = await locals.safeGetSession();

		if (!session) {
			return json({ error: 'No autenticado' }, { status: 401 });
		}

		// Verificar que sea admin
		const { data: perfil } = await locals.supabase
			.from('perfiles')
			.select('es_admin')
			.eq('id', session.user.id)
			.single();

		if (!perfil?.es_admin) {
			return json({ error: 'Solo admins pueden procesar solicitudes' }, { status: 403 });
		}

		const body = await request.json();
		const { accion, notas } = body;
		const solicitudId = params.id;

		if (!accion || !['aprobar', 'rechazar'].includes(accion)) {
			return json(
				{ error: 'accion debe ser "aprobar" o "rechazar"' },
				{ status: 400 }
			);
		}

		const solicitudesService = new SolicitudesService(locals.supabase);
		let resultado;

		if (accion === 'aprobar') {
			resultado = await solicitudesService.aprobar(solicitudId, session.user.id);
			console.log(`[api/solicitudes/[id]] ✓ Solicitud ${solicitudId} aprobada por admin ${session.user.id}`);
		} else {
			resultado = await solicitudesService.rechazar(
				solicitudId,
				session.user.id,
				notas
			);
			console.log(`[api/solicitudes/[id]] ✓ Solicitud ${solicitudId} rechazada por admin ${session.user.id}`);
		}

		return json({ solicitud: resultado }, { status: 200 });
	} catch (error) {
		console.error('[api/solicitudes/[id]] PATCH error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Error desconocido' },
			{ status: 500 }
		);
	}
};