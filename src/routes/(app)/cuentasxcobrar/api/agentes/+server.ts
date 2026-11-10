import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { obtenerAgentesMock } from '$lib/cxc/mock-data';

// GET /cuentasxcobrar/api/agentes
// Devuelve { total, agentes[] } — solo agentes con correo asignado.
export const GET: RequestHandler = async () => {
	// Simulate connection delay
	await new Promise((r) => setTimeout(r, 300));
	return json(obtenerAgentesMock());
};