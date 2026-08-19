/**
 * GET /api/content-creator/meta/auth/login
 *
 * Inicia el flujo OAuth de Meta (Facebook Login). Genera un `state` anti-CSRF
 * (HMAC del session_id + nonce), lo guarda en cookie httpOnly de corta vida,
 * y redirige (302) al diálogo de Facebook con todos los scopes necesarios
 * (FB Page + IG Business).
 */
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createHmac, randomBytes } from 'node:crypto';
import { getAuthUrl, getRedirectUri } from '$lib/features/content-creator/services/meta/meta-oauth-service';
import { env } from '$env/dynamic/private';

const STATE_COOKIE = 'meta_oauth_state';
const STATE_TTL_SECONDS = 10 * 60; // 10 min

/**
 * Genera un state anti-CSRF: base64url(random 16 bytes) + timestamp,
 * firmado con HASH del session id y un secreto de la app.
 */
function buildState(sessionId: string): { state: string; nonce: string } {
	const nonce = randomBytes(16).toString('base64url');
	const ts = Date.now().toString(36);
	// State opaco al usuario; el servidor valida nonce + ts + signature tras callback.
	const secret =
		env.FACEBOOK_APP_SECRET || process.env.FACEBOOK_APP_SECRET || 'vedoba-dev-secret';
	const payload = `${sessionId}.${nonce}.${ts}`;
	const sig = createHmac('sha256', secret).update(payload).digest('base64url');
	return { state: `${ts}.${nonce}.${sig}`, nonce: payload };
}

export const GET: RequestHandler = async ({ locals, cookies, url }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'No autorizado' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Validar que el redirect URI esté configurado (ayuda a fallar temprano).
	if (!getRedirectUri()) {
		return new Response(
			JSON.stringify({
				error:
					'META_OAUTH_REDIRECT_URI no configurado en .env. Agrega la URL HTTPS registrada en Meta App Settings.'
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const sessionId = locals.session?.id || locals.user.id;
	const { state } = buildState(sessionId);

	// Guardar state en cookie para validar en callback.
	cookies.set(STATE_COOKIE, state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: STATE_TTL_SECONDS
	});

	// Origen de retorno tras el flujo (para redirigir al tab correcto).
	const returnTo = url.searchParams.get('returnTo') || '/contentCreator';
	cookies.set('meta_oauth_return', returnTo, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: STATE_TTL_SECONDS
	});

	throw redirect(302, getAuthUrl(state));
};