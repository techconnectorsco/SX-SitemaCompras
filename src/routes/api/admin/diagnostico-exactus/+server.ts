/**
 * ENDPOINT TEMPORAL DE DIAGNÓSTICO
 * POST /api/admin/diagnostico-exactus
 * 
 * ⚠️ ELIMINAR DESPUÉS DE DIAGNOSTICAR
 * 
 * Este endpoint ejecuta queries directamente en Exactus para verificar
 * qué datos están disponibles para 2020 y 2026
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import mssql from 'mssql';
import { env } from '$env/dynamic/private';

const EXACTUS_CONFIG = {
  server: env.EXACTUS_SERVER || '192.168.0.6',
  port: parseInt(env.EXACTUS_PORT || '1433'),
  database: env.EXACTUS_DATABASE || 'EXACTUS',
  user: env.EXACTUS_USER || '',
  password: env.EXACTUS_PASSWORD || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 300000
  }
};

export const POST: RequestHandler = async ({ locals }) => {
  // Verificar autenticación
  const user = locals.user || locals.session?.user;
  if (!user || String(user.role).toUpperCase() !== 'ADMIN') {
    return json({ error: 'No autorizado' }, { status: 403 });
  }

  console.log('\n' + '='.repeat(80));
  console.log('🔍 DIAGNÓSTICO DE EXACTUS - VERIFICANDO DATOS 2020 Y 2026');
  console.log('='.repeat(80) + '\n');

  try {
    // Conectar a Exactus
    console.log('[Diagnóstico] 🔌 Conectando a Exactus...');
    const pool = await mssql.connect(EXACTUS_CONFIG);
    console.log('[Diagnóstico] ✅ Conectado\n');

    const resultados: any = {};

    // =========================================================================
    // QUERY 1: Verificar años disponibles en Exactus
    // =========================================================================
    console.log('[Diagnóstico] 📊 Query 1: Años disponibles en Exactus');
    const query1 = `
      SELECT 
        AnoFactura,
        COUNT(*) as registros,
        COUNT(DISTINCT ArticuloCodigo) as skus_unicos,
        SUM(CAST(Cantidad AS FLOAT)) as total_vendido
      FROM VEDOVA.SoftlandBI_FA_FacturaLinea
      WHERE Anulada = 'N'
      GROUP BY AnoFactura
      ORDER BY AnoFactura
    `;
    
    const result1 = await pool.request().query(query1);
    resultados.añosDisponibles = result1.recordset;
    
    console.log('Años en Exactus:');
    result1.recordset.forEach((row: any) => {
      console.log(`  ${row.AnoFactura}: ${row.registros.toLocaleString()} registros, ${row.skus_unicos} SKUs, Total: ${row.total_vendido?.toFixed(0)}`);
    });
    console.log();

    // =========================================================================
    // QUERY 2: Verificar específicamente 2020 y 2026
    // =========================================================================
    console.log('[Diagnóstico] 📊 Query 2: Datos específicos 2020 y enero 2026');
    const query2 = `
      SELECT 
        AnoFactura,
        MesFactura,
        COUNT(*) as registros,
        COUNT(DISTINCT ArticuloCodigo) as skus_con_ventas,
        SUM(CAST(Cantidad AS FLOAT)) as total_vendido
      FROM VEDOVA.SoftlandBI_FA_FacturaLinea
      WHERE (AnoFactura = 2020 OR (AnoFactura = 2026 AND MesFactura = 1))
        AND Anulada = 'N'
      GROUP BY AnoFactura, MesFactura
      ORDER BY AnoFactura, MesFactura
    `;
    
    const result2 = await pool.request().query(query2);
    resultados.datos2020y2026 = result2.recordset;
    
    if (result2.recordset.length === 0) {
      console.log('❌ NO HAY DATOS de 2020 ni enero 2026 en Exactus\n');
    } else {
      console.log('Datos encontrados:');
      result2.recordset.forEach((row: any) => {
        console.log(`  ${row.AnoFactura}-${String(row.MesFactura).padStart(2, '0')}: ${row.registros} registros, ${row.skus_con_ventas} SKUs, Total: ${row.total_vendido?.toFixed(0)}`);
      });
      console.log();
    }

    // =========================================================================
    // QUERY 3: Verificar SKU específico (5032351-08)
    // =========================================================================
    console.log('[Diagnóstico] 📊 Query 3: Datos del SKU 5032351-08');
    const query3 = `
      SELECT 
        AnoFactura,
        MesFactura,
        SUM(CAST(Cantidad AS FLOAT)) as cantidad_total,
        SUM(CAST(VentaNetaLocal AS FLOAT)) as monto_total
      FROM VEDOVA.SoftlandBI_FA_FacturaLinea
      WHERE ArticuloCodigo = '5032351-08'
        AND Anulada = 'N'
      GROUP BY AnoFactura, MesFactura
      ORDER BY AnoFactura, MesFactura
    `;
    
    const result3 = await pool.request().query(query3);
    resultados.datosSkuEspecifico = result3.recordset;
    
    console.log(`Total de meses con ventas: ${result3.recordset.length}`);
    
    // Agrupar por año
    const porAño: any = {};
    result3.recordset.forEach((row: any) => {
      if (!porAño[row.AnoFactura]) {
        porAño[row.AnoFactura] = {
          año: row.AnoFactura,
          meses: 0,
          total: 0
        };
      }
      porAño[row.AnoFactura].meses++;
      porAño[row.AnoFactura].total += row.cantidad_total || 0;
    });
    
    console.log('Por año:');
    Object.values(porAño).forEach((año: any) => {
      console.log(`  ${año.año}: ${año.meses} meses, Total: ${año.total.toFixed(2)}`);
    });
    
    // Verificar específicamente 2020 y 2026
    const tiene2020 = result3.recordset.some((r: any) => r.AnoFactura === 2020);
    const tiene2026 = result3.recordset.some((r: any) => r.AnoFactura === 2026);
    
    console.log('\nPara SKU 5032351-08:');
    console.log(`  2020: ${tiene2020 ? '✅ SÍ TIENE DATOS' : '❌ NO TIENE DATOS'}`);
    console.log(`  2026: ${tiene2026 ? '✅ SÍ TIENE DATOS' : '❌ NO TIENE DATOS'}`);
    console.log();

    // =========================================================================
    // QUERY 4: Verificar registros con cantidad 0
    // =========================================================================
    console.log('[Diagnóstico] 📊 Query 4: Verificar registros con cantidad 0');
    const query4 = `
      SELECT 
        AnoFactura,
        COUNT(*) as total_registros,
        SUM(CASE WHEN CAST(Cantidad AS FLOAT) > 0 THEN 1 ELSE 0 END) as registros_con_cantidad,
        SUM(CASE WHEN CAST(Cantidad AS FLOAT) = 0 THEN 1 ELSE 0 END) as registros_sin_cantidad,
        SUM(CASE WHEN Cantidad IS NULL THEN 1 ELSE 0 END) as registros_null
      FROM VEDOVA.SoftlandBI_FA_FacturaLinea
      WHERE AnoFactura IN (2020, 2026)
        AND Anulada = 'N'
      GROUP BY AnoFactura
      ORDER BY AnoFactura
    `;
    
    const result4 = await pool.request().query(query4);
    resultados.registrosCantidad = result4.recordset;
    
    if (result4.recordset.length === 0) {
      console.log('❌ NO HAY REGISTROS para 2020 ni 2026\n');
    } else {
      console.log('Análisis de cantidades:');
      result4.recordset.forEach((row: any) => {
        console.log(`  ${row.AnoFactura}:`);
        console.log(`    Total registros: ${row.total_registros}`);
        console.log(`    Con cantidad > 0: ${row.registros_con_cantidad}`);
        console.log(`    Con cantidad = 0: ${row.registros_sin_cantidad}`);
        console.log(`    Con cantidad NULL: ${row.registros_null}`);
      });
      console.log();
    }

    // =========================================================================
    // QUERY 5: Buscar SKUs que SÍ tengan datos en 2020
    // =========================================================================
    console.log('[Diagnóstico] 📊 Query 5: SKUs con más ventas en 2020');
    const query5 = `
      SELECT TOP 10
        ArticuloCodigo,
        COUNT(DISTINCT MesFactura) as meses_con_ventas,
        SUM(CAST(Cantidad AS FLOAT)) as total_vendido
      FROM VEDOVA.SoftlandBI_FA_FacturaLinea
      WHERE AnoFactura = 2020
        AND Anulada = 'N'
        AND CAST(Cantidad AS FLOAT) > 0
      GROUP BY ArticuloCodigo
      ORDER BY total_vendido DESC
    `;
    
    const result5 = await pool.request().query(query5);
    resultados.skusTop2020 = result5.recordset;
    
    if (result5.recordset.length === 0) {
      console.log('❌ NO HAY NINGÚN SKU con ventas en 2020\n');
    } else {
      console.log('Top 10 SKUs con ventas en 2020:');
      result5.recordset.forEach((row: any, i: number) => {
        console.log(`  ${i + 1}. ${row.ArticuloCodigo}: ${row.total_vendido.toFixed(0)} unidades en ${row.meses_con_ventas} meses`);
      });
      console.log();
    }

    // Cerrar conexión
    await pool.close();

    console.log('='.repeat(80));
    console.log('✅ DIAGNÓSTICO COMPLETADO');
    console.log('='.repeat(80) + '\n');

    return json({
      success: true,
      mensaje: 'Diagnóstico completado. Revisa la consola del servidor para ver los resultados.',
      resultados
    });

  } catch (error) {
    console.error('[Diagnóstico] ❌ Error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Error desconocido',
      detalle: 'Revisa la consola del servidor para más información'
    }, { status: 500 });
  }
};