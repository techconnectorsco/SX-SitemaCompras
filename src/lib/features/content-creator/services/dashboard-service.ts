import db from '$lib/config/db-config';
import type { DashboardStats } from '../types';

export class DashboardService {
    static getStats(userId: string): DashboardStats {
        const stats: DashboardStats = {
            total: 0,
            borradores: 0,
            en_revision: 0,
            aprobados: 0,
            publicados: 0,
            errores: 0
        };

        const rows = db.prepare(`
            SELECT estado, count(*) as count
            FROM publicaciones
            WHERE user_id = ? AND deleted_at IS NULL
            GROUP BY estado
        `).all(userId) as { estado: string; count: number }[];

        for (const row of rows) {
            stats.total += row.count;
            if (row.estado === 'Borrador') stats.borradores = row.count;
            if (row.estado === 'En revisión') stats.en_revision = row.count;
            if (row.estado === 'Aprobado') stats.aprobados = row.count;
            if (row.estado === 'Publicado') stats.publicados = row.count;
            if (row.estado === 'Error API') stats.errores = row.count;
        }

        return stats;
    }

    static getConsumoIA(userId: string): { tokens_totales: number; costo_estimado: number } {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const startTimestamp = Math.floor(startOfMonth.getTime() / 1000);

        const result = db.prepare(`
            SELECT SUM(tokens_totales) as tokens_totales, SUM(costo_estimado) as costo_estimado
            FROM ai_token_logs
            WHERE user_id = ? AND created_at >= ?
        `).get(userId, startTimestamp) as { tokens_totales: number | null; costo_estimado: number | null };

        return {
            tokens_totales: result.tokens_totales || 0,
            costo_estimado: result.costo_estimado || 0
        };
    }
}
