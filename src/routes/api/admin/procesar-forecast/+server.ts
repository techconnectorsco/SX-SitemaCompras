/**
 * Endpoint de procesamiento de forecast
 * POST /api/admin/procesar-forecast
 * 
 * Usa DataSource (CSV o SQL Server según configuración)
 * Retorna progreso en tiempo real mediante Server-Sent Events
 * 
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { createDataSource } from '$lib/services/data-source-factory';
import { AuditService } from '$lib/features/security/services/audit-service';
import { ejecutarSnapshot, registrarCorrida } from '$lib/services/forecast-snapshot.server';

const BATCH_SIZE = 500; // Procesar en lotes de 500 SKUs
const DIA_CORTE_INCLUSION = 20;

//const FECHA_CORTE_TEST: Date | null = new Date('2025-01-30');
const FECHA_CORTE_TEST: Date | null = null; // null = usar fecha actual

// Factores de seguridad
const FACTORES_SEGURIDAD: Record<string, number> = {
  'A': 2.500551790,
  'B': 2.326347870,
  'C': 1.281551570,
  'D': 0,
  'E': 0
};

// L.T. de respaldo si NO existe la fila '__DEFAULT__' en la tabla
// (equivale al comportamiento histórico 1/1/1/1).
const LT_RESPALDO = { lt_courier: 1, lt_aereo: 1, lt_maritimo: 1, meses_pedido: 1 };

type Lt = { lt_courier: number; lt_aereo: number; lt_maritimo: number; meses_pedido: number };

/**
 * Genera un código único de procesamiento
 * Formato: PROC-YYYYMMDD-HHMMSS
 * Ejemplo: PROC-20250109-143052
 */
function generarCodigoProcesamiento(): string {
  const ahora = new Date();
  
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const hora = String(ahora.getHours()).padStart(2, '0');
  const minuto = String(ahora.getMinutes()).padStart(2, '0');
  const segundo = String(ahora.getSeconds()).padStart(2, '0');
  
  return `PROC-${año}${mes}${dia}-${hora}${minuto}${segundo}`;
}

