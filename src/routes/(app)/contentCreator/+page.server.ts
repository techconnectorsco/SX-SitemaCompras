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

    // El total principal excluye registros históricos que no se pueden reconstruir por modalidad.
    const tokenStats = db.prepare(`
        SELECT 
            COALESCE(SUM(CASE WHEN billing_status != 'legacy_approximate' THEN costo_estimado ELSE 0 END), 0) AS costo_total,
            COALESCE(SUM(CASE WHEN billing_status = 'legacy_approximate' THEN costo_estimado ELSE 0 END), 0) AS costo_historico_aproximado,
            COALESCE(SUM(tokens_totales), 0)   AS tokens_total,
            COUNT(*)                           AS llamadas_total
        FROM ai_token_logs
        WHERE user_id = ?
    `).get(locals.user.id) as { costo_total: number; costo_historico_aproximado: number; tokens_total: number; llamadas_total: number };

    return {
        catalogos,
        publicaciones,
        tokenStats
    };
};
