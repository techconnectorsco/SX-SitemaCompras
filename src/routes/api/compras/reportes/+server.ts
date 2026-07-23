/**
 * API de Generación de Reportes Excel
 * GET /api/compras/reportes
 * 
 * ✅ ACTUALIZADO: Reporte de antigüedad con fecha_creacion y cálculo de años/días
 * 
 * Query params:
 * - tipo: ID del reporte (analisis-8020, control-compras, etc.)
 * - procesamiento: código del procesamiento
 * 
 * Retorna archivo Excel (.xlsx) con formato profesional
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import ExcelJS from 'exceljs';
import { AuditService } from '$lib/features/security/services/audit-service';

// ===== TIPOS =====
interface SKUData {
  id: number;
  codigo_sku: string;
  codigo_proveedor: string;
  descripcion: string;
  categoria: string;
  linea: string;
  marca: string;
  abc: string;
  abc_rotacion_frecuencia: string;
  activo: string;
  existencia: number;
  transito: number;
  lead_time: number;
  meses_pedido: number;
  frecuencia_ventas_12m: number;
  venta_ultimos_12m: number;
  promedio_12m: number;
  promedio_6m: number;
  promedio_ajustado: number;
  desviacion_estandar: number;
  coeficiente_variacion: number;
  factor_seguridad: number;
  stock_seguridad: number;
  referencia_pedido_courier: number;
  referencia_pedido_aereo: number;
  referencia_pedido_maritimo: number;
  cantidad_courier: number;
  mensaje_courier: string;
  cantidad_final_courier: number;
  cantidad_aereo: number;
  mensaje_aereo: string;
  cantidad_final_aereo: number;
  cantidad_maritimo: number;
  mensaje_maritimo: string;
  cantidad_final_maritimo: number;
  costo_ult_loc: number;
  costo_ult_dol: number;
  sugerido_analista_urgente: number;
  sugerido_analista_aereo: number;
  usuario_modificacion: string;
  fecha_modificacion: string;
  // ✅ NUEVOS: Campos de fecha
  fecha_creacion: string | null;
  ultima_salida: string | null;
  ultimo_movimiento: string | null;
}

// ===== ESTILOS COMUNES =====
const STYLES = {
  header: {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF253166' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
    border: {
      top: { style: 'thin' as const, color: { argb: 'FF1a2147' } },
      bottom: { style: 'thin' as const, color: { argb: 'FF1a2147' } },
      left: { style: 'thin' as const, color: { argb: 'FF1a2147' } },
      right: { style: 'thin' as const, color: { argb: 'FF1a2147' } }
    }
  },
  subHeader: {
    font: { bold: true, color: { argb: 'FF253166' }, size: 10 },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE8EBF4' } },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const, color: { argb: 'FFB8C4E0' } },
      bottom: { style: 'thin' as const, color: { argb: 'FFB8C4E0' } },
      left: { style: 'thin' as const, color: { argb: 'FFB8C4E0' } },
      right: { style: 'thin' as const, color: { argb: 'FFB8C4E0' } }
    }
  },
  cell: {
    font: { size: 10 },
    alignment: { vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const, color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin' as const, color: { argb: 'FFE0E0E0' } },
      left: { style: 'thin' as const, color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin' as const, color: { argb: 'FFE0E0E0' } }
    }
  },
  currency: {
    numFmt: '₡#,##0.00'
  },
  currencyUSD: {
    numFmt: '$#,##0.00'
  },
  number: {
    numFmt: '#,##0'
  },
  decimal: {
    numFmt: '#,##0.00'
  },
  percent: {
    numFmt: '0.00%'
  }
};

// ===== FUNCIONES AUXILIARES =====
function aplicarEstiloEncabezado(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = STYLES.header.font;
    cell.fill = STYLES.header.fill;
    cell.alignment = STYLES.header.alignment;
    cell.border = STYLES.header.border;
  });
  row.height = 30;
}

function aplicarEstiloCelda(row: ExcelJS.Row, isEven: boolean) {
  row.eachCell((cell) => {
    cell.font = STYLES.cell.font;
    cell.alignment = STYLES.cell.alignment;
    cell.border = STYLES.cell.border;
    if (isEven) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FC' } };
    }
  });
  row.height = 20;
}

function agregarTitulo(sheet: ExcelJS.Worksheet, titulo: string, subtitulo: string, numCols: number) {
  // Título principal
  sheet.mergeCells(1, 1, 1, Math.min(numCols, 10));
  const titleCell = sheet.getCell('A1');
  titleCell.value = titulo;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF253166' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  // Subtítulo
  sheet.mergeCells(2, 1, 2, Math.min(numCols, 10));
  const subCell = sheet.getCell('A2');
  subCell.value = subtitulo;
  subCell.font = { size: 10, color: { argb: 'FF666666' }, italic: true };
  subCell.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(2).height = 20;

  // Línea en blanco
  sheet.getRow(3).height = 10;
}

function obtenerDatos(codigoProcesamiento: string, filtros?: { where?: string; orderBy?: string }): SKUData[] {
  const whereClause = filtros?.where 
    ? `WHERE codigo_procesamiento = ? AND (${filtros.where})`  
    : 'WHERE codigo_procesamiento = ?';
  
  const orderClause = filtros?.orderBy || 'ORDER BY codigo_sku ASC';
  
  const query = `
    SELECT * FROM forecast_procesamiento
    ${whereClause}
    ${orderClause}
  `;
  
  return db.prepare(query).all(codigoProcesamiento) as SKUData[];
}

/**
 * ✅ NUEVA FUNCIÓN: Calcula la antigüedad en formato "X años, Y días"
 */
function calcularAntiguedad(fechaCreacion: string | null): { dias: number; texto: string } {
  if (!fechaCreacion) {
    return { dias: 0, texto: 'Sin fecha' };
  }

  const fecha = new Date(fechaCreacion);
  const hoy = new Date();
  
  // Calcular diferencia en milisegundos
  const diffMs = hoy.getTime() - fecha.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Calcular años y días restantes
  const años = Math.floor(diffDias / 365);
  const diasRestantes = diffDias % 365;
  
  // Formatear texto
  let texto = '';
  if (años > 0) {
    texto = `${años} año${años > 1 ? 's' : ''}`;
    if (diasRestantes > 0) {
      texto += `, ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}`;
    }
  } else {
    texto = `${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`;
  }
  
  return { dias: diffDias, texto };
}

/**
 * Formatea una fecha ISO a formato legible
 */
function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'Sin fecha';
  
  try {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'Fecha inválida';
  }
}

// ===== GENERADORES DE REPORTES =====