export const POST: RequestHandler = async ({ locals }) => {
  // ===== VERIFICAR SESIÓN =====
  const user = locals.user || locals.session?.user;
  
  if (!user) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  const userRole = String(user.role).toUpperCase();
  if (userRole !== 'ADMIN') {
    return json({ error: 'Solo administradores' }, { status: 403 });
  }

  const usuarioProcesamiento = user.email;
  const fechaProcesamiento = new Date().toISOString();
  
  // ✅ NUEVO: Generar código único de procesamiento
  const codigoProcesamiento = generarCodigoProcesamiento();

  const ip = 'unknown';
  const userAgent = 'SoporteXperto-App';
  
  // ===== LOG DE AUDITORÍA - INICIO FORECAST =====
  AuditService.log(
    user.id,
    'FORECAST_PROCESS_START',
    ip,
    userAgent,
    `Usuario ${usuarioProcesamiento} inició el procesamiento de forecast. Código: ${codigoProcesamiento}`
  );

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 INICIANDO PROCESAMIENTO DE FORECAST`);
  console.log(`📋 Código: ${codigoProcesamiento}`);
  console.log(`👤 Usuario: ${usuarioProcesamiento}`);
  console.log(`📅 Fecha: ${new Date(fechaProcesamiento).toLocaleString('es-CR')}`);
  console.log('='.repeat(80) + '\n');

  // ===== CREAR STREAM PARA PROGRESO =====
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      
      const sendEvent = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // ===== CREAR DATA SOURCE =====
        sendEvent({ 
          type: 'progress', 
          mensaje: 'Inicializando fuente de datos...', 
          procesados: 0, 
          total: 0,
          codigoProcesamiento
        });

        console.log('📂 Creando DataSource...');
        const dataSource = createDataSource();

        sendEvent({ 
          type: 'progress', 
          mensaje: 'Cargando histórico de ventas en base de datos...', 
          procesados: 0, 
          total: 0,
          codigoProcesamiento
        });

        console.log('\n📊 Cargando histórico de ventas...');
        //console.log(`🔍 [DEBUG] Tipo de DataSource: ${dataSource.constructor.name}`);

        try {
          if (typeof (dataSource as any).cargarVentasHistoricasEnBD === 'function') {
            //console.log('🔵 [DEBUG] Método encontrado, llamando...');
            const ventasInsertadas = await (dataSource as any).cargarVentasHistoricasEnBD();
           // console.log(`🟢 [DEBUG] Método retornó: ${ventasInsertadas}`);
            
            if (ventasInsertadas && ventasInsertadas > 0) {
              //console.log(`✅ ${ventasInsertadas} filas de ventas cargadas en SQLite\n`);
              
              sendEvent({ 
                type: 'progress', 
                mensaje: `Cargadas ${ventasInsertadas} filas de histórico de ventas`, 
                procesados: 0, 
                total: 0,
                codigoProcesamiento
              });
            }
          } else {
            console.log('❌ [DEBUG] Método NO encontrado\n');
          }
        } catch (error) {
          console.error(`❌ Error: ${error}\n`);
        }

        // ===== OBTENER TODOS LOS ARTÍCULOS =====
        sendEvent({ 
          type: 'progress', 
          mensaje: 'Cargando artículos...', 
          procesados: 0, 
          total: 0,
          codigoProcesamiento
        });

        console.log('📦 Cargando artículos...');
        const todosArticulos = await dataSource.getArticulos();
        const totalArticulos = todosArticulos.length;
        
        console.log(`✅ Total de artículos: ${totalArticulos.toLocaleString()}\n`);

        sendEvent({ 
          type: 'progress', 
          mensaje: `Procesando ${totalArticulos.toLocaleString()} SKUs...`, 
          procesados: 0, 
          total: totalArticulos,
          codigoProcesamiento
        });

        //console.log(`📦 Iniciando nuevo procesamiento: ${codigoProcesamiento}`);
        console.log(`📊 Se mantendrá histórico de procesamientos anteriores\n`);

        // ===== PROCESAR EN LOTES =====
        const totalBatches = Math.ceil(totalArticulos / BATCH_SIZE);
        let totalProcesados = 0;
        const tiempoInicio = Date.now();

  
        const insertStmt = db.prepare(`
  INSERT INTO forecast_procesamiento (
    codigo_procesamiento, fecha_procesamiento, usuario_procesamiento, codigo_sku,
    codigo_proveedor, descripcion, categoria, linea, marca, abc, abc_rotacion_frecuencia,
    activo, existencia, transito, lead_time, meses_pedido,
    frecuencia_ventas_12m, venta_ultimos_12m, promedio_12m, promedio_6m,
    promedio_ajustado, desviacion_estandar, coeficiente_variacion,
    factor_seguridad, stock_seguridad, referencia_pedido_courier,
    referencia_pedido_aereo, referencia_pedido_maritimo,
    cantidad_courier, mensaje_courier, cantidad_final_courier,
    cantidad_aereo, mensaje_aereo, cantidad_final_aereo,
    cantidad_maritimo, mensaje_maritimo, cantidad_final_maritimo,
    usuario_modificacion, fecha_modificacion,
    costo_prom_loc, costo_prom_dol, costo_ult_loc, costo_ult_dol,
    costo_std_loc, costo_std_dol, costo_comparativo, costo_fiscal, 
    costo_prom_comparativo_loc,
    fecha_creacion, ultima_salida, ultimo_movimiento,
    lt_courier_usado, lt_aereo_usado, lt_maritimo_usado, meses_pedido_usado
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
    ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?, ?
  )
`);

        const insertMany = db.transaction((rows: any[]) => {
          for (const row of rows) {
            insertStmt.run(...row);
          }
        });

        // ═════════════════════════════════════════════════════════════
        // ✅ CONFIG DE L.T. POR PROVEEDOR/MARCA (tabla marcas_lt_config)
        // Se lee UNA sola vez, solo filas activas. El mapa se busca por CLAVE:
        //   - Marca normal           → clave = marca (CLASIFICACION_4)
        //   - HUSQVARNA              → clave = HUSQVARNA-A si la línea (CLASIFICACION_3)
        //                              empieza con 'RP'; si no, HUSQVARNA-B
        //   - Marca sin clave en el mapa → usa el default ('__DEFAULT__', editable).
        // Fórmula por vía:
        //   courier  = PA × lt_courier
        //   aéreo    = PA × (lt_aereo    + meses_pedido) + S.S.
        //   marítimo = PA × (lt_maritimo + meses_pedido) + S.S.
        // ═════════════════════════════════════════════════════════════
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

        // Default editable (fila '__DEFAULT__'); si no existe, respaldo 2/3/5.
        const defaultLt: Lt = marcasLtMap.get('__DEFAULT__') || LT_RESPALDO;

        console.log(`📐 Claves de L.T. activas (${marcasLtMap.size}): ${[...marcasLtMap.keys()].join(', ') || 'ninguna'}`);
        console.log(`📐 Default (otras marcas): courier=${defaultLt.lt_courier}, aéreo=${defaultLt.lt_aereo}, marítimo=${defaultLt.lt_maritimo}, meses=${defaultLt.meses_pedido}`);

        for (let batch = 0; batch < totalBatches; batch++) {
          const start = batch * BATCH_SIZE;
          const end = Math.min(start + BATCH_SIZE, totalArticulos);
          const articulosLote = todosArticulos.slice(start, end);
          
          console.log(`\n📊 Procesando lote ${batch + 1}/${totalBatches} (${articulosLote.length} SKUs)`);
          
          sendEvent({
            type: 'progress',
            mensaje: `Procesando lote ${batch + 1} de ${totalBatches}...`,
            procesados: totalProcesados,
            total: totalArticulos,
            codigoProcesamiento
          });

          //cambio fuerte para excluir las bodegas lo comentado es código antiguo sin exclusión de bodegas
          /* // ===== OBTENER DATOS RELACIONADOS DEL LOTE =====
          const codigosLote = articulosLote.map(a => a.codigo);
          
          console.log('  📋 Obteniendo existencias, ABC y ventas...');
          const [existenciasMap, abcMap, ventasMap] = await Promise.all([
            dataSource.getExistencias(codigosLote),
            dataSource.getClasificacionesABC(codigosLote),
            dataSource.getVentas12Meses(codigosLote)
          ]); */

          // NUEVO CÓDIGOCON EXCLUSIÓN DE BODEGAS
          // ===== LEER BODEGAS EXCLUIDAS DESDE SQLITE =====
          const bodegasExcluidasRegistros = db.prepare(
            'SELECT bodega_codigo FROM bodegas WHERE excluida = 1'
          ).all() as any[];
          
          const bodegasExcluidas = bodegasExcluidasRegistros.map(b => b.bodega_codigo);
          
          if (bodegasExcluidas.length > 0) {
            console.log(`\n🚫 BODEGAS EXCLUIDAS DETECTADAS: ${bodegasExcluidas.join(', ')}`);
            console.log('   Las existencias se calcularán SIN estas bodegas\n');
          } else {
            console.log('\n✅ Sin bodegas excluidas - se usarán TODAS las bodegas\n');
          }
          
          // ===== OBTENER DATOS RELACIONADOS DEL LOTE =====
          const codigosLote = articulosLote.map(a => a.codigo);
          
          console.log('  📋 Obteniendo existencias, ABC y ventas...');
          const [existenciasMap, abcMap, ventasMap] = await Promise.all([
            dataSource.getExistenciasConExclusiones(codigosLote, bodegasExcluidas),
            dataSource.getClasificacionesABC(codigosLote),
            dataSource.getVentas12Meses(codigosLote)
          ]);

          // ===== CALCULAR FORECAST PARA CADA ARTÍCULO =====
          const rowsToInsert = [];

          for (const articulo of articulosLote) {
  const codigo = articulo.codigo;
  const existenciaData = existenciasMap.get(codigo) || { existencia: 0, transito: 0 };
  const abc = abcMap.get(codigo) || 'N/D';
  const ventas = ventasMap.get(codigo) || [];

  // Calcular estadísticas
  const stats = calcularEstadisticas(ventas);
  const factorSeg = FACTORES_SEGURIDAD[stats.abcRotacion] || 0; //se arreglo por ABC de rotacion

  // ✅ Resolver la CLAVE de L.T. del SKU:
  //    - HUSQVARNA se parte en A/B según la línea (CLASIFICACION_3 = articulo.linea).
  //    - El resto matchea por su marca (CLASIFICACION_4).
  //    - Si la clave no está en la tabla, usa el default editable.
  const marca = (articulo.marca || '').toUpperCase().trim();
  const linea = (articulo.linea || '').toUpperCase().trim();
  const clave = marca === 'HUSQVARNA'
    ? (linea.startsWith('RP') ? 'HUSQVARNA-A' : 'HUSQVARNA-B')
    : marca;

  const ltAplicado = marcasLtMap.get(clave) || defaultLt;

  const forecast = calcularForecast(stats, factorSeg, existenciaData, ltAplicado);

  rowsToInsert.push([
  codigoProcesamiento,           // codigo_procesamiento
  fechaProcesamiento,            // fecha_procesamiento
  usuarioProcesamiento,          // usuario_procesamiento
  codigo,                        // codigo_sku
  articulo.proveedor || '',      // codigo_proveedor
  articulo.descripcion || '',    // descripcion
  articulo.categoria || '',       // categoria
  articulo.linea || '',          // linea
  articulo.marca || '',          // marca
  abc,                           // abc
  stats.abcRotacion,             // abc_rotacion_frecuencia
  articulo.activo ? 1 : 0,       // activo
  existenciaData.existencia,     // existencia
  existenciaData.transito,       // transito
  30,                            // lead_time  (de adorno, intacto)
  '1',                           // meses_pedido (de adorno, intacto)
  stats.frecuencia,              // frecuencia_ventas_12m
  stats.total,                   // venta_ultimos_12m
  stats.prom12,                  // promedio_12m
  stats.prom6,                   // promedio_6m
  stats.promAjustado,            // promedio_ajustado
  stats.desviacion,              // desviacion_estandar
  stats.cv,                      // coeficiente_variacion
  factorSeg,                     // factor_seguridad
  forecast.stockSeguridad,       // stock_seguridad
  forecast.refCourier,           // referencia_pedido_courier
  forecast.refAereo,             // referencia_pedido_aereo
  forecast.refMaritimo,          // referencia_pedido_maritimo
  forecast.cantCourier.cantidad,      // cantidad_courier
  forecast.cantCourier.mensaje,       // mensaje_courier
  forecast.cantCourier.cantidadFinal, // cantidad_final_courier
  forecast.cantAereo.cantidad,        // cantidad_aereo
  forecast.cantAereo.mensaje,         // mensaje_aereo
  forecast.cantAereo.cantidadFinal,   // cantidad_final_aereo
  // ✅ NUEVOS CAMPOS MARÍTIMO
  forecast.cantMaritimo.cantidad,     // cantidad_maritimo
  forecast.cantMaritimo.mensaje,      // mensaje_maritimo
  forecast.cantMaritimo.cantidadFinal, // cantidad_final_maritimo
  usuarioProcesamiento,          // usuario_modificacion
  fechaProcesamiento,            // fecha_modificacion
  articulo.costo_prom_loc || 0,
  articulo.costo_prom_dol || 0,
  articulo.costo_ult_loc || 0,
  articulo.costo_ult_dol || 0,
  articulo.costo_std_loc || 0,
  articulo.costo_std_dol || 0,
  articulo.costo_comparativo || 0,
  articulo.costo_fiscal || 0,
  articulo.costo_prom_comparativo_loc || 0,
  articulo.fecha_creacion || null,
  articulo.ultima_salida || null,
  articulo.ultimo_movimiento || null,
  // ✅ L.T. realmente usado en esta corrida (auditoría / reconstrucción)
  forecast.ltUsado.courier,      // lt_courier_usado
  forecast.ltUsado.aereo,        // lt_aereo_usado
  forecast.ltUsado.maritimo,     // lt_maritimo_usado
  forecast.ltUsado.mesesPedido   // meses_pedido_usado
]);
          }

          // Guardar lote en SQLite
          console.log('  💾 Guardando en SQLite...');
          insertMany(rowsToInsert);
          
          totalProcesados += articulosLote.length;
          
          console.log(`✅ Lote ${batch + 1} completado (${totalProcesados}/${totalArticulos})`);
          
          sendEvent({
            type: 'progress',
            mensaje: `Procesados ${totalProcesados.toLocaleString()} de ${totalArticulos.toLocaleString()}`,
            procesados: totalProcesados,
            total: totalArticulos,
            codigoProcesamiento
          });
        }

               // ===== DURACIÓN DEL FORECAST (antes del snapshot) =====
        const duracionForecastSeg = (Date.now() - tiempoInicio) / 1000;

        // ===== PASO NUEVO: SNAPSHOT (tolerante a fallos) =====
        sendEvent({
          type: 'progress',
          mensaje: 'Capturando datos adicionales (bodegas, pedidos, proveedores)...',
          procesados: totalProcesados,
          total: totalArticulos,
          codigoProcesamiento
        });

        let resultadoSnapshot;
        try {
          resultadoSnapshot = await ejecutarSnapshot(dataSource, codigoProcesamiento);
          console.log(`📸 Snapshot: ${resultadoSnapshot.estado} — bodega ${resultadoSnapshot.filasBodega}, pedidos ${resultadoSnapshot.filasPedidos}, proveedores ${resultadoSnapshot.filasProveedor}`);
        } catch (e) {
          // No debe romper el forecast ya guardado.
          console.error('⚠️ Snapshot falló (el forecast ya está guardado):', e);
          resultadoSnapshot = {
            estado: 'error' as const,
            detalle: e instanceof Error ? e.message : String(e),
            filasBodega: 0, filasPedidos: 0, filasProveedor: 0, duracionSeg: 0
          };
        }

        // Registrar la corrida con tiempos para auditoría.
        registrarCorrida({
          codigoProcesamiento,
          fechaProcesamiento,
          usuarioProcesamiento,
          totalSkus: totalProcesados,
          duracionForecastSeg,
          snapshot: resultadoSnapshot
        });

         // ===== FINALIZAR =====
        try {
          await dataSource.close();
        } catch (e) {
          console.error('⚠️ Error al cerrar dataSource (no afecta el forecast):', e);
        }

        const tiempoTotal = (duracionForecastSeg + resultadoSnapshot.duracionSeg).toFixed(1);
        
       // console.log(`\n${'='.repeat(80)}`);
        console.log(`✅ PROCESAMIENTO COMPLETADO`);
       // console.log(`📋 Código: ${codigoProcesamiento}`);
        console.log(`📦 Total SKUs: ${totalProcesados.toLocaleString()}`);
        console.log(`⏱️ Tiempo total: ${tiempoTotal}s`);
        console.log(`🚀 Velocidad: ${(totalProcesados / parseFloat(tiempoTotal)).toFixed(0)} SKUs/s`);
        console.log('='.repeat(80) + '\n');

        sendEvent({
          type: 'complete',
          codigoProcesamiento,
          totalSKUs: totalProcesados,
          tiempoTotal: `${tiempoTotal}s`
        });

        // ===== LOG DE AUDITORÍA - COMPLETADO FORECAST =====
        AuditService.log(
          user.id,
          'FORECAST_PROCESS_COMPLETE',
          ip,
          userAgent,
          `Procesamiento completado. Código: ${codigoProcesamiento}. Total SKUs: ${totalProcesados}`
        );

        controller.close();

      } catch (error) {
        console.error('❌ ERROR en procesamiento:', error);
        
        sendEvent({
          type: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido',
          codigoProcesamiento
        });

        AuditService.log(
          user?.id ?? null,
          'FORECAST_PROCESS_ERROR',
          ip,
          userAgent,
          `Error en procesamiento ${codigoProcesamiento}: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
        
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
};

