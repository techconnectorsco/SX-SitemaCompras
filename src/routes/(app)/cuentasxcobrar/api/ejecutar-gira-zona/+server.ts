import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { OrdenGiraZona } from '$lib/cxc/types';
import { crearJobGiraZonaMock } from '$lib/cxc/mock-data';

// POST /cuentasxcobrar/api/ejecutar-gira-zona
// Encola la gira selectiva de clientes puntuales y devuelve el job_id
// para que el panel haga polling a /estado-gira-zona.
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as OrdenGiraZona | null;
	if (!body) throw error(400, 'Body inválido');

	const { metodo } = body;
	if (metodo !== 'agente' && metodo !== 'revision') {
		throw error(400, "metodo inválido: usá 'agente' o 'revision'");
	}
	if (!body.agenteCodigo) throw error(400, 'Falta agenteCodigo');
	if (!body.cardCodes?.length) throw error(400, 'Seleccioná al menos un cliente');
	if (metodo === 'revision' && !body.correoRevision?.trim()) {
		throw error(400, "El método de revisión requiere un 'correoRevision'");
	}

	// Simulate connection + enqueue delay (el VPS responde "enviada" rápido)
	await new Promise((r) => setTimeout(r, 800));

	const jobId = crearJobGiraZonaMock(body);
	const cuantos = body.cardCodes.length;
	const mensaje =
		metodo === 'revision'
			? `Gira de ${cuantos} ${cuantos === 1 ? 'cliente' : 'clientes'} enviada para revisión en ${body.correoRevision}.`
			: `Gira de ${cuantos} ${cuantos === 1 ? 'cliente' : 'clientes'} enviada. Se envía al correo del agente.`;

	return json({ ok: true, mensaje, job_id: jobId });
};