async function generarAnalisis8020(codigoProcesamiento: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VYOWEB - Grupo Vedova & Obando';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Análisis 80-20', {
    views: [{ state: 'frozen', ySplit: 4, xSplit: 2 }]
  });

  // Obtener datos ordenados por promedio_6m DESC
  const datos = obtenerDatos(codigoProcesamiento, {
    where: 'promedio_6m > 0',
    orderBy: 'ORDER BY promedio_6m DESC, venta_ultimos_12m DESC'
  });

  // Calcular total para porcentajes
  const totalVentas = datos.reduce((sum, d) => sum + (d.venta_ultimos_12m || 0), 0);
  const totalProm6m = datos.reduce((sum, d) => sum + (d.promedio_6m || 0), 0);

  // Título
  agregarTitulo(
    sheet, 
    'Análisis Pareto 80/20',
    `Procesamiento: ${codigoProcesamiento} | Total SKUs: ${datos.length.toLocaleString()} | Generado: ${new Date().toLocaleString('es-CR')}`,
    12
  );

  // Encabezados
  const headers = [
    'Ranking', 'Código SKU', 'Descripción', 'Línea', 'Marca', 'ABC',
    'Promedio 6M', 'Venta 12M', '% Individual', '% Acumulado', 'Clasificación 80/20', 'Existencia'
  ];
  
  const headerRow = sheet.addRow(headers);
  aplicarEstiloEncabezado(headerRow);

  // Configurar anchos de columna
  sheet.columns = [
    { width: 10 },  // Ranking
    { width: 15 },  // Código
    { width: 40 },  // Descripción
    { width: 15 },  // Línea
    { width: 15 },  // Marca
    { width: 8 },   // ABC
    { width: 14 },  // Prom 6M
    { width: 14 },  // Venta 12M
    { width: 12 },  // % Individual
    { width: 12 },  // % Acumulado
    { width: 16 },  // Clasificación
    { width: 12 }   // Existencia
  ];

  // Datos con acumulado
  let acumulado = 0;
  datos.forEach((sku, index) => {
    const porcentajeIndividual = totalProm6m > 0 ? (sku.promedio_6m || 0) / totalProm6m : 0;
    acumulado += porcentajeIndividual;
    
    const clasificacion = acumulado <= 0.80 ? 'A - Vital (80%)' : 
                          acumulado <= 0.95 ? 'B - Importante (15%)' : 'C - Trivial (5%)';

    const row = sheet.addRow([
      index + 1,
      sku.codigo_sku,
      sku.descripcion,
      sku.linea,
      sku.marca,
      sku.abc,
      sku.promedio_6m || 0,
      sku.venta_ultimos_12m || 0,
      porcentajeIndividual,
      acumulado,
      clasificacion,
      sku.existencia || 0
    ]);

    aplicarEstiloCelda(row, index % 2 === 0);

    // Formatear celdas numéricas
    row.getCell(7).numFmt = '#,##0.00';
    row.getCell(8).numFmt = '#,##0';
    row.getCell(9).numFmt = '0.00%';
    row.getCell(10).numFmt = '0.00%';
    row.getCell(12).numFmt = '#,##0';

    // Color condicional para clasificación
    const clasifCell = row.getCell(11);
    if (clasificacion.startsWith('A')) {
      clasifCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
      clasifCell.font = { ...STYLES.cell.font, color: { argb: 'FF2E7D32' }, bold: true };
    } else if (clasificacion.startsWith('B')) {
      clasifCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
      clasifCell.font = { ...STYLES.cell.font, color: { argb: 'FFE65100' }, bold: true };
    } else {
      clasifCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };
      clasifCell.font = { ...STYLES.cell.font, color: { argb: 'FFC62828' } };
    }
  });

  // Agregar filtros
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: datos.length + 4, column: 12 }
  };

  return workbook;
}

async function generarControlCompras(codigoProcesamiento: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VYOWEB - Grupo Vedova & Obando';
  
  const sheet = workbook.addWorksheet('Control de Compras', {
    views: [{ state: 'frozen', ySplit: 4, xSplit: 2 }]
  });

  // Solo SKUs con algún pedido
  const datos = obtenerDatos(codigoProcesamiento, {
    where: "(mensaje_courier != '' OR mensaje_aereo != '' OR mensaje_maritimo != '' OR sugerido_analista_urgente > 0 OR sugerido_analista_aereo > 0)",
    orderBy: 'ORDER BY promedio_6m DESC'
  });

  agregarTitulo(
    sheet, 
    'Control de Compras Semanal',
    `Procesamiento: ${codigoProcesamiento} | SKUs con pedido: ${datos.length.toLocaleString()} | Generado: ${new Date().toLocaleString('es-CR')}`,
    18
  );

  const headers = [
    'Código SKU', 'Descripción', 'Línea', 'ABC', 'Rotación',
    'Existencia', 'Tránsito', 'Prom. 6M', 'Stock Seg.',
    'Ref. Courier', 'Cant. Courier', 'Estado Courier',
    'Ref. Aéreo', 'Cant. Aéreo', 'Estado Aéreo',
    'Ref. Marítimo', 'Cant. Marítimo', 'Estado Marítimo',
    'Sug. Urgente', 'Sug. Aéreo', 'Modificado Por'
  ];
  
  const headerRow = sheet.addRow(headers);
  aplicarEstiloEncabezado(headerRow);

  sheet.columns = [
    { width: 14 }, { width: 35 }, { width: 12 }, { width: 6 }, { width: 8 },
    { width: 11 }, { width: 10 }, { width: 11 }, { width: 10 },
    { width: 12 }, { width: 12 }, { width: 15 },
    { width: 12 }, { width: 11 }, { width: 13 },
    { width: 13 }, { width: 13 }, { width: 15 },
    { width: 12 }, { width: 11 }, { width: 18 }
  ];

  datos.forEach((sku, index) => {
    const row = sheet.addRow([
      sku.codigo_sku,
      sku.descripcion,
      sku.linea,
      sku.abc,
      sku.abc_rotacion_frecuencia,
      sku.existencia || 0,
      sku.transito || 0,
      sku.promedio_6m || 0,
      sku.stock_seguridad || 0,
      sku.referencia_pedido_courier || 0,
      Math.abs(sku.cantidad_final_courier || 0),
      sku.mensaje_courier || '-',
      sku.referencia_pedido_aereo || 0,
      Math.abs(sku.cantidad_final_aereo || 0),
      sku.mensaje_aereo || '-',
      sku.referencia_pedido_maritimo || 0,
      Math.abs(sku.cantidad_final_maritimo || 0),
      sku.mensaje_maritimo || '-',
      sku.sugerido_analista_urgente || 0,
      sku.sugerido_analista_aereo || 0,
      sku.usuario_modificacion || '-'
    ]);

    aplicarEstiloCelda(row, index % 2 === 0);

    // Formatear números
    [6, 7, 8, 9, 10, 11, 13, 14, 16, 17, 19, 20].forEach(col => {
      row.getCell(col).numFmt = '#,##0';
    });

    // Colorear estados de pedido
    const estadoCourier = row.getCell(12);
    const estadoAereo = row.getCell(15);
    const estadoMaritimo = row.getCell(18);

    [
      { cell: estadoCourier, msg: sku.mensaje_courier },
      { cell: estadoAereo, msg: sku.mensaje_aereo },
      { cell: estadoMaritimo, msg: sku.mensaje_maritimo }
    ].forEach(({ cell, msg }) => {
      if (msg && msg.includes('PEDIR')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
        cell.font = { ...STYLES.cell.font, color: { argb: 'FFC62828' }, bold: true };
      }
    });

    // Resaltar sugeridos del analista
    if (sku.sugerido_analista_urgente > 0) {
      row.getCell(19).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
      row.getCell(19).font = { ...STYLES.cell.font, color: { argb: 'FF1565C0' }, bold: true };
    }
    if (sku.sugerido_analista_aereo > 0) {
      row.getCell(20).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
      row.getCell(20).font = { ...STYLES.cell.font, color: { argb: 'FF1565C0' }, bold: true };
    }
  });

  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: datos.length + 4, column: 21 }
  };

  return workbook;
}

