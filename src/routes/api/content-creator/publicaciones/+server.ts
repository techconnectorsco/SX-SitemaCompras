import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PublicacionService } from '$lib/features/content-creator/services/publicacion-service';

export const GET: RequestHandler = async ({ locals, url }) => {
    try {
        if (!locals.user) {
            return json({ error: 'No autorizado' }, { status: 401 });
        }

        const estado = url.searchParams.get('estado') || undefined;
        const marca_id = url.searchParams.get('marca_id') ? parseInt(url.searchParams.get('marca_id')!) : undefined;
        const campana = url.searchParams.get('campana') || undefined;

        const publicaciones = PublicacionService.getByUser(locals.user.id, { estado, marca_id, campana });
        
        return json(publicaciones);
    } catch (error: any) {
        console.error('[API Publicaciones GET]', error);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        if (!locals.user) {
            return json({ error: 'No autorizado' }, { status: 401 });
        }

        const data = await request.json();
        
        // Basic validation
        if (!data.titulo || !data.cuenta_id || !data.marca_id) {
            return json({ error: 'Faltan campos requeridos (titulo, cuenta_id, marca_id)' }, { status: 400 });
        }

        const id = PublicacionService.create(locals.user.id, data);
        
        return json({ success: true, id }, { status: 201 });
    } catch (error: any) {
        console.error('[API Publicaciones POST]', error);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};
