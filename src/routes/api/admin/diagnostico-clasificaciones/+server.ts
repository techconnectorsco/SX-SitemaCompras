/**
 * ENDPOINT TEMPORAL - Diagnóstico de clasificaciones en Exactus
 * Eliminar después de verificar
 * 
 * GET /api/admin/diagnostico-clasificaciones
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
    requestTimeout: 60000
  }
};

export const GET: RequestHandler = async ({ locals }) => {
  const user = locals.user || locals.session?.user;
  
  if (!user || String(user.role).toUpperCase() !== 'ADMIN') {
    return json({ error: 'Solo administradores' }, { status: 403 });
  }

  let pool: mssql.ConnectionPool | null = null;

  try {
    console.log('[Diagnóstico] Conectando a Exactus...');
    pool = await mssql.connect(EXACTUS_CONFIG);
    console.log('[Diagnóstico] Conectado');

    const clasificaciones: Record<string, Array<{ valor: string; cantidad: number }>> = {};

    // Consultar cada clasificación por separado
    for (let i = 1; i <= 6; i++) {
      const campo = `CLASIFICACION_${i}`;
      const result = await pool.request().query(`
        SELECT TOP 20
          ${campo} as valor,
          COUNT(*) as cantidad
        FROM VEDOVA.ARTICULO
        WHERE ${campo} IS NOT NULL AND ${campo} != ''
        GROUP BY ${campo}
        ORDER BY cantidad DESC
      `);
      
      clasificaciones[campo] = result.recordset.map(r => ({
        valor: r.valor,
        cantidad: r.cantidad
      }));
    }

    // Obtener ejemplos de artículos
    const ejemploResult = await pool.request().query(`
      SELECT TOP 10
        ARTICULO,
        DESCRIPCION,
        CLASIFICACION_1,
        CLASIFICACION_2,
        CLASIFICACION_3,
        CLASIFICACION_4,
        CLASIFICACION_5,
        CLASIFICACION_6
      FROM VEDOVA.ARTICULO
      WHERE ARTICULO IS NOT NULL
      ORDER BY ARTICULO
    `);

    // Mostrar en consola
    console.log('\n' + '='.repeat(80));
    console.log('DIAGNÓSTICO DE CLASIFICACIONES EN EXACTUS');
    console.log('='.repeat(80));

    for (const [campo, valores] of Object.entries(clasificaciones)) {
      console.log(`\n📁 ${campo}:`);
      if (valores.length === 0) {
        console.log('   (vacío)');
      } else {
        valores.forEach(v => {
          console.log(`   - "${v.valor}" (${v.cantidad} artículos)`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('EJEMPLOS DE ARTÍCULOS:');
    console.log('='.repeat(80));
    
    for (const art of ejemploResult.recordset) {
      console.log(`\n🔹 ${art.ARTICULO}: ${art.DESCRIPCION}`);
      console.log(`   C1: ${art.CLASIFICACION_1 || '-'}`);
      console.log(`   C2: ${art.CLASIFICACION_2 || '-'}`);
      console.log(`   C3: ${art.CLASIFICACION_3 || '-'}`);
      console.log(`   C4: ${art.CLASIFICACION_4 || '-'}`);
      console.log(`   C5: ${art.CLASIFICACION_5 || '-'}`);
      console.log(`   C6: ${art.CLASIFICACION_6 || '-'}`);
    }

    console.log('\n' + '='.repeat(80));

    return json({
      success: true,
      mensaje: 'Revisa la consola del servidor para ver el diagnóstico completo',
      clasificaciones,
      ejemplos: ejemploResult.recordset
    });

  } catch (error) {
    console.error('[Diagnóstico] Error:', error);
    return json({ 
      error: 'Error al consultar',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};