/**
 * POST /api/content-creator/meta/auth/disconnect
 *
 * Desconecta una cuenta Meta: intenta revocar permisos en la Graph API
 * (best-effort, ignora si ya está revocado) y limpia los tokens + el vínculo
 * con redes_sociales en la fila `cuentas` (soft-delete).
 *
 * Body: { cuentaId: number }
 * No borra la fila (preserva histórico de publicaciones asociadas).
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	disconnectAccount,
	getAccountById
} from '$lib/features/content-creator/services/meta/meta-account-repo';
import { revokePermissions } from '$lib/features/content-creator/services/meta/meta-oauth-service';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}

	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Body JSON inválido' }, { status: 400 });
	}

	const cuentaId = Number(body?.cuentaId);
	if (!Number.isFinite(cuentaId) || cuentaId <= 0) {
		return json({ error: 'cuentaId inválido' }, { status: 400 });
	}

	const cuenta = getAccountById(cuentaId);
	if (!cuenta) {
		return json({ error: 'Cuenta no encontrada' }, { status: 404 });
	}

	// Best-effort: revocar en Meta (ignora errores de token ya inválido).
	if (cuenta.meta_access_token) {
		await revokePermissions(cuenta.meta_access_token).catch(() => {
			/* token ya revocado previamente — no es error fatal */
		});
	}

	disconnectAccount(cuentaId);

	return json({ success: true, cuentaid: cuentaId });
};