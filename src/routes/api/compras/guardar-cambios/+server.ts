/**
 * Guardar cambios de sugerido del analista
 * POST /api/compras/guardar-cambios
 * * ACTUALIZADO: Valida que los cambios pertenezcan al procesamiento activo
 * * Actualiza SOLO los campos editables en forecast_procesamiento
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { AuditService } from '$lib/features/security/services/audit-service';

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = locals.user || locals.session?.user;
  
  if (!user) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  // ✅ MEJORA 1: Capturar IP y User-Agent reales desde la petición del navegador
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('remote-addr') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'VYOWEB-App';

  try {
    const { cambios, codigoProcesamiento } = await request.json();

    if (!cambios || !Array.isArray(cambios) || cambios.length === 0) {
      return json({ error: 'No hay cambios para guardar' }, { status: 400 });
    }

    const usuarioEmail = user.email || user.name || 'Analista';
    const ahora = new Date().toISOString(); 

    // Preparar statement para UPDATE
    const updateStmt = db.prepare(`
      UPDATE forecast_procesamiento 
      SET 
        sugerido_analista_urgente = ?,
        sugerido_analista_aereo = ?,
        sugerido_analista_maritimo = ?,
        comentario_analista = ?,
        usuario_modificacion = ?,
        fecha_modificacion = ?
      WHERE id = ?
    `);

    // Statement para validar
    const validarStmt = db.prepare(`
      SELECT id, codigo_procesamiento, codigo_sku, 
             sugerido_analista_urgente, sugerido_analista_aereo,
             sugerido_analista_maritimo, comentario_analista
      FROM forecast_procesamiento 
      WHERE id = ?
    `);

    const resultados: { 
      id: number; 
      sku?: string;
      success: boolean; 
      error?: string;
      cambios?: { urgente: number; aereo: number; maritimo: number };
    }[] = [];
    
    const ejecutarTransaccion = db.transaction(() => {
      for (const cambio of cambios) {
        const { id, sugerido_analista_urgente, sugerido_analista_aereo, sugerido_analista_maritimo } = cambio;
        
        try {
          const actual = validarStmt.get(id) as any;

          if (!actual) {
            resultados.push({ id, success: false, error: 'Registro no encontrado' });
            continue;
          }

          if (codigoProcesamiento && actual.codigo_procesamiento !== codigoProcesamiento) {
            resultados.push({ id, sku: actual.codigo_sku, success: false, error: 'Pertenece a otro procesamiento' });
            continue;
          }

          const nuevoUrgente = sugerido_analista_urgente !== undefined ? sugerido_analista_urgente : actual.sugerido_analista_urgente ?? 0;
          const nuevoAereo = sugerido_analista_aereo !== undefined ? sugerido_analista_aereo : actual.sugerido_analista_aereo ?? 0;
          const nuevoMaritimo = sugerido_analista_maritimo !== undefined ? sugerido_analista_maritimo : actual.sugerido_analista_maritimo ?? 0;
          const nuevoComentario = cambio.comentario_analista !== undefined ? cambio.comentario_analista : actual.comentario_analista ?? '';

          const result = updateStmt.run(nuevoUrgente, nuevoAereo, nuevoMaritimo, nuevoComentario, usuarioEmail, ahora, id);

          const exito = result.changes > 0;
          resultados.push({ 
            id, 
            sku: actual.codigo_sku,
            success: exito,
            cambios: { urgente: nuevoUrgente, aereo: nuevoAereo, maritimo: nuevoMaritimo }
          });

          // ❌ SE ELIMINÓ: El AuditService.log individual que estaba aquí, para no hacer "spam" en la base de datos.

        } catch (err) {
          console.error(`Error actualizando id ${id}:`, err);
          resultados.push({ id, success: false, error: err instanceof Error ? err.message : 'Error desconocido' });
        }
      }
    });

    // Ejecutar la transacción
    ejecutarTransaccion();

    const exitosos = resultados.filter(r => r.success);
    const fallidos = resultados.filter(r => !r.success);

    // ✅ MEJORA 2: Registro de auditoría consolidado (1 sola fila en la BD)
    if (exitosos.length > 0) {
      try {
        // Extraemos los códigos SKU que se lograron guardar separados por coma
        const skusModificados = exitosos.map(r => r.sku).join(', ');
        const proc = codigoProcesamiento || 'Actual';
        
        AuditService.log(
          user.id,
          'COMPRAS_SAVE_CHANGES',
          ip,
          userAgent,
          `El usuario guardó sugeridos para ${exitosos.length} SKU(s) en [${proc}]. SKUs modificados: ${skusModificados}`
        );
      } catch (auditError) {
        console.error('Error al registrar auditoría consolidada:', auditError);
      }
    }

    if (fallidos.length > 0) {
      try {
        AuditService.log(user.id, 'COMPRAS_UPDATE_ERROR', ip, userAgent, `Falló el guardado de ${fallidos.length} SKU(s)`);
      } catch (e) {}
    }

    return json({ 
      success: exitosos.length > 0,
      message: `${exitosos.length} de ${cambios.length} registro(s) actualizado(s)`,
      actualizados: exitosos.map(r => ({ id: r.id, sku: r.sku })),
      errores: fallidos.length > 0 ? fallidos : undefined
    });

  } catch (error) {
    console.error('Error guardando cambios:', error);
    AuditService.log(user?.id || null, 'COMPRAS_UPDATE_ERROR', ip, userAgent, 'Falla crítica al intentar guardar cambios masivos');
    return json({ 
      error: 'Error al guardar cambios',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
};