/**
 * POST /api/content-creator/meta/auth/refresh
 *
 * Fuerza el refresh del token de una cuenta Meta (admin/debug utility).
 * Body: { cuentaId: number }
 * Respuesta: { success, tokenExpiresAt? } o { error }.
 *
 * El refresh real lo hace `ensureFreshToken` (MetaAccountRepo) usando
 * `meta_refresh_token` de la fila `cuentas`.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureFreshToken, getAccountById } from '$lib/features/content-creator/services/meta/meta-account-repo';

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
	if (!cuenta.meta_refresh_token) {
		return json(
			{ error: 'La cuenta no tiene refresh_token (token Page puro). Re-conectar vía OAuth.' },
			{ status: 400 }
		);
	}

	try {
		const refreshed = await ensureFreshToken(cuentaId);
		if (!refreshed) {
			return json(
				{ error: 'Token revocado o inválido. Cuenta marcada como desconectada.' },
				{ status: 410 }
			);
		}
		return json({
			success: true,
			tokenExpiresAt: refreshed.token_expires_at,
			daysUntilExpiration: refreshed.token_expires_at
				? Math.floor(
						(refreshed.token_expires_at * 1000 - Date.now()) /
							(24 * 60 * 60 * 1000)
				  )
				: null
		});
	} catch (err: any) {
		return json(
			{ error: err.message || 'Error al refrescar token' },
			{ status: 500 }
		);
	}
};