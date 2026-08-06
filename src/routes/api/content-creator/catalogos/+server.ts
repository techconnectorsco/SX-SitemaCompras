import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CatalogoService } from '$lib/features/content-creator/services/catalogo-service';

export const GET: RequestHandler = async ({ locals }) => {
    try {
        if (!locals.user) {
            return json({ error: 'No autorizado' }, { status: 401 });
        }

        const catalogos = CatalogoService.getAllCatalogos();
        return json(catalogos);
    } catch (error: any) {
        console.error('[API Catalogos]', error);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};