// ===== FUNCIONES DE CÁLCULO =====

/**
 * ✅ VERSIÓN FINAL: calcularEstadisticas()
 * 
 * REGLA DE NEGOCIO:
 * - Si hoy es día < 15: El mes actual es INCOMPLETO → Busca últimos 12 meses (excluye mes actual)
 * - Si hoy es día >= 15: El mes actual tiene suficientes datos → Busca últimos 11 meses (incluye mes actual)
 */
function calcularEstadisticas(ventas: any[]) {
  const hoy = FECHA_CORTE_TEST || new Date();
  
  const diaActual = hoy.getDate();
  const yearActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1; // 1-12
 
  console.log(`\n  🔍 [ESTADÍSTICAS] Fecha: ${hoy.toLocaleDateString('es-CR')} (Día ${diaActual})`);
 
  // ==========================================
  // 1. DETERMINAR SI INCLUIR MES ACTUAL O NO
  // ==========================================
  
  const DIA_CORTE_INCLUSION = 15;
  let mesesARetroceder: number;
  let incluirMesActual: boolean;
  
  if (diaActual < DIA_CORTE_INCLUSION) {
    mesesARetroceder = 12;
    incluirMesActual = false;
    console.log(`  📅 Día ${diaActual} < ${DIA_CORTE_INCLUSION}: Mes actual INCOMPLETO`);
    console.log(`  📊 Buscaremos: Últimos 12 meses COMPLETOS (excluye mes actual)`);
  } else {
    mesesARetroceder = 11;
    incluirMesActual = true;
  }
 
  // ==========================================
  // 2. CALCULAR MES DE INICIO
  // ==========================================
  
  let yearInicio = yearActual;
  let mesInicio = mesActual - mesesARetroceder;
  
  while (mesInicio <= 0) {
    mesInicio += 12;
    yearInicio -= 1;
  }
 
  // ==========================================
  // 3. CONSTRUIR ARRAY DE 12 MESES CONSECUTIVOS
  // ==========================================
  
  const mesesConsecutivos: Array<{año: number, mes: number}> = [];
  const ventasOrdenadas: number[] = [];
  
  let yearTemp = yearInicio;
  let mesTemp = mesInicio;
  
  for (let i = 0; i < 12; i++) {
    mesesConsecutivos.push({año: yearTemp, mes: mesTemp});
    mesTemp += 1;
    if (mesTemp > 12) {
      mesTemp = 1;
      yearTemp += 1;
    }
  }
 
  // ==========================================
  // 4. BUSCAR VENTAS PARA CADA MES
  // ==========================================
  
  let totalVentas = 0;
  let frecuencia = 0;
  
  for (const mes of mesesConsecutivos) {
    const venta = ventas.find(v => v.año === mes.año && v.mes === mes.mes);
    const cantidad = venta ? venta.cantidad : 0;
    
    ventasOrdenadas.push(cantidad);
    totalVentas += cantidad;
    
    if (cantidad > 0) {
      frecuencia += 1;
    }
  }
 
  const prom12 = totalVentas / 12;
 
  // ==========================================
  // 5. LÓGICA DE CORTE DE FECHA (REGLA CLIENTE - PROYECCIÓN)
  // ==========================================
  
  const DIA_CORTE = 15;
  let fechaInicioProyeccion = new Date(hoy);
  
  if (hoy.getDate() > DIA_CORTE) {
    fechaInicioProyeccion.setMonth(fechaInicioProyeccion.getMonth() + 1);
  }
 
  // ==========================================
  // 6. CALCULAR "PROM. 6 MESES POR TEMPORADA" (ESPEJO AÑO ANTERIOR)
  // ==========================================
  
  let sumaVentasTemporada = 0;
  
  for (let i = 0; i < 6; i++) {
    const fechaFutura = new Date(fechaInicioProyeccion);
    fechaFutura.setMonth(fechaInicioProyeccion.getMonth() + i);
 
    const anioHistorico = fechaFutura.getFullYear() - 1;
    const mesHistorico = fechaFutura.getMonth() + 1;
 
    const venta = ventas.find(v => v.año === anioHistorico && v.mes === mesHistorico);
    
    if (venta) {
      sumaVentasTemporada += venta.cantidad;
    }
  }
 
  const prom6 = sumaVentasTemporada / 6;
 
  // ==========================================
  // 7. ESTADÍSTICAS FINALES
  // ==========================================
  
  const promAjustado = Math.max(prom6, prom12);
  
  const varianza = ventasOrdenadas.reduce((sum, v) => sum + Math.pow(v - prom12, 2), 0) / 11;
  const desviacion = Math.sqrt(varianza);
  
  const denominadorCV = prom12 / 1.2;
  const cv = denominadorCV > 0 ? desviacion / denominadorCV : 0;
  
  let abcRotacion = 'E';
  if (frecuencia >= 6) abcRotacion = 'A';
  else if (frecuencia >= 4) abcRotacion = 'B';
  else if (frecuencia === 3) abcRotacion = 'C';
  else if (frecuencia === 2) abcRotacion = 'D';
 
  console.log(`  📈 ABC Rotación: ${abcRotacion}, Prom6m: ${prom6.toFixed(2)}, PromAjustado: ${promAjustado.toFixed(2)}\n`);
  
  return { frecuencia, total: totalVentas, prom12, prom6, promAjustado, desviacion, cv, abcRotacion };
}
 