async function generarABCRotacion(codigoProcesamiento: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VYOWEB - Grupo Vedova & Obando';
  
  // Hoja 1: Detalle por SKU
  const sheetDetalle = workbook.addWorksheet('Detalle ABC-Rotación', {
    views: [{ state: 'frozen', ySplit: 4, xSplit: 2 }]
  });

  const datos = obtenerDatos(codigoProcesamiento, {
    orderBy: 'ORDER BY abc ASC, abc_rotacion_frecuencia ASC, venta_ultimos_12m DESC'
  });

  agregarTitulo(
    sheetDetalle, 
    'Análisis ABC y Rotación - Detalle',
    `Procesamiento: ${codigoProcesamiento} | Total SKUs: ${datos.length.toLocaleString()} | Generado: ${new Date().toLocaleString('es-CR')}`,
    14
  );

  const headersDetalle = [
    'Código SKU', 'Descripción', 'Línea', 'Marca', 'Categoría',
    'ABC Valor', 'ABC Rotación', 'Frecuencia 12M', 'Venta 12M',
    'Promedio 12M', 'Promedio 6M', 'Desv. Estándar', 'Coef. Variación', 'Existencia'
  ];
  
  const headerRow = sheetDetalle.addRow(headersDetalle);
  aplicarEstiloEncabezado(headerRow);

  sheetDetalle.columns = [
    { width: 14 }, { width: 38 }, { width: 14 }, { width: 14 }, { width: 14 },
    { width: 10 }, { width: 12 }, { width: 14 }, { width: 12 },
    { width: 13 }, { width: 12 }, { width: 13 }, { width: 14 }, { width: 12 }
  ];

  const coloresABC: Record<string, string> = {
    'A': 'FFE8F5E9',
    'B': 'FFFFF3E0',
    'C': 'FFFCE4EC',
    'D': 'FFECEFF1',
    'E': 'FFF5F5F5'
  };

  datos.forEach((sku, index) => {
    const row = sheetDetalle.addRow([
      sku.codigo_sku,
      sku.descripcion,
      sku.linea,
      sku.marca,
      sku.categoria,
      sku.abc,
      sku.abc_rotacion_frecuencia,
      sku.frecuencia_ventas_12m || 0,
      sku.venta_ultimos_12m || 0,
      sku.promedio_12m || 0,
      sku.promedio_6m || 0,
      sku.desviacion_estandar || 0,
      sku.coeficiente_variacion || 0,
      sku.existencia || 0
    ]);

    aplicarEstiloCelda(row, index % 2 === 0);

    // Formatear números
    row.getCell(8).numFmt = '#,##0';
    row.getCell(9).numFmt = '#,##0';
    row.getCell(10).numFmt = '#,##0.00';
    row.getCell(11).numFmt = '#,##0.00';
    row.getCell(12).numFmt = '#,##0.00';
    row.getCell(13).numFmt = '0.00';
    row.getCell(14).numFmt = '#,##0';

    // Color por ABC
    const colorABC = coloresABC[sku.abc] || 'FFFFFFFF';
    row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorABC } };
    row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorABC } };
  });

  sheetDetalle.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: datos.length + 4, column: 14 }
  };

  // Hoja 2: Resumen estadístico
  const sheetResumen = workbook.addWorksheet('Resumen Estadístico');
  
  agregarTitulo(sheetResumen, 'Resumen ABC y Rotación', `Procesamiento: ${codigoProcesamiento}`, 6);

  // Calcular estadísticas
  const statsPorABC: Record<string, { count: number; ventas: number; existencia: number }> = {};
  const statsPorRotacion: Record<string, { count: number; ventas: number }> = {};

  datos.forEach(sku => {
    const abc = sku.abc || 'N/A';
    const rot = sku.abc_rotacion_frecuencia || 'N/A';

    if (!statsPorABC[abc]) statsPorABC[abc] = { count: 0, ventas: 0, existencia: 0 };
    statsPorABC[abc].count++;
    statsPorABC[abc].ventas += sku.venta_ultimos_12m || 0;
    statsPorABC[abc].existencia += sku.existencia || 0;

    if (!statsPorRotacion[rot]) statsPorRotacion[rot] = { count: 0, ventas: 0 };
    statsPorRotacion[rot].count++;
    statsPorRotacion[rot].ventas += sku.venta_ultimos_12m || 0;
  });

  // Tabla ABC
  const headerABC = sheetResumen.addRow(['ABC', 'SKUs', '% SKUs', 'Ventas 12M', '% Ventas', 'Existencia']);
  aplicarEstiloEncabezado(headerABC);
  
  const totalSKUs = datos.length;
  const totalVentas = datos.reduce((sum, d) => sum + (d.venta_ultimos_12m || 0), 0);

  ['A', 'B', 'C', 'D', 'E'].forEach((abc, i) => {
    const stats = statsPorABC[abc] || { count: 0, ventas: 0, existencia: 0 };
    const row = sheetResumen.addRow([
      abc,
      stats.count,
      stats.count / totalSKUs,
      stats.ventas,
      totalVentas > 0 ? stats.ventas / totalVentas : 0,
      stats.existencia
    ]);
    aplicarEstiloCelda(row, i % 2 === 0);
    row.getCell(2).numFmt = '#,##0';
    row.getCell(3).numFmt = '0.00%';
    row.getCell(4).numFmt = '#,##0';
    row.getCell(5).numFmt = '0.00%';
    row.getCell(6).numFmt = '#,##0';
  });

  sheetResumen.addRow([]);
  sheetResumen.addRow([]);

  // Tabla Rotación
  const headerRot = sheetResumen.addRow(['Rotación', 'SKUs', '% SKUs', 'Ventas 12M', '% Ventas', 'Descripción']);
  aplicarEstiloEncabezado(headerRot);

  const descripcionRotacion: Record<string, string> = {
    'A': '6+ meses con ventas (Alta)',
    'B': '4-5 meses con ventas (Media-Alta)',
    'C': '3 meses con ventas (Media)',
    'D': '2 meses con ventas (Baja)',
    'E': '0-1 meses con ventas (Muy Baja)'
  };

  ['A', 'B', 'C', 'D', 'E'].forEach((rot, i) => {
    const stats = statsPorRotacion[rot] || { count: 0, ventas: 0 };
    const row = sheetResumen.addRow([
      rot,
      stats.count,
      stats.count / totalSKUs,
      stats.ventas,
      totalVentas > 0 ? stats.ventas / totalVentas : 0,
      descripcionRotacion[rot] || ''
    ]);
    aplicarEstiloCelda(row, i % 2 === 0);
    row.getCell(2).numFmt = '#,##0';
    row.getCell(3).numFmt = '0.00%';
    row.getCell(4).numFmt = '#,##0';
    row.getCell(5).numFmt = '0.00%';
  });

  sheetResumen.columns = [
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 30 }
  ];

  return workbook;
}

async function generarPedidoPrecios(codigoProcesamiento: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VYOWEB - Grupo Vedova & Obando';
  
  const sheet = workbook.addWorksheet('Pedido con Precios', {
    views: [{ state: 'frozen', ySplit: 4, xSplit: 2 }]
  });

  // SKUs con algún pedido o sugerido
  const datos = obtenerDatos(codigoProcesamiento, {
    where: "(cantidad_final_courier < 0 OR cantidad_final_aereo < 0 OR cantidad_final_maritimo < 0 OR sugerido_analista_urgente > 0 OR sugerido_analista_aereo > 0)",
    orderBy: 'ORDER BY promedio_6m DESC'
  });

  agregarTitulo(
    sheet, 
    'Reporte de Pedido Total con Precios',
    `Procesamiento: ${codigoProcesamiento} | SKUs en pedido: ${datos.length.toLocaleString()} | Generado: ${new Date().toLocaleString('es-CR')}`,
    16
  );

  const headers = [
    'Código SKU', 'Código Proveedor', 'Descripción', 'Línea', 'Marca',
    'Cant. Courier', 'Cant. Aéreo', 'Cant. Marítimo', 'Sug. Urgente', 'Sug. Aéreo',
    'Total Unidades', 'Costo Unit. ₡', 'Costo Unit. $',
    'Total Pedido ₡', 'Total Pedido $', 'Lead Time'
  ];
  
  const headerRow = sheet.addRow(headers);
  aplicarEstiloEncabezado(headerRow);

  sheet.columns = [
    { width: 14 }, { width: 16 }, { width: 38 }, { width: 12 }, { width: 12 },
    { width: 12 }, { width: 12 }, { width: 13 }, { width: 12 }, { width: 12 },
    { width: 14 }, { width: 14 }, { width: 12 },
    { width: 15 }, { width: 14 }, { width: 10 }
  ];

  let totalGeneral = { unidades: 0, colones: 0, dolares: 0 };

  datos.forEach((sku, index) => {
    const cantCourier = Math.abs(sku.cantidad_final_courier || 0);
    const cantAereo = Math.abs(sku.cantidad_final_aereo || 0);
    const cantMaritimo = Math.abs(sku.cantidad_final_maritimo || 0);
    const sugUrgente = sku.sugerido_analista_urgente || 0;
    const sugAereo = sku.sugerido_analista_aereo || 0;
    
    const totalUnidades = cantCourier + cantAereo + cantMaritimo + sugUrgente + sugAereo;
    const costoLoc = sku.costo_ult_loc || 0;
    const costoDol = sku.costo_ult_dol || 0;
    const totalColones = totalUnidades * costoLoc;
    const totalDolares = totalUnidades * costoDol;

    totalGeneral.unidades += totalUnidades;
    totalGeneral.colones += totalColones;
    totalGeneral.dolares += totalDolares;

    const row = sheet.addRow([
      sku.codigo_sku,
      sku.codigo_proveedor,
      sku.descripcion,
      sku.linea,
      sku.marca,
      cantCourier > 0 ? cantCourier : '',
      cantAereo > 0 ? cantAereo : '',
      cantMaritimo > 0 ? cantMaritimo : '',
      sugUrgente > 0 ? sugUrgente : '',
      sugAereo > 0 ? sugAereo : '',
      totalUnidades,
      costoLoc > 0 ? costoLoc : '',
      costoDol > 0 ? costoDol : '',
      totalColones > 0 ? totalColones : '',
      totalDolares > 0 ? totalDolares : '',
      sku.lead_time || ''
    ]);

    aplicarEstiloCelda(row, index % 2 === 0);

    // Formatear números
    [6, 7, 8, 9, 10, 11].forEach(col => {
      if (row.getCell(col).value) row.getCell(col).numFmt = '#,##0';
    });
    if (row.getCell(12).value) row.getCell(12).numFmt = '₡#,##0.00';
    if (row.getCell(13).value) row.getCell(13).numFmt = '$#,##0.00';
    if (row.getCell(14).value) row.getCell(14).numFmt = '₡#,##0.00';
    if (row.getCell(15).value) row.getCell(15).numFmt = '$#,##0.00';
  });

  // Fila de totales
  const totalRow = sheet.addRow([
    '', '', '', '', 'TOTALES:',
    '', '', '', '', '',
    totalGeneral.unidades,
    '', '',
    totalGeneral.colones,
    totalGeneral.dolares,
    ''
  ]);

  totalRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECEFF1' } };
    cell.border = STYLES.header.border;
  });
  totalRow.getCell(11).numFmt = '#,##0';
  totalRow.getCell(14).numFmt = '₡#,##0.00';
  totalRow.getCell(15).numFmt = '$#,##0.00';
  totalRow.height = 25;

  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: datos.length + 4, column: 16 }
  };

  return workbook;
}

