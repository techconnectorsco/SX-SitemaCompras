/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHIVO: src/routes/api/admin/bodegas/actualizar/+server.ts
 * 
 * RUTA: POST /api/admin/bodegas/actualizar
 * 
 * ✅ TRAE DE EXACTUS
 * ✅ INSERTA EN SQLITE preservando el estado de exclusión existente
 * ✅ Bodegas NUEVAS entran como EXCLUIDAS por defecto (excluida = 1)
 * ✅ Bodegas EXISTENTES mantienen su estado de exclusión actual
 * ✅ RETORNA LOS DATOS INSERTADOS/ACTUALIZADOS
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { createDataSource } from '$lib/services/data-source-factory';
import { AuditService } from '$lib/features/security/services/audit-service';

export const POST: RequestHandler = async ({ locals }) => {
  const user = locals.user || locals.session?.user;
  
  if (!user) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  const userRole = String(user.role).toUpperCase();
  if (userRole !== 'ADMIN') {
    return json({ error: 'Solo administradores' }, { status: 403 });
  }

  const dataSource = createDataSource();
  
  try {
    console.log('[API] 🔄 INICIANDO: Sincronización desde Exactus...\n');
    
    // ===== PASO 1: TRAER DE EXACTUS =====
    const pool = (dataSource as any).pool || await (dataSource as any).getPool();
    
    console.log('[API] 🌐 Conectando a Exactus...');
    
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
    
    console.log(`[API] ✅ Obtenidas ${bodegasExactus.length} bodegas de Exactus\n`);
    
    // ===== PASO 2: GUARDAR EN SQLITE PRESERVANDO ESTADO =====
    console.log('[API] 💾 GUARDANDO EN SQLITE (preservando estado de exclusión)...');
    
    // ✅ NUEVO: INSERT solo si NO existe, con excluida = 1 (excluida por defecto)
    const insertStmt = db.prepare(`
      INSERT INTO bodegas 
        (bodega_codigo, bodega_nombre, tipo, telefono, direccion, u_zona, tipo_establecimiento, excluida, fecha_sincronizacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    `);
    
    // ✅ NUEVO: UPDATE solo de campos descriptivos. NO toca el campo 'excluida'
    const updateStmt = db.prepare(`
      UPDATE bodegas 
      SET 
        bodega_nombre = ?,
        tipo = ?,
        telefono = ?,
        direccion = ?,
        u_zona = ?,
        tipo_establecimiento = ?,
        fecha_sincronizacion = CURRENT_TIMESTAMP
      WHERE bodega_codigo = ?
    `);
    
    // ✅ Verificar si existe antes de decidir INSERT o UPDATE
    const checkStmt = db.prepare('SELECT id FROM bodegas WHERE bodega_codigo = ?');
    
    const transaction = db.transaction(() => {
      let nuevas = 0;
      let actualizadas = 0;
      const bodegasGuardadas = [];
      
      for (const bodega of bodegasExactus) {
        try {
          const existe = checkStmt.get(bodega.bodega_codigo);
          
          if (existe) {
            // Bodega ya existe: solo actualizar datos descriptivos
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
          } else {
            // Bodega nueva: insertar como EXCLUIDA por defecto
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
          }
          
          bodegasGuardadas.push(bodega);
        } catch (e) {
          console.error(`[API] ⚠️ Error procesando ${bodega.bodega_codigo}:`, e);
        }
      }
      
      return { nuevas, actualizadas, bodegasGuardadas };
    });
    
    const resultado = transaction();
    
    console.log(`[API] ✅ NUEVAS (excluidas por defecto): ${resultado.nuevas}`);
    console.log(`[API] ✅ ACTUALIZADAS (estado preservado): ${resultado.actualizadas}`);
    
    // ===== VERIFICACIÓN =====
    const verificacion = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN excluida = 1 THEN 1 ELSE 0 END) as excluidas,
        SUM(CASE WHEN excluida = 0 THEN 1 ELSE 0 END) as incluidas
      FROM bodegas
    `).get() as any;
    
    console.log(`[API] 🔍 VERIFICACIÓN: Total=${verificacion.total}, Incluidas=${verificacion.incluidas}, Excluidas=${verificacion.excluidas}\n`);
    
    // Log auditoría
    AuditService.log(
      user.id,
      'BODEGAS_ACTUALIZAR',
      'unknown',
      'API',
      `Sincronización: ${resultado.nuevas} nuevas, ${resultado.actualizadas} actualizadas`
    );
    
    // ===== RETORNAR =====
    return json({
      success: true,
      nuevas_agregadas: resultado.nuevas,
      actualizadas: resultado.actualizadas,
      total_bodegas: verificacion.total,
      incluidas: verificacion.incluidas,
      excluidas: verificacion.excluidas,
      bodegas: resultado.bodegasGuardadas,
      mensaje: resultado.nuevas > 0
        ? `✅ ${resultado.nuevas} nueva(s) agregada(s) (excluidas por defecto), ${resultado.actualizadas} actualizada(s)`
        : `✅ ${resultado.actualizadas} bodega(s) actualizada(s). Sin bodegas nuevas.`
    });
    
  } catch (error) {
    console.error('[API] ❌ ERROR:', error);
    return json({ 
      error: String(error),
      mensaje: 'Error al sincronizar bodegas'
    }, { status: 500 });
  }
};