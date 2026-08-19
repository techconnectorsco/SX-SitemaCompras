/**
 * @module FacebookService (v2)
 * @description Publicación y lectura del Feed de una Fan Page de Facebook
 * asociada a una fila de la tabla `cuentas`.
 *
 * Cambios v1 → v2:
 *   - Cada método acepta `cuentaId?: number`. Exige cuenta conectada
 *     (no hay fallback .env desde FASE 4).
 *   - Antes de cada operación se llama a `ensureFreshToken(cuentaId)` para
 *     refrescar el token si está próximo a expirar.
 *   - Reusa MetaOAuthService.getPageInfo para testConnection (unifica errores).
 *
 * Interfaces públicas (`MetaPageInfo`, `PublishPostParams`, `PublishResult`)
 * se mantienen para no romper los callers existentes.
 */
import { getAccountById, ensureFreshToken } from './meta/meta-account-repo';
import { getGraphVersion, getPageInfo } from './meta/meta-oauth-service';
import { getUploadMimeType, readUploadFile } from '$lib/server/uploads-storage';
import path from 'node:path';

// Mantener interfaces pública para compat con callers existentes.
export interface MetaPageInfo {
	id: string;
	name: string;
	category?: string;
	link?: string;
	followers_count?: number;
	tasks?: string[];
}

export interface PublishPostParams {
	message: string;
	link?: string;
	imageUrl?: string;
	/** Array de URLs/rutas para multi-imagen (FB multi-photo post). */
	imageUrls?: string[];
}

export interface PublishResult {
	success: boolean;
	postId?: string;
	error?: string;
}

interface AccountCreds {
	page_id: string;
	access_token: string;
	graph_version: string;
}

/**
 * Resuelve credenciales desde la BD (cuentaId). Exige cuenta conectada —
 * ya no hay fallback .env (post-FASE 4).
 *
 * Lanza error si no se pasa cuentaId, la cuenta no existe, o le falta page_id/token.
 */
async function resolveCreds(
	cuentaId?: number
): Promise<{ creds: AccountCreds; cuentaId: number | null }> {
	if (!cuentaId) {
		throw new Error(
			'No se especificó cuentaId. Conecta una cuenta Meta vía /api/content-creator/meta/auth/login y selecciónala en el sidebar.'
		);
	}

	const cuenta = await ensureFreshToken(cuentaId);
	if (!cuenta) {
		throw new Error(
			`La cuenta ${cuentaId} no existe, fue revocada o no tiene token válido. Re-conéctala vía OAuth.`
		);
	}
	if (!cuenta.meta_facebook_page_id || !cuenta.meta_access_token) {
		throw new Error(
			`La cuenta ${cuentaId} no tiene meta_facebook_page_id o meta_access_token. Re-conéctala vía OAuth.`
		);
	}

	return {
		creds: {
			page_id: cuenta.meta_facebook_page_id,
			access_token: cuenta.meta_access_token,
			graph_version: getGraphVersion()
		},
		cuentaId
	};
}

export class FacebookService {
	/**
	 * Prueba la conexión con la API de Meta Graph obteniendo la información
	 * de la Fan Page. Requiere `cuentaId` de una cuenta Meta conectada.
	 */
	static async testConnection(
		cuentaId?: number
	): Promise<{ success: boolean; page?: MetaPageInfo; error?: string }> {
		try {
			if (!cuentaId) {
				return {
					success: false,
					error: 'No se especificó cuentaId. Conecta una cuenta Meta y selecciónala en el sidebar.'
				};
			}
			const { creds } = await resolveCreds(cuentaId);
			if (!creds.access_token) {
				return { success: false, error: 'La cuenta no tiene access_token.' };
			}
			if (!creds.page_id) {
				return { success: false, error: 'La cuenta no tiene meta_facebook_page_id.' };
			}

			const info = await getPageInfo(creds.page_id, creds.access_token);
			return {
				success: true,
				page: {
					id: info.id,
					name: info.name,
					category: info.category,
					link: info.link,
					followers_count: info.followers_count ?? 0,
					tasks: ['CREATE_CONTENT', 'MODERATE', 'ANALYZE', 'ADVERTISE']
				}
			};
		} catch (err: any) {
			return {
				success: false,
				error: `Meta API Error: ${err.message || err}`
			};
		}
	}

