import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/config/db-config';

// GET /api/content-creator/ia/consumo/resumen
export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

    try {
        const tokenStats = db.prepare(`
            SELECT
                COALESCE(SUM(CASE WHEN billing_status != 'legacy_approximate' THEN costo_estimado ELSE 0 END), 0) AS costo_total,
                COALESCE(SUM(CASE WHEN billing_status = 'legacy_approximate' THEN costo_estimado ELSE 0 END), 0) AS costo_historico_aproximado,
                COALESCE(SUM(tokens_totales), 0) AS tokens_total,
                COUNT(*) AS llamadas_total
            FROM ai_token_logs
            WHERE user_id = ?
        `).get(locals.user.id);

        return json({ tokenStats });
    } catch (error) {
        console.error('[API IA Consumo Resumen]', error);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};
