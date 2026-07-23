/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ENDPOINT CORRECTO: src/routes/api/admin/bodegas/+server.ts
 * 
 * TABLA ÚNICA: bodegas (con campo excluida)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { createDataSource } from '$lib/services/data-source-factory';
import { AuditService } from '$lib/features/security/services/audit-service';

// =====================================================================
// HELPERS
// =====================================================================

/**
 * Obtiene todas las bodegas desde SQLite
 * Si no hay → trae de Exactus y guarda
 */
async function obtenerBodegasConEstado() {
  const dataSource = createDataSource();
  
  try {
    // Verificar si hay bodegas en SQLite
    const bodegasEnSQLite = db.prepare('SELECT COUNT(*) as count FROM bodegas').get() as any;
    const tieneBodegas = bodegasEnSQLite.count > 0;
 
    console.log(`[API] 🔍 Bodegas en SQLite: ${tieneBodegas ? '✅ ' + bodegasEnSQLite.count : '❌ 0'}`);
 
    let bodegasResult: any[] = [];
 
    if (!tieneBodegas) {
      // ===== PRIMERA CARGA: TRAER DE EXACTUS =====
      console.log('[API] 📥 PRIMERA CARGA: Trayendo de Exactus...');
      
      const pool = (dataSource as any).pool || await (dataSource as any).getPool();
      
      const result = await pool.request().query(`
        SELECT 
          BODEGA,
          NOMBRE,
          TIPO,
          TELEFONO,
          DIRECCION,
          U_ZONA,
          TIPO_ESTABLECIMIENTO
        FROM VEDOVA.BODEGA
        WHERE BODEGA IS NOT NULL
        ORDER BY BODEGA
      `);
      
      const bodegasExactus = result.recordset.map((row: any) => ({
        bodega_codigo: row.BODEGA.trim(),
        bodega_nombre: (row.NOMBRE || '').trim(),
        tipo: (row.TIPO || '').trim(),
        telefono: (row.TELEFONO || '').trim(),
        direccion: (row.DIRECCION || '').trim(),
        u_zona: (row.U_ZONA || '').trim(),
        tipo_establecimiento: (row.TIPO_ESTABLECIMIENTO || '').trim()
      }));
      
      console.log(`[API] 📦 ${bodegasExactus.length} bodegas de Exactus`);
      
      // Guardar en SQLite
      const insertBodega = db.prepare(`
        INSERT INTO bodegas (bodega_codigo, bodega_nombre, tipo, telefono, direccion, u_zona, tipo_establecimiento, excluida)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `);
      
      const transaction = db.transaction(() => {
        let insertadas = 0;
        for (const bodega of bodegasExactus) {
          try {
            insertBodega.run(
              bodega.bodega_codigo,
              bodega.bodega_nombre,
              bodega.tipo,
              bodega.telefono,
              bodega.direccion,
              bodega.u_zona,
              bodega.tipo_establecimiento
            );
            insertadas++;
          } catch (e) {
            console.error(`[API] ⚠️ Error insertando ${bodega.bodega_codigo}:`, e);
          }
        }
        return insertadas;
      });
      
      const insertadas = transaction();
      console.log(`[API] 💾 ${insertadas} guardadas en SQLite\n`);
      
      // ✅ DESPUÉS DE INSERTAR, VOLVER A CONSULTAR PARA TRAER LOS IDs GENERADOS
      bodegasResult = db.prepare(`
        SELECT 
          id, bodega_codigo, bodega_nombre, tipo, telefono, direccion, u_zona, tipo_establecimiento, excluida, fecha_actualizacion
        FROM bodegas
        ORDER BY bodega_codigo
      `).all() as any[];
        bodegasResult = bodegasExactus;
    } else {
      // ===== CARGAS POSTERIORES: TRAER DE SQLITE (RÁPIDO) =====
      console.log('[API] 📂 Cargando de SQLite...');
      
      // ✅ INCLUIR ID EN EL SELECT
      bodegasResult = db.prepare(`
        SELECT 
          id,
          bodega_codigo,
          bodega_nombre,
          tipo,
          telefono,
          direccion,
          u_zona,
          tipo_establecimiento,
          excluida,
          fecha_actualizacion
        FROM bodegas
        ORDER BY bodega_codigo
      `).all() as any[];
      
      console.log(`[API] ✅ ${bodegasResult.length} bodegas de SQLite\n`);
    }
    
    // ✅ RETORNAR CON ID MAPEADO
    return bodegasResult.map((bodega: any) => ({
      id: bodega.id || 0,  // ✅ INCLUIR ID
      bodega_codigo: bodega.bodega_codigo,
      bodega_nombre: bodega.bodega_nombre,
      tipo: bodega.tipo || '',
      telefono: bodega.telefono || '',
      direccion: bodega.direccion || '',
      u_zona: bodega.u_zona || '',
      tipo_establecimiento: bodega.tipo_establecimiento || '',
      excluida: bodega.excluida === 1 || bodega.excluida === true,
      fecha_actualizacion: bodega.fecha_actualizacion || null
    }));
    
  } catch (error) {
    console.error('❌ Error obteniendo bodegas:', error);
    throw error;
  }
}

