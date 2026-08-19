import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FacebookService } from '$lib/features/content-creator/services/facebook-service';
import { listAccounts } from '$lib/features/content-creator/services/meta/meta-account-repo';

/**
 * GET /api/content-creator/meta/status
 *
 * Sin `cuentaId`: devuelve la lista de cuentas conectadas + su estado
 * (alimentaba el selector UI antes). Llamada usada por meta-hub-tab onMount.
 *
 * Con ?cuentaId=N: hace test de conexión de UNA cuenta específica y devuelve
 * { success, page } en la forma vieja (compat con el front actual).
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}

	const cuentaIdParam = url.searchParams.get('cuentaId');
	const cuentaId = cuentaIdParam ? Number(cuentaIdParam) : undefined;

	if (cuentaId === undefined) {
		// Listar todas las cuentas (alimenta selector)
		const accounts = listAccounts();
		return json({
			success: true,
			accounts: accounts,
			default: accounts.find((a) => a.token_valid)?.id ?? null
		});
	}

	// Test de conexión de una cuenta específica (forma legacy)
	const result = await FacebookService.testConnection(cuentaId);
	return json(result);
};