/**
 * ✅ REPORTE CORREGIDO: Antigüedad SKUs con fecha_creacion y cálculo de años/días
 */
async function generarAntiguedadSKUs(codigoProcesamiento: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VYOWEB - Grupo Vedova & Obando';
  
  const sheet = workbook.addWorksheet('SKUs Sin Movimiento', {
    views: [{ state: 'frozen', ySplit: 4, xSplit: 2 }]
  });

  // SKUs sin ventas en 12 meses pero con existencia
  // Ordenar por fecha_creacion ASC (los más viejos primero)
  const datos = obtenerDatos(codigoProcesamiento, {
    where: "frecuencia_ventas_12m = 0 AND existencia > 0",
    orderBy: 'ORDER BY fecha_creacion ASC, existencia DESC'
  });

  agregarTitulo(
    sheet, 
    'Reporte de Antigüedad - SKUs Sin Movimiento',
    `Procesamiento: ${codigoProcesamiento} | SKUs sin movimiento: ${datos.length.toLocaleString()} | Generado: ${new Date().toLocaleString('es-CR')}`,
    12
  );

  // ✅ ENCABEZADOS ACTUALIZADOS con Frecuencia
  const headers = [
    'Código SKU', 
    'Descripción', 
    'Línea', 
    'Marca', 
    'Fecha Creación',
    'Antigüedad',
    'Frecuencia 12M',  // ✅ NUEVA COLUMNA
    'Venta 12M',       // ✅ NUEVA COLUMNA para contexto
    'Existencia', 
    'Costo Unit. ₡',
    'Valor Inventario ₡'
  ];
  
  const headerRow = sheet.addRow(headers);
  aplicarEstiloEncabezado(headerRow);

  // ✅ ANCHOS DE COLUMNA AJUSTADOS
  sheet.columns = [
    { width: 15 },  // Código SKU
    { width: 42 },  // Descripción
    { width: 15 },  // Línea
    { width: 15 },  // Marca
    { width: 14 },  // Fecha Creación
    { width: 20 },  // Antigüedad (años, días)
    { width: 14 },  // ✅ NUEVA: Frecuencia 12M
    { width: 12 },  // ✅ NUEVA: Venta 12M
    { width: 12 },  // Existencia
    { width: 14 },  // Costo Unit. ₡
    { width: 18 }   // Valor Inventario ₡
  ];

  let totalExistencia = 0;
  let totalValorInventario = 0;

  datos.forEach((sku, index) => {
    const valorInventario = (sku.existencia || 0) * (sku.costo_ult_loc || 0);
    totalValorInventario += valorInventario;
    totalExistencia += sku.existencia || 0;

    // Calcular antigüedad
    const antiguedad = calcularAntiguedad(sku.fecha_creacion);

    const row = sheet.addRow([
      sku.codigo_sku,
      sku.descripcion,
      sku.linea,
      sku.marca,
      formatearFecha(sku.fecha_creacion),
      antiguedad.texto,
      `${sku.frecuencia_ventas_12m}/12`,  // NUEVO: Mostrar frecuencia
      sku.venta_ultimos_12m || 0,         // NUEVO: Venta total
      sku.existencia || 0,
      sku.costo_ult_loc || 0,
      valorInventario
    ]);

    aplicarEstiloCelda(row, index % 2 === 0);

    // ✅ FORMATEAR CELDAS
    // Frecuencia - estilo especial
    const celdaFreq = row.getCell(7);
    celdaFreq.font = { ...STYLES.cell.font, bold: true };
    celdaFreq.alignment = { horizontal: 'center', vertical: 'middle' };
    celdaFreq.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0E0' } };
    celdaFreq.font = { ...STYLES.cell.font, color: { argb: 'FFC62828' }, bold: true };

    // Venta 12M
    row.getCell(8).numFmt = '#,##0';
    
    // Existencia
    row.getCell(9).numFmt = '#,##0';
    
    // Costos
    row.getCell(10).numFmt = '₡#,##0.00';
    row.getCell(11).numFmt = '₡#,##0.00';

    // ✅ COLOR CONDICIONAL POR ANTIGÜEDAD
    const añosAntiguedad = Math.floor(antiguedad.dias / 365);
    const celdaAntiguedad = row.getCell(6);
    
    if (añosAntiguedad >= 3) {
      // Más de 3 años: ROJO CRÍTICO
      celdaAntiguedad.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
      celdaAntiguedad.font = { ...STYLES.cell.font, color: { argb: 'FFC62828' }, bold: true };
    } else if (añosAntiguedad >= 2) {
      // 2-3 años: NARANJA
      celdaAntiguedad.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
      celdaAntiguedad.font = { ...STYLES.cell.font, color: { argb: 'FFE65100' }, bold: true };
    } else if (añosAntiguedad >= 1) {
      // 1-2 años: AMARILLO
      celdaAntiguedad.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDE7' } };
      celdaAntiguedad.font = { ...STYLES.cell.font, color: { argb: 'FFF9A825' } };
    }
    // Menos de 1 año: sin color especial

    // Resaltar valores de inventario altos (> ₡100,000)
    if (valorInventario > 100000) {
      row.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
      row.getCell(11).font = { ...STYLES.cell.font, color: { argb: 'FFC62828' }, bold: true };
    }
  });

  // ✅ FILA DE TOTALES ACTUALIZADA
  const totalRow = sheet.addRow([
    '', 
    '', 
    '', 
    'TOTALES:', 
    '',
    `${datos.length} SKUs`,
    '0/12',  // ✅ Frecuencia promedio (todos son 0 en este reporte)
    '',      // ✅ Placeholder para venta
    totalExistencia,
    '',
    totalValorInventario
  ]);

  totalRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECEFF1' } };
    cell.border = STYLES.header.border;
  });
  
  // Formatear celdas de totales
  totalRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.getCell(9).numFmt = '#,##0';
  totalRow.getCell(11).numFmt = '₡#,##0.00';
  totalRow.height = 25;

  // ✅ AGREGAR FILTROS
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: datos.length + 4, column: 11 }
  };

  return workbook;
}


/**
 * ✅ REPORTE REDISEÑADO: Productos NUEVOS con ventas
 */
