import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PublicacionService } from '$lib/features/content-creator/services/publicacion-service';

export const POST: RequestHandler = async ({ params, locals }) => {
    try {
        if (!locals.user) {
            return json({ error: 'No autorizado' }, { status: 401 });
        }

        const id = parseInt(params.id);
        if (isNaN(id)) {
            return json({ error: 'ID de publicación inválido' }, { status: 400 });
        }

        const publicacion = PublicacionService.getById(id, locals.user.id);
        if (!publicacion) {
            return json({ error: 'Publicación no encontrada' }, { status: 404 });
        }
        if (!publicacion.copy_final?.trim()) {
            return json({ error: 'La publicación debe tener un copy final antes de aprobarse para Meta.' }, { status: 400 });
        }
        
        PublicacionService.aprobar(id, locals.user.id);
        
        return json({ success: true });
    } catch (error: any) {
        console.error('[API Aprobar]', error);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};
