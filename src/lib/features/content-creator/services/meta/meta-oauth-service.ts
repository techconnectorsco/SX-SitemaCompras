/**
 * @module MetaOAuthService
 * @description Capa stateless de comunicación con la Graph API de Meta
 * (Facebook Login OAuth, intercambio de tokens, listado de Pages,
 * descubrimiento de Instagram Business, debug/revocación de tokens).
 *
 * No toca la base de datos — eso lo hace MetaAccountRepo.
 *
 * Variables de entorno que usa:
 *   PUBLIC_FACEBOOK_APP_ID       — App ID público (client_id)
 *   FACEBOOK_APP_SECRET          — App Secret (client_secret)
 *   PUBLIC_FACEBOOK_GRAPH_VERSION — ej. "v26.0"
 *   META_OAUTH_REDIRECT_URI      — URL de callback (https, configurada en Meta App)
 */
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

/** Scopes solicitados en el diálogo OAuth (FB + IG Business). */
export const META_SCOPES = [
	'pages_show_list',
	'pages_read_engagement',
	'pages_manage_posts',
	'pages_read_user_content',
	'pages_manage_ads',
	'instagram_basic',
	'instagram_content_publish',
	'instagram_manage_insights',
	'business_management'
] as const;

const FB_API_BASE = 'https://graph.facebook.com';
/** Host del diálogo OAuth de Facebook Login (NO sirve graph.facebook.com para /dialog/oauth). */
const FB_DIALOG_BASE = 'https://www.facebook.com';

function getAppId(): string {
	// PUBLIC_-prefixed vars must be read from $env/dynamic/public (SvelteKit).
	return (
		publicEnv.PUBLIC_FACEBOOK_APP_ID ||
		(privateEnv as any).PUBLIC_FACEBOOK_APP_ID ||
		process.env.PUBLIC_FACEBOOK_APP_ID ||
		''
	);
}

function getAppSecret(): string {
	return privateEnv.FACEBOOK_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '';
}

export function getGraphVersion(): string {
	return (
		publicEnv.PUBLIC_FACEBOOK_GRAPH_VERSION ||
		(privateEnv as any).PUBLIC_FACEBOOK_GRAPH_VERSION ||
		process.env.PUBLIC_FACEBOOK_GRAPH_VERSION ||
		'v26.0'
	);
}

export function getRedirectUri(): string {
	return (
		privateEnv.META_OAUTH_REDIRECT_URI ||
		process.env.META_OAUTH_REDIRECT_URI ||
		''
	);
}

/**
 * Construye la URL de autorización (Facebook Login dialog).
 * El `state` debe ser un valor anti-CSRF opaco validado en el callback.
 */
export function getAuthUrl(state: string): string {
	const clientId = getAppId();
	const redirectUri = getRedirectUri();
	const scope = META_SCOPES.join(',');
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		scope,
		state,
		response_type: 'code'
	});
	return `${FB_DIALOG_BASE}/${getGraphVersion()}/dialog/oauth?${params.toString()}`;
}

export interface TokenExchangeResult {
	access_token: string;
	token_type: string;
	expires_in: number; // segundos (los short-lived ~5400; long-lived ~5184000)
}

export interface LongLivedTokenResult {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token?: string; // presente en tokens long-lived recientes (System-User style)
}

/**
 * Intercambia el `code` del callback OAuth por un User Access Token (short-lived).
 */
export async function exchangeCodeForToken(
	code: string
): Promise<TokenExchangeResult> {
	const clientId = getAppId();
	const clientSecret = getAppSecret();
	const redirectUri = getRedirectUri();

	if (!clientId || !clientSecret || !redirectUri) {
		throw new Error('Faltan credenciales Meta (APP_ID/APP_SECRET/REDIRECT_URI).');
	}

	const params = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		redirect_uri: redirectUri,
		code
	});

	const res = await fetch(
		`${FB_API_BASE}/${getGraphVersion()}/oauth/access_token`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: params.toString()
		}
	);
	const data = await res.json();
	if (!res.ok || data.error) {
		throw new Error(
			`exchangeCodeForToken: ${data.error?.message || `HTTP ${res.status}`}`
		);
	}
	return {
		access_token: data.access_token,
		token_type: data.token_type || 'bearer',
		expires_in: data.expires_in
	};
}

