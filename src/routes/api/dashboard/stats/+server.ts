/**
 * Obtener estadísticas del dashboard
 * GET /api/dashboard/stats
 * 
 * ✅ CORREGIDO: Filtra por el procesamiento más reciente (codigo_procesamiento)
 * ✅ NUEVO: Filtros dinámicos para análisis exploratorio
 * 
 * Query params opcionales:
 * - procesamiento: código específico (ej: PROC-20250109-143052). Default: el más reciente
 * - categoria: filtra por categoría (ej: REPUESTOS, ACCESORIOS)
 * - solo_pedido: 'true' → solo SKUs con mensaje de pedido (courier/aéreo/marítimo)
 * - solo_8020: 'true' → solo SKUs con promedio_6m > 0 (proyección de venta)
 * 
 * Todos los filtros se aplican a: KPIs, distribución ABC, rotación, top líneas/marcas,
 * alertas y resumen de pedidos. Lo que ves en el dashboard es lo que ves bajo esos filtros.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';

interface DashboardStats {
  ultimoProcesamiento: {
    codigo: string | null;
    fecha: string | null;
    usuario: string;
  };
  procesamientosDisponibles: Array<{
    codigo: string;
    fecha: string;
    usuario: string;
    totalSKUs: number;
  }>;
  // Filtros activos (para que el frontend pueda mostrarlos)
  filtrosActivos: {
    categoria: string;
    soloPedido: boolean;
    solo8020: boolean;
  };
  // Lista de categorías disponibles para el selector
  categoriasDisponibles: string[];

  totalSKUs: number;
  skusActivos: number;
  skusInactivos: number;
  
  stockCritico: number;
  stockBajo: number;
  sinStock: number;
  
  requierenPedidoCourier: number;
  requierenPedidoAereo: number;
  totalRequierenPedido: number;
  skusConPedido: number;
  
  conSugeridoUrgente: number;
  conSugeridoAereo: number;
  totalConSugerido: number;
  
  distribucionABC: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    'N/D': number;
  };
  
  distribucionRotacion: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
  };
  
  topLineas: Array<{ linea: string; cantidad: number; }>;
  topMarcas: Array<{ marca: string; cantidad: number; }>;
}

interface Alerta {
  id: number;
  tipo: 'critico' | 'advertencia' | 'info';
  sku: string;
  descripcion: string;
  mensaje: string;
  abc: string;
  existencia: number;
  stockSeguridad: number;
}

export const GET: RequestHandler = async ({ url, locals }) => {
  const user = locals.user || locals.session?.user;
  
  if (!user) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    // Verificar si hay datos de procesamiento
    const hayDatos = db.prepare(`SELECT COUNT(*) as total FROM forecast_procesamiento`).get() as { total: number };
    
    if (hayDatos.total === 0) {
      return json({
        sinDatos: true,
        mensaje: 'No hay datos de procesamiento. Ejecute un procesamiento primero.'
      });
    }

    // ===== OBTENER LISTA DE PROCESAMIENTOS DISPONIBLES =====
    const procesamientosDisponibles = db.prepare(`
      SELECT 
        codigo_procesamiento as codigo,
        fecha_procesamiento as fecha,
        usuario_procesamiento as usuario,
        COUNT(*) as totalSKUs
      FROM forecast_procesamiento
      WHERE codigo_procesamiento IS NOT NULL AND codigo_procesamiento != ''
      GROUP BY codigo_procesamiento
      ORDER BY fecha_procesamiento DESC
      LIMIT 20
    `).all() as Array<{ codigo: string; fecha: string; usuario: string; totalSKUs: number }>;

    // ===== DETERMINAR QUÉ PROCESAMIENTO USAR =====
    let codigoProcesamiento = url.searchParams.get('procesamiento') || '';
    
    if (!codigoProcesamiento && procesamientosDisponibles.length > 0) {
      codigoProcesamiento = procesamientosDisponibles[0].codigo;
    }

    if (!codigoProcesamiento) {
      const ultimoSinCodigo = db.prepare(`
        SELECT fecha_procesamiento, usuario_procesamiento
        FROM forecast_procesamiento
        ORDER BY fecha_procesamiento DESC
        LIMIT 1
      `).get() as { fecha_procesamiento: string; usuario_procesamiento: string } | undefined;

      return json({
        sinDatos: true,
        mensaje: 'Los datos existentes no tienen código de procesamiento. Ejecute un nuevo procesamiento.',
        datosAntiguos: ultimoSinCodigo ? {
          fecha: ultimoSinCodigo.fecha_procesamiento,
          usuario: ultimoSinCodigo.usuario_procesamiento
        } : null
      });
    }

    // ===== LEER FILTROS DEL QUERY =====
    const categoria = url.searchParams.get('categoria') || '';
    const soloPedido = url.searchParams.get('solo_pedido') === 'true';
    const solo8020 = url.searchParams.get('solo_8020') === 'true';

    // ===== CONSTRUIR FILTRO COMÚN (se aplica a TODOS los queries) =====
    // Cada query parte de este WHERE base y agrega lo suyo encima.
    const conditions: string[] = ['codigo_procesamiento = ?'];
    const params: any[] = [codigoProcesamiento];

    if (categoria) {
      conditions.push(`categoria = ?`);
      params.push(categoria);
    }

    if (soloPedido) {
      conditions.push(`(mensaje_courier != '' OR mensaje_aereo != '' OR mensaje_maritimo != '')`);
    }

    if (solo8020) {
      conditions.push(`promedio_6m > 0`);
    }

    // SQL fragment ya armado: "codigo_procesamiento = ? AND ..."
    const whereBase = conditions.join(' AND ');

    // ===== METADATA DEL PROCESAMIENTO =====
    const metadata = db.prepare(`
      SELECT 
        codigo_procesamiento,
        fecha_procesamiento, 
        usuario_procesamiento 
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento = ?
      LIMIT 1
    `).get(codigoProcesamiento) as { 
      codigo_procesamiento: string;
      fecha_procesamiento: string; 
      usuario_procesamiento: string 
    } | undefined;

    // ===== LISTA DE CATEGORÍAS DISPONIBLES (para el selector del dashboard) =====
    // Sin aplicar filtros para que el dropdown muestre TODAS las categorías del procesamiento.
    const categoriasDisponibles = db.prepare(`
      SELECT DISTINCT categoria 
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento = ? AND categoria IS NOT NULL AND categoria != ''
      ORDER BY categoria
    `).all(codigoProcesamiento) as Array<{ categoria: string }>;

    // ===== KPIs PRINCIPALES (con filtros aplicados) =====
    const kpis = db.prepare(`
      SELECT 
        COUNT(*) as totalSKUs,
        SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as skusActivos,
        SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as skusInactivos,
        
        -- Stock crítico: sin stock y rotación frecuente (A o B)
        SUM(CASE WHEN existencia = 0 AND abc_rotacion_frecuencia IN ('A', 'B') THEN 1 ELSE 0 END) as stockCritico,
        
        -- Stock bajo: por debajo del stock de seguridad
        SUM(CASE WHEN existencia < stock_seguridad AND existencia > 0 THEN 1 ELSE 0 END) as stockBajo,
        
        -- Sin stock total
        SUM(CASE WHEN existencia = 0 THEN 1 ELSE 0 END) as sinStock,
        
        -- Requieren pedido
        SUM(CASE WHEN cantidad_final_courier < 0 THEN ABS(cantidad_final_courier) ELSE 0 END) as requierenPedidoCourier,
        SUM(CASE WHEN cantidad_final_aereo < 0 THEN ABS(cantidad_final_aereo) ELSE 0 END) as requierenPedidoAereo,
        
        -- Sugeridos del analista
        SUM(CASE WHEN sugerido_analista_urgente > 0 THEN 1 ELSE 0 END) as conSugeridoUrgente,
        SUM(CASE WHEN sugerido_analista_aereo > 0 THEN 1 ELSE 0 END) as conSugeridoAereo,
        SUM(CASE WHEN sugerido_analista_urgente > 0 OR sugerido_analista_aereo > 0 THEN 1 ELSE 0 END) as totalConSugerido,
        
        -- SKUs con pedido sugerido por el sistema
        SUM(CASE WHEN mensaje_courier != '' OR mensaje_aereo != '' OR mensaje_maritimo != '' THEN 1 ELSE 0 END) as skusConPedido
        
      FROM forecast_procesamiento
      WHERE ${whereBase}
    `).get(...params) as any;

    // ===== DISTRIBUCIÓN ABC =====
    const abcRows = db.prepare(`
      SELECT 
        COALESCE(abc, 'N/D') as abc, 
        COUNT(*) as cantidad 
      FROM forecast_procesamiento 
      WHERE ${whereBase}
      GROUP BY abc
    `).all(...params) as Array<{ abc: string; cantidad: number }>;

    const distribucionABC = {
      A: 0, B: 0, C: 0, D: 0, E: 0, 'N/D': 0
    };
    abcRows.forEach(row => {
      if (row.abc in distribucionABC) {
        distribucionABC[row.abc as keyof typeof distribucionABC] = row.cantidad;
      }
    });

    // ===== DISTRIBUCIÓN POR ROTACIÓN =====
    const rotacionRows = db.prepare(`
      SELECT 
        COALESCE(abc_rotacion_frecuencia, 'E') as rotacion, 
        COUNT(*) as cantidad 
      FROM forecast_procesamiento 
      WHERE ${whereBase}
      GROUP BY abc_rotacion_frecuencia
    `).all(...params) as Array<{ rotacion: string; cantidad: number }>;

    const distribucionRotacion = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    rotacionRows.forEach(row => {
      if (row.rotacion in distribucionRotacion) {
        distribucionRotacion[row.rotacion as keyof typeof distribucionRotacion] = row.cantidad;
      }
    });

    // ===== TOP LÍNEAS CON PEDIDO =====
    const topLineas = db.prepare(`
      SELECT linea, COUNT(*) as cantidad 
      FROM forecast_procesamiento 
      WHERE ${whereBase}
        AND linea != '' AND linea IS NOT NULL
        AND (mensaje_courier != '' OR mensaje_aereo != '' OR mensaje_maritimo != '')
      GROUP BY linea 
      ORDER BY cantidad DESC 
      LIMIT 5
    `).all(...params) as Array<{ linea: string; cantidad: number }>;

    // ===== TOP MARCAS CON PEDIDO =====
    const topMarcas = db.prepare(`
      SELECT marca, COUNT(*) as cantidad 
      FROM forecast_procesamiento 
      WHERE ${whereBase}
        AND marca != '' AND marca IS NOT NULL
        AND (mensaje_courier != '' OR mensaje_aereo != '' OR mensaje_maritimo != '')
      GROUP BY marca 
      ORDER BY cantidad DESC 
      LIMIT 5
    `).all(...params) as Array<{ marca: string; cantidad: number }>;

    // ===== ALERTAS =====
    const alertas: Alerta[] = [];

    // Alertas CRÍTICAS: Sin stock y rotación A (frecuente)
    const criticosA = db.prepare(`
      SELECT id, codigo_sku, descripcion, abc_rotacion_frecuencia, existencia, stock_seguridad
      FROM forecast_procesamiento 
      WHERE ${whereBase}
        AND existencia = 0 AND abc_rotacion_frecuencia = 'A' AND activo = 1
      ORDER BY venta_ultimos_12m DESC
      LIMIT 8
    `).all(...params) as any[];

    criticosA.forEach(row => {
      alertas.push({
        id: row.id,
        tipo: 'critico',
        sku: row.codigo_sku,
        descripcion: row.descripcion || 'Sin descripción',
        mensaje: 'Sin stock - Rotación frecuente (A)',
        abc: row.abc_rotacion_frecuencia,
        existencia: row.existencia,
        stockSeguridad: row.stock_seguridad
      });
    });

    // Alertas CRÍTICAS: Sin stock y rotación B (intermedio)
    const criticosB = db.prepare(`
      SELECT id, codigo_sku, descripcion, abc_rotacion_frecuencia, existencia, stock_seguridad
      FROM forecast_procesamiento 
      WHERE ${whereBase}
        AND existencia = 0 AND abc_rotacion_frecuencia = 'B' AND activo = 1
      ORDER BY venta_ultimos_12m DESC
      LIMIT 4
    `).all(...params) as any[];

    criticosB.forEach(row => {
      alertas.push({
        id: row.id,
        tipo: 'critico',
        sku: row.codigo_sku,
        descripcion: row.descripcion || 'Sin descripción',
        mensaje: 'Sin stock - Rotación intermedia (B)',
        abc: row.abc_rotacion_frecuencia,
        existencia: row.existencia,
        stockSeguridad: row.stock_seguridad
      });
    });

    // Alertas ADVERTENCIA: Stock bajo (rotación A o B)
    const stockBajoRows = db.prepare(`
      SELECT id, codigo_sku, descripcion, abc_rotacion_frecuencia, existencia, stock_seguridad
      FROM forecast_procesamiento 
      WHERE ${whereBase}
        AND existencia > 0 
        AND existencia < stock_seguridad 
        AND abc_rotacion_frecuencia IN ('A', 'B')
        AND activo = 1
      ORDER BY (stock_seguridad - existencia) DESC
      LIMIT 8
    `).all(...params) as any[];

    stockBajoRows.forEach(row => {
      alertas.push({
        id: row.id,
        tipo: 'advertencia',
        sku: row.codigo_sku,
        descripcion: row.descripcion || 'Sin descripción',
        mensaje: `Stock bajo: ${row.existencia} uds (mín: ${row.stock_seguridad})`,
        abc: row.abc_rotacion_frecuencia,
        existencia: row.existencia,
        stockSeguridad: row.stock_seguridad
      });
    });

    // Alertas INFO: Requieren pedido urgente (Courier)
    const pedidosCourier = db.prepare(`
      SELECT id, codigo_sku, descripcion, abc_rotacion_frecuencia, existencia, stock_seguridad, cantidad_final_courier
      FROM forecast_procesamiento 
      WHERE ${whereBase}
        AND mensaje_courier = 'PEDIR COURIER' 
        AND activo = 1
      ORDER BY cantidad_final_courier ASC
      LIMIT 5
    `).all(...params) as any[];

    pedidosCourier.forEach(row => {
      alertas.push({
        id: row.id,
        tipo: 'info',
        sku: row.codigo_sku,
        descripcion: row.descripcion || 'Sin descripción',
        mensaje: `Pedir Courier: ${Math.abs(row.cantidad_final_courier).toFixed(0)} uds`,
        abc: row.abc_rotacion_frecuencia,
        existencia: row.existencia,
        stockSeguridad: row.stock_seguridad
      });
    });

    // ===== RESUMEN DE CANTIDADES A PEDIR =====
    const resumenPedidos = db.prepare(`
      SELECT 
        SUM(CASE WHEN cantidad_final_courier < 0 THEN ABS(cantidad_final_courier) ELSE 0 END) as totalCourier,
        SUM(CASE WHEN cantidad_final_aereo < 0 THEN ABS(cantidad_final_aereo) ELSE 0 END) as totalAereo,
        SUM(CASE WHEN sugerido_analista_urgente > 0 THEN sugerido_analista_urgente ELSE 0 END) as totalSugeridoUrgente,
        SUM(CASE WHEN sugerido_analista_aereo > 0 THEN sugerido_analista_aereo ELSE 0 END) as totalSugeridoAereo
      FROM forecast_procesamiento
      WHERE ${whereBase}
    `).get(...params) as any;

    // ===== CONSTRUIR RESPUESTA =====
    const stats: DashboardStats = {
      ultimoProcesamiento: {
        codigo: metadata?.codigo_procesamiento || null,
        fecha: metadata?.fecha_procesamiento || null,
        usuario: metadata?.usuario_procesamiento || 'Sistema'
      },
      procesamientosDisponibles,
      // ✅ NUEVO: filtros activos y categorías disponibles
      filtrosActivos: {
        categoria,
        soloPedido,
        solo8020
      },
      categoriasDisponibles: categoriasDisponibles.map(r => r.categoria),

      totalSKUs: kpis.totalSKUs || 0,
      skusActivos: kpis.skusActivos || 0,
      skusInactivos: kpis.skusInactivos || 0,
      stockCritico: kpis.stockCritico || 0,
      stockBajo: kpis.stockBajo || 0,
      sinStock: kpis.sinStock || 0,
      requierenPedidoCourier: kpis.requierenPedidoCourier || 0,
      requierenPedidoAereo: kpis.requierenPedidoAereo || 0,
      totalRequierenPedido: kpis.totalRequierenPedido || 0,
      skusConPedido: kpis.skusConPedido || 0,
      conSugeridoUrgente: kpis.conSugeridoUrgente || 0,
      conSugeridoAereo: kpis.conSugeridoAereo || 0,
      totalConSugerido: kpis.totalConSugerido || 0,
      distribucionABC,
      distribucionRotacion,
      topLineas,
      topMarcas
    };

    return json({
      stats,
      alertas: alertas,
      resumenPedidos: {
        cantidadCourier: resumenPedidos.totalCourier || 0,
        cantidadAereo: resumenPedidos.totalAereo || 0,
        sugeridoUrgente: resumenPedidos.totalSugeridoUrgente || 0,
        sugeridoAereo: resumenPedidos.totalSugeridoAereo || 0
      }
    });

  } catch (error) {
    console.error('Error obteniendo stats del dashboard:', error);
    return json({ error: 'Error interno del servidor' }, { status: 500 });
  }
};