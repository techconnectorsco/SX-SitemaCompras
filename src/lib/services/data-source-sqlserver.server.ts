/**
 * Implementación de Data Source usando SQL Server
 * ✅ CORREGIDO: Ahora trae histórico completo desde 2020 hasta la fecha actual
 * 
 * Para PRODUCCIÓN en servidor VM
 * Credenciales desde variables de entorno
 */

import mssql from 'mssql';
import type { 
  IDataSource, 
  Articulo, 
  Existencia, 
  VentaMensual 
} from './data-source.interface';
import { db } from '$lib/config/db-config';
import { env } from '$env/dynamic/private';

/**
 * ✅ Categorías (CLASIFICACION_1) que NO entran al procesamiento de forecast.
 * 
 * Para excluir más categorías, simplemente agrega el string al array.
 * Se aplica en TODAS las consultas a Exactus (artículos y ventas históricas).
 * 
 * Categorías disponibles en Exactus (al día de hoy):
 *   REPUESTOS, ACCESORIOS, CI, ASERRADEROS, JARDINERIA, FERRETERÍA,
 *   OTROS, HERRAMIENTAS, AUTOMOTRIZ, GENERICO, PUBLICIDAD, EQUIPOS
 */
const CATEGORIAS_EXCLUIR: string[] = ['EQUIPOS', 'CI', 'PUBLICIDAD', 'OTROS'];

/**
 * Genera el fragmento SQL para excluir CATEGORIAS_EXCLUIR de las consultas.
 * 
 * @param prefijo - Alias de tabla opcional (ej: 'A' para 'A.CLASIFICACION_1')
 * @returns String SQL listo para concatenar, o '' si no hay nada que excluir.
 */
function filtroExclusionSQL(prefijo: string = ''): string {
  if (CATEGORIAS_EXCLUIR.length === 0) return '';
  const col = prefijo ? `${prefijo}.CLASIFICACION_1` : 'CLASIFICACION_1';
  const lista = CATEGORIAS_EXCLUIR.map(c => `'${c.replace(/'/g, "''")}'`).join(', ');
  return `AND (${col} IS NULL OR ${col} NOT IN (${lista}))`;
}

//const FECHA_CORTE_TEST: Date | null = new Date('2025-01-30');
const FECHA_CORTE_TEST: Date | null = null; // null = sin límite de fecha

// ===== CONFIGURACIÓN DESDE ENV =====
const EXACTUS_CONFIG = {
  server: env.EXACTUS_SERVER || '192.168.0.6',
  port: parseInt(env.EXACTUS_PORT || '1433'),
  database: env.EXACTUS_DATABASE || 'EXACTUS',
  user: env.EXACTUS_USER || '',
  password: env.EXACTUS_PASSWORD || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 300000 // 5 minutos
  }
};

export class SQLServerDataSource implements IDataSource {
  private pool: mssql.ConnectionPool | null = null;
  private ventasCargaronEnBD = false;

  constructor() {
    console.log('[SQL Server DataSource] 🔌 Configurado para Exactus');
    console.log(`[SQL Server DataSource] 📡 Servidor: ${EXACTUS_CONFIG.server}:${EXACTUS_CONFIG.port}`);
    console.log(`[SQL Server DataSource] 🗄️  Base de datos: ${EXACTUS_CONFIG.database}`);
    console.log(`[SQL Server DataSource] 👤 Usuario: ${EXACTUS_CONFIG.user}`);
    
    // Validar configuración
    if (!EXACTUS_CONFIG.user || !EXACTUS_CONFIG.password) {
      console.error('[SQL Server DataSource] ❌ ERROR: Falta configurar EXACTUS_USER y/o EXACTUS_PASSWORD en .env');
      throw new Error('SQL Server credentials not configured');
    }
  }

  private async getPool(): Promise<mssql.ConnectionPool> {
    if (!this.pool) {
      console.log('[SQL Server] 🔌 Conectando a Exactus...');
      try {
        this.pool = await mssql.connect(EXACTUS_CONFIG);
        console.log('[SQL Server] ✅ Conectado exitosamente');
      } catch (error) {
        console.error('[SQL Server] ❌ Error de conexión:', error);
        throw error;
      }
    }
    return this.pool;
  }

