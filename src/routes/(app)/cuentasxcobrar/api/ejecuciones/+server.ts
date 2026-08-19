import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MOCK_EJECUCIONES_CXC, MOCK_EJECUCIONES_GIRAS } from '$lib/cxc/mock-data';

export const GET: RequestHandler = async () => {
	await new Promise(r => setTimeout(r, 300));
	return json({ 
		cxc: MOCK_EJECUCIONES_CXC, 
		giras: MOCK_EJECUCIONES_GIRAS 
	});
};
