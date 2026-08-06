import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { CatalogoService } from '$lib/features/content-creator/services/catalogo-service';
import { PublicacionService } from '$lib/features/content-creator/services/publicacion-service';
import db from '$lib/config/db-config';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(302, '/auth/login');
    }

    const catalogos = CatalogoService.getAllCatalogos();
    const publicaciones = PublicacionService.getByUser(locals.user.id);

    // Costo real acumulado desde ai_token_logs (no calculado, leído directo de BD)
    const tokenStats = db.prepare(`
        SELECT 
            COALESCE(SUM(costo_estimado), 0)  AS costo_total,
            COALESCE(SUM(tokens_totales), 0)   AS tokens_total,
            COUNT(*)                           AS llamadas_total
        FROM ai_token_logs
        WHERE user_id = ?
    `).get(locals.user.id) as { costo_total: number; tokens_total: number; llamadas_total: number };

    return {
        catalogos,
        publicaciones,
        tokenStats
    };
};