/**
 * ✅ calcularForecast()  — horizontes por proveedor/marca
 *
 * Recibe el L.T. ya resuelto (`lt`), sea de una marca configurada o el default.
 *   courier  = lt_courier
 *   aéreo    = lt_aereo    + meses_pedido
 *   marítimo = lt_maritimo + meses_pedido
 * meses_pedido se suma SOLO a aéreo y marítimo. Courier sin S.S.; aéreo/marítimo con S.S.
 * La cascada de las 3 vías no cambia.
 *
 * Devuelve `ltUsado` (lo realmente aplicado) para persistirlo por SKU.
 */
function calcularForecast(
  stats: any,
  factorSeguridad: number,
  existenciaData: any,
  lt: Lt
) {
  const stockSeguridad = Math.round(factorSeguridad * stats.promAjustado);

  const ltCourier   = lt.lt_courier;
  const ltAereo     = lt.lt_aereo;
  const ltMaritimo  = lt.lt_maritimo;
  const mesesPedido = lt.meses_pedido;

  const refCourier  = Math.round(stats.promAjustado * ltCourier);
  const refAereo    = Math.round(stats.promAjustado * (ltAereo + mesesPedido) + stockSeguridad);
  const refMaritimo = Math.round(stats.promAjustado * (ltMaritimo + mesesPedido) + stockSeguridad);
  
  const cantCourierCalc = existenciaData.existencia + existenciaData.transito - refCourier;
  const cantCourier = {
    cantidad: cantCourierCalc,
    mensaje: cantCourierCalc < 0 ? 'PEDIR COURIER' : '',
    cantidadFinal: cantCourierCalc > 0 ? 0 : cantCourierCalc
  };
  
  const cantAereoCalc = existenciaData.existencia + existenciaData.transito - refAereo - cantCourier.cantidadFinal;
  const cantAereo = {
    cantidad: cantAereoCalc,
    mensaje: cantAereoCalc < 0 ? 'PEDIR AEREO' : '',
    cantidadFinal: cantAereoCalc > 0 ? 0 : cantAereoCalc
  };
 
  const cantMaritimoCalc = existenciaData.existencia + existenciaData.transito - cantAereo.cantidadFinal - refMaritimo;
  const cantMaritimo = {
    cantidad: cantMaritimoCalc,
    mensaje: cantMaritimoCalc < 0 ? 'PEDIR MARITIMO' : '',
    cantidadFinal: cantMaritimoCalc > 0 ? 0 : cantMaritimoCalc
  };

  const ltUsado = {
    courier: ltCourier,
    aereo: ltAereo,
    maritimo: ltMaritimo,
    mesesPedido: mesesPedido
  };
  
  return { stockSeguridad, refCourier, refAereo, refMaritimo, cantCourier, cantAereo, cantMaritimo, ltUsado };
}