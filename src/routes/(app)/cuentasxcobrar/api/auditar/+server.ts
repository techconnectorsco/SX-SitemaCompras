import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auditarClienteMock } from '$lib/cxc/mock-data';

export const GET: RequestHandler = async ({ url }) => {
	const cardCode = url.searchParams.get('cardCode')?.trim().toUpperCase();
	if (!cardCode) throw error(400, "Falta el parámetro 'cardCode'");

	await new Promise(r => setTimeout(r, 500));
	const data = auditarClienteMock(cardCode);
	if (!data) throw error(404, `El cliente ${cardCode} no existe`);
	
	return json(data);
};
