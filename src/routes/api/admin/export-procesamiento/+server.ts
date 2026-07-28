/**
 * Exportar procesamiento completo a JSON
 * 
 * GET /api/admin/export-procesamiento
 * - Sin parámetros: devuelve el último procesamiento
 * - ?codigo=PROC-XXXXXXXX-XXXXXX: devuelve procesamiento específico
 * - ?listar=true: devuelve lista de procesamientos disponibles
 * 
 * Solo accesible por ADMIN
 * Para uso con PowerBI y análisis externo
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { AuditService } from '$lib/features/security/services/audit-service';

export const GET: RequestHandler = async ({ url, locals, request }) => {
  const user = locals.user || locals.session?.user;
  
  // ===== VERIFICAR AUTENTICACIÓN Y ROL =====
  if (!user) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  const userRole = String(user.role).toUpperCase();
  if (userRole !== 'ADMIN' && userRole !== 'API_CONSUMER') {
    return json({ error: 'Solo administradores y consumidores de API pueden acceder a esta API' }, { status: 403 });
  }

  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'SoporteXperto-App';

  try {
    const codigo = url.searchParams.get('codigo');
    const listar = url.searchParams.get('listar') === 'true';
    const formato = url.searchParams.get('formato') || 'json'; // json | download

    // ===== MODO: LISTAR PROCESAMIENTOS DISPONIBLES =====
    if (listar) {
      const procesamientos = db.prepare(`
        SELECT 
          codigo_procesamiento as codigo,
          fecha_procesamiento as fecha,
          usuario_procesamiento as usuario,
          COUNT(*) as total_skus
        FROM forecast_procesamiento
        WHERE codigo_procesamiento IS NOT NULL AND codigo_procesamiento != ''
        GROUP BY codigo_procesamiento
        ORDER BY fecha_procesamiento DESC
        LIMIT 50
      `).all();

      return json({
        success: true,
        procesamientos,
        total: procesamientos.length
      });
    }

    // ===== DETERMINAR QUÉ PROCESAMIENTO EXPORTAR =====
    let codigoProcesamiento = codigo;

    if (!codigoProcesamiento) {
      // Obtener el último procesamiento
      const ultimo = db.prepare(`
        SELECT codigo_procesamiento 
        FROM forecast_procesamiento 
        WHERE codigo_procesamiento IS NOT NULL AND codigo_procesamiento != ''
        ORDER BY fecha_procesamiento DESC 
        LIMIT 1
      `).get() as { codigo_procesamiento: string } | undefined;

      if (!ultimo) {
        return json({ 
          error: 'No hay procesamientos disponibles',
          mensaje: 'Ejecute primero un procesamiento de forecast'
        }, { status: 404 });
      }

      codigoProcesamiento = ultimo.codigo_procesamiento;
    }

    // ===== OBTENER METADATA DEL PROCESAMIENTO =====
    const metadata = db.prepare(`
      SELECT 
        codigo_procesamiento as codigo,
        fecha_procesamiento as fecha,
        usuario_procesamiento as usuario,
        COUNT(*) as total_skus
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento = ?
      GROUP BY codigo_procesamiento
    `).get(codigoProcesamiento) as { 
      codigo: string; 
      fecha: string; 
      usuario: string;
      total_skus: number;
    } | undefined;

    if (!metadata) {
      return json({ 
        error: 'Procesamiento no encontrado',
        codigo: codigoProcesamiento
      }, { status: 404 });
    }

   // ===== OBTENER TODOS LOS DATOS DEL PROCESAMIENTO =====
    const datos = db.prepare(`
      SELECT 
        id,
        codigo_procesamiento,
        fecha_procesamiento,
        usuario_procesamiento,
        codigo_sku,
        codigo_proveedor,
        descripcion,
        categoria,
        linea,
        marca,
        abc,
        abc_rotacion_frecuencia,
        activo,
        existencia,
        transito,
        lead_time,
        meses_pedido,
        frecuencia_ventas_12m,
        venta_ultimos_12m,
        promedio_12m,
        promedio_6m,
        promedio_ajustado,
        desviacion_estandar,
        coeficiente_variacion,
        factor_seguridad,
        stock_seguridad,
        referencia_pedido_courier,
        referencia_pedido_aereo,
        referencia_pedido_maritimo,
        cantidad_courier,
        mensaje_courier,
        cantidad_final_courier,
        cantidad_aereo,
        mensaje_aereo,
        cantidad_final_aereo,
        cantidad_maritimo,
        mensaje_maritimo,
        cantidad_final_maritimo,
        costo_prom_loc,
        costo_prom_dol,
        costo_ult_loc,
        costo_ult_dol,
        costo_std_loc,
        costo_std_dol,
        costo_comparativo,
        costo_fiscal,
        costo_prom_comparativo_loc,
        fecha_creacion,
        ultima_salida,
        ultimo_movimiento,
        sugerido_analista_urgente,
        sugerido_analista_aereo,
        sugerido_analista_maritimo,
        comentario_analista,
        usuario_modificacion,
        fecha_modificacion
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento = ?
      ORDER BY codigo_sku
    `).all(codigoProcesamiento) as any[];

    // ===== OBTENER HISTÓRICO DE VENTAS DE TODOS LOS SKUs =====
    const codigosSKUs = datos.map((d: any) => d.codigo_sku);
    
    // Crear mapa de histórico por SKU
    const historicoVentasMap = new Map<string, Record<string, number>>();
    
    if (codigosSKUs.length > 0) {
      // Obtener todas las ventas de todos los SKUs en una sola consulta
      const placeholders = codigosSKUs.map(() => '?').join(',');
      const ventasHistoricas = db.prepare(`
        SELECT 
          sku_codigo,
          strftime('%Y-%m', fecha) as mes_año,
          SUM(cantidad) as cantidad
        FROM ventas_mensuales
        WHERE sku_codigo IN (${placeholders})
          AND fecha >= '2020-01-01'
        GROUP BY sku_codigo, strftime('%Y-%m', fecha)
        ORDER BY sku_codigo, mes_año
      `).all(...codigosSKUs) as Array<{ sku_codigo: string; mes_año: string; cantidad: number }>;

      // Agrupar por SKU
      for (const venta of ventasHistoricas) {
        if (!historicoVentasMap.has(venta.sku_codigo)) {
          historicoVentasMap.set(venta.sku_codigo, {});
        }
        historicoVentasMap.get(venta.sku_codigo)![venta.mes_año] = venta.cantidad || 0;
      }

      console.log(`[Export JSON] ✅ Histórico cargado para ${historicoVentasMap.size} SKUs`);
    }

    // ===== AGREGAR HISTÓRICO A CADA SKU =====
    const datosConHistorico = datos.map((sku: any) => {
      const historico = historicoVentasMap.get(sku.codigo_sku) || {};
      
      // Rellenar meses faltantes con 0 (desde 2020 hasta hoy)
      const hoy = new Date();
      const añoActual = hoy.getFullYear();
      const mesActual = hoy.getMonth() + 1;
      const AÑO_BASE = 2020;
      
      for (let año = AÑO_BASE; año <= añoActual; año++) {
        const mesFin = año === añoActual ? mesActual : 12;
        for (let mes = 1; mes <= mesFin; mes++) {
          const key = `${año}-${mes.toString().padStart(2, '0')}`;
          if (historico[key] === undefined) {
            historico[key] = 0;
          }
        }
      }

      return {
        ...sku,
        historico_ventas: historico
      };
    });

    // ===== CALCULAR ESTADÍSTICAS RESUMEN =====
     const resumen = {
      total_skus: datosConHistorico.length,
      skus_con_pedido_courier: datosConHistorico.filter((d: any) => d.mensaje_courier === 'PEDIR COURIER').length,
      skus_con_pedido_aereo: datosConHistorico.filter((d: any) => d.mensaje_aereo === 'PEDIR AEREO').length,
      skus_con_pedido_maritimo: datosConHistorico.filter((d: any) => d.mensaje_maritimo === 'PEDIR MARITIMO').length,
      skus_con_sugerido_analista: datosConHistorico.filter((d: any) =>
        (d.sugerido_analista_urgente || 0) > 0 || 
        (d.sugerido_analista_aereo || 0) > 0 ||
        (d.sugerido_analista_maritimo || 0) > 0
      ).length,
      total_inversion_sugerida: datosConHistorico.reduce((acc: number, d: any) => {
        const costo = d.costo_prom_dol || d.costo_ult_dol || 0;
        const cantidad = (d.sugerido_analista_urgente || 0) + 
                        (d.sugerido_analista_aereo || 0) + 
                        (d.sugerido_analista_maritimo || 0);
        return acc + (costo * cantidad);
      }, 0),
      por_clasificacion_abc: {
        A: datosConHistorico.filter((d: any) => d.abc === 'A').length,
        B: datosConHistorico.filter((d: any) => d.abc === 'B').length,
        C: datosConHistorico.filter((d: any) => d.abc === 'C').length,
        D: datosConHistorico.filter((d: any) => d.abc === 'D').length,
        E: datosConHistorico.filter((d: any) => d.abc === 'E').length,
        'N/D': datosConHistorico.filter((d: any) => d.abc === 'N/D' || !d.abc).length
      },
      por_rotacion: {
        A: datosConHistorico.filter((d: any) => d.abc_rotacion_frecuencia === 'A').length,
        B: datosConHistorico.filter((d: any) => d.abc_rotacion_frecuencia === 'B').length,
        C: datosConHistorico.filter((d: any) => d.abc_rotacion_frecuencia === 'C').length,
        D: datosConHistorico.filter((d: any) => d.abc_rotacion_frecuencia === 'D').length,
        E: datosConHistorico.filter((d: any) => d.abc_rotacion_frecuencia === 'E').length
      }
    };

    // ===== LOG DE AUDITORÍA =====
    AuditService.log(
      user.id,
      'FORECAST_EXPORT_JSON',
      ip,
      userAgent,
      `Exportación JSON del procesamiento ${codigoProcesamiento}. Total SKUs: ${datosConHistorico.length}`
    );

    // ===== CONSTRUIR RESPUESTA =====
    const response = {
      success: true,
      exportado_en: new Date().toISOString(),
      exportado_por: user.email,
      procesamiento: {
        codigo: metadata.codigo,
        fecha: metadata.fecha,
        usuario: metadata.usuario
      },
      resumen,
      datos: datosConHistorico
    };

    // ===== MODO DESCARGA (archivo .json) =====
    if (formato === 'download') {
      const jsonString = JSON.stringify(response, null, 2);
      const fechaArchivo = new Date().toISOString().split('T')[0].replace(/-/g, '');
      
      return new Response(jsonString, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="procesamiento_${codigoProcesamiento}_${fechaArchivo}.json"`,
          'Content-Length': Buffer.byteLength(jsonString, 'utf8').toString()
        }
      });
    }

    // ===== MODO JSON (para PowerBI) =====
    return json(response);

  } catch (error) {
    console.error('Error exportando procesamiento:', error);
    
    AuditService.log(
      user.id,
      'FORECAST_EXPORT_ERROR',
      ip,
      userAgent,
      `Error en exportación JSON: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );

    return json({ 
      error: 'Error al exportar procesamiento',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
};