 async getArticulos(limit?: number): Promise<Articulo[]> {
    const pool = await this.getPool();

    // ✅ ACTUALIZADO: Ahora trae campos de fecha para antigüedad
    const query = `
      SELECT ${limit ? `TOP ${limit}` : ''}
        ARTICULO as codigo,
        DESCRIPCION as descripcion,
        CLASIFICACION_1 as categoria,
        CLASIFICACION_3 as linea,
        CLASIFICACION_4 as marca,
        PROVEEDOR as proveedor,
        ACTIVO as activo,
        ISNULL(COSTO_PROM_LOC, 0) as costo_prom_loc,
        ISNULL(COSTO_PROM_DOL, 0) as costo_prom_dol,
        ISNULL(COSTO_ULT_LOC, 0) as costo_ult_loc,
        ISNULL(COSTO_ULT_DOL, 0) as costo_ult_dol,
        ISNULL(COSTO_STD_LOC, 0) as costo_std_loc,
        ISNULL(COSTO_STD_DOL, 0) as costo_std_dol,
        ISNULL(COSTO_COMPARATIVO, 0) as costo_comparativo,
        ISNULL(COSTO_FISCAL, 0) as costo_fiscal,
        ISNULL(COSTO_PROM_COMPARATIVO_LOC, 0) as costo_prom_comparativo_loc,
        FCH_HORA_CREACION as fecha_creacion,
        ULTIMA_SALIDA as ultima_salida,
        ULTIMO_MOVIMIENTO as ultimo_movimiento
      FROM VEDOVA.ARTICULO
      WHERE ARTICULO IS NOT NULL AND ARTICULO != 'ND' ${filtroExclusionSQL()}
      ORDER BY ARTICULO
    `;
      
    try {
      const result = await pool.request().query(query);
      
      return result.recordset.map(row => ({
        codigo: (row.codigo || '').trim(),
        descripcion: (row.descripcion || '').trim(),
        categoria: (row.categoria || '').trim(),
        linea: (row.linea || '').trim(),
        marca: (row.marca || '').trim(),
        proveedor: (row.proveedor || '').trim(),
        activo: row.activo === 'S' || row.activo === '1',
        costo_prom_loc: parseFloat(row.costo_prom_loc) || 0,
        costo_prom_dol: parseFloat(row.costo_prom_dol) || 0,
        costo_ult_loc: parseFloat(row.costo_ult_loc) || 0,
        costo_ult_dol: parseFloat(row.costo_ult_dol) || 0,
        costo_std_loc: parseFloat(row.costo_std_loc) || 0,
        costo_std_dol: parseFloat(row.costo_std_dol) || 0,
        costo_comparativo: parseFloat(row.costo_comparativo) || 0,
        costo_fiscal: parseFloat(row.costo_fiscal) || 0,
        costo_prom_comparativo_loc: parseFloat(row.costo_prom_comparativo_loc) || 0,
        // NUEVOS: Campos de fecha (convertir a ISO string si existe)
        fecha_creacion: row.fecha_creacion ? new Date(row.fecha_creacion).toISOString() : null,
        ultima_salida: row.ultima_salida ? new Date(row.ultima_salida).toISOString() : null,
        ultimo_movimiento: row.ultimo_movimiento ? new Date(row.ultimo_movimiento).toISOString() : null
      }));
    } catch (error) {
      console.error('[SQL Server] ❌ Error cargando artículos con costos y fechas:', error);
      throw error;
    }
  }

  async getExistencias(codigosArticulos: string[]): Promise<Map<string, Existencia>> {
    const pool = await this.getPool();
    
    if (codigosArticulos.length === 0) {
      console.warn('[SQL Server] ⚠️ getExistencias(): Lista de códigos vacía');
      return new Map();
    }
    
    try {
      const codigosStr = codigosArticulos.map(c => `'${c.replace(/'/g, "''")}'`).join(',');
      
      const query = `
        SELECT 
          ARTICULO,
          SUM(CAST(CANT_DISPONIBLE AS FLOAT)) as existencia,
          SUM(CAST(CANT_TRANSITO AS FLOAT)) as transito
        FROM VEDOVA.EXISTENCIA_BODEGA
        WHERE ARTICULO IN (${codigosStr})
        GROUP BY ARTICULO
      `;
      
      const result = await pool.request().query(query);
      
      const existenciasMap = new Map<string, Existencia>();
      
      if (!result.recordset) {
        console.warn('[SQL Server] ⚠️ No hay datos de existencias');
        return existenciasMap;
      }
      
      result.recordset.forEach(row => {
        existenciasMap.set(row.ARTICULO, {
          articulo: row.ARTICULO,
          existencia: parseFloat(row.existencia) || 0,
          transito: parseFloat(row.transito) || 0
        });
      });
      
      console.log(`[SQL Server] ✅ Cargadas ${existenciasMap.size} existencias`);
      if (existenciasMap.size < codigosArticulos.length) {
        console.warn(`[SQL Server] ⚠️ Solo ${existenciasMap.size} de ${codigosArticulos.length} artículos tienen existencia`);
      }
      
      return existenciasMap;
    } catch (error) {
      console.error('[SQL Server] ❌ Error cargando existencias:', error);
      throw error;
    }
  }

