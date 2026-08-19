/**
 * GET /api/content-creator/meta/auth/list
 *
 * Devuelve la lista de cuentas Meta conectadas con su estado (token válido,
 * días hasta expiración, redes activas). Alimenta el selector UI.
 *
 * Opcional: ?include_deleted=1 → incluye cuentas soft-deleted (solo ADMIN).
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAccounts } from '$lib/features/content-creator/services/meta/meta-account-repo';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}

	const includeDeleted = url.searchParams.get('include_deleted') === '1';

	const accounts = listAccounts();

	return json({
		success: true,
		accounts: includeDeleted ? accounts : accounts.filter((a) => !a.deleted_at)
	});
};