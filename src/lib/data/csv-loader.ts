// csv-loader.ts
/**
 * @module CSVLoader
 * @description Funciones para cargar y parsear CSVs de Exactus
 * 
 * ⚠️ IMPORTANTE: Este módulo usa CSVs temporales como fuente de datos.
 * ⚠️ En producción, estos datos deben obtenerse directamente de Exactus via SQL.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
// Directorio base de los CSVs
const CSV_DIR = join(process.cwd(), 'src', 'lib', 'data', 'csv');

/**
 * Parsear CSV con punto y coma como delimitador
 */
function parseCSV(content: string, delimiter: string = ';'): any[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(delimiter).map(h => h.trim());
  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter);
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    
    data.push(row);
  }

  return data;
}

/**
 * Cargar tabla ARTICULOS
 * 
 * 🔴 TEMPORAL: Leer desde CSV
 * ✅ PRODUCCIÓN: SELECT * FROM EXACTUS.VEDOVA.ARTICULO
 * 
 * @param limit - Opcional: limitar cantidad de artículos cargados (para evitar OOM)
 */
export function loadArticulos(limit?: number): Map<string, any> {
  const content = readFileSync(join(CSV_DIR, 'articulos.csv'), 'utf-8');
  const rows = parseCSV(content, ';');
  
  const map = new Map();
  const maxRows = limit || rows.length;
  
  for (let i = 0; i < Math.min(maxRows, rows.length); i++) {
    map.set(rows[i].ARTICULO, rows[i]);
  }
  
  console.log(`[csv] ✅ Loaded ${map.size} articulos (FROM CSV - TODO: Connect to Exactus)${limit ? ` [LIMITED to ${limit}]` : ''}`);
  return map;
}

/**
 * Cargar tabla BODEGA
 * 
 * 🔴 TEMPORAL: Leer desde CSV
 * ✅ PRODUCCIÓN: SELECT * FROM EXACTUS.VEDOVA.BODEGA
 */
export function loadBodegas(): Map<string, any> {
  const content = readFileSync(join(CSV_DIR, 'bodega.csv'), 'utf-8');
  const rows = parseCSV(content, ';');
  
  const map = new Map();
  rows.forEach(row => {
    map.set(row.BODEGA, row);
  });
  
  console.log(`[csv] ✅ Loaded ${map.size} bodegas (FROM CSV - TODO: Connect to Exactus)`);
  return map;
}

/**
 * Cargar tabla EXISTENCIA
 * 
 * @param limitArticulos - Si se proporciona, solo cargar existencias de esos artículos
 */
export function loadExistencias(articulosCodigos?: Set<string>): any[] {
  const content = readFileSync(join(CSV_DIR, 'existencia.csv'), 'utf-8');
  const rows = parseCSV(content, ';');
  
  // Si hay filtro de artículos, solo cargar esas existencias
  const filtered = articulosCodigos 
    ? rows.filter(row => articulosCodigos.has(row.ARTICULO))
    : rows;
  
  console.log(`[csv] ✅ Loaded ${filtered.length} existencias (FROM CSV - TODO: Connect to Exactus)${articulosCodigos ? ' [FILTERED]' : ''}`);
  return filtered;
}

/**
 * Cargar Lead Times por Proveedor
 * 
 * 🔴 TEMPORAL: Leer desde CSV (dato del Excel original)
 * ⚠️  NOTA: Esta tabla NO está en Exactus, fue agregada manualmente al Excel
 * ✅ PRODUCCIÓN: Mantener como tabla auxiliar en SQLite o agregar a Exactus
 */
export function loadLeadTimes(): Map<string, any> {
  const content = readFileSync(join(CSV_DIR, 'lt-meses-pedido.csv'), 'utf-8');
  const rows = parseCSV(content, ';');
  
  const map = new Map();
  rows.forEach(row => {
    map.set(row.PROVEEDOR, {
      lt: parseInt(row.LT) || 0,
      mesesPedido: row['MESES PEDIDO'] || ''
    });
  });
  
  console.log(`[csv] ✅ Loaded ${map.size} lead times (FROM CSV - NOT IN EXACTUS)`);
  return map;
}

