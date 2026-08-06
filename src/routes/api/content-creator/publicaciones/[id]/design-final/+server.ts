import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/config/db-config';

/**
 * Persiste el reemplazo de la imagen de IA por el diseño final (Adobe).
 * Actualiza sharepoint_item_id, image_name y designed=1 en la publicación.
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
    try {
        if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

        const id = parseInt(params.id);
        if (isNaN(id)) return json({ error: 'ID inválido' }, { status: 400 });

        const data = await request.json();
        const imageUrl = data.imageUrl;
        const imageName = data.imageName;
        if (!imageUrl || !imageName) {
            return json({ error: 'Se requieren imageUrl e imageName' }, { status: 400 });
        }

        const now = Math.floor(Date.now() / 1000);
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