import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PublicacionService } from '$lib/features/content-creator/services/publicacion-service';

export const POST: RequestHandler = async ({ params, locals }) => {
    try {
        if (!locals.user) {
            return json({ error: 'No autorizado' }, { status: 401 });
        }

        const id = parseInt(params.id);
        
        PublicacionService.aprobar(id, locals.user.id);
        
        return json({ success: true });
    } catch (error: any) {
        console.error('[API Aprobar]', error);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};
