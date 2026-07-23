//D:\Users\Usuario\Desktop\VedovaWEB\VYOWEB\src\lib\services\compras-service.ts

/**
 * @module ComprasService
 * @description Lógica de negocio completa para Gestión de Compras
 * 
 * 🔴🔴🔴 ADVERTENCIA CRÍTICA 🔴🔴🔴
 * Este servicio actualmente usa CSVs temporales como fuente de datos.
 * En producción, DEBE conectarse directamente a Exactus SQL Server.
 * 
 * Ver csv-loader.ts para detalles de cada fuente de datos temporal.
 */

// ===== IMPORTS EN ORDEN CORRECTO =====
import { 
  loadAllData, 
  calcularFrecuenciaVentas, 
  clasificarABCRotacion 
} from '$lib/data/csv-loader';
//ajuste

import {
  obtenerVentasUltimosMeses,
  calcularVentaUltimos12Meses,
  calcularPromedioMeses,
  calcularPromedioAjustado,
  calcularDesviacionEstandar,
  calcularCoeficienteVariacion,
  obtenerFactorSeguridad,
  calcularStockSeguridad,
  calcularReferenciaCourier,
  calcularReferenciaAereo,
  calcularReferenciaMaritimo,
  calcularCantidadCourier,
  calcularCantidadAereo
} from '$lib/data/forecast-calculator';

// ===== INTERFAZ =====
export interface SKUCompra {
  // ===== DATOS BÁSICOS =====
  codigo: string;
  codigoProveedor: string;
  descripcion: string;
  linea: string;
  marca: string;
  abc: string;
  abcRotacionFrecuencia: string;
  activo: boolean;
  existencia: number;
  transito: number;
  leadTime: number;
  mesesPedido: string;
  
  // ===== VENTAS HISTÓRICAS =====
  ventas12Meses: number[];
  
  // ===== ESTADÍSTICAS =====
  frecuenciaVentas12M: number;
  ventaUltimos12Meses: number;
  promedioUltimos12Meses: number;
  promedio6MesesTemporada: number;
  promedioAjustado: number;
  desviacionEstandar: number;
  coeficienteVariacion: number;
  
  // ===== FORECAST =====
  factorSeguridad: number;
  stockSeguridad: number;
  referenciaPedidoCourier: number;
  referenciaPedidoAereo: number;
  referenciaPedidoMaritimo: number;
  
  // ===== CANTIDADES A PEDIR =====
  cantidadCourier: number;
  mensajeCourier: string;
  cantidadFinalCourier: number;
  
  cantidadAereo: number;
  mensajeAereo: string;
  cantidadFinalAereo: number;
  
  // ===== CAMPOS EDITABLES (por analista) =====
  sugeridoAnalistaUrgente: number;
  sugeridoAnalistaAereo: number;
}

/**
 * Obtener todos los SKUs con TODOS los cálculos de forecast
 * 
 * 🔴 TEMPORAL: Datos desde CSVs
 * ✅ PRODUCCIÓN: Query directo a Exactus con JOINs
 * 
 * @param limit - Opcional: limitar cantidad de SKUs (para testing/evitar OOM)
 * 
 * Query recomendado para producción:
 * ```sql
 * SELECT 
 *   a.ARTICULO as codigo,
 *   a.PROVEEDOR as codigoProveedor,
 *   a.DESCRIPCION as descripcion,
 *   a.CLASIFICACION_3 as linea,
 *   a.CLASIFICACION_4 as marca,
 *   a.ACTIVO as activo,
 *   SUM(e.CANT_DISPONIBLE) as existencia,
 *   SUM(e.CANT_TRANSITO) as transito
 * FROM EXACTUS.VEDOVA.ARTICULO a
 * LEFT JOIN EXACTUS.VEDOVA.EXISTENCIA_BODEGA e ON a.ARTICULO = e.ARTICULO
 * GROUP BY a.ARTICULO, a.PROVEEDOR, a.DESCRIPCION, 
 *          a.CLASIFICACION_3, a.CLASIFICACION_4, a.ACTIVO
 * ```
 */
