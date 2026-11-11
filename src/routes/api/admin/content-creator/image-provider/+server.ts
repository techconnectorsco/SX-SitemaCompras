import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import {
	getImageProvider,
	setImageProvider
} from '$lib/features/content-creator/services/image-provider-settings';

export const GET: RequestHandler = ({ locals }) => {
	if (!locals.user) return json({ error: 'No autenticado' }, { status: 401 });
	if (String(locals.user.role).toUpperCase() !== 'ADMIN')
		return json({ error: 'Acceso denegado' }, { status: 403 });
	return json({ provider: getImageProvider(), openaiAvailable: !!env.OPENAI_API_KEY?.trim() });
};
export const PUT: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'No autenticado' }, { status: 401 });
	if (String(locals.user.role).toUpperCase() !== 'ADMIN')
		return json({ error: 'Acceso denegado' }, { status: 403 });
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Solicitud inválida' }, { status: 400 });
	}
	const provider = body?.provider;
	if (provider !== 'gemini' && provider !== 'openai')
		return json({ error: 'Proveedor inválido' }, { status: 400 });
	if (provider === 'openai' && !env.OPENAI_API_KEY?.trim())
		return json({ error: 'Falta configurar OPENAI_API_KEY en el servidor' }, { status: 409 });
	setImageProvider(provider);
	return json({ provider });
};
