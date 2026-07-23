/**
 * API PÚBLICA para estadísticas de la landing page
 * GET /api/public/landing-stats
 * 
 * NO requiere autenticación - solo datos básicos no sensibles
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';

export const GET: RequestHandler = async () => {
  try {
    // Verificar si hay datos
    const hayDatos = db.prepare(`SELECT COUNT(*) as total FROM forecast_procesamiento`).get() as { total: number };
    
    if (hayDatos.total === 0) {
      return json({
        hayDatos: false,
        totalSKUs: 0,
        skusActivos: 0,
        distribucionABC: null,
        ultimoProcesamiento: null
      });
    }

    // Obtener el código del procesamiento más reciente
    const ultimoProcRow = db.prepare(`
      SELECT codigo_procesamiento, fecha_procesamiento, usuario_procesamiento
      FROM forecast_procesamiento
      WHERE codigo_procesamiento IS NOT NULL AND codigo_procesamiento != ''
      ORDER BY fecha_procesamiento DESC
      LIMIT 1
    `).get() as { codigo_procesamiento: string; fecha_procesamiento: string; usuario_procesamiento: string } | undefined;

    if (!ultimoProcRow) {
      return json({
        hayDatos: false,
        totalSKUs: 0,
        skusActivos: 0,
        distribucionABC: null,
        ultimoProcesamiento: null
      });
    }

    const codigoProcesamiento = ultimoProcRow.codigo_procesamiento;

    // KPIs básicos
    const kpis = db.prepare(`
      SELECT 
        COUNT(*) as totalSKUs,
        SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as skusActivos,
        SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as skusInactivos,
        SUM(CASE WHEN existencia = 0 AND abc IN ('A', 'B') THEN 1 ELSE 0 END) as stockCritico,
        SUM(CASE WHEN (mensaje_courier != '' AND mensaje_courier IS NOT NULL) OR (mensaje_aereo != '' AND mensaje_aereo IS NOT NULL) THEN 1 ELSE 0 END) as requierenPedido
      FROM forecast_procesamiento
      WHERE codigo_procesamiento = ?
    `).get(codigoProcesamiento) as any;

    // Distribución ABC
    const abcRows = db.prepare(`
      SELECT 
        COALESCE(abc, 'N/D') as abc, 
        COUNT(*) as cantidad 
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento = ?
      GROUP BY abc
      ORDER BY abc
    `).all(codigoProcesamiento) as Array<{ abc: string; cantidad: number }>;

    const distribucionABC: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    abcRows.forEach(row => {
      if (row.abc in distribucionABC) {
        distribucionABC[row.abc] = row.cantidad;
      }
    });

    // Top 3 líneas
    const topLineas = db.prepare(`
      SELECT linea, COUNT(*) as cantidad 
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento = ?
        AND linea != '' AND linea IS NOT NULL
      GROUP BY linea 
      ORDER BY cantidad DESC 
      LIMIT 3
    `).all(codigoProcesamiento) as Array<{ linea: string; cantidad: number }>;

    return json({
      hayDatos: true,
      totalSKUs: kpis.totalSKUs || 0,
      skusActivos: kpis.skusActivos || 0,
      skusInactivos: kpis.skusInactivos || 0,
      stockCritico: kpis.stockCritico || 0,
      requierenPedido: kpis.requierenPedido || 0,
      distribucionABC,
      topLineas,
      ultimoProcesamiento: {
        codigo: ultimoProcRow.codigo_procesamiento,
        fecha: ultimoProcRow.fecha_procesamiento
      }
    });

  } catch (error) {
    console.error('Error en landing stats:', error);
    // En caso de error, devolver datos vacíos (no romper la landing)
    return json({
      hayDatos: false,
      totalSKUs: 0,
      skusActivos: 0,
      distribucionABC: null,
      ultimoProcesamiento: null
    });
  }
};