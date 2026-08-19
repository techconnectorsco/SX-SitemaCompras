import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/config/db-config';

/**
 * Persiste el reemplazo de la imagen de IA por el diseño final (Adobe).
 *
 * Comportamiento según `slideIndex`:
 *   - Ausente o null → flujo original: actualiza sharepoint_item_id + image_name + designed=1.
 *   - Número         → flujo carrusel: actualiza carousel_images[slideIndex].imagePreview/imageName.
 *
 * Mantenemos `designed=1` en ambos casos para no romper la validación de aprobación
 * basada en `designed` para posts de imagen única (legacy).
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
    try {
        if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

        const id = parseInt(params.id);
        if (isNaN(id)) return json({ error: 'ID inválido' }, { status: 400 });

        const data = await request.json();
        const imageUrl = data.imageUrl;
        const imageName = data.imageName;
        const slideIndex = typeof data.slideIndex === 'number' ? data.slideIndex : null;

        if (!imageUrl || !imageName) {
            return json({ error: 'Se requieren imageUrl e imageName' }, { status: 400 });
        }

        const now = Math.floor(Date.now() / 1000);

        if (slideIndex !== null) {
            if (slideIndex < 0) {
                return json({ error: 'slideIndex inválido' }, { status: 400 });
            }

            // Leer carousel_images actuales
            const row = db.prepare(
                `SELECT carousel_images FROM publicaciones WHERE id = ? AND user_id = ? AND deleted_at IS NULL`
            ).get(id, locals.user.id) as { carousel_images?: string | null } | undefined;

            if (!row) {
                return json({ error: 'Publicación no encontrada o no autorizada' }, { status: 404 });
            }

            let carouselData: any[] = [];
            if (row.carousel_images) {
                try {
                    carouselData = JSON.parse(row.carousel_images);
                    if (!Array.isArray(carouselData)) carouselData = [];
                } catch (e) {
                    carouselData = [];
                }
            }

            // Asegurar que el array tenga el tamaño necesario
            while (carouselData.length <= slideIndex) {
                carouselData.push({ imagePreview: null, imageName: '', imageBase64: '', prompt: '', modo: 'editar' });
            }

            // Actualizar el slide preservando prompt y modo
            const prev = carouselData[slideIndex] || {};
            carouselData[slideIndex] = {
                imagePreview: imageUrl,
                imageName,
                imageBase64: '',
                prompt: prev.prompt || '',
                modo: prev.modo || 'editar'
            };

            const info = db.prepare(`
                UPDATE publicaciones
                SET carousel_images = ?, designed = 1, updated_at = ?
                WHERE id = ? AND user_id = ? AND deleted_at IS NULL
            `).run(JSON.stringify(carouselData), now, id, locals.user.id);

            if (info.changes === 0) {
                return json({ error: 'Publicación no encontrada o no autorizada' }, { status: 404 });
            }

            return json({ success: true, slideIndex });
        }

        // Flujo original (imagen única)
        const info = db.prepare(`
            UPDATE publicaciones
            SET sharepoint_item_id = ?, image_name = ?, designed = 1, updated_at = ?
            WHERE id = ? AND user_id = ? AND deleted_at IS NULL
        `).run(imageUrl, imageName, now, id, locals.user.id);

        if (info.changes === 0) {
            return json({ error: 'Publicación no encontrada o no autorizada' }, { status: 404 });
        }

        return json({ success: true });
    } catch (error: any) {
        console.error('[API design-final PUT]', error);
        return json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
};