/**
 * Intercambia un User Token short-lived por long-lived (60 días).
 */
export async function exchangeLongLived(
	shortToken: string
): Promise<LongLivedTokenResult> {
	const clientId = getAppId();
	const clientSecret = getAppSecret();
	if (!clientId || !clientSecret) {
		throw new Error('Faltan credenciales Meta (APP_ID/APP_SECRET).');
	}

	const params = new URLSearchParams({
		grant_type: 'fb_exchange_token',
		client_id: clientId,
		client_secret: clientSecret,
		fb_exchange_token: shortToken
	});

	const res = await fetch(
		`${FB_API_BASE}/${getGraphVersion()}/oauth/access_token?${params.toString()}`
	);
	const data = await res.json();
	if (!res.ok || data.error) {
		throw new Error(
			`exchangeLongLived: ${data.error?.message || `HTTP ${res.status}`}`
		);
	}
	return {
		access_token: data.access_token,
		token_type: data.token_type || 'bearer',
		expires_in: data.expires_in, // ~5184000s = 60d
		refresh_token: data.refresh_token
	};
}

/**
 * Refresca un User Token long-lived.
 * Meta soporta dos grant types:
 *   - "fb_exchange_token"  — intercambio regular (renueva el token actual)
 *   - "th_refresh_token"  — tokens emitidos por System Users (BBT-style)
 */
export async function refreshToken(
	refreshToken: string
): Promise<LongLivedTokenResult> {
	const clientId = getAppId();
	const clientSecret = getAppSecret();
	if (!clientId || !clientSecret) {
		throw new Error('Faltan credenciales Meta (APP_ID/APP_SECRET).');
	}

	const params = new URLSearchParams({
		grant_type: 'fb_exchange_token',
		client_id: clientId,
		client_secret: clientSecret,
		fb_exchange_token: refreshToken
	});

	const res = await fetch(
		`${FB_API_BASE}/${getGraphVersion()}/oauth/access_token?${params.toString()}`
	);
	const data = await res.json();
	if (!res.ok || data.error) {
		const msg = data.error?.message || `HTTP ${res.status}`;
		const err = new Error(`refreshToken: ${msg}`);
		// Marca errores típicos de revocación para que el repo pueda soft-deletar
		if (/revoked|invalid|expired/i.test(msg)) {
			(err as any).revoked = true;
		}
		throw err;
	}
	return {
		access_token: data.access_token,
		token_type: data.token_type || 'bearer',
		expires_in: data.expires_in,
		refresh_token: data.refresh_token
	};
}

export interface MetaPageAccount {
	/** ID de la Page. */
	id: string;
	/** Nombre de la Page. */
	name: string;
	/** Categoría de la Page. */
	category?: string;
	/** Tareas/permisos que el usuario tiene sobre la Page. */
	tasks?: string[];
	/** Page Access Token (long-lived gestión de contenido). */
	access_token: string;
	/** Instagram Business Account ID asociado (si la Page tiene IG vinculado). */
	instagram_business_account?: string;
}

/**
 * Lista las Pages que administra el usuario propietario del `userToken`.
 * Para cada Page, consulta también el instagram_business_account asociado.
 */
export async function listPages(
	userToken: string
): Promise<MetaPageAccount[]> {
	const v = getGraphVersion();
	// 1) Pages del usuario
	const url = `${FB_API_BASE}/${v}/me/accounts?fields=id,name,category,tasks,access_token&limit=100&access_token=${encodeURIComponent(
		userToken
	)}`;
	const res = await fetch(url);
	const data = await res.json();
	if (!res.ok || data.error) {
		throw new Error(`listPages: ${data.error?.message || `HTTP ${res.status}`}`);
	}
	const pages = (data.data || []) as MetaPageAccount[];

	// 2) Para cada Page, lookup IG Business (en paralelo)
	const withIg = await Promise.all(
		pages.map(async (p) => {
			try {
				const igUrl = `${FB_API_BASE}/${v}/${p.id}?fields=instagram_business_account&access_token=${encodeURIComponent(
					p.access_token
				)}`;
				const r = await fetch(igUrl);
				const d = await r.json();
				if (r.ok && !d.error && d.instagram_business_account) {
					p.instagram_business_account = d.instagram_business_account.id;
				}
			} catch {
				// ignore: la Page no tiene IG conectado o no hay permisos
			}
			return p;
		})
	);
	return withIg;
}