async function generarProductosNuevos(codigoProcesamiento: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VYOWEB - Grupo Vedova & Obando';
  
  const sheet = workbook.addWorksheet('Productos Nuevos', {
    views: [{ state: 'frozen', ySplit: 4, xSplit: 2 }]
  });

  // Productos agregados en los últimos 6 meses que ya tienen ventas
  const datos = obtenerDatos(codigoProcesamiento, {
    where: "fecha_creacion >= date('now', '-6 months') AND venta_ultimos_12m > 0",
    orderBy: 'ORDER BY fecha_creacion DESC, venta_ultimos_12m DESC'
  });

  agregarTitulo(
    sheet, 
    'Productos Nuevos con Ventas',
    `Procesamiento: ${codigoProcesamiento} | Productos nuevos: ${datos.length.toLocaleString()} | Generado: ${new Date().toLocaleString('es-CR')}`,
    13
  );

  const headers = [
    'Código SKU', 'Código Proveedor', 'Descripción', 'Línea', 'Marca',
    'Fecha Creación', 'Antigüedad', 'ABC', 'Rotación', 
    'Venta 12M', 'Promedio 6M', 'Existencia', 'Estado'
  ];
  
  const headerRow = sheet.addRow(headers);
  aplicarEstiloEncabezado(headerRow);

  sheet.columns = [
    { width: 14 }, { width: 16 }, { width: 40 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 18 }, { width: 8 }, { width: 10 }, 
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 16 }
  ];

  datos.forEach((sku, index) => {
    const antiguedad = calcularAntiguedad(sku.fecha_creacion);
    
    // Determinar estado de rendimiento
    let estado = 'Excelente';
    if (sku.venta_ultimos_12m >= sku.promedio_6m * 8) {
      estado = 'Excepcional';
    } else if (sku.existencia <= 0 && sku.transito <= 0) {
      estado = 'Sin Stock';
    } else if (sku.existencia < (sku.promedio_6m || 0)) {
      estado = 'Reabastecer';
    }

    const row = sheet.addRow([
      sku.codigo_sku,
      sku.codigo_proveedor || '-',
      sku.descripcion,
      sku.linea || '-',
      sku.marca || '-',
      formatearFecha(sku.fecha_creacion),
      antiguedad.texto,
      sku.abc,
      sku.abc_rotacion_frecuencia,
      sku.venta_ultimos_12m || 0,
      sku.promedio_6m || 0,
      sku.existencia || 0,
      estado
    ]);

    aplicarEstiloCelda(row, index % 2 === 0);

    row.getCell(10).numFmt = '#,##0';
    row.getCell(11).numFmt = '#,##0.00';
    row.getCell(12).numFmt = '#,##0';

    // Colorear por antigüedad
    const diasAntig = antiguedad.dias;
    const celdaAntig = row.getCell(7);
    if (diasAntig < 30) {
      celdaAntig.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
      celdaAntig.font = { ...STYLES.cell.font, color: { argb: 'FF2E7D32' }, bold: true };
    } else if (diasAntig < 90) {
      celdaAntig.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
      celdaAntig.font = { ...STYLES.cell.font, color: { argb: 'FF1565C0' } };
    }

    // Colorear estado
    const estadoCell = row.getCell(13);
    if (estado.includes('Excepcional')) {
      estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
      estadoCell.font = { ...STYLES.cell.font, color: { argb: 'FFE65100' }, bold: true };
    } else if (estado.includes('Sin Stock')) {
      estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
      estadoCell.font = { ...STYLES.cell.font, color: { argb: 'FFC62828' }, bold: true };
    } else if (estado.includes('Reabastecer')) {
      estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
      estadoCell.font = { ...STYLES.cell.font, color: { argb: 'FFE65100' } };
    } else {
      estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
      estadoCell.font = { ...STYLES.cell.font, color: { argb: 'FF2E7D32' } };
    }
  });

  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: datos.length + 4, column: 13 }
  };

  return workbook;
}

/**
 * ✅ NUEVO REPORTE: Productos REACTIVADOS
 */
async function generarProductosReactivados(codigoProcesamiento: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VYOWEB - Grupo Vedova & Obando';
  
  const sheet = workbook.addWorksheet('Productos Reactivados', {
    views: [{ state: 'frozen', ySplit: 4, xSplit: 2 }]
  });

  // ✅ LÓGICA CORREGIDA:
  // 1. Producto antiguo (> 1 año)
  // 2. Frecuencia BAJA histórica (1-3 meses de 12) - vendía poco
  // 3. Última venta RECIENTE (últimos 2 meses) - ahora sí está vendiendo
  // 4. Promedio 6M > 0 - confirma actividad reciente
  const datos = obtenerDatos(codigoProcesamiento, {
    where: `
      fecha_creacion < date('now', '-12 months') 
      AND frecuencia_ventas_12m BETWEEN 1 AND 3 
      AND ultima_salida >= date('now', '-2 months')
      AND promedio_6m > 0
    `,
    orderBy: 'ORDER BY promedio_6m DESC, ultima_salida DESC'
  });

  agregarTitulo(
    sheet, 
    'Productos Reactivados',
    `Procesamiento: ${codigoProcesamiento} | Productos reactivados: ${datos.length.toLocaleString()} | Generado: ${new Date().toLocaleString('es-CR')}`,
    15
  );

  const headers = [
    'Código SKU', 'Código Proveedor', 'Descripción', 'Línea', 'Marca',
    'Fecha Creación', 'Última Venta', 'Frecuencia 12M', 'Venta 12M',
    'Promedio 6M', 'Existencia', 'Tránsito', 'ABC', 'Rotación', 'Oportunidad'
  ];
  
  const headerRow = sheet.addRow(headers);
  aplicarEstiloEncabezado(headerRow);

  sheet.columns = [
    { width: 14 }, { width: 16 }, { width: 40 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 12 },
    { width: 12 }, { width: 12 }, { width: 10 }, { width: 8 }, { width: 10 }, { width: 18 }
  ];

  datos.forEach((sku, index) => {
    // ✅ Evaluar oportunidad de reactivación
    let oportunidad = 'Moderada';
    
    // Si el promedio de 6 meses es alto comparado con lo poco que vendía antes
    const promedioHistorico = sku.venta_ultimos_12m / 12;
    
    if (sku.promedio_6m > promedioHistorico * 3) {
      oportunidad = 'Alta - Acelerar';
    } else if (sku.promedio_6m > promedioHistorico * 1.5) {
      oportunidad = 'Buena - Monitorear';
    }

    // Verificar stock
    if (sku.existencia <= 0 && sku.transito <= 0) {
      oportunidad = 'SIN STOCK!';
    } else if (sku.existencia < sku.promedio_6m * 2) {
      oportunidad = '' + oportunidad.split(' ')[1] + ' - Reabastecer';
    }

    const row = sheet.addRow([
      sku.codigo_sku,
      sku.codigo_proveedor || '-',
      sku.descripcion,
      sku.linea || '-',
      sku.marca || '-',
      formatearFecha(sku.fecha_creacion),
      formatearFecha(sku.ultima_salida),
      `${sku.frecuencia_ventas_12m}/12`,
      sku.venta_ultimos_12m || 0,
      sku.promedio_6m || 0,
      sku.existencia || 0,
      sku.transito || 0,
      sku.abc,
      sku.abc_rotacion_frecuencia,
      oportunidad
    ]);

    aplicarEstiloCelda(row, index % 2 === 0);

    // Frecuencia - BAJA (esto es bueno para este reporte)
    const celdaFreq = row.getCell(8);
    celdaFreq.alignment = { horizontal: 'center', vertical: 'middle' };
    celdaFreq.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0E0' } };
    celdaFreq.font = { ...STYLES.cell.font, color: { argb: 'FFC62828' }, bold: true };

    row.getCell(9).numFmt = '#,##0';
    
    // Promedio 6M - RESALTAR (esto es lo importante)
    const celdaProm6m = row.getCell(10);
    celdaProm6m.numFmt = '#,##0.00';
    celdaProm6m.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    celdaProm6m.font = { ...STYLES.cell.font, color: { argb: 'FF2E7D32' }, bold: true };
    
    row.getCell(11).numFmt = '#,##0';
    row.getCell(12).numFmt = '#,##0';

    // Colorear oportunidad
    const opCell = row.getCell(15);
    if (oportunidad.includes('Alta')) {
      opCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
      opCell.font = { ...STYLES.cell.font, color: { argb: 'FFE65100' }, bold: true };
    } else if (oportunidad.includes('SIN STOCK')) {
      opCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
      opCell.font = { ...STYLES.cell.font, color: { argb: 'FFC62828' }, bold: true };
    } else if (oportunidad.includes('Buena')) {
      opCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
      opCell.font = { ...STYLES.cell.font, color: { argb: 'FF2E7D32' }, bold: true };
    } else if (oportunidad.includes('Reabastecer')) {
      opCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
      opCell.font = { ...STYLES.cell.font, color: { argb: 'FFE65100' }, bold: true };
    } else {
      opCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
      opCell.font = { ...STYLES.cell.font, color: { argb: 'FF1565C0' } };
    }
  });

  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: datos.length + 4, column: 15 }
  };

  return workbook;
}

