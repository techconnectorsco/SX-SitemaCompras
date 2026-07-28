// historico-ventas server endpoint

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';

/**
 * ✅ ENDPOINT: Obtener histórico de ventas de un SKU
 * 
 * Retorna TODAS las ventas desde 2020 hasta el mes actual (parcial)
 * Incluye meses sin ventas rellenados con 0
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  const user = locals.user || locals.session?.user;
  
  if (!user) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const codigo = url.searchParams.get('codigo');
    
    if (!codigo) {
      return json({ error: 'Código SKU requerido' }, { status: 400 });
    }

    // ✅ Definir año base (desde 2020)
    const AÑO_BASE = 2020;
    const FECHA_CORTE = `${AÑO_BASE}-01-01`;

    console.log(`[Histórico Ventas] 📊 Consultando SKU: ${codigo}`);
    console.log(`[Histórico Ventas] 📅 Desde: ${FECHA_CORTE} hasta HOY`);

    // ✅ Consultar ventas desde 2020 hasta HOY (sin límite superior)
    const ventas = db.prepare(`
      SELECT 
        strftime('%Y-%m', fecha) as mes_año,
        SUM(cantidad) as cantidad
      FROM ventas_mensuales
      WHERE sku_codigo = ?
        AND fecha >= ?
      GROUP BY strftime('%Y-%m', fecha)
      ORDER BY mes_año ASC
    `).all(codigo, FECHA_CORTE);

    console.log(`[Histórico Ventas] ✅ Registros encontrados: ${ventas.length}`);

    // Convertir a objeto clave-valor
    const ventasObj: Record<string, number> = {};
    (ventas as any[]).forEach(row => {
      ventasObj[row.mes_año] = row.cantidad || 0;
    });

    // ✅ Si no hay datos, rellenar desde 2020 hasta el mes actual
    if (Object.keys(ventasObj).length === 0) {
      const hoy = new Date();
      const añoActual = hoy.getFullYear();
      const mesActual = hoy.getMonth() + 1; // 0-based, sumamos 1
      
      console.log(`[Histórico Ventas] ℹ️ No hay ventas, rellenando con 0 desde ${AÑO_BASE} hasta ${añoActual}-${mesActual}`);
      
      // Bucle desde 2020 hasta el año actual
      for (let año = AÑO_BASE; año <= añoActual; año++) {
        const mesInicio = 1;
        const mesFin = año === añoActual ? mesActual : 12;
        
        for (let mes = mesInicio; mes <= mesFin; mes++) {
          const mesPadded = mes.toString().padStart(2, '0');
          const key = `${año}-${mesPadded}`;
          ventasObj[key] = 0;
        }
      }
    } else {
      // ✅ Si hay datos, rellenar meses faltantes con 0
      const hoy = new Date();
      const añoActual = hoy.getFullYear();
      const mesActual = hoy.getMonth() + 1;
      
      for (let año = AÑO_BASE; año <= añoActual; año++) {
        const mesInicio = 1;
        const mesFin = año === añoActual ? mesActual : 12;
        
        for (let mes = mesInicio; mes <= mesFin; mes++) {
          const mesPadded = mes.toString().padStart(2, '0');
          const key = `${año}-${mesPadded}`;
          
          if (!ventasObj[key]) {
            ventasObj[key] = 0;
          }
        }
      }
    }

    console.log(`[Histórico Ventas] ✅ Meses totales retornados: ${Object.keys(ventasObj).length}`);

    return json({
      codigo,
      ventas: ventasObj
    });

  } catch (error) {
    console.error('[Histórico Ventas] ❌ Error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};