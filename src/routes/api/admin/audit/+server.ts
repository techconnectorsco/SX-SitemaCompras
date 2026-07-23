import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/config/db-config';

export const GET: RequestHandler = async ({ locals }) => {
    // 1. Seguridad: Solo ADMINs pueden ver esto
    if (!locals.user || locals.user.role !== 'ADMIN') {
        throw error(403, 'Acceso denegado. Se requieren permisos de administrador.');
    }

    try {
        // 2. Obtener logs unidos con usuarios
        const logsQuery = db.prepare(`
            SELECT 
                a.*,
                u.email as user_email,
                u.display_name as user_name,
                u.role as user_role
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
            LIMIT 500
        `);

        const rawLogs = logsQuery.all();

        // 3. Recolectar IDs de Forecast para los logs de COMPRAS
        const forecastIdsToFetch = new Set<number>();

        const enrichedLogs = rawLogs.map((log: any) => {
            const newLog = { ...log, product_info: null };

            // Solo nos interesa buscar info extra si es update de compras
            if (log.action === 'COMPRAS_UPDATE' || log.action === 'COMPRAS_UPDATE_ERROR') {
                // Regex para extraer "id=123" del string de detalles
                const match = log.details?.match(/id=(\d+)/);
                if (match && match[1]) {
                    const forecastId = parseInt(match[1]);
                    newLog.forecast_id = forecastId;
                    forecastIdsToFetch.add(forecastId);
                }
            }
            return newLog;
        });

        // 4. Buscar información de SKUs (si hay IDs)
        let forecastMap = new Map();
        if (forecastIdsToFetch.size > 0) {
            const ids = Array.from(forecastIdsToFetch).join(',');
            const forecastQuery = db.prepare(`
                SELECT id, codigo_sku, descripcion 
                FROM forecast_procesamiento 
                WHERE id IN (${ids})
            `);
            const forecastRows = forecastQuery.all();
            
            forecastRows.forEach((row: any) => {
                forecastMap.set(row.id, row);
            });
        }

        // 5. Inyectar la info del producto en los logs
        const finalLogs = enrichedLogs.map((log) => {
            if (log.forecast_id && forecastMap.has(log.forecast_id)) {
                log.product_info = forecastMap.get(log.forecast_id);
            }
            return log;
        });

        // 6. Clasificar para el frontend
        const authLogs = finalLogs.filter(l => ['LOGIN', 'REGISTER', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_RESET', 'USER_BANNED', 'USER_PROMOTED', 'ADMIN_PASSWORD_RESET'].includes(l.action));
        const processLogs = finalLogs.filter(l => l.action.includes('FORECAST_PROCESS'));
        const comprasLogs = finalLogs.filter(l => l.action.includes('COMPRAS'));
        const profileLogs = finalLogs.filter(l => ['PROFILE_UPDATE', 'PASSWORD_CHANGE'].includes(l.action));
        const reportesLogs = finalLogs.filter(l => l.action.includes('REPORT_DOWNLOAD'));

        return json({
            auth: authLogs,
            process: processLogs,
            compras: comprasLogs,
            profile: profileLogs,
            reportes: reportesLogs
        });

    } catch (err: any) {
        console.error('[API Audit] Error:', err);
        throw error(500, 'Error al obtener los registros de auditoría');
    }
};