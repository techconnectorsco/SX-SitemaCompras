import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { AUTH_PATHS } from '$lib/features/auth/config/auth';

export const load: LayoutServerLoad = async (event) => {
	const { session, user } = await event.locals.safeGetSession();

	if (!session || !user) {
		throw redirect(302, AUTH_PATHS.LOGIN);
	}

	if (user.account_status !== 'ACTIVE') {
		throw redirect(303, '/auth/pending');
	}

	if (String(user.role).toUpperCase() !== 'ADMIN') {
		throw error(403, 'Acceso denegado. Se requieren permisos de administrador.');
	}
};