export function getAllSKUsForCompras(limit?: number): SKUCompra[] {
  console.log('[compras] 📊 Loading SKUs with full forecast calculations...');
  if (limit) {
    console.log(`[compras] ⚠️  LIMITED to ${limit} SKUs for testing`);
  }
  console.log('[compras] 🔴 Using CSV data (TODO: Connect to Exactus)');
  
  const data = loadAllData(limit);  // ← PASAR EL LÍMITE AQUÍ
  const skus: SKUCompra[] = [];
  

  for (const [codigo, articulo] of data.articulos) {
    
    // ===== DATOS BÁSICOS =====
    const abc = data.clasificacionABC.get(codigo) || 'N/D';
    const existencia = data.existenciaTotal.get(codigo) || 0;
    const transito = data.transito.get(codigo) || 0;
    const ltData = data.leadTimes.get(articulo.PROVEEDOR) || { lt: 0, mesesPedido: '' };
    
    // ===== VENTAS ÚLTIMOS 12 MESES =====
    const ventas12 = obtenerVentasUltimosMeses(data.ventasMensuales, codigo, 12);
    const ventas6 = ventas12.slice(-6);
    
    // ===== FRECUENCIA DE VENTAS =====
    const frecuenciaVentas = calcularFrecuenciaVentas(data.ventasMensuales, codigo, 12);
    const abcRotacionFrecuencia = clasificarABCRotacion(frecuenciaVentas);
    
    // ===== ESTADÍSTICAS =====
    const ventaTotal12M = calcularVentaUltimos12Meses(ventas12);
    const prom12 = calcularPromedioMeses(ventas12);
    const prom6 = calcularPromedioMeses(ventas6);
    const promAjustado = calcularPromedioAjustado(prom6, prom12);
    const desviacion = calcularDesviacionEstandar(ventas12);
    const cv = calcularCoeficienteVariacion(desviacion, prom12);
    
    // ===== FORECAST =====
    const factorSeg = obtenerFactorSeguridad(abc, data.factorSeguridad);
    const stockSeg = calcularStockSeguridad(factorSeg, promAjustado);
    const refCourier = calcularReferenciaCourier(promAjustado);
    const refAereo = calcularReferenciaAereo(promAjustado, stockSeg);
    const refMaritimo = calcularReferenciaMaritimo(promAjustado, stockSeg);
    
    // ===== CANTIDADES A PEDIR =====
    const courier = calcularCantidadCourier(existencia, transito, refCourier);
    const aereo = calcularCantidadAereo(existencia, transito, refAereo, courier.cantidadFinal);
    
    skus.push({
      codigo,
      codigoProveedor: articulo.PROVEEDOR || '',
      descripcion: articulo.DESCRIPCION || '',
      linea: articulo.CLASIFICACION_3 || '',
      marca: articulo.CLASIFICACION_4 || '',
      abc,
      abcRotacionFrecuencia,
      activo: articulo.ACTIVO === 'S' || articulo.ACTIVO === '1' || articulo.ACTIVO === 'true',
      existencia,
      transito,
      leadTime: ltData.lt,
      mesesPedido: ltData.mesesPedido,
      
      ventas12Meses: ventas12,
      
      frecuenciaVentas12M: frecuenciaVentas,
      ventaUltimos12Meses: ventaTotal12M,
      promedioUltimos12Meses: prom12,
      promedio6MesesTemporada: prom6,
      promedioAjustado: promAjustado,
      desviacionEstandar: desviacion,
      coeficienteVariacion: cv,
      
      factorSeguridad: factorSeg,
      stockSeguridad: stockSeg,
      referenciaPedidoCourier: refCourier,
      referenciaPedidoAereo: refAereo,
      referenciaPedidoMaritimo: refMaritimo,
      
      cantidadCourier: courier.cantidad,
      mensajeCourier: courier.mensaje,
      cantidadFinalCourier: courier.cantidadFinal,
      
      cantidadAereo: aereo.cantidad,
      mensajeAereo: aereo.mensaje,
      cantidadFinalAereo: aereo.cantidadFinal,
      
      sugeridoAnalistaUrgente: 0,
      sugeridoAnalistaAereo: 0
    });
    
    
  
  }

  console.log(`[compras] ✅ Calculated ${skus.length} SKUs with full forecast`);
  if (limit) {
    console.log(`[compras] ⚠️  LIMITED to first ${limit} SKUs for testing`);
  }
  console.log(`[compras] 🔴 Note: Using MOCK sales data`);

  return skus;
}

/**
 * Filtrar SKUs por criterios
 */
export function filterSKUs(
  skus: SKUCompra[],
  filters: {
    marca?: string;
    linea?: string;
    abc?: string;
    abcRotacion?: string;
    activo?: boolean;
    search?: string;
    soloCriticos?: boolean;
    soloConPedido?: boolean;
  }
): SKUCompra[] {
  return skus.filter(sku => {
    if (filters.marca && sku.marca !== filters.marca) return false;
    if (filters.linea && sku.linea !== filters.linea) return false;
    if (filters.abc && sku.abc !== filters.abc) return false;
    if (filters.abcRotacion && sku.abcRotacionFrecuencia !== filters.abcRotacion) return false;
    if (filters.activo !== undefined && sku.activo !== filters.activo) return false;
    
    if (filters.soloCriticos) {
      const esCritico = sku.existencia === 0 && (sku.abc === 'A' || sku.abc === 'B');
      if (!esCritico) return false;
    }
    
    if (filters.soloConPedido) {
      const tienePedido = sku.mensajeCourier !== '' || sku.mensajeAereo !== '';
      if (!tienePedido) return false;
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        sku.codigo.toLowerCase().includes(search) ||
        sku.descripcion.toLowerCase().includes(search) ||
        sku.codigoProveedor.toLowerCase().includes(search)
      );
    }
    
    return true;
  });
}

/**
 * Obtener lista única de marcas
 */
export function getUniqueMarcas(skus: SKUCompra[]): string[] {
  const marcas = new Set<string>();
  skus.forEach(sku => {
    if (sku.marca) marcas.add(sku.marca);
  });
  return Array.from(marcas).sort();
}

/**
 * Obtener lista única de líneas
 */
export function getUniqueLineas(skus: SKUCompra[]): string[] {
  const lineas = new Set<string>();
  skus.forEach(sku => {
    if (sku.linea) lineas.add(sku.linea);
  });
  return Array.from(lineas).sort();
}

/**
 * Obtener estadísticas generales
 */
export function getEstadisticasGenerales(skus: SKUCompra[]) {
  const total = skus.length;
  const activos = skus.filter(s => s.activo).length;
  const conPedidoCourier = skus.filter(s => s.mensajeCourier !== '').length;
  const conPedidoAereo = skus.filter(s => s.mensajeAereo !== '').length;
  const criticos = skus.filter(s => s.existencia === 0 && (s.abc === 'A' || s.abc === 'B')).length;
  
  const porABC = {
    A: skus.filter(s => s.abc === 'A').length,
    B: skus.filter(s => s.abc === 'B').length,
    C: skus.filter(s => s.abc === 'C').length,
    D: skus.filter(s => s.abc === 'D').length,
    E: skus.filter(s => s.abc === 'E').length,
    ND: skus.filter(s => s.abc === 'N/D').length,
  };
  
  return {
    total,
    activos,
    conPedidoCourier,
    conPedidoAereo,
    criticos,
    porABC
  };
}