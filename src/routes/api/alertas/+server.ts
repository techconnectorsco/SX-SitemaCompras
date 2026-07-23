/**
 * Obtener alertas detalladas del sistema
 * GET /api/alertas
 * * ✅ CORREGIDO: 
 * 1. Sin límites artificiales (LIMIT) para mostrar TODO lo que detecte el dashboard.
 * 2. Usa codigo_procesamiento para sincronizar exacto con los stats.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';

interface Alerta {
  alerta_id: string;
  id: number;
  tipo: 'critico' | 'advertencia' | 'info';
  categoria: 'sin_stock' | 'stock_bajo' | 'pedir_courier' | 'pedir_aereo' | 'demanda' | 'sobrestock' | 'sin_rotacion';
  codigo_sku: string;
  descripcion: string;
  linea: string;
  marca: string;
  abc: string;
  rotacion: string;
  existencia: number;
  transito: number;
  stock_seguridad: number;
  promedio_ajustado: number;
  coeficiente_variacion: number;
  frecuencia_ventas_12m: number;
  ref_courier: number;
  ref_aereo: number;
  cantidad_pedir_courier: number;
  cantidad_pedir_aereo: number;
  mensaje: string;
  detalle: string;
  accion_sugerida: string;
}

interface ResumenAlertas {
  critico: number;
  advertencia: number;
  info: number;
  total: number;
  pedirCourier: number;
  pedirAereo: number;
}

export const GET: RequestHandler = async ({ url, locals, setHeaders }) => {
  // 1. Evitar caché agresivamente
  setHeaders({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  const user = locals.user || locals.session?.user;
  
  if (!user) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const tipoFiltro = url.searchParams.get('tipo') || '';
    const categoriaFiltro = url.searchParams.get('categoria') || '';
    const abcFiltro = url.searchParams.get('abc') || '';
    const searchFiltro = url.searchParams.get('search') || '';

    // ==============================================================================
    // 🔍 PASO 1: ENCONTRAR EL ÚLTIMO CÓDIGO DE PROCESAMIENTO
    // (Igual que en el dashboard para que los datos coincidan)
    // ==============================================================================
    const lastProc = db.prepare(`
      SELECT codigo_procesamiento, fecha_procesamiento, usuario_procesamiento 
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento IS NOT NULL AND codigo_procesamiento != ''
      ORDER BY fecha_procesamiento DESC 
      LIMIT 1
    `).get() as { codigo_procesamiento: string; fecha_procesamiento: string; usuario_procesamiento: string } | undefined;

    // Si no hay ningún registro
    if (!lastProc) {
      return json({
        alertas: [],
        resumen: { critico: 0, advertencia: 0, info: 0, total: 0, pedirCourier: 0, pedirAereo: 0 },
        metadata: null
      });
    }

    const codigoCorte = lastProc.codigo_procesamiento;
    const qParams = { codigo: codigoCorte };

    const alertas: Alerta[] = [];
    let alertaIndex = 0;

    // Helper para crear alerta
    const crearAlerta = (
      row: any, 
      tipo: 'critico' | 'advertencia' | 'info',
      categoria: Alerta['categoria'],
      mensaje: string,
      detalle: string,
      accion: string
    ): Alerta => {
      alertaIndex++;
      return {
        alerta_id: `${tipo}-${categoria}-${alertaIndex}`,
        id: row.id,
        tipo,
        categoria,
        codigo_sku: row.codigo_sku,
        descripcion: row.descripcion || 'Sin descripción',
        linea: row.linea || '',
        marca: row.marca || '',
        abc: row.abc || 'N/D',
        rotacion: row.abc_rotacion_frecuencia || '',
        existencia: row.existencia || 0,
        transito: row.transito || 0,
        stock_seguridad: row.stock_seguridad || 0,
        promedio_ajustado: row.promedio_ajustado || 0,
        coeficiente_variacion: row.coeficiente_variacion || 0,
        frecuencia_ventas_12m: row.frecuencia_ventas_12m || 0,
        ref_courier: row.referencia_pedido_courier || 0,
        ref_aereo: row.referencia_pedido_aereo || 0,
        cantidad_pedir_courier: Math.abs(row.cantidad_final_courier || 0),
        cantidad_pedir_aereo: Math.abs(row.cantidad_final_aereo || 0),
        mensaje,
        detalle,
        accion_sugerida: accion
      };
    };

    // ========================================
    // NOTA IMPORTANTE:
    // Se han eliminado los "LIMIT" para que coincida con el Dashboard.
    // Esto traerá TODOS los registros que cumplan la condición.
    // ========================================

    // ========================================
    // 🔴 CRÍTICAS: SIN STOCK - CATEGORÍA A (Frecuentes)
    // ========================================
    const sinStockACritico = db.prepare(`
      SELECT * FROM forecast_procesamiento 
      WHERE codigo_procesamiento = @codigo
        AND existencia = 0 
        AND abc = 'A' 
        AND frecuencia_ventas_12m >= 3
        AND activo = 1
      ORDER BY venta_ultimos_12m DESC
    `).all(qParams) as any[];

    sinStockACritico.forEach(row => {
      const diasSinStock = row.promedio_ajustado > 0 
        ? Math.round((row.transito / row.promedio_ajustado) * 30) 
        : 0;
      
      alertas.push(crearAlerta(
        row, 'critico', 'sin_stock',
        'SIN STOCK - ABC A',
        `Producto categoría A de alta rotación sin existencias. Promedio mensual: ${row.promedio_ajustado?.toFixed(1)} uds. ` +
        `Frecuencia ventas: ${row.frecuencia_ventas_12m}/12 meses. ` +
        (row.transito > 0 ? `En tránsito: ${row.transito} uds (≈${diasSinStock} días).` : 'Sin unidades en tránsito.'),
        row.transito > 0 ? 'Verificar llegada de tránsito' : 'Solicitar pedido URGENTE vía Courier'
      ));
    });

    // ========================================
    // 🔴 CRÍTICAS: SIN STOCK - CATEGORÍA B (Frecuentes)
    // ========================================
    const sinStockBCritico = db.prepare(`
      SELECT * FROM forecast_procesamiento 
      WHERE codigo_procesamiento = @codigo
        AND existencia = 0 
        AND abc = 'B' 
        AND frecuencia_ventas_12m >= 3
        AND activo = 1
      ORDER BY venta_ultimos_12m DESC
    `).all(qParams) as any[];

    sinStockBCritico.forEach(row => {
      alertas.push(crearAlerta(
        row, 'critico', 'sin_stock',
        'SIN STOCK - ABC B',
        `Producto categoría B con rotación frecuente sin existencias. Promedio mensual: ${row.promedio_ajustado?.toFixed(1)} uds. ` +
        `Frecuencia: ${row.frecuencia_ventas_12m}/12 meses. ` +
        (row.transito > 0 ? `En tránsito: ${row.transito} uds.` : 'Sin unidades en tránsito.'),
        'Evaluar pedido urgente Courier o Aéreo'
      ));
    });

    // ========================================
    // 🟡 ADVERTENCIA: SIN STOCK - ABC A/B (Baja Rotación)
    // ========================================
    const sinStockBajaRotacion = db.prepare(`
      SELECT * FROM forecast_procesamiento 
      WHERE codigo_procesamiento = @codigo
        AND existencia = 0 
        AND abc IN ('A', 'B')
        AND frecuencia_ventas_12m < 3
        AND frecuencia_ventas_12m > 0
        AND activo = 1
      ORDER BY abc, venta_ultimos_12m DESC
    `).all(qParams) as any[];

    sinStockBajaRotacion.forEach(row => {
      alertas.push(crearAlerta(
        row, 'advertencia', 'sin_stock',
        `SIN STOCK - ABC ${row.abc} (Baja rotación)`,
        `Producto categoría ${row.abc} pero con baja frecuencia de ventas (${row.frecuencia_ventas_12m}/12 meses). ` +
        `Promedio: ${row.promedio_ajustado?.toFixed(1)} uds/mes.`,
        'Evaluar si realmente requiere reposición'
      ));
    });

    // ========================================
    // 🔴 CRÍTICAS: STOCK MUY BAJO (< 50% del mínimo)
    // ========================================
    const stockMuyBajo = db.prepare(`
      SELECT * FROM forecast_procesamiento 
      WHERE codigo_procesamiento = @codigo
        AND existencia > 0 
        AND stock_seguridad > 0
        AND existencia < (stock_seguridad * 0.5)
        AND abc IN ('A', 'B')
        AND frecuencia_ventas_12m >= 3
        AND activo = 1
      ORDER BY abc, (stock_seguridad - existencia) DESC
    `).all(qParams) as any[];

    stockMuyBajo.forEach(row => {
      const porcentaje = ((row.existencia / row.stock_seguridad) * 100).toFixed(0);
      const diasCobertura = row.promedio_ajustado > 0 
        ? Math.round((row.existencia / row.promedio_ajustado) * 30) 
        : 0;
      
      alertas.push(crearAlerta(
        row, 'critico', 'stock_bajo',
        'STOCK CRÍTICO',
        `Solo ${row.existencia} uds (${porcentaje}% del mínimo de ${row.stock_seguridad}). ` +
        `Cobertura estimada: ${diasCobertura} días. ` +
        (row.transito > 0 ? `Tránsito: ${row.transito} uds.` : ''),
        'Priorizar en próximo pedido Courier'
      ));
    });

    // ========================================
    // 🟡 ADVERTENCIA: PEDIR COURIER
    // ========================================
    const pedirCourier = db.prepare(`
      SELECT * FROM forecast_procesamiento 
      WHERE codigo_procesamiento = @codigo
        AND mensaje_courier = 'PEDIR COURIER' 
        AND activo = 1
        AND existencia > 0
        AND frecuencia_ventas_12m >= 2
      ORDER BY abc, ABS(cantidad_final_courier) DESC
    `).all(qParams) as any[];

    pedirCourier.forEach(row => {
      const disponible = row.existencia + row.transito;
      const deficit = Math.abs(row.cantidad_final_courier || 0);
      
      alertas.push(crearAlerta(
        row, 'advertencia', 'pedir_courier',
        'PEDIR COURIER',
        `Disponible: ${disponible} uds (Exist: ${row.existencia} + Tráns: ${row.transito}). ` +
        `Referencia 2 meses: ${row.referencia_pedido_courier} uds. ` +
        `Déficit: ${deficit.toFixed(0)} unidades.`,
        `Agregar ${deficit.toFixed(0)} uds al pedido Courier`
      ));
    });

    // ========================================
    // 🟡 ADVERTENCIA: PEDIR AÉREO
    // ========================================
    const pedirAereo = db.prepare(`
      SELECT * FROM forecast_procesamiento 
      WHERE codigo_procesamiento = @codigo
        AND mensaje_aereo = 'PEDIR AEREO' 
        AND mensaje_courier = ''
        AND activo = 1
        AND frecuencia_ventas_12m >= 2
      ORDER BY abc, ABS(cantidad_final_aereo) DESC
    `).all(qParams) as any[];

    pedirAereo.forEach(row => {
      const deficit = Math.abs(row.cantidad_final_aereo || 0);
      
      alertas.push(crearAlerta(
        row, 'advertencia', 'pedir_aereo',
        'PEDIR AÉREO',
        `Referencia aérea (3 meses + seguridad): ${row.referencia_pedido_aereo} uds. ` +
        `Stock seguridad: ${row.stock_seguridad} uds. ` +
        `Déficit: ${deficit.toFixed(0)} unidades.`,
        `Agregar ${deficit.toFixed(0)} uds al pedido Aéreo`
      ));
    });

    // ========================================
    // 🟡 ADVERTENCIA: STOCK BAJO (50-100% del mínimo)
    // ========================================
    const stockBajo = db.prepare(`
      SELECT * FROM forecast_procesamiento 
      WHERE codigo_procesamiento = @codigo
        AND existencia > 0 
        AND stock_seguridad > 0
        AND existencia >= (stock_seguridad * 0.5)
        AND existencia < stock_seguridad
        AND abc IN ('A', 'B', 'C')
        AND frecuencia_ventas_12m >= 2
        AND activo = 1
      ORDER BY abc, (stock_seguridad - existencia) DESC
    `).all(qParams) as any[];

    stockBajo.forEach(row => {
      const porcentaje = ((row.existencia / row.stock_seguridad) * 100).toFixed(0);
      
      alertas.push(crearAlerta(
        row, 'advertencia', 'stock_bajo',
        'STOCK BAJO',
        `${row.existencia} uds disponibles (${porcentaje}% del mínimo de ${row.stock_seguridad}). ` +
        `Categoría ${row.abc} - Factor de seguridad aplicado.`,
        'Incluir en próximo pedido regular'
      ));
    });

    // ========================================
    // 🟡 ADVERTENCIA: DEMANDA MUY IRREGULAR
    // ========================================
    const demandaIrregular = db.prepare(`
      SELECT * FROM forecast_procesamiento 
      WHERE codigo_procesamiento = @codigo
        AND coeficiente_variacion > 1.2 
        AND abc IN ('A', 'B')
        AND frecuencia_ventas_12m >= 3
        AND activo = 1
      ORDER BY coeficiente_variacion DESC
    `).all(qParams) as any[];

    demandaIrregular.forEach(row => {
      alertas.push(crearAlerta(
        row, 'advertencia', 'demanda',
        'DEMANDA IRREGULAR',
        `Coeficiente de variación: ${row.coeficiente_variacion?.toFixed(2)} (muy alto). ` +
        `Desviación estándar: ${row.desviacion_estandar?.toFixed(1)} uds. ` +
        `Promedio: ${row.promedio_ajustado?.toFixed(1)} uds/mes.`,
        'Revisar histórico y considerar ajuste manual'
      ));
    });

    // ========================================
    // 🔵 INFO: SOBRE-STOCK
    // ========================================
    const sobreStock = db.prepare(`
      SELECT * FROM forecast_procesamiento 
      WHERE codigo_procesamiento = @codigo
        AND promedio_ajustado > 0
        AND existencia > (promedio_ajustado * 12)
        AND activo = 1
      ORDER BY (existencia / promedio_ajustado) DESC
    `).all(qParams) as any[];

    sobreStock.forEach(row => {
      const mesesStock = (row.existencia / row.promedio_ajustado).toFixed(0);
      
      alertas.push(crearAlerta(
        row, 'info', 'sobrestock',
        'SOBRE-STOCK',
        `Inventario para ${mesesStock} meses (${row.existencia} uds). ` +
        `Promedio mensual: ${row.promedio_ajustado?.toFixed(1)} uds.`,
        'Evaluar promociones o redistribución'
      ));
    });

    // ========================================
    // 🔵 INFO: SIN ROTACIÓN
    // ========================================
    const sinRotacion = db.prepare(`
      SELECT * FROM forecast_procesamiento 
      WHERE codigo_procesamiento = @codigo
        AND frecuencia_ventas_12m = 0
        AND existencia > 0
        AND activo = 1
      ORDER BY existencia DESC
    `).all(qParams) as any[];

    sinRotacion.forEach(row => {
      alertas.push(crearAlerta(
        row, 'info', 'sin_rotacion',
        'SIN ROTACIÓN 12 MESES',
        `${row.existencia} unidades sin movimiento en los últimos 12 meses. ` +
        `ABC: ${row.abc}.`,
        'Evaluar obsolescencia, liquidación o baja'
      ));
    });

    // ========================================
    // RESUMEN Y FILTRADO FINAL
    // ========================================
    const resumen: ResumenAlertas = {
      critico: alertas.filter(a => a.tipo === 'critico').length,
      advertencia: alertas.filter(a => a.tipo === 'advertencia').length,
      info: alertas.filter(a => a.tipo === 'info').length,
      total: alertas.length,
      pedirCourier: alertas.filter(a => a.categoria === 'pedir_courier').length,
      pedirAereo: alertas.filter(a => a.categoria === 'pedir_aereo').length
    };

    let alertasFiltradas = [...alertas];

    if (tipoFiltro) {
      alertasFiltradas = alertasFiltradas.filter(a => a.tipo === tipoFiltro);
    }
    if (categoriaFiltro) {
      alertasFiltradas = alertasFiltradas.filter(a => a.categoria === categoriaFiltro);
    }
    if (abcFiltro) {
      alertasFiltradas = alertasFiltradas.filter(a => a.abc === abcFiltro);
    }
    if (searchFiltro) {
      const term = searchFiltro.toLowerCase();
      alertasFiltradas = alertasFiltradas.filter(a => 
        a.codigo_sku.toLowerCase().includes(term) ||
        a.descripcion.toLowerCase().includes(term)
      );
    }

    return json({
      alertas: alertasFiltradas,
      totalFiltrado: alertasFiltradas.length,
      resumen,
      metadata: {
        fecha: lastProc.fecha_procesamiento,
        usuario: lastProc.usuario_procesamiento
      }
    });

  } catch (error) {
    console.error('Error obteniendo alertas:', error);
    return json({ error: 'Error interno del servidor' }, { status: 500 });
  }
};