	/**
	 * Publica un post en la Fan Page (soporta texto, enlaces e imágenes
	 * remotas o locales en /uploads/).
	 */
	static async publicarPost(params: PublishPostParams, cuentaId?: number): Promise<PublishResult> {
		try {
			const { creds } = await resolveCreds(cuentaId);
			const token = creds.access_token;
			const pageId = creds.page_id;
			const version = creds.graph_version;

			if (!token || !pageId) {
				return {
					success: false,
					error: 'Faltan credenciales (la cuenta no tiene page_id o access_token).'
				};
			}

			let url: string;
			let reqOptions: RequestInit;

			if (params.imageUrl) {
				url = `https://graph.facebook.com/${version}/${pageId}/photos`;

				if (params.imageUrl.startsWith('http://') || params.imageUrl.startsWith('https://')) {
					// Imagen remota vía URL
					reqOptions = {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							url: params.imageUrl,
							caption: params.message,
							access_token: token
						})
					};
				} else if (params.imageUrl.startsWith('/uploads/')) {
					try {
						const fileBuffer = await readUploadFile(params.imageUrl);
						const fileName = path.posix.basename(params.imageUrl);
						const mimeType = getUploadMimeType(fileName);
						const blob = new Blob([fileBuffer], { type: mimeType });
						const formData = new FormData();
						formData.append('caption', params.message);
						formData.append('access_token', token);
						formData.append('source', blob, fileName);

						reqOptions = { method: 'POST', body: formData };
					} catch (error: any) {
						if (error?.code !== 'ENOENT') throw error;
						console.warn(
							`[FacebookService] ⚠️ Imagen local no encontrada: ${params.imageUrl}; enviando solo texto.`
						);
						url = `https://graph.facebook.com/${version}/${pageId}/feed`;
						reqOptions = {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ message: params.message, access_token: token })
						};
					}
				} else {
					reqOptions = {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ message: params.message, access_token: token })
					};
				}
			} else {
				// Solo texto / enlace
				url = `https://graph.facebook.com/${version}/${pageId}/feed`;
				const body: Record<string, string> = {
					message: params.message,
					access_token: token
				};
				if (params.link) body.link = params.link;
				reqOptions = {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				};
			}

			const response = await fetch(url, reqOptions);
			const data = await response.json();

			if (!response.ok || data.error) {
				const errMsg = data.error?.message || `Error HTTP ${response.status}`;
				return { success: false, error: `Meta API Error: ${errMsg}` };
			}

			return { success: true, postId: data.id || data.post_id };
		} catch (err: any) {
			return { success: false, error: `Error de envío: ${err.message || err}` };
		}
	}

	/**
	 * Publica un post multi-imagen en la Fan Page (hasta 10 fotos).
	 * Flujo:
	 *   1. Sube cada imagen a /{page-id}/photos con published=false → obtiene photo_id.
	 *   2. Publica en /{page-id}/feed con attached_media[i]={"media_fbid":"<photo_id>"}.
	 * Acepta URLs remotas (http/https) y rutas locales en /uploads/ (lee el archivo
	 * y lo sube como multipart source).
	 */
	static async publicarMultiFoto(
		params: PublishPostParams,
		cuentaId?: number
	): Promise<PublishResult> {
		try {
			const { creds } = await resolveCreds(cuentaId);
			const token = creds.access_token;
			const pageId = creds.page_id;
			const version = creds.graph_version;

			if (!token || !pageId) {
				return {
					success: false,
					error: 'Faltan credenciales (la cuenta no tiene page_id o access_token).'
				};
			}
			const urls = params.imageUrls || [];
			if (urls.length < 2) {
				return {
					success: false,
					error: 'publicarMultiFoto requiere al menos 2 imágenes.'
				};
			}

			// FB admite hasta 10 fotos por post multi-imagen.
			let imageUrls = urls;
			if (imageUrls.length > 10) {
				console.warn(
					`[FacebookService] ⚠️ Se recibieron ${imageUrls.length} imágenes; FB admite máx 10. Se truncará.`
				);
				imageUrls = imageUrls.slice(0, 10);
			}

			// 1) Subir cada imagen con published=false y recolectar media_id.
			const mediaIds: string[] = [];
			for (const imgUrl of imageUrls) {
				let res: Response;
				if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
					// Imagen remota vía URL. Graph API espera parámetros de formulario,
					// no un cuerpo JSON, para procesar correctamente `published`.
					const body = new URLSearchParams({
						url: imgUrl,
						published: 'false',
						access_token: token
					});
					res = await fetch(`https://graph.facebook.com/${version}/${pageId}/photos`, {
						method: 'POST',
						body
					});
				} else if (imgUrl.startsWith('/uploads/')) {
					let fileBuffer: Buffer;
					try {
						fileBuffer = await readUploadFile(imgUrl);
					} catch (error: any) {
						if (error?.code !== 'ENOENT') throw error;
						return {
							success: false,
							error: `Imagen local no encontrada: ${imgUrl}`
						};
					}
					const fileName = path.posix.basename(imgUrl);
					const mimeType = getUploadMimeType(fileName);
					const blob = new Blob([fileBuffer], { type: mimeType });
					const formData = new FormData();
					formData.append('published', 'false');
					formData.append('access_token', token);
					formData.append('source', blob, fileName);
					res = await fetch(`https://graph.facebook.com/${version}/${pageId}/photos`, {
						method: 'POST',
						body: formData
					});
				} else {
					return {
						success: false,
						error: `URL de imagen no soportada: ${imgUrl}`
					};
				}
				const data = await res.json();
				if (!res.ok || data.error) {
					return {
						success: false,
						error: `FB photos (subida multi): ${data.error?.message || 'error desconocido'}`
					};
				}
				mediaIds.push(data.id);
			}

			// 2) Publicar un único post con las fotos temporales. Los nombres
			// indexados son necesarios: enviar un array JSON puede crear solo el copy.
			const feedBody = new URLSearchParams({
				message: params.message,
				access_token: token
			});
			mediaIds.forEach((id, index) => {
				feedBody.append(`attached_media[${index}]`, JSON.stringify({ media_fbid: id }));
			});

			const response = await fetch(`https://graph.facebook.com/${version}/${pageId}/feed`, {
				method: 'POST',
				body: feedBody
			});
			const data = await response.json();
			if (!response.ok || data.error) {
				const errMsg = data.error?.message || `Error HTTP ${response.status}`;
				return { success: false, error: `Meta API Error: ${errMsg}` };
			}

			return { success: true, postId: data.id || data.post_id };
		} catch (err: any) {
			return { success: false, error: `Error de envío multi-imagen: ${err.message || err}` };
		}
	}

	/**
	 * Obtiene las publicaciones recientes del Feed de la página con métricas básicas.
	 */
	static async obtenerFeed(
		limit = 10,
		cuentaId?: number
	): Promise<{ success: boolean; posts?: any[]; error?: string }> {
		try {
			const { creds } = await resolveCreds(cuentaId);
			const token = creds.access_token;
			const pageId = creds.page_id;
			const version = creds.graph_version;

			if (!token || !pageId) {
				return { success: false, error: 'Credenciales incompletas.' };
			}

			const fields =
				'id,message,created_time,full_picture,permalink_url,shares,comments.summary(true),likes.summary(true)';
			const url = `https://graph.facebook.com/${version}/${pageId}/posts?fields=${encodeURIComponent(fields)}&limit=${limit}&access_token=${encodeURIComponent(token)}`;

			const response = await fetch(url);
			const data = await response.json();

			if (!response.ok || data.error) {
				return {
					success: false,
					error: data.error?.message || 'Error al consultar feed'
				};
			}

			return { success: true, posts: data.data || [] };
		} catch (err: any) {
			return { success: false, error: err.message || 'Error de conexión' };
		}
	}
}

// Compat: si alguien hacia `import { FacebookService } from './facebook-service'`
// antes el archivo usaba `env.X` directo; FASE 4 eliminó ese fallback.
export { getGraphVersion };
