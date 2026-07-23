import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { createDataSource } from '$lib/services/data-source-factory';
import ExcelJS from 'exceljs';

const BATCH_SIZE = 500;
const FECHA_CORTE_TEST: Date | null = null; 

const FACTORES_SEGURIDAD: Record<string, number> = {
  'A': 2.500551790, 'B': 2.326347870, 'C': 1.281551570, 'D': 0, 'E': 0
};

// L.T. de respaldo si NO existe la fila '__DEFAULT__' (= "otras marcas" del cliente)
const LT_RESPALDO = { lt_courier: 1, lt_aereo: 1, lt_maritimo: 1, meses_pedido: 1 };

type Lt = { lt_courier: number; lt_aereo: number; lt_maritimo: number; meses_pedido: number };

export const GET: RequestHandler = async ({ locals }) => {
  const user = locals.user || locals.session?.user;
  if (!user) return json({ error: 'No autenticado' }, { status: 401 });
  if (String(user.role).toUpperCase() !== 'ADMIN') return json({ error: 'Solo administradores' }, { status: 403 });

  try {
    // 1. Obtener bodegas excluidas desde SQLite
    const bodegasExcluidasRegistros = db.prepare('SELECT bodega_codigo FROM bodegas WHERE excluida = 1').all() as any[];
    const bodegasExcluidas = bodegasExcluidasRegistros.map(b => b.bodega_codigo);

    if (bodegasExcluidas.length === 0) {
      return json({ error: 'No hay bodegas excluidas para simular' }, { status: 400 });
    }

    // 2. Iniciar ExcelJS
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Simulación Forecast');

    // Configurar Columnas
    sheet.columns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Descripción', key: 'desc', width: 35 },
      { header: 'ABC Rotación', key: 'abc', width: 12 },
      { header: 'Prom. Ventas Ajustado', key: 'prom', width: 22 },
      
      { header: 'Existencia NORMAL', key: 'ex_normal', width: 18 },
      { header: 'Existencia SIMULADA', key: 'ex_simulada', width: 20 },
      { header: 'Diferencia Exist.', key: 'diff_ex', width: 15 },

      { header: 'Sug. Aéreo NORMAL', key: 'aereo_normal', width: 18 },
      { header: 'Sug. Aéreo SIMULADO', key: 'aereo_simulado', width: 20 },
      { header: 'Diferencia Aéreo', key: 'diff_aereo', width: 16 },

      { header: 'Sug. Marítimo NORMAL', key: 'mar_normal', width: 22 },
      { header: 'Sug. Marítimo SIMULADO', key: 'mar_simulado', width: 22 },
      { header: 'Diferencia Marítimo', key: 'diff_mar', width: 18 }
    ];

    // Estilos de cabecera
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }; // Azul oscuro

    // 3. Crear DataSource y procesar por lotes (Igual que el forecast real)
    const dataSource = createDataSource();

    // ===== CONFIG L.T. POR CLAVE (igual que el procesamiento real) =====
    const marcasLtRegistros = db.prepare(
      'SELECT clave, lt_courier, lt_aereo, lt_maritimo, meses_pedido FROM marcas_lt_config WHERE activo = 1'
    ).all() as any[];
    const marcasLtMap = new Map<string, Lt>(
      marcasLtRegistros.map(m => [
        String(m.clave).toUpperCase().trim(),
        {
          lt_courier: Number(m.lt_courier),
          lt_aereo: Number(m.lt_aereo),
          lt_maritimo: Number(m.lt_maritimo),
          meses_pedido: Number(m.meses_pedido)
        }
      ])
    );
    const defaultLt: Lt = marcasLtMap.get('__DEFAULT__') || LT_RESPALDO;

    const todosArticulos = await dataSource.getArticulos();
    const totalBatches = Math.ceil(todosArticulos.length / BATCH_SIZE);

    for (let batch = 0; batch < totalBatches; batch++) {
      const start = batch * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, todosArticulos.length);
      const articulosLote = todosArticulos.slice(start, end);
      const codigosLote = articulosLote.map(a => a.codigo);

      // Traer datos necesarios
      const [existenciasNORMALMap, existenciasSIMULADASMap, ventasMap] = await Promise.all([
        dataSource.getExistenciasConExclusiones(codigosLote, []), // NORMAL: Sin exclusiones
        dataSource.getExistenciasConExclusiones(codigosLote, bodegasExcluidas), // SIMULADO: Con exclusiones
        dataSource.getVentas12Meses(codigosLote)
      ]);

      for (const articulo of articulosLote) {
        const codigo = articulo.codigo;
        const ventas = ventasMap.get(codigo) || [];
        
        const stats = calcularEstadisticas(ventas);
        const factorSeg = FACTORES_SEGURIDAD[stats.abcRotacion] || 0;

        // Resolver la CLAVE de L.T. (mismo criterio que el motor real):
        //  - HUSQVARNA → A si la línea empieza con RP, si no B.
        //  - resto → marca directa ; si no está en la tabla → default.
        const marca = (articulo.marca || '').toUpperCase().trim();
        const linea = (articulo.linea || '').toUpperCase().trim();
        const clave = marca === 'HUSQVARNA'
          ? (linea.startsWith('RP') ? 'HUSQVARNA-A' : 'HUSQVARNA-B')
          : marca;
        const ltAplicado = marcasLtMap.get(clave) || defaultLt;

        // El L.T. es el mismo para NORMAL y SIMULADO; lo que cambia es la existencia.

        // Cálculos Normales
        const exNormalData = existenciasNORMALMap.get(codigo) || { existencia: 0, transito: 0 };
        // Forzar enteros
        const exNormal = Math.round(exNormalData.existencia);
        const forecastNormal = calcularForecast(stats, factorSeg, exNormalData, ltAplicado);

        // Cálculos Simulados
        const exSimuladaData = existenciasSIMULADASMap.get(codigo) || { existencia: 0, transito: 0 };
        // Forzar enteros
        const exSimulada = Math.round(exSimuladaData.existencia);
        const forecastSimulado = calcularForecast(stats, factorSeg, exSimuladaData, ltAplicado);

        // Calcular Diferencias (Redondeadas)
        const diffExistencia = exNormal - exSimulada;
        const diffAereo = Math.round(Math.abs(forecastNormal.cantAereo.cantidadFinal) - Math.abs(forecastSimulado.cantAereo.cantidadFinal));
        const diffMaritimo = Math.round(Math.abs(forecastNormal.cantMaritimo.cantidadFinal) - Math.abs(forecastSimulado.cantMaritimo.cantidadFinal));

        // Insertar fila en Excel
        const row = sheet.addRow({
          sku: codigo,
          desc: articulo.descripcion,
          abc: stats.abcRotacion,
          prom: Math.round(stats.promAjustado), // <-- También en enteros para no ensuciar
          
          ex_normal: exNormal,
          ex_simulada: exSimulada,
          diff_ex: diffExistencia,

          aereo_normal: Math.round(Math.abs(forecastNormal.cantAereo.cantidadFinal)),
          aereo_simulado: Math.round(Math.abs(forecastSimulado.cantAereo.cantidadFinal)),
          diff_aereo: diffAereo,

          mar_normal: Math.round(Math.abs(forecastNormal.cantMaritimo.cantidadFinal)),
          mar_simulado: Math.round(Math.abs(forecastSimulado.cantMaritimo.cantidadFinal)),
          diff_mar: diffMaritimo
        });

        // Aplicar Colores si hay diferencias
        const badFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } } as ExcelJS.FillPattern;
        const badFont = { color: { argb: 'FF9C0006' }, bold: true };

        if (diffExistencia !== 0) {
          row.getCell('diff_ex').fill = badFill;
          row.getCell('diff_ex').font = badFont;
        }
        if (diffAereo !== 0) {
          row.getCell('diff_aereo').fill = badFill;
          row.getCell('diff_aereo').font = badFont;
        }
        if (diffMaritimo !== 0) {
          row.getCell('diff_mar').fill = badFill;
          row.getCell('diff_mar').font = badFont;
        }
      }
    }

    await dataSource.close();

    // 4. Preparar respuesta y enviar
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Simulacion_Forecast.xlsx"'
      }
    });

  } catch (error) {
    console.error('❌ Error generando Excel de simulación:', error);
    return json({ error: String(error) }, { status: 500 });
  }
};

