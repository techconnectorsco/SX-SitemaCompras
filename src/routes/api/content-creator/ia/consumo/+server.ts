import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/config/db-config';

export const GET: RequestHandler = async ({ locals }) => {
    try {
        if (!locals.user) {
            return json({ error: 'No autorizado' }, { status: 401 });
        }

        const logs = db.prepare(`
            SELECT a.*, p.titulo as publicacion_titulo, m.nombre as marca_nombre
            FROM ai_token_logs a
            LEFT JOIN publicaciones p ON a.publicacion_id = p.id
            LEFT JOIN marcas m ON a.marca_id = m.id
            WHERE a.user_id = ?
            ORDER BY a.created_at DESC
            LIMIT 50
        `).all(locals.user.id);
        
        return json(logs);
    } catch (error: any) {
        console.error('[API IA Consumo]', error);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};
