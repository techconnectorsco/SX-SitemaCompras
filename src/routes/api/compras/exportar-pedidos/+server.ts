/**
 * Exportar pedidos a Excel para Husqvarna y otras líneas
 * GET /api/compras/exportar-pedidos
 * 
 * Query params:
 * - procesamiento: código del procesamiento
 * - tipo: 'husqvarna' | 'otros'
 * 
 * Genera un ZIP con 3 archivos Excel:
 * - pedido_courier.xlsx
 * - pedido_aereo.xlsx
 * - pedido_maritimo.xlsx
 * 
 * Campos: codigo, cantidad, fecha_entrega (+3 días hábiles)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { AuditService } from '$lib/features/security/services/audit-service';

/**
 * Calcula la fecha de entrega sumando 3 días hábiles (lunes a viernes)
 */
function calcularFechaEntrega(fechaBase: Date): Date {
  const resultado = new Date(fechaBase);
  let diasAgregados = 0;
  
  while (diasAgregados < 3) {
    resultado.setDate(resultado.getDate() + 1);
    const diaSemana = resultado.getDay();
    // 0 = Domingo, 6 = Sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasAgregados++;
    }
  }
  
  return resultado;
}

/**
 * Formatea fecha como DD/MM/YYYY
 */
function formatearFecha(fecha: Date): string {
  const dia = fecha.getDate().toString().padStart(2, '0');
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const año = fecha.getFullYear();
  return `${dia}/${mes}/${año}`;
}

/**
 * Crea un archivo Excel con los datos de pedido
 */
