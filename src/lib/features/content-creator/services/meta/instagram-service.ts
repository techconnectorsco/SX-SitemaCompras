/**
 * @module InstagramService
 * @description Publicación y lectura de Instagram Business / Creator Account
 * vía la Graph API de Meta (ig-user-id).
 *
 * Documentación de referencia:
 *   - Imagen simple: POST /{ig-user-id}/media → POST /{ig-user-id}/media_publish
 *   - Carrusel:      POST /{ig-user-id}/media?media_type=CAROUSEL + children
 *   - Reel:          POST /{ig-user-id}/media?media_type=REELS
 *
 * El `ig-user-id` vive en `cuentas.meta_instagram_id` y se publica usando el
 * Page Access Token de la Page asociada (ig requiere page-level token).
 */
import {
	ensureFreshToken
} from './meta-account-repo';
import { getGraphVersion } from './meta-oauth-service';

export interface IgPublishParams {
	/** URL pública de la imagen/video (HTTPS). IG no acepta archivos locales. */
	imageUrl: string;
	/** Caption del post (puede incluir hashtags y emojis). */
	caption: string;
	/** URL pública de la miniatura (solo Reels). */
	thumbnailUrl?: string;
	/** Tipo de medio. */
	mediaType?: 'IMAGE' | 'VIDEO' | 'REELS' | 'CAROUSEL';
	/** IDs de medios hijos cuando mediaType === CAROUSEL. */
	children?: string[];
	/** Para Reels: URL del audio / sound. */
	shareToFeed?: boolean;
}

export interface IgPublishResult {
	success: boolean;
	/** ID del contenedor de media creado en el paso 1. */
	mediaId?: string;
	/** ID de la publicación publicada en IG (paso 2). */
	postId?: string;
	permalink?: string;
	error?: string;
}

export interface IgFeedPost {
	id: string;
	caption: string;
	media_type: string;
	media_url: string;
	permalink: string;
	timestamp: string;
	like_count?: number;
	comments_count?: number;
}

const FB_API_BASE = 'https://graph.facebook.com';

/** Resuelve ig_user_id + Page token. IG usa el Page Access Token, no el del usuario. */
async function resolveIgCreds(
	cuentaId: number
): Promise<{ igUserId: string; accessToken: string; version: string }> {
	const cuenta = await ensureFreshToken(cuentaId);
	if (!cuenta) {
		throw new Error(
			`La cuenta ${cuentaId} no existe, fue revocada o no tiene token. Re-conéctala vía OAuth.`
		);
	}
	if (!cuenta.meta_instagram_id || !cuenta.meta_access_token) {
		throw new Error(
			`La cuenta ${cuentaId} no tiene Instagram Business conectado (falta meta_instagram_id o access_token).`
		);
	}
	return {
		igUserId: cuenta.meta_instagram_id,
		accessToken: cuenta.meta_access_token,
		version: getGraphVersion()
	};
}

export class InstagramService {
	/** Verifica que la cuenta tenga IG Business y el token funcione. */
	static async testConnection(
		cuentaId: number
	): Promise<{
		success: boolean;
		igUser?: { id: string; username?: string; followers?: number };
		error?: string;
	}> {
		try {
			const { igUserId, accessToken, version } = await resolveIgCreds(cuentaId);
			const url = `https://graph.facebook.com/${version}/${igUserId}?fields=id,username,followers_count&access_token=${encodeURIComponent(
				accessToken
			)}`;
			const res = await fetch(url);
			const data = await res.json();
			if (!res.ok || data.error) {
				return {
					success: false,
					error: data.error?.message || `HTTP ${res.status}`
				};
			}
			return {
				success: true,
				igUser: {
					id: data.id,
					username: data.username,
					followers: data.followers_count
				}
			};
		} catch (err: any) {
			return { success: false, error: err.message || String(err) };
		}
	}