// ==========================================
// MISMAS FUNCIONES DE CÁLCULO QUE EL FORECAST REAL
// ==========================================
function calcularEstadisticas(ventas: any[]) {
  const hoy = FECHA_CORTE_TEST || new Date();
  const diaActual = hoy.getDate();
  const yearActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;

  const DIA_CORTE_INCLUSION = 20;
  let mesesARetroceder = diaActual < DIA_CORTE_INCLUSION ? 12 : 11;
  
  let yearInicio = yearActual;
  let mesInicio = mesActual - mesesARetroceder;
  
  while (mesInicio <= 0) {
    mesInicio += 12;
    yearInicio -= 1;
  }
  
  const mesesConsecutivos: Array<{año: number, mes: number}> = [];
  const ventasOrdenadas: number[] = [];
  
  let yearTemp = yearInicio;
  let mesTemp = mesInicio;
  
  for (let i = 0; i < 12; i++) {
    mesesConsecutivos.push({año: yearTemp, mes: mesTemp});
    mesTemp += 1;
    if (mesTemp > 12) { mesTemp = 1; yearTemp += 1; }
  }
  
  let totalVentas = 0;
  let frecuencia = 0;
  
  for (const mes of mesesConsecutivos) {
    const venta = ventas.find(v => v.año === mes.año && v.mes === mes.mes);
    const cantidad = venta ? venta.cantidad : 0;
    ventasOrdenadas.push(cantidad);
    totalVentas += cantidad;
    if (cantidad > 0) frecuencia += 1;
  }
  
  const prom12 = totalVentas / 12;
  
  let fechaInicioProyeccion = new Date(hoy);
  if (hoy.getDate() > 20) {
    fechaInicioProyeccion.setMonth(fechaInicioProyeccion.getMonth() + 1);
  }
  
  let sumaVentasTemporada = 0;
  for (let i = 0; i < 6; i++) {
    const fechaFutura = new Date(fechaInicioProyeccion);
    fechaFutura.setMonth(fechaInicioProyeccion.getMonth() + i);
    const anioHistorico = fechaFutura.getFullYear() - 1;
    const mesHistorico = fechaFutura.getMonth() + 1;
    const venta = ventas.find(v => v.año === anioHistorico && v.mes === mesHistorico);
    if (venta) sumaVentasTemporada += venta.cantidad;
  }
  
  const prom6 = sumaVentasTemporada / 6;
  const promAjustado = Math.max(prom6, prom12);
  
  let abcRotacion = 'E';
  if (frecuencia >= 6) abcRotacion = 'A';
  else if (frecuencia >= 4) abcRotacion = 'B';
  else if (frecuencia === 3) abcRotacion = 'C';
  else if (frecuencia === 2) abcRotacion = 'D';
  
  return { abcRotacion, promAjustado };
}

