/**
 * ============================================================================
 * ENDPOINT: POST /api/ia
 * ============================================================================
 * Recibe la consulta del popup, resuelve el usuario autenticado y sus módulos,
 * y delega en el motor de IA. Devuelve la respuesta y el costo de la interacción.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { crearMotor, modulosDelUsuario } from '$lib/server/ia';
import { historialReciente } from '$lib/server/ia/auditoria';
import { db } from '$lib/config/db-config';
import type { MensajeChat, ContextoPantalla } from '$lib/server/ia';

interface CuerpoPeticion {
	mensaje: string;
	contexto?: ContextoPantalla;
	historial?: MensajeChat[];
	conversacionId?: string;
}

/**
 * GET /api/ia/historial — devuelve las interacciones de las últimas 24h del
 * usuario, para reconstruir el chat al reabrir la plataforma.
 */
export const GET: RequestHandler = async ({ locals }) => {
	const usuario = locals.user;
	if (!usuario) throw error(401, 'No autenticado.');

	const filas = historialReciente(db, usuario.id, 24, 100);
	return json({ ok: true, historial: filas });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	// En VYOWEB el usuario se establece en event.locals.user (sqlite-hook).
	const usuario = locals.user;
	if (!usuario) throw error(401, 'No autenticado.');

	const cuerpo = (await request.json()) as CuerpoPeticion;
	if (!cuerpo?.mensaje?.trim()) throw error(400, 'Falta el mensaje.');

	const modulos = modulosDelUsuario(db, usuario.id);

	const motor = crearMotor(db);
	const salida = await motor.responder({
		mensaje: cuerpo.mensaje,
		usuario: {
			userId: usuario.id,
			nombre: usuario.display_name ?? usuario.email ?? 'Usuario',
			modulos
		},
		contexto: cuerpo.contexto,
		historial: cuerpo.historial,
		conversacionId: cuerpo.conversacionId
	});

	// Dejar rastro en el log del servidor si hubo error (para diagnóstico).
	if (!salida.ok && salida.error) {
		console.error(`[/api/ia] Error para usuario ${usuario.id}: ${salida.error}`);
	}

	return json(salida);
};