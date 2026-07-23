/**
 * GET /api/admin/procesamiento/historial
 * Obtiene historial completo de procesamiento de forecasts
 * Agrupa por codigo_procesamiento y muestra últimos 20
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '../$types';
import { db } from '$lib/config/db-config';

// 1. Eliminamos la importación de password-utils

export const GET: RequestHandler = async ({ url, locals }) => {
    const user = locals.user || locals.session?.user;

    // Verificar que sea admin o analyst
    if (!user || !['ADMIN', 'ANALYST'].includes(user.role)) {
        return json({ error: 'No autorizado' }, { status: 403 });
    }

    try {
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        // Obtener histórico de procesamiento (agrupa por código)
        const query = `
            SELECT 
                codigo_procesamiento as codigo,
                fecha_procesamiento as fecha,
                usuario_procesamiento as usuario,
                COUNT(*) as totalSKUs,
                MIN(id) as id_minimo,
                MAX(id) as id_maximo
            FROM forecast_procesamiento
            WHERE codigo_procesamiento IS NOT NULL AND codigo_procesamiento != ''
            GROUP BY codigo_procesamiento
            ORDER BY fecha_procesamiento DESC
            LIMIT ? OFFSET ?
        `;

        const historial = db.prepare(query).all(limit, offset);

        // Obtener total de procesamientos
        const totalQuery = `
            SELECT COUNT(DISTINCT codigo_procesamiento) as total 
            FROM forecast_procesamiento 
            WHERE codigo_procesamiento IS NOT NULL AND codigo_procesamiento != ''
        `;
        const totalResult = db.prepare(totalQuery).get() as { total: number };

        // Formatear respuesta
        const historialFormateado = (historial as any[]).map((h) => ({
            codigo: h.codigo,
            // 2. Usamos la función local definida abajo
            fecha: formatearFechaLocal(h.fecha), 
            fechaRaw: h.fecha,
            usuario: h.usuario,
            totalSKUs: h.totalSKUs,
            estado: 'COMPLETADO' 
        }));

        // Obtener estadísticas
        const statsQuery = `
            SELECT 
                usuario_procesamiento,
                COUNT(DISTINCT codigo_procesamiento) as totalProcesos
            FROM forecast_procesamiento
            WHERE codigo_procesamiento IS NOT NULL AND codigo_procesamiento != ''
            GROUP BY usuario_procesamiento
            ORDER BY totalProcesos DESC
        `;
        const stats = db.prepare(statsQuery).all() as Array<{
            usuario_procesamiento: string;
            totalProcesos: number;
        }>;

        return json({
            historial: historialFormateado,
            total: totalResult.total,
            limite: limit,
            offset: offset,
            estadisticas: {
                totalProcesosHistorico: totalResult.total,
                usuariosMasActivos: stats
            }
        });
    } catch (error) {
        console.error('Error obteniendo historial de procesamiento:', error);
        return json(
            {
                error: 'Error al obtener historial',
                details: error instanceof Error ? error.message : 'Error desconocido'
            },
            { status: 500 }
        );
    }
};

/**
 * Función auxiliar local para formatear fechas
 * Maneja tanto timestamps numéricos como strings ISO de SQL
 */
function formatearFechaLocal(fecha: string | number | null): string {
    if (!fecha) return '-';
    
    let dateObj: Date;

    // Si es número (asumimos segundos Unix timestamp como es común en SQLite)
    if (typeof fecha === 'number') {
        dateObj = new Date(fecha * 1000);
    } else {
        // Si es string (ej: "2023-01-01 12:00:00")
        // Reemplazar espacio por T para compatibilidad segura en Safari/Firefox
        const fechaStr = fecha.replace(' ', 'T');
        dateObj = new Date(fechaStr);
    }

    // Retornar formato local CR
    return dateObj.toLocaleString('es-CR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}