  /**
 * NUEVA FUNCIÓN: getExistenciasConExclusiones()
 * 
 * IGUAL a getExistencias() pero respeta bodega excluidas
 * 
 * @param codigosArticulos - Array de SKUs a consultar
 * @param bodegasExcluidas - Array de códigos de bodegas a EXCLUIR
 *                           Ej: ["BODEGA_PASO", "BODEGA_X"]
 *                           Si está vacío, comportamiento = getExistencias() actual
 * 
 * @returns Map con existencia (sin contar bodegas excluidas)
 */
async getExistenciasConExclusiones(
  codigosArticulos: string[],
  bodegasExcluidas: string[] = []
): Promise<Map<string, Existencia>> {
  const pool = await this.getPool();
 
  if (codigosArticulos.length === 0) {
    console.warn('[SQL Server] ⚠️ getExistenciasConExclusiones(): Lista de códigos vacía');
    return new Map();
  }
 
  try {
    const codigosStr = codigosArticulos.map(c => `'${c.replace(/'/g, "''")}'`).join(',');
 
    // ═════════════════════════════════════════════════════════════
    // CONSTRUIR FILTRO DE BODEGAS EXCLUIDAS
    // ═════════════════════════════════════════════════════════════
 
    let whereExclusiones = '';
    
    if (bodegasExcluidas && bodegasExcluidas.length > 0) {
      // Escapar comillas simples en códigos de bodega
      const bodegasStr = bodegasExcluidas
        .map(b => `'${b.replace(/'/g, "''")}'`)
        .join(',');
      
      whereExclusiones = `AND BODEGA NOT IN (${bodegasStr})`;
      
      console.log(`[SQL Server] 🚫 Excluyendo bodegas: ${bodegasExcluidas.join(', ')}`);
    } else {
      console.log('[SQL Server] ✅ Sin exclusiones - incluye TODAS las bodegas');
    }
 
    // ═════════════════════════════════════════════════════════════
    // QUERY: SUMAR EXISTENCIA SIN BODEGAS EXCLUIDAS
    // ═════════════════════════════════════════════════════════════
 
    const query = `
      SELECT 
        ARTICULO,
        SUM(CAST(CANT_DISPONIBLE AS FLOAT)) as existencia,
        SUM(CAST(CANT_TRANSITO AS FLOAT)) as transito
      FROM VEDOVA.EXISTENCIA_BODEGA
      WHERE ARTICULO IN (${codigosStr})
        ${whereExclusiones}
      GROUP BY ARTICULO
    `;
 
    console.log('[SQL Server] 📋 Query:\n', query.replace(/\s+/g, ' '));
 
    const result = await pool.request().query(query);
 
    const existenciasMap = new Map<string, Existencia>();
 
    if (!result.recordset) {
      console.warn('[SQL Server] ⚠️ No hay datos de existencias');
      return existenciasMap;
    }
 
    result.recordset.forEach(row => {
      existenciasMap.set(row.ARTICULO, {
        articulo: row.ARTICULO,
        existencia: parseFloat(row.existencia) || 0,
        transito: parseFloat(row.transito) || 0
      });
    });
 
    console.log(
      `[SQL Server] ✅ Cargadas ${existenciasMap.size} existencias (con exclusiones)`
    );
 
    if (existenciasMap.size < codigosArticulos.length) {
      console.warn(
        `[SQL Server] ⚠️ Solo ${existenciasMap.size} de ${codigosArticulos.length} artículos tienen existencia`
      );
    }
 
    return existenciasMap;
  } catch (error) {
    console.error('[SQL Server] ❌ Error cargando existencias con exclusiones:', error);
    throw error;
  }
}

  async getClasificacionesABC(codigosArticulos: string[]): Promise<Map<string, string>> {
    const pool = await this.getPool();
    
    if (codigosArticulos.length === 0) {
      console.warn('[SQL Server] ⚠️ getClasificacionesABC(): Lista de códigos vacía');
      return new Map();
    }
    
    try {
      const codigosStr = codigosArticulos.map(c => `'${c.replace(/'/g, "''")}'`).join(',');
      
      const query = `
        SELECT DISTINCT
          ArticuloCodigo,
          ArticuloClaseABC
        FROM VEDOVA.SoftlandBI_FA_FacturaLinea
        WHERE ArticuloCodigo IN (${codigosStr})
          AND ArticuloClaseABC IS NOT NULL
      `;
      
      const result = await pool.request().query(query);
      
      const abcMap = new Map<string, string>();
      
      if (!result.recordset) {
        console.warn('[SQL Server] ⚠️ No hay datos de clasificación ABC');
        return abcMap;
      }
      
      result.recordset.forEach(row => {
        abcMap.set(row.ArticuloCodigo, row.ArticuloClaseABC || '');
      });
      
      console.log(`[SQL Server] ✅ Cargadas ${abcMap.size} clasificaciones ABC`);
      if (abcMap.size < codigosArticulos.length) {
        console.warn(`[SQL Server] ⚠️ Solo ${abcMap.size} de ${codigosArticulos.length} artículos tienen clasificación ABC`);
      }
      
      return abcMap;
    } catch (error) {
      console.error('[SQL Server] ❌ Error cargando clasificaciones ABC:', error);
      throw error;
    }
  }

