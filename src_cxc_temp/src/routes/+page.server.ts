import type { PageServerLoad } from './$types';
import { getCasosExitoPublicos } from '$lib/services/casos-exito.service';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { session, user } = await safeGetSession();

	const casosExito = await getCasosExitoPublicos(supabase);

	return {
		session,
		user,
		casosExito
	};
};