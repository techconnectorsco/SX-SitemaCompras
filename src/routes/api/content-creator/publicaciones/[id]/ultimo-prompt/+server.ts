import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/config/db-config';

export const GET: RequestHandler = async ({ params, url, locals }) => {
    try {
        if (!locals.user) {
            return json({ error: 'No autorizado' }, { status: 401 });
        }

        const id = parseInt(params.id);
        if (isNaN(id)) {
            return json({ error: 'ID de publicación inválido' }, { status: 400 });
        }

        const tipo = url.searchParams.get('tipo') || 'imagen';

        let row: { prompt_utilizado?: string } | undefined;

        if (tipo === 'copy') {
            row = db.prepare(`
                SELECT prompt_utilizado
                FROM ai_token_logs
                WHERE publicacion_id = ? 
                  AND prompt_utilizado IS NOT NULL 
                  AND prompt_utilizado != ''
                  AND (tarea LIKE '%Copy%' OR (modelo_ia LIKE '%flash%' AND modelo_ia NOT LIKE '%image%'))
                ORDER BY id DESC
                LIMIT 1
            `).get(id) as { prompt_utilizado?: string } | undefined;
        } else {
            // Por defecto: filtrar para tareas de Imagen
            row = db.prepare(`
                SELECT prompt_utilizado
                FROM ai_token_logs
                WHERE publicacion_id = ? 
                  AND prompt_utilizado IS NOT NULL 
                  AND prompt_utilizado != ''
                  AND (tarea LIKE '%Imagen%' OR modelo_ia LIKE '%image%')
                ORDER BY id DESC
                LIMIT 1
            `).get(id) as { prompt_utilizado?: string } | undefined;

            // Fallback si aún no hay registros específicos de imagen
            if (!row?.prompt_utilizado) {
                row = db.prepare(`
                    SELECT prompt_utilizado
                    FROM ai_token_logs
                    WHERE publicacion_id = ? 
                      AND prompt_utilizado IS NOT NULL 
                      AND prompt_utilizado != ''
                    ORDER BY id DESC
                    LIMIT 1
                `).get(id) as { prompt_utilizado?: string } | undefined;
            }
        }

        return json({ success: true, prompt: row?.prompt_utilizado || null });
    } catch (error: any) {
        console.error('[API ultimo-prompt GET]', error);
        return json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
};