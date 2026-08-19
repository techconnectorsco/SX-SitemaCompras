import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PublishScheduler } from '$lib/features/content-creator/services/publish-scheduler';

/**
 * POST /api/content-creator/publicaciones/procesar-programadas
 * Fuerza el procesamiento manual inmediato de publicaciones programadas vencidas.
 */
export const POST: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        return json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        console.log(`[API Procesar Programadas] ⚡ Disparo manual solicitado por usuario ${locals.user.display_name || locals.user.id}`);
        const resultados = await PublishScheduler.processScheduledPosts();
        
        return json({
            success: true,
            totalProcesados: resultados.length,
            exitosos: resultados.filter(r => r.success).length,
            fallidos: resultados.filter(r => !r.success).length,
            detalles: resultados
        });
    } catch (err: any) {
        console.error('[API Procesar Programadas Error]', err);
        return json({ success: false, error: err.message || 'Error al procesar publicaciones programadas' }, { status: 500 });
    }
};
