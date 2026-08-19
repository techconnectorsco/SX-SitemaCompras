import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { obtenerClientesMock } from '$lib/cxc/mock-data';

export const GET: RequestHandler = async () => {
	// Simulate connection delay
	await new Promise(r => setTimeout(r, 300));
	return json(obtenerClientesMock());
};
