//protege esta zona solo para inicios de session
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { AUTH_PATHS } from '$lib/features/auth/config/auth';

/* export const load: LayoutServerLoad = async (event) => {
	const { session } = await event.locals.safeGetSession();

	// if (!session) {
	// 	throw redirect(302, AUTH_PATHS.LOGIN);
	// }

	return {
		session
	};
}; */



export const load: LayoutServerLoad = async ({ locals: { safeGetSession } }) => {
	const { session, user } = await safeGetSession();
	
	return {
		session,
		user
	};
};