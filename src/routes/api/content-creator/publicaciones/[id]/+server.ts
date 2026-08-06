import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PublicacionService } from '$lib/features/content-creator/services/publicacion-service';

export const GET: RequestHandler = async ({ params, locals }) => {
    try {
        if (!locals.user) {
            return json({ error: 'No autorizado' }, { status: 401 });
        }

        const id = parseInt(params.id);
        const publicacion = PublicacionService.getById(id, locals.user.id);
        
        if (!publicacion) {
            return json({ error: 'Publicación no encontrada' }, { status: 404 });
        }

        return json(publicacion);
    } catch (error: any) {
        console.error('[API Publicaciones [id] GET]', error);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
    try {
        if (!locals.user) {
            return json({ error: 'No autorizado' }, { status: 401 });
        }

        const id = parseInt(params.id);
        const data = await request.json();
        
        PublicacionService.update(id, locals.user.id, data);
        
        return json({ success: true });
    } catch (error: any) {
        console.error('[API Publicaciones [id] PUT]', error);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
    try {
        if (!locals.user) {
            return json({ error: 'No autorizado' }, { status: 401 });
        }

        const id = parseInt(params.id);
        PublicacionService.softDelete(id, locals.user.id);
        
        return json({ success: true });
    } catch (error: any) {
        console.error('[API Publicaciones [id] DELETE]', error);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};
