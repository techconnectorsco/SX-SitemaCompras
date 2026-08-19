import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase-admin';

export const GET: RequestHandler = async ({ locals }) => {
	const { safeGetSession } = locals;
	const { session, user } = await safeGetSession();

	if (!session || !user) {
		return json({ url_imagen: null });
	}

	const { data } = await supabaseAdmin
		.from('perfiles')
		.select('url_imagen')
		.eq('id', user.id)
		.maybeSingle();

	return json({ url_imagen: data?.url_imagen ?? null });
};
