
// ARCHIVO: src/routes/api/public/clientes/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase-admin';

export const GET: RequestHandler = async () => {
	try {
		const { data, error } = await supabaseAdmin
			.from('clientes')
			.select('id, nombre')
			.order('nombre');

		if (error) {
			console.error('[api/public/clientes] Error:', error);
			return json({ clientes: [] });
		}

		return json({ clientes: data || [] });
	} catch (err) {
		console.error('[api/public/clientes] Error:', err);
		return json({ clientes: [] });
	}
};