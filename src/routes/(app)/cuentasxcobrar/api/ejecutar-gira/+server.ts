import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { OrdenEjecucionGira } from '$lib/cxc/types';
import { crearJobGiraMock, MOCK_AGENTES } from '$lib/cxc/mock-data';

// POST /cuentasxcobrar/api/ejecutar-gira
// Encola el envío manual de la gira (un agente o todos).
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as OrdenEjecucionGira | null;
	if (!body) throw error(400, 'Body inválido');

	const { metodo } = body;
	if (metodo !== 'agente' && metodo !== 'revision') {
		throw error(400, "metodo inválido: usá 'agente' o 'revision'");
	}

	if (metodo === 'revision' && !body.correoRevision?.trim()) {
		throw error(400, "El método de revisión requiere un 'correoRevision'");
	}

	// Simulate processing time (el VPS valida y encola)
	await new Promise((r) => setTimeout(r, 1200));

	const jobId = crearJobGiraMock(body);
	const agenteTexto = body.agenteCodigo
		? `del agente ${body.agenteCodigo}`
		: `de los ${MOCK_AGENTES.length} agentes`;

	const mensaje =
		metodo === 'revision'
			? `Gira ${agenteTexto} enviada para revisión. El PDF llegará a ${body.correoRevision} en los próximos minutos.`
			: `Gira ${agenteTexto} enviada. Cada agente recibirá su reporte en los próximos minutos.`;

	return json({ ok: true, mensaje, job_id: jobId });
};