async function crearExcelPedido(
  datos: Array<{ codigo: string; cantidad: number }>,
  fechaEntrega: string,
  nombreTipo: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Pedido');

  // Encabezados
  sheet.columns = [
    { header: 'Referencia', key: 'codigo', width: 20 },
    { header: 'Cantidad', key: 'cantidad', width: 15 },
    { header: 'Fecha Entrega', key: 'fecha_entrega', width: 15 }
  ];

  // Estilo de encabezados
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center' };

  // Agregar datos
  for (const item of datos) {
    sheet.addRow({
      codigo: item.codigo,
      cantidad: item.cantidad,
      fecha_entrega: fechaEntrega
    });
  }

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export const GET: RequestHandler = async ({ url, locals, request }) => {
  const user = locals.user || locals.session?.user;
  
  if (!user) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'SoporteXperto-App';

  try {
    const codigoProcesamiento = url.searchParams.get('procesamiento');
    const tipo = url.searchParams.get('tipo'); // 'husqvarna' | 'otros'

    if (!codigoProcesamiento) {
      return json({ error: 'Falta código de procesamiento' }, { status: 400 });
    }

    if (!tipo || !['husqvarna', 'otros'].includes(tipo)) {
      return json({ error: 'Tipo debe ser "husqvarna" o "otros"' }, { status: 400 });
    }

    // Calcular fecha de entrega (+3 días hábiles desde hoy)
    const hoy = new Date();
    const fechaEntrega = calcularFechaEntrega(hoy);
    const fechaEntregaStr = formatearFecha(fechaEntrega);

    // Construir condición de línea
    // Husqvarna: línea contiene 'HUSQVARNA' (case insensitive)
    // Otros: línea NO contiene 'HUSQVARNA' o es NULL
    const condicionLinea = tipo === 'husqvarna'
      ? `AND (UPPER(linea) LIKE '%HUSQVARNA%' OR UPPER(marca) LIKE '%HUSQVARNA%')`
      : `AND (UPPER(linea) NOT LIKE '%HUSQVARNA%' OR linea IS NULL) AND (UPPER(marca) NOT LIKE '%HUSQVARNA%' OR marca IS NULL)`;

    // Query para Courier (sugerido_analista_urgente > 0)
    const datosCourier = db.prepare(`
      SELECT codigo_sku as codigo, sugerido_analista_urgente as cantidad
      FROM forecast_procesamiento
      WHERE codigo_procesamiento = ?
        AND sugerido_analista_urgente > 0
        ${condicionLinea}
      ORDER BY codigo_sku
    `).all(codigoProcesamiento) as Array<{ codigo: string; cantidad: number }>;

    // Query para Aéreo (sugerido_analista_aereo > 0)
    const datosAereo = db.prepare(`
      SELECT codigo_sku as codigo, sugerido_analista_aereo as cantidad
      FROM forecast_procesamiento
      WHERE codigo_procesamiento = ?
        AND sugerido_analista_aereo > 0
        ${condicionLinea}
      ORDER BY codigo_sku
    `).all(codigoProcesamiento) as Array<{ codigo: string; cantidad: number }>;

    // Query para Marítimo (sugerido_analista_maritimo > 0)
    const datosMaritimo = db.prepare(`
      SELECT codigo_sku as codigo, sugerido_analista_maritimo as cantidad
      FROM forecast_procesamiento
      WHERE codigo_procesamiento = ?
        AND sugerido_analista_maritimo > 0
        ${condicionLinea}
      ORDER BY codigo_sku
    `).all(codigoProcesamiento) as Array<{ codigo: string; cantidad: number }>;

    // Verificar si hay datos
    if (datosCourier.length === 0 && datosAereo.length === 0 && datosMaritimo.length === 0) {
      return json({ 
        error: 'No hay pedidos para exportar',
        mensaje: `No se encontraron SKUs con pedido para ${tipo === 'husqvarna' ? 'Husqvarna' : 'otras líneas'}`
      }, { status: 404 });
    }

    // Crear ZIP con los archivos
    const zip = new JSZip();
    const prefijo = tipo === 'husqvarna' ? 'husqvarna' : 'otros';
    const fechaArchivo = hoy.toISOString().split('T')[0].replace(/-/g, '');

    // Agregar archivos al ZIP solo si tienen datos
    if (datosCourier.length > 0) {
      const excelCourier = await crearExcelPedido(datosCourier, fechaEntregaStr, 'Courier');
      zip.file(`${prefijo}_courier_${fechaArchivo}.xlsx`, excelCourier);
    }

    if (datosAereo.length > 0) {
      const excelAereo = await crearExcelPedido(datosAereo, fechaEntregaStr, 'Aéreo');
      zip.file(`${prefijo}_aereo_${fechaArchivo}.xlsx`, excelAereo);
    }

    if (datosMaritimo.length > 0) {
      const excelMaritimo = await crearExcelPedido(datosMaritimo, fechaEntregaStr, 'Marítimo');
      zip.file(`${prefijo}_maritimo_${fechaArchivo}.xlsx`, excelMaritimo);
    }

    // Generar ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // ===== LOG DE AUDITORÍA - EXPORTACIÓN EXITOSA =====
    const tipoAccion = tipo === 'husqvarna' ? 'COMPRAS_EXPORT_HUSQVARNA' : 'COMPRAS_EXPORT_OTROS';
    const resumen = [
      datosCourier.length > 0 ? `Courier: ${datosCourier.length}` : null,
      datosAereo.length > 0 ? `Aéreo: ${datosAereo.length}` : null,
      datosMaritimo.length > 0 ? `Marítimo: ${datosMaritimo.length}` : null
    ].filter(Boolean).join(', ');

    AuditService.log(
      user.id,
      tipoAccion,
      ip,
      userAgent,
      `Exportación ${tipo === 'husqvarna' ? 'Husqvarna' : 'Otras líneas'} completada. Procesamiento: ${codigoProcesamiento}. SKUs: ${resumen}. Fecha entrega: ${fechaEntregaStr}`
    );

    // Devolver como descarga
    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="pedidos_${prefijo}_${fechaArchivo}.zip"`,
        'Content-Length': zipBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('Error exportando pedidos:', error);
    
    // ===== LOG DE AUDITORÍA - ERROR =====
    const tipoParam = url.searchParams.get('tipo') || 'desconocido';
    const procParam = url.searchParams.get('procesamiento') || 'N/A';
    
    AuditService.log(
      user.id,
      'COMPRAS_EXPORT_ERROR',
      ip,
      userAgent,
      `Error en exportación ${tipoParam}. Procesamiento: ${procParam}. Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );

    return json({ 
      error: 'Error al exportar pedidos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
};