/**
 * Sincroniza bodegas desde Exactus
 * Agrega nuevas, actualiza datos, mantiene estado de exclusión
 */
async function actualizarBodegasDesdeExactus() {
  const dataSource = createDataSource();
  
  try {
    console.log('[API] 🔄 Sincronizando desde Exactus...');
    
    const pool = (dataSource as any).pool || await (dataSource as any).getPool();
    
    const result = await pool.request().query(`
      SELECT 
        BODEGA,
        NOMBRE,
        TIPO,
        TELEFONO,
        DIRECCION,
        U_ZONA,
        TIPO_ESTABLECIMIENTO
      FROM VEDOVA.BODEGA
      WHERE BODEGA IS NOT NULL
      ORDER BY BODEGA
    `);
    
    const bodegasExactus = result.recordset.map((row: any) => ({
      bodega_codigo: row.BODEGA.trim(),
      bodega_nombre: (row.NOMBRE || '').trim(),
      tipo: (row.TIPO || '').trim(),
      telefono: (row.TELEFONO || '').trim(),
      direccion: (row.DIRECCION || '').trim(),
      u_zona: (row.U_ZONA || '').trim(),
      tipo_establecimiento: (row.TIPO_ESTABLECIMIENTO || '').trim()
    }));
    
    console.log(`[API] 📦 ${bodegasExactus.length} bodegas para sincronizar`);
    
    const insertStmt = db.prepare(`
      INSERT INTO bodegas (bodega_codigo, bodega_nombre, tipo, telefono, direccion, u_zona, tipo_establecimiento, excluida)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);
    
    const updateStmt = db.prepare(`
      UPDATE bodegas 
      SET bodega_nombre = ?, tipo = ?, telefono = ?, direccion = ?, u_zona = ?, tipo_establecimiento = ?, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE bodega_codigo = ?
    `);
    
    const transaction = db.transaction(() => {
      let nuevas = 0;
      let actualizadas = 0;
      
      for (const bodega of bodegasExactus) {
        const existe = db.prepare('SELECT id FROM bodegas WHERE bodega_codigo = ?').get(bodega.bodega_codigo);
        
        if (!existe) {
          insertStmt.run(
            bodega.bodega_codigo,
            bodega.bodega_nombre,
            bodega.tipo,
            bodega.telefono,
            bodega.direccion,
            bodega.u_zona,
            bodega.tipo_establecimiento
          );
          nuevas++;
        } else {
          updateStmt.run(
            bodega.bodega_nombre,
            bodega.tipo,
            bodega.telefono,
            bodega.direccion,
            bodega.u_zona,
            bodega.tipo_establecimiento,
            bodega.bodega_codigo
          );
          actualizadas++;
        }
      }
      
      return { nuevas, actualizadas };
    });
    
    const resultado = transaction();
    console.log(`[API] ✅ ${resultado.nuevas} nuevas, ${resultado.actualizadas} actualizadas\n`);
    
    return resultado;
  } catch (error) {
    console.error('[API] ❌ Error sincronizando:', error);
    throw error;
  }
}

/**
 * Obtiene distribución de un SKU en todas las bodegas
 */
async function obtenerDistribucionSKU(sku: string) {
  const dataSource = createDataSource();
  
  try {
    const pool = (dataSource as any).pool || await (dataSource as any).getPool();
    
    // Agregamos el AND para filtrar los ceros desde la base de datos
    const result = await pool.request().query(`
      SELECT 
        ARTICULO,
        BODEGA,
        CANT_DISPONIBLE,
        CANT_RESERVADA,
        CANT_TRANSITO,
        CANT_PRODUCCION
      FROM VEDOVA.EXISTENCIA_BODEGA
      WHERE UPPER(ARTICULO) = '${sku.toUpperCase().replace(/'/g, "''")}'
        AND (
          CAST(CANT_DISPONIBLE AS FLOAT) <> 0 OR 
          CAST(CANT_RESERVADA AS FLOAT) <> 0 OR 
          CAST(CANT_TRANSITO AS FLOAT) <> 0 OR 
          CAST(CANT_PRODUCCION AS FLOAT) <> 0
        )
      ORDER BY BODEGA
    `);
    
    if (!result.recordset || result.recordset.length === 0) {
      // Si llega aquí, es porque el SKU no existe o tiene 0 en TODAS las bodegas
      return { encontrado: false, sku, distribucion: [] };
    }
    
    // Enriquecer con datos de bodegas
    const distribucion = result.recordset.map((row: any) => {
      const bodegaInfo = db.prepare(
        'SELECT bodega_nombre, tipo, u_zona, excluida FROM bodegas WHERE bodega_codigo = ?'
      ).get(row.BODEGA) as any;
      
      const cantDisponible = parseFloat(row.CANT_DISPONIBLE) || 0;
      const cantReservada = parseFloat(row.CANT_RESERVADA) || 0;
      const cantTransito = parseFloat(row.CANT_TRANSITO) || 0;
      const cantProduccion = parseFloat(row.CANT_PRODUCCION) || 0;
      const total = cantDisponible + cantReservada + cantTransito + cantProduccion;
      
      return {
        bodega_codigo: row.BODEGA,
        bodega_nombre: bodegaInfo?.bodega_nombre || row.BODEGA,
        tipo: bodegaInfo?.tipo || '',
        u_zona: bodegaInfo?.u_zona || '',
        cant_disponible: cantDisponible,
        cant_reservada: cantReservada,
        cant_transito: cantTransito,
        cant_produccion: cantProduccion,
        total: total,
        excluida: bodegaInfo ? bodegaInfo.excluida === 1 : false
      };
    });
    
    // Resumen
    const totalActual = distribucion.reduce((sum: number, d: any) => sum + d.cant_disponible, 0);
    const totalSinExcluidas = distribucion
      .filter((d: any) => !d.excluida)
      .reduce((sum: number, d: any) => sum + d.cant_disponible, 0);
    
    return {
      encontrado: true,
      sku,
      distribucion,
      resumen: {
        total_actual: totalActual,
        total_sin_excluidas: totalSinExcluidas,
        diferencia: totalActual - totalSinExcluidas,
        bodegas_excluidas_en_sku: distribucion
          .filter((d: any) => d.excluida)
          .map((d: any) => d.bodega_codigo)
      }
    };
  } catch (error) {
    console.error('❌ Error obteniendo distribución SKU:', error);
    throw error;
  }
}

// =====================================================================
// HANDLERS
// =====================================================================

/**
 * GET /api/admin/bodegas
 * Obtiene lista de bodegas
 * 
 * Parámetro opcional: ?sku=CODIGO para ver distribución en bodegas
 */
export const GET: RequestHandler = async ({ locals, url }) => {
  const user = locals.user || locals.session?.user;
  
  if (!user) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  const userRole = String(user.role).toUpperCase();
  if (userRole !== 'ADMIN') {
    return json({ error: 'Solo administradores' }, { status: 403 });
  }

  const sku = url.searchParams.get('sku');

  try {
    if (sku) {
      // Distribución de un SKU específico
      const resultado = await obtenerDistribucionSKU(sku);
      return json(resultado);
    } else {
      // Listar todas las bodegas
      const bodegas = await obtenerBodegasConEstado();
      
      const totalBodegas = bodegas.length;
      const excluidas = bodegas.filter((b: any) => b.excluida).length;
      const incluidas = totalBodegas - excluidas;
      
      return json({
        success: true,
        bodegas,
        resumen: {
          total_bodegas: totalBodegas,
          excluidas,
          incluidas
        }
      });
    }
  } catch (error) {
    console.error('❌ Error en GET /api/admin/bodegas:', error);
    return json({ error: String(error) }, { status: 500 });
  }
};

/**
 * PATCH /api/admin/bodegas/:codigo
 * Marca/desmarca bodega como excluida
 * 
 * Body:
 * {
 *   "excluida": true|false,
 *   "razon": "opcional"
 * }
 */
export const PATCH: RequestHandler = async ({ locals, request }) => {
  const user = locals.user || locals.session?.user;
  
  if (!user) return json({ error: 'No autenticado' }, { status: 401 });
  if (String(user.role).toUpperCase() !== 'ADMIN') return json({ error: 'Solo administradores' }, { status: 403 });
 
  try {
    const body = await request.json();
    // ✅ Extraer id del body
    const { id, excluida, razon } = body;
    
    // ✅ Convertir el id
    const bodegaId = parseInt(String(id || '0'), 10);
    
    console.log(`[API PATCH] Intentando actualizar bodega ID: ${bodegaId}`);
    
    if (!bodegaId || bodegaId <= 0) {
      return json({ error: 'ID de bodega inválido' }, { status: 400 });
    }
    
    if (excluida === undefined) {
      return json({ error: 'Campo "excluida" requerido' }, { status: 400 });
    }
    
    const bodega = db.prepare('SELECT id, bodega_codigo, bodega_nombre FROM bodegas WHERE id = ?').get(bodegaId) as any;
    
    if (!bodega) {
      return json({ error: `Bodega no encontrada: id=${bodegaId}` }, { status: 404 });
    }
    
    // Actualizar
    db.prepare('UPDATE bodegas SET excluida = ?, usuario_actualizacion = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?')
      .run(excluida ? 1 : 0, user.email, bodega.id);
    
    // Historial
    db.prepare(`INSERT INTO bodegas_exclusion_historial (bodega_codigo, bodega_nombre, accion, usuario, razon) VALUES (?, ?, ?, ?, ?)`)
      .run(bodega.bodega_codigo, bodega.bodega_nombre, excluida ? 'EXCLUIDA' : 'INCLUIDA', user.email, razon || null);
    
    AuditService.log(user.id, excluida ? 'BODEGA_EXCLUIDA' : 'BODEGA_INCLUIDA', 'unknown', 'API', `Bodega id=${bodega.id}: ${excluida ? 'EXCLUIDA' : 'INCLUIDA'}`);
    
    return json({
      success: true,
      id: bodega.id,
      bodega_codigo: bodega.bodega_codigo,
      excluida,
      accion: excluida ? 'EXCLUIDA' : 'INCLUIDA'
    });
  } catch (error) {
    return json({ error: String(error) }, { status: 500 });
  }
};

/**
 * DELETE /api/admin/bodegas/:codigo
 * Elimina una bodega y su historial
 * (Usar solo si es necesario)
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
  const user = locals.user || locals.session?.user;
  
  if (!user) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  const userRole = String(user.role).toUpperCase();
  if (userRole !== 'ADMIN') {
    return json({ error: 'Solo administradores' }, { status: 403 });
  }

  try {
    const bodegaCodigo = params.codigo;
    
    const transaction = db.transaction(() => {
      // Eliminar historial
      db.prepare('DELETE FROM bodegas_exclusion_historial WHERE bodega_codigo = ?').run(bodegaCodigo);
      // Eliminar bodega
      db.prepare('DELETE FROM bodegas WHERE bodega_codigo = ?').run(bodegaCodigo);
    });
    
    transaction();
    
    AuditService.log(
      user.id,
      'BODEGA_ELIMINAR',
      'unknown',
      'API',
      `Bodega ${bodegaCodigo} eliminada`
    );
    
    return json({ success: true, bodega_codigo: bodegaCodigo });
  } catch (error) {
    console.error('❌ Error en DELETE /api/admin/bodegas/:codigo:', error);
    return json({ error: String(error) }, { status: 500 });
  }
};