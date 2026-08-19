import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FacebookService } from '$lib/features/content-creator/services/facebook-service';
import { InstagramService } from '$lib/features/content-creator/services/meta/instagram-service';
import { PublicacionService } from '$lib/features/content-creator/services/publicacion-service';
import db from '$lib/config/db-config';

/**
 * POST /api/content-creator/meta/publish
 *
 * Body:
 *   { message?, link?, imageUrl?, publicacionId?, cuentaId?, red? }
 *
 * - `red`: 'fb' (default) o 'ig'. Si 'ig' y la cuenta tiene IG conectado, usa
 *   InstagramService (imagen obligatoria HTTPS).
 * - `cuentaId`: ID de la fila `cuentas`. Si falta, cae al fallback .env (FB only).
 * - Tras publicar con éxito, marca la publicación como 'Publicado' y enlaza
 *   con `publicacion_redes(red_social_id)`.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}

	try {
		const body = await request.json();
		let {
			message,
			link,
			imageUrl,
			imageUrls,
			publicacionId,
			cuentaId,
			red
		} = body as {
			message?: string;
			link?: string;
			imageUrl?: string;
			imageUrls?: string[];
			publicacionId?: number;
			cuentaId?: number;
			red?: 'fb' | 'ig';
		};


		// Una publicación persistida siempre se envía con su copy_final, no con
		// texto arbitrario provisto por el cliente.
		if (publicacionId) {
			const publicacion = PublicacionService.getById(Number(publicacionId), locals.user.id);
			if (!publicacion) {
				return json({ success: false, error: 'Publicación no encontrada' }, { status: 404 });
			}
			if (!publicacion.copy_final?.trim()) {
				return json(
					{ success: false, error: 'La publicación debe tener un copy final antes de enviarse a Meta.' },
					{ status: 400 }
				);
			}
			message = publicacion.copy_final.trim();
		} else if (!message?.trim()) {
			return json(
				{ success: false, error: 'El mensaje del post no puede estar vacío' },
				{ status: 400 }
			);
		}

		// Si es una publicación guardada y no enviaron imageUrls, intentar cargar carrusel de la BD
		if (publicacionId && (!imageUrls || imageUrls.length === 0)) {
			const postRow = db
				.prepare(`SELECT es_carrusel, carousel_images, sharepoint_item_id FROM publicaciones WHERE id = ?`)
				.get(Number(publicacionId)) as { es_carrusel?: number; carousel_images?: string; sharepoint_item_id?: string } | undefined;

			if (postRow?.es_carrusel === 1 && postRow.carousel_images) {
				try {
					const carousel = JSON.parse(postRow.carousel_images);
					if (Array.isArray(carousel)) {
						imageUrls = carousel
							.map((c: any) => (typeof c === 'string' ? c : c?.imagePreview || c?.url || c?.src || null))
							.filter((u: string | null) => typeof u === 'string' && u.trim().length > 0) as string[];
					}
				} catch (e) {}
			}
			if (!imageUrl && postRow?.sharepoint_item_id) {
				imageUrl = postRow.sharepoint_item_id;
			}
		}

		const cuentaIdNum = cuentaId ? Number(cuentaId) : undefined;
		const redNorm = (red || 'fb').toLowerCase() as 'fb' | 'ig';

		// FASE 4: no hay fallback .env. Exigir cuentaId.
		if (!cuentaIdNum) {
			return json(
				{
					success: false,
					error: `Selecciona una cuenta Meta conectada para publicar${redNorm === 'ig' ? ' en Instagram' : ''}.`
				},
				{ status: 400 }
			);
		}

		let publishedPostId: string | undefined;

		if (redNorm === 'ig') {
			if (Array.isArray(imageUrls) && imageUrls.length > 1) {
				const carouselResult = await InstagramService.publicarCarrusel(
					cuentaIdNum,
					imageUrls,
					message
				);
				if (!carouselResult.success) {
					return json(
						{ success: false, error: carouselResult.error },
						{ status: 502 }
					);
				}
				publishedPostId = carouselResult.postId;
			} else {
			if (!imageUrl) {
				return json(
					{ success: false, error: 'Instagram requiere una imagen (imageUrl).' },
					{ status: 400 }
				);
			}
			const result = await InstagramService.publicarMedia(cuentaIdNum, {
				imageUrl,
				caption: message
			});
			if (!result.success) {
				return json(
					{ success: false, error: result.error },
					{ status: 502 }
				);
			}
			publishedPostId = result.postId;
			}
	} else {
		// Facebook
		const hasMultiple = Array.isArray(imageUrls) && imageUrls.length >= 2;
		let result;
		if (hasMultiple) {
			result = await FacebookService.publicarMultiFoto(
				{ message, link, imageUrls },
				cuentaIdNum
			);
		} else {
			result = await FacebookService.publicarPost(
				{ message, link, imageUrl },
				cuentaIdNum
			);
		}
		if (!result.success) {
			return json(
				{ success: false, error: result.error },
				{ status: 502 }
			);
		}
		publishedPostId = result.postId;
	}

		// Actualizar publicación + enlazar red_social_id
		if (publicacionId) {
			PublicacionService.update(Number(publicacionId), locals.user.id, {
				estado: 'Publicado'
			});
			db.prepare(`
				UPDATE publicaciones
				SET published = 1,
					published_at = COALESCE(published_at, ?),
					meta_post_id = ?,
					updated_at = ?
				WHERE id = ? AND user_id = ? AND deleted_at IS NULL
			`).run(
				Math.floor(Date.now() / 1000),
				publishedPostId || null,
				Math.floor(Date.now() / 1000),
				Number(publicacionId),
				locals.user.id
			);

			const redSocialId = redNorm === 'ig' ? 2 : 1; // 1=Facebook, 2=Instagram
			try {
				db.prepare(
					`INSERT OR IGNORE INTO publicacion_redes (publicacion_id, red_social_id) VALUES (?, ?)`
				).run(Number(publicacionId), redSocialId);
			} catch (e) {
				console.warn('[meta/publish] No se pudo enlazar publicacion_redes:', e);
			}
		}

		return json({ success: true, postId: publishedPostId });
	} catch (err: any) {
		return json(
			{ success: false, error: err.message || 'Error interno al procesar la publicación' },
			{ status: 500 }
		);
	}
};
