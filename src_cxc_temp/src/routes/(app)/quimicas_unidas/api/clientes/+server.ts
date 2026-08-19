import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { obtenerClientes } from '$lib/quimicas_unidas/sap';

// GET /quimicas_unidas/api/clientes
// Devuelve { total, clientes[], padres[] } desde el Service Layer.
export const GET: RequestHandler = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	if (!session) throw error(401, 'No autorizado');

	try {
		const data = await obtenerClientes();
		return json(data);
	} catch (e) {
		console.error('[quimicas_unidas] error al obtener clientes:', e);
		throw error(502, 'No se pudo obtener la lista de clientes desde el Service Layer');
	}
};