/**
 * Misma lógica que el motor real. Recibe el L.T. ya resuelto (`lt`):
 *   courier  = lt_courier
 *   aéreo    = lt_aereo    + meses_pedido
 *   marítimo = lt_maritimo + meses_pedido
 * meses_pedido se suma SOLO a aéreo y marítimo. Courier sin S.S.; aéreo/marítimo con S.S.
 */
function calcularForecast(
  stats: any,
  factorSeguridad: number,
  existenciaData: any,
  lt: Lt
) {
  const stockSeguridad = Math.round(factorSeguridad * stats.promAjustado);

  const refCourier  = Math.round(stats.promAjustado * lt.lt_courier);
  const refAereo    = Math.round(stats.promAjustado * (lt.lt_aereo + lt.meses_pedido) + stockSeguridad);
  const refMaritimo = Math.round(stats.promAjustado * (lt.lt_maritimo + lt.meses_pedido) + stockSeguridad);
  
  const cantCourierCalc = existenciaData.existencia + existenciaData.transito - refCourier;
  const cantCourier = { cantidadFinal: cantCourierCalc > 0 ? 0 : cantCourierCalc };
  
  const cantAereoCalc = existenciaData.existencia + existenciaData.transito - refAereo - cantCourier.cantidadFinal;
  const cantAereo = { cantidadFinal: cantAereoCalc > 0 ? 0 : cantAereoCalc };
  
  const cantMaritimoCalc = existenciaData.existencia + existenciaData.transito - cantAereo.cantidadFinal - refMaritimo;
  const cantMaritimo = { cantidadFinal: cantMaritimoCalc > 0 ? 0 : cantMaritimoCalc };
  
  return { cantCourier, cantAereo, cantMaritimo };
}