// ARCHIVO: src/routes/api/solicitudes/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { SolicitudesService } from '$lib/services/solicitudes.service.ts';
import { supabaseAdmin } from '$lib/features/auth/config/supabase-admin';

/**
 * GET /api/solicitudes
 * - Usuario: obtiene sus propias solicitudes
 * - Admin: obtiene todas las solicitudes con filtro opcional por estado
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		const { session } = await locals.safeGetSession();

		if (!session) {
			return json({ error: 'No autenticado' }, { status: 401 });
		}

		const solicitudesService = new SolicitudesService(locals.supabase);
		const filtroEstado = url.searchParams.get('estado') as
			| 'pendiente'
			| 'aprobada'
			| 'rechazada'
			| null;

		let solicitudes;

		// Verificar si es admin
		const { data: perfil } = await locals.supabase
			.from('perfiles')
			.select('es_admin')
			.eq('id', session.user.id)
			.single();

		if (perfil?.es_admin) {
			// Admin: obtener todas las solicitudes
			solicitudes = await solicitudesService.getAll(filtroEstado || undefined);
		} else {
			// Usuario: obtener solo sus solicitudes
			solicitudes = await solicitudesService.getByUser(session.user.id);
		}

		return json({ solicitudes });
	} catch (error) {
		console.error('[api/solicitudes] GET error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Error desconocido' },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/solicitudes
 * Usuario crea una solicitud de acceso a un cliente
 *
 * Body: {
 *   cliente_id: string,
 *   mensaje?: string
 * }
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	try {
		const { session } = await locals.safeGetSession();

		if (!session) {
			return json({ error: 'No autenticado' }, { status: 401 });
		}

		const body = await request.json();
		const { cliente_id, mensaje } = body;

		if (!cliente_id) {
			return json({ error: 'cliente_id es obligatorio' }, { status: 400 });
		}

		const solicitudesService = new SolicitudesService(locals.supabase);

		// Crear solicitud
		const solicitud = await solicitudesService.crear(session.user.id, cliente_id, mensaje);

		console.log(
			`[api/solicitudes] ✓ Solicitud creada: user ${session.user.id} → cliente ${cliente_id}`
		);

		return json({ solicitud }, { status: 201 });
	} catch (error) {
		console.error('[api/solicitudes] POST error:', error);

		// Manejar errores específicos
		if (error instanceof Error) {
			if (error.message.includes('unique constraint')) {
				return json(
					{ error: 'Ya has solicitado acceso a este cliente' },
					{ status: 409 }
				);
			}
		}

		return json(
			{ error: error instanceof Error ? error.message : 'Error desconocido' },
			{ status: 500 }
		);
	}
};