async function generarSugerenciasAnalista(codigoProcesamiento: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VYOWEB - Grupo Vedova & Obando';
  
  const sheet = workbook.addWorksheet('Sugerencias Analista', {
    views: [{ state: 'frozen', ySplit: 4, xSplit: 2 }]
  });

  // ✅ DEBUGGING: Ver qué está pasando
  console.log('🔍 [DEBUG] Procesamiento buscado:', codigoProcesamiento);
  
  // Verificar estadísticas del procesamiento
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN sugerido_analista_urgente > 0 OR sugerido_analista_aereo > 0 THEN 1 ELSE 0 END) as editados,
      SUM(CASE WHEN sugerido_analista_urgente > 0 THEN 1 ELSE 0 END) as con_courier,
      SUM(CASE WHEN sugerido_analista_aereo > 0 THEN 1 ELSE 0 END) as con_aereo
    FROM forecast_procesamiento
    WHERE codigo_procesamiento = ?
  `).get(codigoProcesamiento);
  
  console.log('📊 [DEBUG] Estadísticas del procesamiento:', stats);
  
  // Ver muestra de SKUs con valores
  const muestra = db.prepare(`
    SELECT 
      codigo_sku, 
      sugerido_analista_urgente, 
      sugerido_analista_aereo,
      usuario_modificacion,
      fecha_modificacion
    FROM forecast_procesamiento
    WHERE codigo_procesamiento = ?
      AND (sugerido_analista_urgente > 0 OR sugerido_analista_aereo > 0)
    LIMIT 5
  `).all(codigoProcesamiento);
  
  console.log('🔬 [DEBUG] Muestra de SKUs editados:', muestra);

  // SKUs con sugerencias del analista (courier O aéreo)
  const datos = obtenerDatos(codigoProcesamiento, {
    where: "sugerido_analista_urgente > 0 OR sugerido_analista_aereo > 0",
    orderBy: 'ORDER BY (sugerido_analista_urgente + sugerido_analista_aereo) * COALESCE(costo_ult_loc, costo_ult_dol, 0) DESC'
  });

  console.log('📦 [DEBUG] Total SKUs retornados por obtenerDatos():', datos.length);

  // ✅ SI NO HAY DATOS, RETORNAR EXCEL VACÍO CON MENSAJE
  if (datos.length === 0) {
    agregarTitulo(
      sheet, 
      'Resumen de Sugerencias del Analista',
      `Procesamiento: ${codigoProcesamiento} | Sin SKUs editados | Generado: ${new Date().toLocaleString('es-CR')}`,
      17
    );

    const headers = [
      'Código SKU', 
      'Código Proveedor',
      'Descripción', 
      'Línea', 
      'Marca',
      'ABC',
      'Rotación',
      'Existencia', 
      'Tránsito',
      'Promedio 6M',
      'Stock Seguridad',
      'Sug. Courier', 
      'Sug. Aéreo',
      'Total Sugerido',
      'Costo Unit. ₡',
      'Valor Total ₡',
      'Modificado Por'
    ];
    
    const headerRow = sheet.addRow(headers);
    aplicarEstiloEncabezado(headerRow);

    // Mensaje de no datos
    const mensajeRow = sheet.addRow(['', '', 'No hay SKUs editados por el analista en este procesamiento']);
    sheet.mergeCells(mensajeRow.number, 3, mensajeRow.number, 17);
    mensajeRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    mensajeRow.getCell(3).font = { italic: true, color: { argb: 'FF666666' } };
    mensajeRow.height = 40;

    console.log('⚠️ [DEBUG] Retornando Excel vacío - no hay datos');
    return workbook;
  }

  agregarTitulo(
    sheet, 
    'Resumen de Sugerencias del Analista',
    `Procesamiento: ${codigoProcesamiento} | SKUs editados: ${datos.length.toLocaleString()} | Generado: ${new Date().toLocaleString('es-CR')}`,
    17
  );

  const headers = [
    'Código SKU', 
    'Código Proveedor',
    'Descripción', 
    'Línea', 
    'Marca',
    'ABC',
    'Rotación',
    'Existencia', 
    'Tránsito',
    'Promedio 6M',
    'Stock Seguridad',
    'Sug. Courier', 
    'Sug. Aéreo',
    'Total Sugerido',
    'Costo Unit. ₡',
    'Valor Total ₡',
    'Modificado Por'
  ];
  
  const headerRow = sheet.addRow(headers);
  aplicarEstiloEncabezado(headerRow);

  sheet.columns = [
    { width: 14 },  // Código SKU
    { width: 16 },  // Código Proveedor
    { width: 40 },  // Descripción
    { width: 14 },  // Línea
    { width: 14 },  // Marca
    { width: 8 },   // ABC
    { width: 10 },  // Rotación
    { width: 12 },  // Existencia
    { width: 10 },  // Tránsito
    { width: 12 },  // Promedio 6M
    { width: 12 },  // Stock Seguridad
    { width: 14 },  // Sug. Courier
    { width: 14 },  // Sug. Aéreo
    { width: 14 },  // Total Sugerido
    { width: 14 },  // Costo Unit. ₡
    { width: 16 },  // Valor Total ₡
    { width: 20 }   // Modificado Por
  ];

  let totales = {
    skus: 0,
    courier: 0,
    aereo: 0,
    total: 0,
    valorColones: 0,
    valorDolares: 0
  };

  datos.forEach((sku, index) => {
    const sugCourier = sku.sugerido_analista_urgente || 0;
    const sugAereo = sku.sugerido_analista_aereo || 0;
    const totalSugerido = sugCourier + sugAereo;
    
    // Costo: priorizar colones, si no usar dólares
    const costoLoc = sku.costo_ult_loc || 0;
    const costoDol = sku.costo_ult_dol || 0;
    const costoUsar = costoLoc > 0 ? costoLoc : costoDol;
    const esColones = costoLoc > 0;
    
    const valorTotal = totalSugerido * costoUsar;

    // Acumular totales
    totales.skus++;
    totales.courier += sugCourier;
    totales.aereo += sugAereo;
    totales.total += totalSugerido;
    if (esColones) {
      totales.valorColones += valorTotal;
    } else {
      totales.valorDolares += valorTotal;
    }

    const row = sheet.addRow([
      sku.codigo_sku,
      sku.codigo_proveedor || '-',
      sku.descripcion,
      sku.linea || '-',
      sku.marca || '-',
      sku.abc,
      sku.abc_rotacion_frecuencia,
      sku.existencia || 0,
      sku.transito || 0,
      sku.promedio_6m || 0,
      sku.stock_seguridad || 0,
      sugCourier,
      sugAereo,
      totalSugerido,
      costoUsar > 0 ? costoUsar : '',
      valorTotal > 0 ? valorTotal : '',
      sku.usuario_modificacion || '-'
    ]);

    aplicarEstiloCelda(row, index % 2 === 0);

    // Formatear números
    row.getCell(8).numFmt = '#,##0';   // Existencia
    row.getCell(9).numFmt = '#,##0';   // Tránsito
    row.getCell(10).numFmt = '#,##0.00'; // Promedio 6M
    row.getCell(11).numFmt = '#,##0';  // Stock Seguridad

    // ✅ DIFERENCIAR VISUALMENTE COURIER VS AÉREO
    // Sugerido Courier - Fondo naranja
    const celdaCourier = row.getCell(12);
    if (sugCourier > 0) {
      celdaCourier.numFmt = '#,##0';
      celdaCourier.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
      celdaCourier.font = { ...STYLES.cell.font, color: { argb: 'FFE65100' }, bold: true };
    } else {
      celdaCourier.value = '-';
      celdaCourier.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    }

    // Sugerido Aéreo - Fondo morado
    const celdaAereo = row.getCell(13);
    if (sugAereo > 0) {
      celdaAereo.numFmt = '#,##0';
      celdaAereo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1BEE7' } };
      celdaAereo.font = { ...STYLES.cell.font, color: { argb: 'FF6A1B9A' }, bold: true };
    } else {
      celdaAereo.value = '-';
      celdaAereo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    }

    // Total Sugerido
    const celdaTotal = row.getCell(14);
    celdaTotal.numFmt = '#,##0';
    celdaTotal.font = { ...STYLES.cell.font, bold: true };
    celdaTotal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };

    // Costo
    if (row.getCell(15).value) {
      row.getCell(15).numFmt = esColones ? '₡#,##0.00' : '$#,##0.00';
    }

    // Valor Total
    if (row.getCell(16).value) {
      const celdaValor = row.getCell(16);
      celdaValor.numFmt = esColones ? '₡#,##0.00' : '$#,##0.00';
      
      // ✅ RESALTAR VALORES ALTOS (> ₡500,000 o $1,000)
      if ((esColones && valorTotal > 500000) || (!esColones && valorTotal > 1000)) {
        celdaValor.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
        celdaValor.font = { ...STYLES.cell.font, color: { argb: 'FFC62828' }, bold: true };
      }
    }
  });

  console.log('💰 [DEBUG] Totales calculados:', totales);

  // ===== FILA DE TOTALES =====
  const totalRow = sheet.addRow([
    '', 
    '', 
    '', 
    '', 
    'TOTALES:', 
    '',
    '',
    '',
    '',
    '',
    '',
    totales.courier,
    totales.aereo,
    totales.total,
    '',
    '', // Valor lo ponemos en texto aparte
    `${totales.skus} SKUs editados`
  ]);

  totalRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECEFF1' } };
    cell.border = STYLES.header.border;
  });

  // Formatear columnas de totales
  totalRow.getCell(12).numFmt = '#,##0';
  totalRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
  totalRow.getCell(12).font = { ...STYLES.cell.font, color: { argb: 'FFE65100' }, bold: true };
  
  totalRow.getCell(13).numFmt = '#,##0';
  totalRow.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1BEE7' } };
  totalRow.getCell(13).font = { ...STYLES.cell.font, color: { argb: 'FF6A1B9A' }, bold: true };
  
  totalRow.getCell(14).numFmt = '#,##0';
  totalRow.getCell(14).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
  
  totalRow.height = 25;

  // ===== FILA DE VALORES TOTALES =====
  let valorTexto = '';
  if (totales.valorColones > 0 && totales.valorDolares > 0) {
    valorTexto = `VALOR TOTAL: ₡${totales.valorColones.toLocaleString('es-CR', { minimumFractionDigits: 2 })} + $${totales.valorDolares.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  } else if (totales.valorColones > 0) {
    valorTexto = `VALOR TOTAL: ₡${totales.valorColones.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
  } else if (totales.valorDolares > 0) {
    valorTexto = `VALOR TOTAL: $${totales.valorDolares.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  if (valorTexto) {
    const valorRow = sheet.addRow(['', '', '', '', valorTexto]);
    sheet.mergeCells(valorRow.number, 5, valorRow.number, 17);
    const valorCell = valorRow.getCell(5);
    valorCell.font = { bold: true, size: 12, color: { argb: 'FF1565C0' } };
    valorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
    valorCell.alignment = { horizontal: 'center', vertical: 'middle' };
    valorCell.border = STYLES.header.border;
    valorRow.height = 28;
  }

  // ===== FILTROS =====
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: datos.length + 4, column: 17 }
  };

  return workbook;
}


