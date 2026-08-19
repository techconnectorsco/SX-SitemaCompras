import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body) throw error(400, 'Body inválido');

	// Simulate processing time
	await new Promise(r => setTimeout(r, 2000));
	
	return json({ 
		ok: true, 
		mensaje: 'Orden de envío procesada correctamente. Los estados de cuenta serán enviados en los próximos minutos (Simulación).',
		job_id: crypto.randomUUID()
	});
};
