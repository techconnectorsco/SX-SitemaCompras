import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DashboardService } from '$lib/features/content-creator/services/dashboard-service';

export const GET: RequestHandler = async ({ locals }) => {
    try {
        if (!locals.user) {
            return json({ error: 'No autorizado' }, { status: 401 });
        }

        const stats = DashboardService.getStats(locals.user.id);
        const consumoIA = DashboardService.getConsumoIA(locals.user.id);
        
        return json({
            stats,
            consumoIA
        });
    } catch (error: any) {
        console.error('[API Dashboard]', error);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};