/**
 * ✅ NUEVO REPORTE: SKUs con Pedido Sugerido por el Sistema
 */
async function generarSKUsConPedido(codigoProcesamiento: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VYOWEB - Grupo Vedova & Obando';
  
  const sheet = workbook.addWorksheet('SKUs con Pedido', {
    views: [{ state: 'frozen', ySplit: 4, xSplit: 2 }]
  });

  // SKUs con algún mensaje de pedido (courier, aereo o maritimo)
  const datos = obtenerDatos(codigoProcesamiento, {
    where: "(mensaje_courier != '' OR mensaje_aereo != '' OR mensaje_maritimo != '')",
    orderBy: 'ORDER BY promedio_6m DESC, venta_ultimos_12m DESC'
  });

  agregarTitulo(
    sheet, 
    'SKUs con Pedido Sugerido por el Sistema',
    `Procesamiento: ${codigoProcesamiento} | SKUs con pedido: ${datos.length.toLocaleString()} | Generado: ${new Date().toLocaleString('es-CR')}`,
    20
  );

  const headers = [
    'Código SKU', 
    'Código Proveedor',
    'Descripción', 
    'Línea', 
    'Marca',
    'Rotación',
    'Existencia', 
    'Tránsito',
    'Promedio 6M',
    'Stock Seguridad',
    'Ref. Courier',
    'Cant. Courier',
    'Ref. Aéreo',
    'Cant. Aéreo',
    'Ref. Marítimo',
    'Cant. Marítimo',
    'Total a Pedir',
    'Costo Unit. ₡',
    'Costo Unit. $',
    'Valor Pedido ₡'
  ];
  
  const headerRow = sheet.addRow(headers);
  aplicarEstiloEncabezado(headerRow);

  sheet.columns = [
    { width: 14 },  // Código SKU
    { width: 16 },  // Código Proveedor
    { width: 38 },  // Descripción
    { width: 12 },  // Línea
    { width: 12 },  // Marca
    { width: 10 },  // Rotación
    { width: 11 },  // Existencia
    { width: 10 },  // Tránsito
    { width: 12 },  // Promedio 6M
    { width: 12 },  // Stock Seguridad
    { width: 12 },  // Ref. Courier
    { width: 12 },  // Cant. Courier
    { width: 12 },  // Ref. Aéreo
    { width: 12 },  // Cant. Aéreo
    { width: 13 },  // Ref. Marítimo
    { width: 13 },  // Cant. Marítimo
    { width: 12 },  // Total a Pedir
    { width: 13 },  // Costo Unit. ₡
    { width: 12 },  // Costo Unit. $
    { width: 15 }   // Valor Pedido ₡
  ];

  let totales = {
    skus: 0,
    courier: 0,
    aereo: 0,
    maritimo: 0,
    total: 0,
    valorColones: 0
  };

  datos.forEach((sku, index) => {
    const cantCourier = sku.mensaje_courier ? Math.abs(sku.cantidad_final_courier || 0) : 0;
    const cantAereo = sku.mensaje_aereo ? Math.abs(sku.cantidad_final_aereo || 0) : 0;
    const cantMaritimo = sku.mensaje_maritimo ? Math.abs(sku.cantidad_final_maritimo || 0) : 0;
    const totalPedir = cantCourier + cantAereo + cantMaritimo;
    
    const costoLoc = sku.costo_ult_loc || 0;
    const costoDol = sku.costo_ult_dol || 0;
    const valorPedido = totalPedir * costoLoc;

    // Acumular totales
    totales.skus++;
    totales.courier += cantCourier;
    totales.aereo += cantAereo;
    totales.maritimo += cantMaritimo;
    totales.total += totalPedir;
    totales.valorColones += valorPedido;

    const row = sheet.addRow([
      sku.codigo_sku,
      sku.codigo_proveedor || '-',
      sku.descripcion,
      sku.linea || '-',
      sku.marca || '-',
      sku.abc_rotacion_frecuencia,
      sku.existencia || 0,
      sku.transito || 0,
      sku.promedio_6m || 0,
      sku.stock_seguridad || 0,
      sku.referencia_pedido_courier || 0,
      cantCourier > 0 ? cantCourier : '-',
      sku.referencia_pedido_aereo || 0,
      cantAereo > 0 ? cantAereo : '-',
      sku.referencia_pedido_maritimo || 0,
      cantMaritimo > 0 ? cantMaritimo : '-',
      totalPedir,
      costoLoc > 0 ? costoLoc : '-',
      costoDol > 0 ? costoDol : '-',
      valorPedido > 0 ? valorPedido : '-'
    ]);

    aplicarEstiloCelda(row, index % 2 === 0);

    // Formatear números
    row.getCell(7).numFmt = '#,##0';   // Existencia
    row.getCell(8).numFmt = '#,##0';   // Tránsito
    row.getCell(9).numFmt = '#,##0.00'; // Promedio 6M
    row.getCell(10).numFmt = '#,##0';  // Stock Seguridad
    row.getCell(11).numFmt = '#,##0';  // Ref. Courier
    row.getCell(13).numFmt = '#,##0';  // Ref. Aéreo
    row.getCell(15).numFmt = '#,##0';  // Ref. Marítimo

    // Colorear cantidades de pedido
    // Courier - Naranja
    const celdaCourier = row.getCell(12);
    if (cantCourier > 0) {
      celdaCourier.numFmt = '#,##0';
      celdaCourier.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
      celdaCourier.font = { ...STYLES.cell.font, color: { argb: 'FFE65100' }, bold: true };
    }

    // Aéreo - Morado
    const celdaAereo = row.getCell(14);
    if (cantAereo > 0) {
      celdaAereo.numFmt = '#,##0';
      celdaAereo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1BEE7' } };
      celdaAereo.font = { ...STYLES.cell.font, color: { argb: 'FF6A1B9A' }, bold: true };
    }

    // Marítimo - Azul
    const celdaMaritimo = row.getCell(16);
    if (cantMaritimo > 0) {
      celdaMaritimo.numFmt = '#,##0';
      celdaMaritimo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBBDEFB' } };
      celdaMaritimo.font = { ...STYLES.cell.font, color: { argb: 'FF1565C0' }, bold: true };
    }

    // Total a Pedir
    const celdaTotal = row.getCell(17);
    celdaTotal.numFmt = '#,##0';
    celdaTotal.font = { ...STYLES.cell.font, bold: true };
    celdaTotal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };

    // Costos
    if (row.getCell(18).value !== '-') row.getCell(18).numFmt = '₡#,##0.00';
    if (row.getCell(19).value !== '-') row.getCell(19).numFmt = '$#,##0.00';
    if (row.getCell(20).value !== '-') {
      row.getCell(20).numFmt = '₡#,##0.00';
      // Resaltar valores altos
      if (valorPedido > 500000) {
        row.getCell(20).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
        row.getCell(20).font = { ...STYLES.cell.font, color: { argb: 'FFC62828' }, bold: true };
      }
    }
  });

  // ===== FILA DE TOTALES =====
  const totalRow = sheet.addRow([
    '', 
    '', 
    '', 
    '', 
    'TOTALES:', 
    `${totales.skus} SKUs`,
    '',
    '',
    '',
    '',
    '',
    totales.courier,
    '',
    totales.aereo,
    '',
    totales.maritimo,
    totales.total,
    '',
    '',
    totales.valorColones
  ]);

  totalRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECEFF1' } };
    cell.border = STYLES.header.border;
  });

  // Formatear celdas de totales
  totalRow.getCell(12).numFmt = '#,##0';
  totalRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
  totalRow.getCell(12).font = { bold: true, color: { argb: 'FFE65100' } };
  
  totalRow.getCell(14).numFmt = '#,##0';
  totalRow.getCell(14).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1BEE7' } };
  totalRow.getCell(14).font = { bold: true, color: { argb: 'FF6A1B9A' } };
  
  totalRow.getCell(16).numFmt = '#,##0';
  totalRow.getCell(16).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBBDEFB' } };
  totalRow.getCell(16).font = { bold: true, color: { argb: 'FF1565C0' } };
  
  totalRow.getCell(17).numFmt = '#,##0';
  totalRow.getCell(17).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
  totalRow.getCell(17).font = { bold: true, size: 12 };
  
  totalRow.getCell(20).numFmt = '₡#,##0.00';
  totalRow.getCell(20).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
  totalRow.getCell(20).font = { bold: true, color: { argb: 'FF2E7D32' }, size: 12 };
  
  totalRow.height = 28;

  // ===== RESUMEN POR TIPO DE PEDIDO =====
  sheet.addRow([]);
  sheet.addRow([]);
  
  const resumenHeader = sheet.addRow(['', '', '', '', 'RESUMEN POR TIPO DE PEDIDO']);
  sheet.mergeCells(resumenHeader.number, 5, resumenHeader.number, 10);
  resumenHeader.getCell(5).font = { bold: true, size: 12, color: { argb: 'FF253166' } };
  resumenHeader.getCell(5).alignment = { horizontal: 'center' };

  const resumenData = [
    ['', '', '', '', 'Tipo', 'SKUs', 'Unidades', '% del Total'],
    ['', '', '', '', 'Courier (Urgente)', datos.filter(d => d.mensaje_courier).length, totales.courier, totales.total > 0 ? (totales.courier / totales.total * 100).toFixed(1) + '%' : '0%'],
    ['', '', '', '', 'Aéreo', datos.filter(d => d.mensaje_aereo).length, totales.aereo, totales.total > 0 ? (totales.aereo / totales.total * 100).toFixed(1) + '%' : '0%'],
    ['', '', '', '', 'Marítimo', datos.filter(d => d.mensaje_maritimo).length, totales.maritimo, totales.total > 0 ? (totales.maritimo / totales.total * 100).toFixed(1) + '%' : '0%']
  ];

  resumenData.forEach((rowData, idx) => {
    const row = sheet.addRow(rowData);
    if (idx === 0) {
      aplicarEstiloEncabezado(row);
    } else {
      aplicarEstiloCelda(row, idx % 2 === 0);
      row.getCell(7).numFmt = '#,##0';
    }
  });

  // ===== FILTROS =====
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: datos.length + 4, column: 20 }
  };

  return workbook;
}

