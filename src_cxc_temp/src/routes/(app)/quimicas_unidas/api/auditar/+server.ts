import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auditarCliente } from '$lib/quimicas_unidas/sap';

// GET /quimicas_unidas/api/auditar?cardCode=C1061
// Consulta directa al Service Layer (read-only) para ver qué pasa con un cliente.
export const GET: RequestHandler = async ({ url, locals }) => {
	const { session } = await locals.safeGetSession();
	if (!session) throw error(401, 'No autorizado');

	const cardCode = url.searchParams.get('cardCode')?.trim();
	if (!cardCode) throw error(400, "Falta el parámetro 'cardCode'");

	try {
		const data = await auditarCliente(cardCode);
		if (!data.existe) {
			throw error(404, `El cliente ${cardCode.toUpperCase()} no existe en SAP`);
		}
		return json(data);
	} catch (e) {
		// Re-lanzar errores de SvelteKit (404/400) tal cual.
		if (e && typeof e === 'object' && 'status' in e) throw e;
		console.error('[quimicas_unidas] error auditando cliente:', e);
		throw error(502, 'No se pudo consultar el cliente en el Service Layer');
	}
};
