// ARCHIVO: src/routes/api/automatizaciones/[id]/toggle/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { AutomatizacionesService } from '$lib/services/automatizaciones.service';

/**
 * PATCH /api/automatizaciones/[id]/toggle
 * Admin activa/desactiva un robot
 *
 * Body: {
 *   esta_activa: boolean,
 *   motivo?: string  // Opcional: razón del cambio (para logs)
 * }
 *
 * Response: {
 *   success: boolean,
 *   automatizacion: Automatizacion,
 *   mensaje: string
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
			return json(
				{ error: 'Solo administradores pueden cambiar el estado de robots' },
				{ status: 403 }
			);
		}

		const body = await request.json();
		const { esta_activa, motivo } = body;
		const automatizacionId = params.id;

		// Validar parámetro
		if (typeof esta_activa !== 'boolean') {
			return json(
				{ error: 'esta_activa debe ser un booleano (true/false)' },
				{ status: 400 }
			);
		}

		// Obtener datos de la automatización antes del cambio
		const { data: autoAntes } = await locals.supabase
			.from('automatizaciones')
			.select('id, nombre, cliente_id, esta_activa')
			.eq('id', automatizacionId)
			.single();

		if (!autoAntes) {
			return json(
				{ error: 'Automatización no encontrada' },
				{ status: 404 }
			);
		}

		// Si ya está en ese estado, retornar sin cambiar
		if (autoAntes.esta_activa === esta_activa) {
			return json({
				success: true,
				automatizacion: autoAntes,
				mensaje: `Robot ya estaba ${esta_activa ? 'activo' : 'desactivado'}`
			});
		}

		// Cambiar estado
		const automatizacionesService = new AutomatizacionesService(locals.supabase);
		const automatizacion = await automatizacionesService.toggleRobot(
			automatizacionId,
			esta_activa
		);

		// Log en consola (opcional: podría guardarse en tabla de auditoría)
		const accion = esta_activa ? 'REACTIVADO' : 'DESACTIVADO';
		const detalleMotivo = motivo ? ` — Motivo: ${motivo}` : '';
		console.log(
			`[api/automatizaciones/[id]/toggle] ✓ Robot ${automatizacion.nombre} (${automatizacionId}) ${accion} por admin ${session.user.id}${detalleMotivo}`
		);

		return json({
			success: true,
			automatizacion,
			mensaje: `Robot ${esta_activa ? 'activado' : 'desactivado'} correctamente`
		});
	} catch (error) {
		console.error('[api/automatizaciones/[id]/toggle] Error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Error desconocido' },
			{ status: 500 }
		);
	}
};