// ===== NOMBRES DE REPORTES PARA AUDITORÍA =====
const NOMBRES_REPORTES: Record<string, string> = {
  'analisis-8020': 'Análisis 80/20 (Pareto)',
  'control-compras': 'Control de Compras',
  'abc-rotacion': 'Análisis ABC y Rotación',
  'pedido-precios': 'Pedido con Precios',
  'antiguedad-skus': 'Antigüedad SKUs',
  'productos-nuevos': 'Productos Nuevos',
  'productos-reactivados': 'Productos Reactivados',
  'sugerencias-analista': 'Sugerencias del Analista',
  'skus-con-pedido': 'SKUs con Pedido Sugerido'
};

// ===== HANDLER PRINCIPAL =====
export const GET: RequestHandler = async ({ url, locals, request }) => {
  const user = locals.user || locals.session?.user;
  
  if (!user) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  const tipo = url.searchParams.get('tipo');
  const procesamiento = url.searchParams.get('procesamiento');

  if (!tipo || !procesamiento) {
    return json({ error: 'Parámetros tipo y procesamiento requeridos' }, { status: 400 });
  }

  // Datos para auditoría
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'VYOWEB-App';
  const nombreReporte = NOMBRES_REPORTES[tipo] || tipo;

  try {
    let workbook: ExcelJS.Workbook;
    let filename: string;

    switch (tipo) {
      case 'analisis-8020':
        workbook = await generarAnalisis8020(procesamiento);
        filename = `Analisis_8020_${procesamiento}.xlsx`;
        break;
        
      case 'control-compras':
        workbook = await generarControlCompras(procesamiento);
        filename = `Control_Compras_${procesamiento}.xlsx`;
        break;
        
      case 'abc-rotacion':
        workbook = await generarABCRotacion(procesamiento);
        filename = `ABC_Rotacion_${procesamiento}.xlsx`;
        break;
        
      case 'pedido-precios':
        workbook = await generarPedidoPrecios(procesamiento);
        filename = `Pedido_Precios_${procesamiento}.xlsx`;
        break;
        
      case 'antiguedad-skus':
        workbook = await generarAntiguedadSKUs(procesamiento);
        filename = `Antiguedad_SKUs_${procesamiento}.xlsx`;
        break;
        
      case 'productos-nuevos':  
    workbook = await generarProductosNuevos(procesamiento);
    filename = `Productos_Nuevos_${procesamiento}.xlsx`;
    break;
  
  case 'productos-reactivados': 
    workbook = await generarProductosReactivados(procesamiento);
    filename = `Productos_Reactivados_${procesamiento}.xlsx`;
    break;

      //NUEVO CASE PARA SUGERENCIAS ANALISTA
      case 'sugerencias-analista':
        workbook = await generarSugerenciasAnalista(procesamiento);
        filename = `Sugerencias_Analista_${procesamiento}.xlsx`;
        break;

      case 'skus-con-pedido':
        workbook = await generarSKUsConPedido(procesamiento);
        filename = `SKUs_Con_Pedido_${procesamiento}.xlsx`;
        break;
        
      default:
        return json({ error: 'Tipo de reporte no válido' }, { status: 400 });
    }

     // Generar buffer del Excel
    const buffer = await workbook.xlsx.writeBuffer();

    // ✅ Registrar descarga en auditoría
    AuditService.log(
      user.id,
      'REPORT_DOWNLOAD',
      ip,
      userAgent,
      `Reporte: ${nombreReporte} | Procesamiento: ${procesamiento} | Archivo: ${filename}`
    );

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error generando reporte:', error);
    
    // ✅ Registrar error en auditoría
    AuditService.log(
      user.id,
      'REPORT_DOWNLOAD_ERROR',
      ip,
      userAgent,
      `Reporte: ${nombreReporte} | Procesamiento: ${procesamiento} | Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );

    return json({ 
      error: 'Error al generar el reporte',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
};

