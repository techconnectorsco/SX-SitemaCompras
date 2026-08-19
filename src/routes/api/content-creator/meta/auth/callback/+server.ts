/**
 * GET /api/content-creator/meta/auth/callback
 *
 * Callback OAuth de Meta. Recibe { code, state }, valida `state` contra cookie,
 * intercambia `code` por User Access Token (short-lived) → long-lived (60 días),
 * lista las Pages que el usuario administra, descubre IG Business por Page,
 * y hace UPSERT en `cuentas` (por meta_facebook_page_id) + `cuenta_redes`.
 *
 * Tras éxito, redirige al `returnTo` (default /contentCreator?meta_connected=1).
 * En error, redirige a /contentCreator?meta_error=<msg encoded>.
 */
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createHmac } from 'node:crypto';
import { env } from '$env/dynamic/private';
import {
	exchangeCodeForToken,
	exchangeLongLived,
	listPages
} from '$lib/features/content-creator/services/meta/meta-oauth-service';
import {
	upsertAccount,
	type MetaAccount
} from '$lib/features/content-creator/services/meta/meta-account-repo';

const STATE_COOKIE = 'meta_oauth_state';

/** Valida el state anti-CSRF contra la cookie y un secreto de la app. */
function verifyState(stateFromMeta: string, stateFromCookie: string, sessionId: string): boolean {
	if (!stateFromMeta || !stateFromCookie || stateFromMeta !== stateFromCookie) return false;
	const [ts, nonce, sig] = stateFromMeta.split('.');
	if (!ts || !nonce || !sig) return false;
	const payload = `${sessionId}.${nonce}.${ts}`;
	const secret =
		env.FACEBOOK_APP_SECRET || process.env.FACEBOOK_APP_SECRET || 'vedoba-dev-secret';
	const expected = createHmac('sha256', secret)
		.update(payload)
		.digest('base64url');
	return sig === expected;
}

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'No autorizado' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const errorParam = url.searchParams.get('error');
	const errorMsg = url.searchParams.get('error_description');
	const returnTo = cookies.get('meta_oauth_return') || '/contentCreator';

	// Meta puede devolver error=access_denied si el user cancela.
	if (errorParam) {
		cookies.delete(STATE_COOKIE, { path: '/' });
		cookies.delete('meta_oauth_return', { path: '/' });
		throw redirect(
			302,
			`${returnTo}?meta_error=${encodeURIComponent(errorMsg || errorParam)}`
		);
	}

	// Validar state anti-CSRF.
	const cookieState = cookies.get(STATE_COOKIE);
	const sessionId = locals.session?.id || locals.user.id;
	if (!verifyState(state || '', cookieState || '', sessionId)) {
		cookies.delete(STATE_COOKIE, { path: '/' });
		cookies.delete('meta_oauth_return', { path: '/' });
		throw redirect(
			302,
			`${returnTo}?meta_error=${encodeURIComponent('State OAuth inválido (posible CSRF). Vuelve a intentar.')}`
		);
	}

	if (!code) {
		cookies.delete(STATE_COOKIE, { path: '/' });
		cookies.delete('meta_oauth_return', { path: '/' });
		throw redirect(
			302,
			`${returnTo}?meta_error=${encodeURIComponent('Callback OAuth sin code.')}`
		);
	}

	cookies.delete(STATE_COOKIE, { path: '/' });
	cookies.delete('meta_oauth_return', { path: '/' });

	try {
		// 1) Intercambiar code por User Token short-lived.
		const shortToken = await exchangeCodeForToken(code);

		// 2) Intercambiar por long-lived (60 días).
		let longToken;
		try {
			longToken = await exchangeLongLived(shortToken.access_token);
		} catch (err) {
			// Algunas apps ya emiten long-lived en el primer paso; toleramos.
			console.warn('[meta/auth/callback] exchangeLongLived falló, usando short token:', err);
			longToken = {
				access_token: shortToken.access_token,
				token_type: shortToken.token_type,
				expires_in: shortToken.expires_in,
				refresh_token: undefined as string | undefined
			};
		}

		// 3) Listar Pages del usuario (c/u con su Page Access Token + IG id).
		const pages = await listPages(longToken.access_token);

		if (pages.length === 0) {
			throw redirect(
				302,
				`${returnTo}?meta_error=${encodeURIComponent(
					'El usuario no administra ninguna Page de Facebook.'
				)}`
			);
		}

		// 4) UPSERT por cada Page en la tabla `cuentas`.
		const now = Math.floor(Date.now() / 1000);
		// Expiración: usar expires_in del long-lived token, fallback 60d.
		const expiresInSec =
			longToken.expires_in && longToken.expires_in > 0
				? longToken.expires_in
				: 60 * 24 * 60 * 60;
		const tokenExpiresAt = now + expiresInSec;

		const createdAccounts: MetaAccount[] = [];
		for (const page of pages) {
			const saved = upsertAccount({
				meta_facebook_page_id: page.id,
				nombre: page.name,
				meta_access_token: page.access_token,
				meta_refresh_token: longToken.refresh_token ?? null,
				token_expires_at: tokenExpiresAt,
				meta_instagram_id: page.instagram_business_account ?? null,
				timezone: 'America/Costa_Rica',
				redes: {
					facebook: true,
					instagram: !!page.instagram_business_account
				}
			});
			createdAccounts.push(saved);
		}

		// Marcar la primera cuenta como activa vía cookie persistente (por sesión).
		const firstAccountId = createdAccounts[0]?.id;
		const summary = createdAccounts
			.map(
				(p) =>
					`${p.nombre}${p.meta_instagram_id ? '+IG' : ''}#${p.id}`
			)
			.join('|');

		throw redirect(
			302,
			`${returnTo}?meta_connected=1&cuentas=${encodeURIComponent(summary)}&first=${firstAccountId}`
		);
	} catch (err: any) {
		// El redirect del bloque try es una excepción normal; solo loguear otros.
		if (err?.status === 302 || err?.location) throw err;
		console.error('[meta/auth/callback] Error:', err);
		throw redirect(
			302,
			`${returnTo}?meta_error=${encodeURIComponent(err?.message || 'Error inesperado en OAuth')}`
		);
	}
};