/**
 * Cargar clasificación ABC (consultas-mg.csv)
 * 
 * 🔴 TEMPORAL: Leer desde CSV (dato del Excel original)
 * ⚠️  NOTA: Esta clasificación NO está en Exactus, fue generada manualmente
 * ✅ PRODUCCIÓN: Calcular dinámicamente o mantener tabla auxiliar
 * 
 * Formato: CODIGO<TAB>CLASIFICACION (sin cabecera, separado por TAB)
 */
export function loadClasificacionABC(): Map<string, string> {
  const content = readFileSync(join(CSV_DIR, 'consultas-mg.csv'), 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const map = new Map<string, string>();
  
  lines.forEach(line => {
    // Usar TAB como separador (no punto y coma)
    const parts = line.split('\t');
    if (parts.length >= 2) {
      const codigo = parts[0].trim();
      const clasificacion = parts[1].trim();
      if (codigo && clasificacion) {
        map.set(codigo, clasificacion);
      }
    }
  });
  
  console.log(`[csv] ✅ Loaded ${map.size} clasificaciones ABC (FROM CSV - NOT IN EXACTUS)`);
  return map;
}

/**
 * Cargar ventas mensuales históricas
 * 
 * @param articulosCodigos - Si se proporciona, solo cargar ventas de esos artículos
 */
export function loadVentasMensuales(articulosCodigos?: Set<string>): any[] {
  try {
    const content = readFileSync(join(CSV_DIR, 'ventas-mensuales.csv'), 'utf-8');
    const rows = parseCSV(content, ';');
    
    // Filtrar si hay códigos específicos
    const filtered = articulosCodigos
      ? rows.filter(row => articulosCodigos.has(row.ArticuloCodigo))
      : rows;
    
    console.log(`[csv] ⚠️  Loaded ${filtered.length} ventas mensuales (🔴 MOCK DATA)${articulosCodigos ? ' [FILTERED]' : ''}`);
    console.log(`[csv] 🔴 TODO: Replace with real data from Exactus BI`);
    return filtered;
  } catch (error) {
    console.warn('[csv] ⚠️  ventas-mensuales.csv not found, using empty data');
    return [];
  }
}

/**
 * Cargar tabla Factor de Seguridad
 * 
 * 🔴 TEMPORAL: Leer desde CSV
 * ⚠️  NOTA: Esta tabla NO está en Exactus, fue creada manualmente
 * ✅ PRODUCCIÓN: Mantener como tabla auxiliar en SQLite
 * 
 * Formato: Clasificacion;Factor
 */
export function loadFactorSeguridad(): Map<string, number> {
  const content = readFileSync(join(CSV_DIR, 'factor-seguridad.csv'), 'utf-8');
  const rows = parseCSV(content, ';');
  
  const map = new Map<string, number>();
  
  rows.forEach(row => {
    const clasificacion = row.Clasificacion?.trim();
    const factor = parseFloat(row.Factor) || 0;
    if (clasificacion) {
      map.set(clasificacion, factor);
    }
  });
  
  console.log(`[csv] ✅ Loaded ${map.size} factores de seguridad`);
  return map;
}

/**
 * Calcular EXISTENCIA TOTAL por artículo
 * Suma CANT_DISPONIBLE de todas las bodegas
 * 
 * 🔴 TEMPORAL: Calculado desde CSV
 * ✅ PRODUCCIÓN: SELECT ARTICULO, SUM(CANT_DISPONIBLE) 
 *                FROM EXACTUS.VEDOVA.EXISTENCIA_BODEGA 
 *                GROUP BY ARTICULO
 */
export function calcularExistenciaTotal(existencias: any[]): Map<string, number> {
  const totales = new Map<string, number>();
  
  existencias.forEach(row => {
    const articulo = row.ARTICULO;
    const cantidad = parseFloat(row.CANT_DISPONIBLE) || 0;
    
    const actual = totales.get(articulo) || 0;
    totales.set(articulo, actual + cantidad);
  });
  
  return totales;
}

/**
 * Calcular TRANSITO por artículo
 * Suma CANT_TRANSITO de todas las bodegas
 * 
 * 🔴 TEMPORAL: Calculado desde CSV
 * ✅ PRODUCCIÓN: SELECT ARTICULO, SUM(CANT_TRANSITO) 
 *                FROM EXACTUS.VEDOVA.EXISTENCIA_BODEGA 
 *                GROUP BY ARTICULO
 */
export function calcularTransito(existencias: any[]): Map<string, number> {
  const transitos = new Map<string, number>();
  
  existencias.forEach(row => {
    const articulo = row.ARTICULO;
    const cantidad = parseFloat(row.CANT_TRANSITO) || 0;
    
    const actual = transitos.get(articulo) || 0;
    transitos.set(articulo, actual + cantidad);
  });
  
  return transitos;
}

/**
 * Calcular frecuencia de ventas (últimos N meses)
 * Cuenta cuántos meses tuvieron venta > 0
 * 
 * 🔴🔴 USANDO MOCK DATA - Resultados NO son reales 🔴🔴
 * 
 * Lógica: Replica fórmula Excel =CONTAR.SI(EW5:FH5;">0")
 * - EW5:FH5 = Últimos 12 meses de venta
 * - Cuenta meses con cantidad > 0
 */
export function calcularFrecuenciaVentas(
  ventasMensuales: any[],
  articulo: string,
  ultimosMeses: number = 12
): number {
  // Obtener fecha actual para calcular últimos N meses
  const hoy = new Date();
  const añoActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1; // 1-12

  // Generar array de últimos N meses
  const mesesRelevantes: Array<{año: number, mes: number}> = [];
  for (let i = 0; i < ultimosMeses; i++) {
    let mes = mesActual - i;
    let año = añoActual;
    
    while (mes <= 0) {
      mes += 12;
      año -= 1;
    }
    
    mesesRelevantes.push({ año, mes });
  }

  // Filtrar ventas del artículo en esos meses
  const ventasDelPeriodo = ventasMensuales.filter(v => {
    if (v.ArticuloCodigo !== articulo) return false;
    
    const año = parseInt(v.Año);
    const mes = parseInt(v.Mes);
    
    return mesesRelevantes.some(m => m.año === año && m.mes === mes);
  });

  // Contar meses con venta > 0
  let mesesConVenta = 0;
  
  mesesRelevantes.forEach(({ año, mes }) => {
    const venta = ventasDelPeriodo.find(v => 
      parseInt(v.Año) === año && parseInt(v.Mes) === mes
    );
    
    const cantidad = parseFloat(venta?.Cantidad || '0');
    if (cantidad > 0) {
      mesesConVenta++;
    }
  });

  return mesesConVenta;
}

/**
 * Clasificar ABC por Rotación según frecuencia
 * 
 * Lógica: Replica fórmula Excel 
 * =SI(FJ5>=6;"A";SI(FJ5>=4;"B";SI(FJ5=3;"C";SI(FJ5=2;"D";SI(FJ5>=0;"E";)))))
 * 
 * Donde FJ5 = Frecuencia de ventas últimos 12 meses
 */
export function clasificarABCRotacion(frecuencia: number): string {
  if (frecuencia >= 6) return 'A';
  if (frecuencia >= 4) return 'B';
  if (frecuencia === 3) return 'C';
  if (frecuencia === 2) return 'D';
  if (frecuencia >= 0) return 'E';
  return 'N/D';
}

/**
 * Cargar todos los datos necesarios
 */
export function loadAllData(limitArticulos?: number) {
  console.log('[csv] 📊 Loading all data from CSVs...');
  if (limitArticulos) {
    console.log(`[csv] ⚠️  LIMITED to ${limitArticulos} articulos for testing`);
  }
  console.log('[csv] 🔴 WARNING: Using temporary CSV files instead of Exactus connection');
  
  const articulos = loadArticulos(limitArticulos);
  
  // Crear set de códigos para filtrar otras tablas
  const articulosCodigos = new Set(articulos.keys());
  
  const bodegas = loadBodegas();
  const existencias = loadExistencias(articulosCodigos);  // ← FILTRAR
  const leadTimes = loadLeadTimes();
  const clasificacionABC = loadClasificacionABC();
  const ventasMensuales = loadVentasMensuales(articulosCodigos);  // ← FILTRAR
  const factorSeguridad = loadFactorSeguridad();
  
  const existenciaTotal = calcularExistenciaTotal(existencias);
  const transito = calcularTransito(existencias);
  
  console.log('[csv] ✅ All data loaded');
  console.log('[csv] 🔴 TODO: Replace CSV loading with direct Exactus SQL queries');
  
  return {
    articulos,
    bodegas,
    existencias,
    leadTimes,
    clasificacionABC,
    existenciaTotal,
    transito,
    ventasMensuales,
    factorSeguridad
  };
}