  /**
   * ✅ CORREGIDO: Trae TODAS las ventas históricas desde 2020 hasta HOY
   * 
   * IMPORTANTE: Este método ya NO limita a 12 meses. Retorna el histórico completo.
   * La función calcularEstadisticas() en el endpoint es quien extrae solo los 12 meses
   * necesarios para el forecast, pero guardamos TODO el histórico en ventas_mensuales.
   */
  async getVentas12Meses(codigosArticulos: string[]): Promise<Map<string, VentaMensual[]>> {
    const pool = await this.getPool();
    
    if (codigosArticulos.length === 0) {
      console.warn('[SQL Server] ⚠️ getVentas12Meses(): Lista de códigos vacía');
      return new Map();
    }
    
    try {
      const codigosStr = codigosArticulos.map(c => `'${c.replace(/'/g, "''")}'`).join(',');
      
      // ✅ CORREGIDO: Traer TODO desde 2020 hasta la fecha actual (o fecha de corte si está definida)
      // ⚠️ Si FECHA_CORTE_TEST está activa, limita los datos hasta esa fecha
      let filtroFecha = 'AND AnoFactura >= 2020';
      if (FECHA_CORTE_TEST) {
        const añoCorte = FECHA_CORTE_TEST.getFullYear();
        const mesCorte = FECHA_CORTE_TEST.getMonth() + 1;
        filtroFecha = `AND AnoFactura >= 2020 AND (AnoFactura < ${añoCorte} OR (AnoFactura = ${añoCorte} AND MesFactura <= ${mesCorte}))`;
        console.log(`[SQL Server] ⚠️ MODO TEST: Limitando ventas hasta ${añoCorte}-${mesCorte.toString().padStart(2, '0')}`);
      }

      const query = `
        SELECT 
          ArticuloCodigo,
          AnoFactura,
          MesFactura,
          ROUND(SUM(CAST(Cantidad AS FLOAT)), 0) as Cantidad,
          SUM(CAST(VentaNetaLocal AS FLOAT)) as Monto
        FROM VEDOVA.SoftlandBI_FA_FacturaLinea
        WHERE ArticuloCodigo IN (${codigosStr})
          ${filtroFecha}
          AND Anulada = 'N'
        GROUP BY ArticuloCodigo, AnoFactura, MesFactura
        ORDER BY ArticuloCodigo, AnoFactura, MesFactura
      `;
      
      const result = await pool.request().query(query);
      
      const ventasMap = new Map<string, VentaMensual[]>();
      
      if (!result.recordset) {
        console.warn('[SQL Server] ⚠️ No hay datos de ventas');
        return ventasMap;
      }
      
      result.recordset.forEach(row => {
        if (!ventasMap.has(row.ArticuloCodigo)) {
          ventasMap.set(row.ArticuloCodigo, []);
        }
        
        ventasMap.get(row.ArticuloCodigo)!.push({
          articulo: row.ArticuloCodigo,
          año: row.AnoFactura,
          mes: row.MesFactura,
          cantidad: parseFloat(row.Cantidad) || 0,
          monto: parseFloat(row.Monto) || 0
        });
      });
      
      // ✅ Logging actualizado
      console.log(`[SQL Server] ✅ Cargadas ventas históricas (desde 2020) de ${ventasMap.size} artículos`);
      if (ventasMap.size < codigosArticulos.length) {
        console.warn(`[SQL Server] ⚠️ Solo ${ventasMap.size} de ${codigosArticulos.length} artículos tienen ventas desde 2020`);
      }
      
      return ventasMap;
    } catch (error) {
      console.error('[SQL Server] ❌ Error cargando ventas históricas:', error);
      throw error;
    }
  }

/**
 * ✅ VERSIÓN CORREGIDA: cargarVentasHistoricasEnBD()
 * 
 * Reemplaza esta función en:
 * D:\Users\Usuario\Desktop\VedovaWEB\VYOWEB\src\lib\services\data-source-sqlserver.server.ts
 * 
 * CAMBIOS:
 * 1. Logging detallado por año para detectar dónde se pierden los datos
 * 2. Validación mejorada de datos
 * 3. Reportes de errores específicos
 * 4. Verificación final por año
 */

async cargarVentasHistoricasEnBD(): Promise<number> {
  if (this.ventasCargaronEnBD) {
    console.log('[SQL Server] ℹ️ Histórico ya fue cargado en esta sesión, saltando...');
    return 0;
  }

  const pool = await this.getPool();

  try {
    console.log('\n' + '='.repeat(80));
    console.log('[SQL Server] 📊 INICIANDO CARGA DE HISTÓRICO DESDE EXACTUS');
    console.log('='.repeat(80));
    
    // =========================================================================
    // FASE 1: CARGAR SKUs DESDE EXACTUS
    // =========================================================================
    console.log('\n[SQL Server] 📥 FASE 1: Cargando SKUs...');
    db.prepare('DELETE FROM ventas_mensuales').run();
    db.prepare('DELETE FROM skus').run();
    const insertSkuStmt = db.prepare('INSERT OR IGNORE INTO skus (codigo) VALUES (?)');
    
    const articulosResult = await pool.request().query(`
      SELECT ARTICULO 
      FROM VEDOVA.ARTICULO 
      WHERE ARTICULO IS NOT NULL AND ARTICULO != 'ND' ${filtroExclusionSQL()}
    `);
    
    if (!articulosResult.recordset || articulosResult.recordset.length === 0) {
      console.error('[SQL Server] ❌ NO SE ENCONTRARON ARTÍCULOS EN EXACTUS');
      return 0;
    }
    
    let skuCount = 0;
    const skusTransaction = db.transaction(() => {
      for (const row of articulosResult.recordset) {
        const codigo = (row.ARTICULO || '').trim();
        if (codigo) {
          insertSkuStmt.run(codigo);
          skuCount++;
        }
      }
      return skuCount;
    });
    
    const totalSkus = skusTransaction();
    console.log(`[SQL Server] ✅ SKUs insertados: ${totalSkus.toLocaleString()}`);
    
    // =========================================================================
    // FASE 2: VERIFICAR RANGO DE DATOS EN EXACTUS
    // =========================================================================
    console.log('\n[SQL Server] 📥 FASE 2: Verificando datos disponibles en Exactus...');
    
    const rangoResult = await pool.request().query(`
      SELECT 
        MIN(AnoFactura) as AnoMin,
        MAX(AnoFactura) as AnoMax,
        COUNT(DISTINCT AnoFactura) as AniosDisponibles,
        COUNT(*) as TotalRegistros
      FROM VEDOVA.SoftlandBI_FA_FacturaLinea
      WHERE AnoFactura >= 2020 AND Anulada = 'N'
    `);
    
    const rangoInfo = rangoResult.recordset[0] || {};
    console.log(`[SQL Server] 📋 Rango disponible en Exactus:`);
    console.log(`[SQL Server]    - Años: ${rangoInfo.AnoMin} a ${rangoInfo.AnoMax}`);
    console.log(`[SQL Server]    - Total años: ${rangoInfo.AniosDisponibles}`);
    console.log(`[SQL Server]    - Total registros: ${rangoInfo.TotalRegistros?.toLocaleString()}`);
    
    // Verificar específicamente 2020 y 2026
    const verificacionResult = await pool.request().query(`
      SELECT 
        AnoFactura,
        COUNT(*) as registros,
        COUNT(DISTINCT ArticuloCodigo) as skus_unicos
      FROM VEDOVA.SoftlandBI_FA_FacturaLinea
      WHERE AnoFactura IN (2020, 2026) AND Anulada = 'N'
      GROUP BY AnoFactura
      ORDER BY AnoFactura
    `);
    
    console.log(`[SQL Server] 🔍 Verificación 2020 y 2026:`);
    verificacionResult.recordset.forEach(row => {
      console.log(`[SQL Server]    - ${row.AnoFactura}: ${row.registros.toLocaleString()} registros, ${row.skus_unicos} SKUs`);
    });
    
    // =========================================================================
    // FASE 3: CARGAR VENTAS DESDE EXACTUS
    // =========================================================================
    console.log('\n[SQL Server] 📥 FASE 3: Cargando ventas históricas desde 2020...');
    
    
    // ⚠️ Si FECHA_CORTE_TEST está activa, limita los datos hasta esa fecha
    let filtroFechaHistorico = 'FL.AnoFactura >= 2020';
    if (FECHA_CORTE_TEST) {
      const añoCorte = FECHA_CORTE_TEST.getFullYear();
      const mesCorte = FECHA_CORTE_TEST.getMonth() + 1;
      filtroFechaHistorico = `FL.AnoFactura >= 2020 AND (FL.AnoFactura < ${añoCorte} OR (FL.AnoFactura = ${añoCorte} AND FL.MesFactura <= ${mesCorte}))`;
      console.log(`[SQL Server] ⚠️ MODO TEST: Cargando histórico hasta ${añoCorte}-${mesCorte.toString().padStart(2, '0')}`);
    }

    const ventasResult = await pool.request().query(`
      SELECT 
        FL.ArticuloCodigo,
        FL.AnoFactura,
        FL.MesFactura,
        ROUND(SUM(CAST(FL.Cantidad AS FLOAT)), 0) as cantidad,
        SUM(CAST(FL.VentaNetaLocal AS FLOAT)) as monto
      FROM VEDOVA.SoftlandBI_FA_FacturaLinea FL
      INNER JOIN VEDOVA.ARTICULO A ON FL.ArticuloCodigo = A.ARTICULO
      WHERE ${filtroFechaHistorico}
        AND FL.Anulada = 'N'
        ${filtroExclusionSQL('A')}
      GROUP BY FL.ArticuloCodigo, FL.AnoFactura, FL.MesFactura
      ORDER BY FL.ArticuloCodigo, FL.AnoFactura, FL.MesFactura
    `);
    
    if (!ventasResult.recordset || ventasResult.recordset.length === 0) {
      console.warn('[SQL Server] ⚠️ NO SE ENCONTRARON REGISTROS DE VENTAS DESDE 2020');
      this.ventasCargaronEnBD = true;
      return 0;
    }
    
    console.log(`[SQL Server] 📦 Registros obtenidos de Exactus: ${ventasResult.recordset.length.toLocaleString()}`);
    
    // =========================================================================
    // FASE 4: INSERTAR EN SQLITE CON LOGGING DETALLADO
    // =========================================================================
    console.log('\n[SQL Server] 💾 FASE 4: Insertando en SQLite...');
    
    const insertVentas = db.prepare(`
      INSERT INTO ventas_mensuales (sku_codigo, fecha, cantidad, monto, stock_promedio)
      VALUES (?, ?, ?, ?, 0)
    `);
    
    // Contadores por año para diagnóstico
    const estadisticasPorAño: Record<number, {
      procesados: number;
      insertados: number;
      errores: number;
      skusUnicos: Set<string>;
    }> = {};
    
    const ventasTransaction = db.transaction(() => {
      let totalInsertados = 0;
      let totalErrores = 0;
      let erroresPorTipo: Record<string, number> = {
        codigoVacio: 0,
        añoInvalido: 0,
        mesInvalido: 0,
        foreignKey: 0,
        otros: 0
      };
      
      for (const row of ventasResult.recordset) {
        const codigo = (row.ArticuloCodigo || '').trim();
        const año = parseInt(row.AnoFactura) || 0;
        const mes = parseInt(row.MesFactura) || 0;
        const cantidad = parseFloat(row.cantidad) || 0;
        const monto = parseFloat(row.monto) || 0;
        
        // Inicializar estadísticas del año
        if (!estadisticasPorAño[año]) {
          estadisticasPorAño[año] = {
            procesados: 0,
            insertados: 0,
            errores: 0,
            skusUnicos: new Set()
          };
        }
        
        estadisticasPorAño[año].procesados++;
        estadisticasPorAño[año].skusUnicos.add(codigo);
        
        // Validaciones
        if (!codigo) {
          erroresPorTipo.codigoVacio++;
          estadisticasPorAño[año].errores++;
          totalErrores++;
          continue;
        }
        
        if (año < 2020) {
          erroresPorTipo.añoInvalido++;
          estadisticasPorAño[año].errores++;
          totalErrores++;
          continue;
        }
        
        if (mes < 1 || mes > 12) {
          erroresPorTipo.mesInvalido++;
          estadisticasPorAño[año].errores++;
          totalErrores++;
          continue;
        }
        
        // Construir fecha
        const fecha = `${año}-${mes.toString().padStart(2, '0')}-01`;
        
        try {
          insertVentas.run(codigo, fecha, cantidad, monto);
          estadisticasPorAño[año].insertados++;
          totalInsertados++;
        } catch (e: any) {
          if (e.message && e.message.includes('FOREIGN KEY')) {
            erroresPorTipo.foreignKey++;
          } else {
            erroresPorTipo.otros++;
          }
          estadisticasPorAño[año].errores++;
          totalErrores++;
        }
      }
      
      return { totalInsertados, totalErrores, erroresPorTipo };
    });
    
    const resultado = ventasTransaction();
    
    console.log(`\n[SQL Server] 📊 RESULTADO DE INSERCIÓN:`);
    console.log(`[SQL Server]    ✅ Insertados exitosamente: ${resultado.totalInsertados.toLocaleString()}`);
    console.log(`[SQL Server]    ❌ Errores totales: ${resultado.totalErrores.toLocaleString()}`);
    
    if (resultado.totalErrores > 0) {
      console.log(`\n[SQL Server] ⚠️ DETALLE DE ERRORES:`);
      Object.entries(resultado.erroresPorTipo).forEach(([tipo, cantidad]) => {
        if (cantidad > 0) {
          console.log(`[SQL Server]    - ${tipo}: ${cantidad}`);
        }
      });
    }
    
    // =========================================================================
    // FASE 5: ESTADÍSTICAS POR AÑO
    // =========================================================================
    console.log(`\n[SQL Server] 📊 ESTADÍSTICAS POR AÑO:`);
    const añosOrdenados = Object.keys(estadisticasPorAño)
      .map(a => parseInt(a))
      .sort((a, b) => a - b);
    
    for (const año of añosOrdenados) {
      const stats = estadisticasPorAño[año];
      console.log(`[SQL Server]    ${año}: ${stats.insertados.toLocaleString()}/${stats.procesados.toLocaleString()} insertados, ${stats.skusUnicos.size} SKUs únicos, ${stats.errores} errores`);
    }
    
    // =========================================================================
    // FASE 6: VERIFICACIÓN FINAL EN SQLITE
    // =========================================================================
    console.log(`\n[SQL Server] 🔍 FASE 6: Verificando datos en SQLite...`);
    
    const verificacionSQLite = db.prepare(`
      SELECT 
        strftime('%Y', fecha) as año,
        COUNT(*) as registros,
        COUNT(DISTINCT sku_codigo) as skus_unicos,
        SUM(cantidad) as total_vendido
      FROM ventas_mensuales
      GROUP BY strftime('%Y', fecha)
      ORDER BY año
    `).all() as any[];
    
    console.log(`[SQL Server] 📊 DATOS EN SQLITE (ventas_mensuales):`);
    verificacionSQLite.forEach((row: any) => {
      console.log(`[SQL Server]    ${row.año}: ${row.registros.toLocaleString()} registros, ${row.skus_unicos} SKUs, Total: ${row.total_vendido?.toFixed(0)}`);
    });
    
    // Verificar específicamente 2020 y 2026
    const tiene2020 = verificacionSQLite.some((r: any) => r.año === '2020');
    const tiene2026 = verificacionSQLite.some((r: any) => r.año === '2026');
    
    console.log(`\n[SQL Server] ✅ VERIFICACIÓN FINAL:`);
    console.log(`[SQL Server]    2020 en SQLite: ${tiene2020 ? '✅ SÍ' : '❌ NO'}`);
    console.log(`[SQL Server]    2026 en SQLite: ${tiene2026 ? '✅ SÍ' : '❌ NO'}`);
    
    // Rango completo
    const rangoVentas = db.prepare(`
      SELECT 
        MIN(fecha) as fecha_min,
        MAX(fecha) as fecha_max,
        COUNT(*) as total_registros
      FROM ventas_mensuales
    `).get() as any;
    
    console.log(`[SQL Server]    Rango: ${rangoVentas.fecha_min} a ${rangoVentas.fecha_max}`);
    console.log(`[SQL Server]    Total registros: ${rangoVentas.total_registros?.toLocaleString()}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('[SQL Server] ✅ CARGA HISTÓRICA COMPLETADA');
    console.log('='.repeat(80) + '\n');
    
    this.ventasCargaronEnBD = true;
    return resultado.totalInsertados;
    
  } catch (error) {
    console.error('\n[SQL Server] ❌ ERROR FATAL EN CARGA HISTÓRICA:', error);
    throw error;
  }
}

  async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.close();
        console.log('[SQL Server] ✅ Conexión cerrada correctamente');
      } catch (error) {
        console.error('[SQL Server] ⚠️ Error al cerrar conexión:', error);
      }
      this.pool = null;
    }
  }

  async getExistenciasPorBodega(): Promise<Array<{
  articulo: string;
  bodega: string;
  disponible: number;
  reservada: number;
  transito: number;
  produccion: number;
}>> {
  const pool = await this.getPool();
  try {
    const query = `
      SELECT
        ARTICULO,
        BODEGA,
        CAST(ISNULL(CANT_DISPONIBLE, 0) AS FLOAT) as disponible,
        CAST(ISNULL(CANT_RESERVADA, 0) AS FLOAT) as reservada,
        CAST(ISNULL(CANT_TRANSITO, 0) AS FLOAT) as transito,
        CAST(ISNULL(CANT_PRODUCCION, 0) AS FLOAT) as produccion
      FROM VEDOVA.EXISTENCIA_BODEGA
      WHERE ARTICULO IS NOT NULL
        AND (
          CAST(ISNULL(CANT_DISPONIBLE, 0) AS FLOAT) <> 0 OR
          CAST(ISNULL(CANT_RESERVADA, 0) AS FLOAT) <> 0 OR
          CAST(ISNULL(CANT_TRANSITO, 0) AS FLOAT) <> 0 OR
          CAST(ISNULL(CANT_PRODUCCION, 0) AS FLOAT) <> 0
        )
    `;
    const result = await pool.request().query(query);
    return (result.recordset || []).map((r: any) => ({
      articulo: (r.ARTICULO || '').trim(),
      bodega: (r.BODEGA || '').trim(),
      disponible: parseFloat(r.disponible) || 0,
      reservada: parseFloat(r.reservada) || 0,
      transito: parseFloat(r.transito) || 0,
      produccion: parseFloat(r.produccion) || 0
    }));
  } catch (error) {
    console.error('[SQL Server] ❌ Error en getExistenciasPorBodega:', error);
    throw error;
  }
}

async getPedidosLineas(meses: number = 6): Promise<Array<{
  pedido: string;
  pedidoLinea: number;
  articulo: string;
  descripcion: string | null;
  proveedor: string | null;
  bodega: string;
  estado: string;
  fechaPrometida: string | null;
  fechaEntrega: string | null;
  cantidadPedida: number;
  cantidadFacturada: number;
  cantidadPendiente: number;
  cantidadCancelada: number;
  precioUnitario: number;
  diasDiferencia: number | null;
}>> {
  const pool = await this.getPool();
  try {
    const query = `
      SELECT
        PL.PEDIDO,
        PL.PEDIDO_LINEA,
        PL.ARTICULO,
        A.DESCRIPCION,
        A.PROVEEDOR,
        PL.BODEGA,
        PL.ESTADO,
        PL.FECHA_PROMETIDA,
        PL.FECHA_ENTREGA,
        CAST(ISNULL(PL.CANTIDAD_PEDIDA, 0) AS FLOAT) as CANTIDAD_PEDIDA,
        CAST(ISNULL(PL.CANTIDAD_FACTURADA, 0) AS FLOAT) as CANTIDAD_FACTURADA,
        CAST(ISNULL(PL.CANTIDAD_A_FACTURA, 0) AS FLOAT) as CANTIDAD_A_FACTURA,
        CAST(ISNULL(PL.CANTIDAD_CANCELADA, 0) AS FLOAT) as CANTIDAD_CANCELADA,
        CAST(ISNULL(PL.PRECIO_UNITARIO, 0) AS FLOAT) as PRECIO_UNITARIO,
        DATEDIFF(day, PL.FECHA_PROMETIDA, PL.FECHA_ENTREGA) as DIAS_DIFERENCIA
      FROM VEDOVA.PEDIDO_LINEA PL
      LEFT JOIN VEDOVA.ARTICULO A ON PL.ARTICULO = A.ARTICULO
      WHERE PL.FECHA_ENTREGA >= DATEADD(month, -@meses, GETDATE())
        AND YEAR(PL.FECHA_ENTREGA) BETWEEN 2000 AND 2035
        AND (PL.FECHA_PROMETIDA IS NULL OR YEAR(PL.FECHA_PROMETIDA) BETWEEN 2000 AND 2035)
    `;
    const result = await pool.request()
      .input('meses', mssql.Int, meses)
      .query(query);

    return (result.recordset || []).map((r: any) => ({
      pedido: r.PEDIDO,
      pedidoLinea: r.PEDIDO_LINEA,
      articulo: (r.ARTICULO || '').trim(),
      descripcion: r.DESCRIPCION ? String(r.DESCRIPCION).trim() : null,
      proveedor: r.PROVEEDOR ? String(r.PROVEEDOR).trim() : null,
      bodega: (r.BODEGA || '').trim(),
      estado: (r.ESTADO || '').trim(),
      fechaPrometida: r.FECHA_PROMETIDA ? new Date(r.FECHA_PROMETIDA).toISOString().split('T')[0] : null,
      fechaEntrega: r.FECHA_ENTREGA ? new Date(r.FECHA_ENTREGA).toISOString().split('T')[0] : null,
      cantidadPedida: parseFloat(r.CANTIDAD_PEDIDA) || 0,
      cantidadFacturada: parseFloat(r.CANTIDAD_FACTURADA) || 0,
      cantidadPendiente: parseFloat(r.CANTIDAD_A_FACTURA) || 0,
      cantidadCancelada: parseFloat(r.CANTIDAD_CANCELADA) || 0,
      precioUnitario: parseFloat(r.PRECIO_UNITARIO) || 0,
      diasDiferencia: r.DIAS_DIFERENCIA != null ? Number(r.DIAS_DIFERENCIA) : null
    }));
  } catch (error) {
    console.error('[SQL Server] ❌ Error en getPedidosLineas:', error);
    throw error;
  }
}

}


