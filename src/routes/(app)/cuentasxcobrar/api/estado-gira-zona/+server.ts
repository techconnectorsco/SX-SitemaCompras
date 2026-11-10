import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { obtenerEstadoJobMock } from '$lib/cxc/mock-data';

// GET /cuentasxcobrar/api/estado-gira-zona?job=<uuid>
// Devuelve el estado del job de gira-zona y, cuando terminó, el resultado
// completo con la lista de clientes procesados y omitidos (agrupados por motivo).
export const GET: RequestHandler = async ({ url }) => {
	const jobId = url.searchParams.get('job')?.trim();
	if (!jobId) throw error(400, "Falta el parámetro 'job'");

	// Delay chico — el polling tiene que sentirse ágil
	await new Promise((r) => setTimeout(r, 150));

	return json(obtenerEstadoJobMock(jobId));
};