export interface IgBusinessInfo {
	id: string;
	username?: string;
	name?: string;
	profile_picture_url?: string;
	followers_count?: number;
	biography?: string;
}

/**
 * Obtiene metadatos del IG Business Account (usando el Page Access Token).
 */
export async function getInstagramBusinessInfo(
	igUserId: string,
	pageToken: string
): Promise<IgBusinessInfo> {
	const v = getGraphVersion();
	const url = `${FB_API_BASE}/${v}/${igUserId}?fields=id,username,name,profile_picture_url,followers_count,biography&access_token=${encodeURIComponent(
		pageToken
	)}`;
	const res = await fetch(url);
	const data = await res.json();
	if (!res.ok || data.error) {
		throw new Error(
			`getInstagramBusinessInfo: ${data.error?.message || `HTTP ${res.status}`}`
		);
	}
	return data as IgBusinessInfo;
}

export interface PageInfo {
	id: string;
	name: string;
	category?: string;
	link?: string;
	followers_count?: number;
}

/**
 * Obtiene metadata de la Page (test de conexión). Acepta optional token override.
 */
export async function getPageInfo(
	pageId: string,
	accessToken: string
): Promise<PageInfo> {
	const v = getGraphVersion();
	const fields = 'id,name,category,link,followers_count,fan_count';
	const url = `${FB_API_BASE}/${v}/${pageId}?fields=${fields}&access_token=${encodeURIComponent(
		accessToken
	)}`;
	const res = await fetch(url);
	const data = await res.json();
	if (!res.ok || data.error) {
		throw new Error(`getPageInfo: ${data.error?.message || `HTTP ${res.status}`}`);
	}
	return {
		id: data.id,
		name: data.name,
		category: data.category,
		link: data.link,
		followers_count: data.followers_count ?? data.fan_count ?? 0
	};
}

/** Respuesta de /debug_token — para inspeccionar validez/scopes/expiry. */
export interface DebugTokenResult {
	data: {
		app_id: string;
		application: string;
		expires_at: number; // 0 = no expira
		data_access_expires_at: number;
		valid: boolean;
		scopes: string[];
		type: string;
	};
}

/** Inspecciona un token (requiere el App Access Token interno: appId|appSecret). */
export async function debugToken(
	inputToken: string
): Promise<DebugTokenResult> {
	const v = getGraphVersion();
	const appAccessToken = `${getAppId()}|${getAppSecret()}`;
	const params = new URLSearchParams({
		input_token: inputToken,
		access_token: appAccessToken
	});
	const res = await fetch(
		`${FB_API_BASE}/${v}/debug_token?${params.toString()}`
	);
	const data = await res.json();
	if (!res.ok || data.error) {
		throw new Error(`debugToken: ${data.error?.message || `HTTP ${res.status}`}`);
	}
	return data as DebugTokenResult;
}

/**
 * Revoca los permisos del usuario actual sobre la app (desconexión total).
 * Equivalente a DELETE /me/permissions en la Graph API.
 */
export async function revokePermissions(
	userOrPageToken: string
): Promise<void> {
	const v = getGraphVersion();
	const res = await fetch(
		`${FB_API_BASE}/${v}/me/permissions?access_token=${encodeURIComponent(
			userOrPageToken
		)}`,
		{ method: 'DELETE' }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok && data?.error) {
		console.warn(
			`[MetaOAuthService] revokePermissions: ${data.error?.message || res.status}`
		);
	}
}