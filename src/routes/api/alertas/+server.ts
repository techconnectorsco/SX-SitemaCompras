/**
 * Obtener alertas detalladas del sistema
 * GET /api/alertas
 * ✅ OPTIMIZADO: 1 sola consulta SQL. Filtrado y ordenamiento en memoria (RAM).
 * ✅ NUEVO: Retorna los campos de sugerido y el código de procesamiento para edición rápida.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { env } from '$env/dynamic/private';
const CRON_SECRET = env.CRON_SECRET || '';

interface Alerta {
  alerta_id: string;
  id: number;
  tipo: 'critico' | 'advertencia' | 'info';
  categoria: string;
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
  // Campos editables
  sugerido_analista_urgente: number;
  sugerido_analista_aereo: number;
  sugerido_analista_maritimo: number;
  comentario_analista: string;
}

export const GET: RequestHandler = async ({ url, locals, setHeaders, request }) => {
  setHeaders({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  // Puerta para automatización (RPA lee alertas con el token) + sesión normal para humanos.
  const isCron = !!CRON_SECRET && request.headers.get('x-cron-secret') === CRON_SECRET;
  const user = locals.user || locals.session?.user;
  if (!user && !isCron) return json({ error: 'No autenticado' }, { status: 401 });

  try {
    const tipoFiltro = url.searchParams.get('tipo') || '';
    const categoriaFiltro = url.searchParams.get('categoria') || '';
    const abcFiltro = url.searchParams.get('abc') || '';
    const searchFiltro = url.searchParams.get('search') || '';

    // 1. Obtener último código
    const lastProc = db.prepare(`
      SELECT codigo_procesamiento, fecha_procesamiento, usuario_procesamiento 
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento IS NOT NULL AND codigo_procesamiento != ''
      ORDER BY fecha_procesamiento DESC LIMIT 1
    `).get() as { codigo_procesamiento: string; fecha_procesamiento: string; usuario_procesamiento: string } | undefined;

    if (!lastProc) {
      return json({
        alertas: [],
        resumen: { critico: 0, advertencia: 0, info: 0, total: 0, pedirCourier: 0, pedirAereo: 0 },
        metadata: null
      });
    }

    const codigoCorte = lastProc.codigo_procesamiento;

    // 2. CONSULTA ÚNICA (Extrae todo de una vez para máxima velocidad)
    const rows = db.prepare(`
      SELECT 
        id, codigo_sku, descripcion, linea, marca, abc, abc_rotacion_frecuencia, 
        existencia, transito, stock_seguridad, promedio_ajustado, 
        coeficiente_variacion, frecuencia_ventas_12m, 
        referencia_pedido_courier, referencia_pedido_aereo, 
        cantidad_final_courier, cantidad_final_aereo, 
        mensaje_courier, mensaje_aereo, desviacion_estandar, venta_ultimos_12m,
        sugerido_analista_urgente, sugerido_analista_aereo, sugerido_analista_maritimo, comentario_analista
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento = ? AND activo = 1
    `).all(codigoCorte) as any[];

    const alertas: Alerta[] = [];
    let alertaIndex = 0;

    const crearAlerta = (row: any, tipo: 'critico'|'advertencia'|'info', categoria: string, mensaje: string, detalle: string, accion: string): Alerta => {
      alertaIndex++;
      return {
        alerta_id: `${tipo}-${categoria}-${alertaIndex}`,
        id: row.id,
        tipo, categoria, codigo_sku: row.codigo_sku, descripcion: row.descripcion || 'Sin descripción',
        linea: row.linea || '', marca: row.marca || '', abc: row.abc || 'N/D', rotacion: row.abc_rotacion_frecuencia || '',
        existencia: row.existencia || 0, transito: row.transito || 0, stock_seguridad: row.stock_seguridad || 0,
        promedio_ajustado: row.promedio_ajustado || 0, coeficiente_variacion: row.coeficiente_variacion || 0,
        frecuencia_ventas_12m: row.frecuencia_ventas_12m || 0, ref_courier: row.referencia_pedido_courier || 0,
        ref_aereo: row.referencia_pedido_aereo || 0, cantidad_pedir_courier: Math.abs(row.cantidad_final_courier || 0),
        cantidad_pedir_aereo: Math.abs(row.cantidad_final_aereo || 0), mensaje, detalle, accion_sugerida: accion,
        // Campos editables
        sugerido_analista_urgente: row.sugerido_analista_urgente || 0,
        sugerido_analista_aereo: row.sugerido_analista_aereo || 0,
        sugerido_analista_maritimo: row.sugerido_analista_maritimo || 0,
        comentario_analista: row.comentario_analista || ''
      };
    };

    // Buckets en RAM para clasificar
    const sinStockA = [], sinStockB = [], sinStockBaja = [], stockMuyBajo = [];
    const pedirCourier = [], pedirAereo = [], stockBajo = [], demandaIrreg = [], sobreStock = [], sinRot = [];

    // 3. CLASIFICACIÓN EN MEMORIA (O(N) - Ultra rápido)
    for (const row of rows) {
      if (row.existencia === 0 && row.abc === 'A' && row.frecuencia_ventas_12m >= 3) sinStockA.push(row);
      if (row.existencia === 0 && row.abc === 'B' && row.frecuencia_ventas_12m >= 3) sinStockB.push(row);
      if (row.existencia === 0 && ['A', 'B'].includes(row.abc) && row.frecuencia_ventas_12m > 0 && row.frecuencia_ventas_12m < 3) sinStockBaja.push(row);
      if (row.existencia > 0 && row.stock_seguridad > 0 && row.existencia < (row.stock_seguridad * 0.5) && ['A', 'B'].includes(row.abc) && row.frecuencia_ventas_12m >= 3) stockMuyBajo.push(row);
      if (row.mensaje_courier === 'PEDIR COURIER' && row.existencia > 0 && row.frecuencia_ventas_12m >= 2) pedirCourier.push(row);
      if (row.mensaje_aereo === 'PEDIR AEREO' && row.mensaje_courier === '' && row.frecuencia_ventas_12m >= 2) pedirAereo.push(row);
      if (row.existencia > 0 && row.stock_seguridad > 0 && row.existencia >= (row.stock_seguridad * 0.5) && row.existencia < row.stock_seguridad && ['A', 'B', 'C'].includes(row.abc) && row.frecuencia_ventas_12m >= 2) stockBajo.push(row);
      if (row.coeficiente_variacion > 1.2 && ['A', 'B'].includes(row.abc) && row.frecuencia_ventas_12m >= 3) demandaIrreg.push(row);
      if (row.promedio_ajustado > 0 && row.existencia > (row.promedio_ajustado * 12)) sobreStock.push(row);
      if (row.frecuencia_ventas_12m === 0 && row.existencia > 0) sinRot.push(row);
    }

    // 4. ORDENAMIENTO Y GENERACIÓN DE ALERTAS
    sinStockA.sort((a, b) => b.venta_ultimos_12m - a.venta_ultimos_12m).forEach(row => {
      const dias = row.promedio_ajustado > 0 ? Math.round((row.transito / row.promedio_ajustado) * 30) : 0;
      alertas.push(crearAlerta(row, 'critico', 'sin_stock', 'SIN STOCK - ABC A', `Promedio: ${row.promedio_ajustado?.toFixed(1)} uds. Freq: ${row.frecuencia_ventas_12m}/12. ` + (row.transito > 0 ? `En tránsito: ${row.transito} uds (≈${dias} días).` : 'Sin tránsito.'), row.transito > 0 ? 'Verificar llegada de tránsito' : 'Solicitar pedido URGENTE'));
    });

    sinStockB.sort((a, b) => b.venta_ultimos_12m - a.venta_ultimos_12m).forEach(row => {
      alertas.push(crearAlerta(row, 'critico', 'sin_stock', 'SIN STOCK - ABC B', `Promedio: ${row.promedio_ajustado?.toFixed(1)} uds. Freq: ${row.frecuencia_ventas_12m}/12. ` + (row.transito > 0 ? `En tránsito: ${row.transito} uds.` : 'Sin tránsito.'), 'Evaluar pedido urgente'));
    });

    sinStockBaja.sort((a, b) => a.abc.localeCompare(b.abc) || b.venta_ultimos_12m - a.venta_ultimos_12m).forEach(row => {
      alertas.push(crearAlerta(row, 'advertencia', 'sin_stock', `SIN STOCK - ABC ${row.abc}`, `Frecuencia baja (${row.frecuencia_ventas_12m}/12). Promedio: ${row.promedio_ajustado?.toFixed(1)} uds/mes.`, 'Evaluar reposición'));
    });

    stockMuyBajo.sort((a, b) => a.abc.localeCompare(b.abc) || (b.stock_seguridad - b.existencia) - (a.stock_seguridad - a.existencia)).forEach(row => {
      const pct = ((row.existencia / row.stock_seguridad) * 100).toFixed(0);
      const dias = row.promedio_ajustado > 0 ? Math.round((row.existencia / row.promedio_ajustado) * 30) : 0;
      alertas.push(crearAlerta(row, 'critico', 'stock_bajo', 'STOCK CRÍTICO', `Solo ${row.existencia} uds (${pct}% del mínimo). Cobertura: ${dias} días. ` + (row.transito > 0 ? `Tránsito: ${row.transito} uds.` : ''), 'Priorizar en pedido Courier'));
    });

    pedirCourier.sort((a, b) => a.abc.localeCompare(b.abc) || Math.abs(b.cantidad_final_courier) - Math.abs(a.cantidad_final_courier)).forEach(row => {
      const def = Math.abs(row.cantidad_final_courier || 0);
      alertas.push(crearAlerta(row, 'advertencia', 'pedir_courier', 'PEDIR COURIER', `Disponible: ${row.existencia + row.transito} uds. Ref: ${row.referencia_pedido_courier}. Déficit: ${def.toFixed(0)} uds.`, `Agregar ${def.toFixed(0)} uds al Courier`));
    });

    pedirAereo.sort((a, b) => a.abc.localeCompare(b.abc) || Math.abs(b.cantidad_final_aereo) - Math.abs(a.cantidad_final_aereo)).forEach(row => {
      const def = Math.abs(row.cantidad_final_aereo || 0);
      alertas.push(crearAlerta(row, 'advertencia', 'pedir_aereo', 'PEDIR AÉREO', `Ref aérea: ${row.referencia_pedido_aereo} uds. Déficit: ${def.toFixed(0)} uds.`, `Agregar ${def.toFixed(0)} uds al Aéreo`));
    });

    stockBajo.sort((a, b) => a.abc.localeCompare(b.abc) || (b.stock_seguridad - b.existencia) - (a.stock_seguridad - a.existencia)).forEach(row => {
      const pct = ((row.existencia / row.stock_seguridad) * 100).toFixed(0);
      alertas.push(crearAlerta(row, 'advertencia', 'stock_bajo', 'STOCK BAJO', `${row.existencia} uds (${pct}% del mínimo). Factor de seguridad activado.`, 'Incluir en próximo pedido'));
    });

    demandaIrreg.sort((a, b) => b.coeficiente_variacion - a.coeficiente_variacion).forEach(row => {
      alertas.push(crearAlerta(row, 'advertencia', 'demanda', 'DEMANDA IRREGULAR', `C.V.: ${row.coeficiente_variacion?.toFixed(2)}. Desv Std: ${row.desviacion_estandar?.toFixed(1)}. Prom: ${row.promedio_ajustado?.toFixed(1)}.`, 'Considerar ajuste manual'));
    });

    sobreStock.sort((a, b) => (b.existencia / (b.promedio_ajustado||1)) - (a.existencia / (a.promedio_ajustado||1))).forEach(row => {
      alertas.push(crearAlerta(row, 'info', 'sobrestock', 'SOBRE-STOCK', `Inventario para ${(row.existencia/row.promedio_ajustado).toFixed(0)} meses (${row.existencia} uds). Prom: ${row.promedio_ajustado?.toFixed(1)}.`, 'Evaluar promoción'));
    });

    sinRot.sort((a, b) => b.existencia - a.existencia).forEach(row => {
      alertas.push(crearAlerta(row, 'info', 'sin_rotacion', 'SIN ROTACIÓN 12M', `${row.existencia} uds sin movimiento. ABC: ${row.abc}.`, 'Evaluar liquidación'));
    });

    // 5. RESUMEN Y FILTRADO FINAL
    const resumen = {
      critico: alertas.filter(a => a.tipo === 'critico').length,
      advertencia: alertas.filter(a => a.tipo === 'advertencia').length,
      info: alertas.filter(a => a.tipo === 'info').length,
      total: alertas.length,
      pedirCourier: alertas.filter(a => a.categoria === 'pedir_courier').length,
      pedirAereo: alertas.filter(a => a.categoria === 'pedir_aereo').length
    };

    let alertasFiltradas = [...alertas];
    if (tipoFiltro) alertasFiltradas = alertasFiltradas.filter(a => a.tipo === tipoFiltro);
    if (categoriaFiltro) alertasFiltradas = alertasFiltradas.filter(a => a.categoria === categoriaFiltro);
    if (abcFiltro) alertasFiltradas = alertasFiltradas.filter(a => a.abc === abcFiltro);
    if (searchFiltro) {
      const term = searchFiltro.toLowerCase();
      alertasFiltradas = alertasFiltradas.filter(a => a.codigo_sku.toLowerCase().includes(term) || a.descripcion.toLowerCase().includes(term));
    }

    return json({
      alertas: alertasFiltradas,
      totalFiltrado: alertasFiltradas.length,
      resumen,
      metadata: { fecha: lastProc.fecha_procesamiento, usuario: lastProc.usuario_procesamiento, codigo: codigoCorte } // NUEVO: enviamos codigo
    });

  } catch (error) {
    console.error('Error obteniendo alertas:', error);
    return json({ error: 'Error interno del servidor' }, { status: 500 });
  }
};