	/**
	 * Publica una imagen simple en IG.
	 * Flujo de dos pasos:
	 *   1. POST /{ig-user-id}/media → crea el contenedor.
	 *   2. POST /{ig-user-id}/media_publish → publica el contenedor.
	 */
	static async publicarMedia(
		cuentaId: number,
		params: IgPublishParams
	): Promise<IgPublishResult> {
		try {
			const { igUserId, accessToken, version } = await resolveIgCreds(cuentaId);

			// Valores requeridos por la Graph API.
			if (!params.imageUrl?.startsWith('https://')) {
				return {
					success: false,
					error:
						'Instagram exige imageUrl HTTPS público (no soporta rutas locales).'
				};
			}

			// 1) Crear el contenedor de media.
			const createBody: Record<string, string> = {
				image_url: params.imageUrl,
				caption: params.caption,
				access_token: accessToken
			};
			if (params.mediaType === 'REELS' && params.mediaType) {
				createBody.media_type = 'REELS';
				createBody.video_url = params.imageUrl;
				if (params.thumbnailUrl) createBody.thumbnail_url = params.thumbnailUrl;
				delete createBody.image_url;
			}
			const createUrl = `${FB_API_BASE}/${version}/${igUserId}/media`;
			const createRes = await fetch(createUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(createBody)
			});
			const createData = await createRes.json();
			if (!createRes.ok || createData.error) {
				return {
					success: false,
					error: `IG media (paso 1): ${createData.error?.message || 'error desconocido'}`
				};
			}
			const mediaId = createData.id;

			// 2) Publicar el contenedor.
			const publishUrl = `${FB_API_BASE}/${version}/${igUserId}/media_publish`;
			const publishRes = await fetch(publishUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					creation_id: mediaId,
					access_token: accessToken
				})
			});
			const publishData = await publishRes.json();
			if (!publishRes.ok || publishData.error) {
				return {
					success: false,
					mediaId,
					error: `IG media_publish (paso 2): ${publishData.error?.message || 'error desconocido'}`
				};
			}

			return {
				success: true,
				mediaId,
				postId: publishData.id
			};
		} catch (err: any) {
			return { success: false, error: err.message || String(err) };
		}
	}

	/**
	 * Publica un carrusel en IG (n imágenes). Sigue el flujo:
	 *   1. Crea un contenedor hijo por cada imagen.
	 *   2. Crea el contenedor padre con media_type=CAROUSEL y children=ids.
	 *   3. Publica el padre con media_publish.
	 *
	 * @param childrenImageUrls array de URLs HTTPS públicas (1-10 imágenes).
	 */
	static async publicarCarrusel(
		cuentaId: number,
		childrenImageUrls: string[],
		caption: string
	): Promise<IgPublishResult> {
		try {
			const { igUserId, accessToken, version } = await resolveIgCreds(cuentaId);
			if (!childrenImageUrls.length) {
				return { success: false, error: 'Se requiere al menos 1 imagen en el carrusel.' };
			}
			if (childrenImageUrls.length > 10) {
				return { success: false, error: 'Máximo 10 imágenes por carrusel IG.' };
			}

			// 1) Crear contenedores hijos.
			const childIds: string[] = [];
			for (const url of childrenImageUrls) {
				if (!url.startsWith('https://')) {
					return {
						success: false,
						error: `URL de imagen IG no HTTPS: ${url}`
					};
				}
				const res = await fetch(`${FB_API_BASE}/${version}/${igUserId}/media`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						image_url: url,
						is_carousel_item: 'true',
						access_token: accessToken
					})
				});
				const data = await res.json();
				if (!res.ok || data.error) {
					return {
						success: false,
						error: `IG carrusel hijo: ${data.error?.message || 'error'}`
					};
				}
				childIds.push(data.id);
			}

			// 2) Contenedor padre tipo CAROUSEL.
			const resParent = await fetch(`${FB_API_BASE}/${version}/${igUserId}/media`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					media_type: 'CAROUSEL',
					children: childIds.join(','),
					caption,
					access_token: accessToken
				})
			});
			const dataParent = await resParent.json();
			if (!resParent.ok || dataParent.error) {
				return {
					success: false,
					error: `IG carrusel padre: ${dataParent.error?.message || 'error'}`
				};
			}
			const parentMediaId = dataParent.id;

			// 3) Publicar.
			const publishRes = await fetch(
				`${FB_API_BASE}/${version}/${igUserId}/media_publish`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						creation_id: parentMediaId,
						access_token: accessToken
					})
				}
			);
			const publishData = await publishRes.json();
			if (!publishRes.ok || publishData.error) {
				return {
					success: false,
					mediaId: parentMediaId,
					error: `IG carrusel publish: ${publishData.error?.message || 'error'}`
				};
			}
			return {
				success: true,
				mediaId: parentMediaId,
				postId: publishData.id
			};
		} catch (err: any) {
			return { success: false, error: err.message || String(err) };
		}
	}

	/**
	 * Obtiene las últimas publicaciones del feed de IG (hasta 50 per la Graph API).
	 */
	static async obtenerFeed(
		cuentaId: number,
		limit = 25
	): Promise<{ success: boolean; posts?: IgFeedPost[]; error?: string }> {
		try {
			const { igUserId, accessToken, version } = await resolveIgCreds(cuentaId);
			const fields =
				'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count';
			const url = `${FB_API_BASE}/${version}/${igUserId}/media?fields=${encodeURIComponent(
				fields
			)}&limit=${Math.min(limit, 50)}&access_token=${encodeURIComponent(accessToken)}`;
			const res = await fetch(url);
			const data = await res.json();
			if (!res.ok || data.error) {
				return {
					success: false,
					error: data.error?.message || `HTTP ${res.status}`
				};
			}
			return {
				success: true,
				posts: (data.data || []) as IgFeedPost[]
			};
		} catch (err: any) {
			return { success: false, error: err.message || String(err) };
		}
	}
}