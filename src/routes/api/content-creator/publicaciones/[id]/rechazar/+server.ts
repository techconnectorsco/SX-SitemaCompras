import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PublicacionService } from '$lib/features/content-creator/services/publicacion-service';

export const POST: RequestHandler = async ({ params, request, locals }) => {
    try {
        if (!locals.user) {
            return json({ error: 'No autorizado' }, { status: 401 });
        }

        const id = parseInt(params.id);
        const { notas } = await request.json();

        if (!notas) {
            return json({ error: 'Se requieren notas de revisión' }, { status: 400 });
        }
        
        PublicacionService.rechazar(id, locals.user.id, notas);
        
        return json({ success: true });
    } catch (error: any) {
        console.error('[API Rechazar]', error);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};
