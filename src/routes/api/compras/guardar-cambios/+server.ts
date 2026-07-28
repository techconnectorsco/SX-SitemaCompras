/**
 * Guardar cambios de sugerido del analista
 * POST /api/compras/guardar-cambios
 * * ACTUALIZADO: Valida que los cambios pertenezcan al procesamiento activo
 * * Actualiza SOLO los campos editables en forecast_procesamiento:
 * - sugerido_analista_urgente
 * - sugerido_analista_aereo
 * - sugerido_analista_maritimo (✅ NUEVO)
 * - usuario_modificacion
 * - fecha_modificacion
 * * Body: { 
 * cambios: [{ id, sugerido_analista_urgente?, sugerido_analista_aereo?, sugerido_analista_maritimo? }],
 * codigoProcesamiento?: string  // opcional, para validación
 * }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { AuditService } from '$lib/features/security/services/audit-service';

const ip = 'unknown';
const userAgent = 'SoporteXperto-App';

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = locals.user || locals.session?.user;
  
  if (!user) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const { cambios, codigoProcesamiento } = await request.json();

    if (!cambios || !Array.isArray(cambios) || cambios.length === 0) {
      return json({ error: 'No hay cambios para guardar' }, { status: 400 });
    }

    const usuarioEmail = user.email || user.name || 'Analista';
    const ahora = new Date().toISOString(); // ISO string para consistencia

    // Preparar statement para UPDATE
    // ✅ ACTUALIZADO: Agregado campo maritimo
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

    // Statement para validar que el registro pertenece al procesamiento correcto
    // ✅ ACTUALIZADO: Agregado campo maritimo al select
    const validarStmt = db.prepare(`
      SELECT id, codigo_procesamiento, codigo_sku, 
             sugerido_analista_urgente, 
             sugerido_analista_aereo,
             sugerido_analista_maritimo,
             comentario_analista
      FROM forecast_procesamiento 
      WHERE id = ?
    `);

    // Ejecutar en transacción
    const resultados: { 
      id: number; 
      sku?: string;
      success: boolean; 
      error?: string;
      cambios?: { urgente: number; aereo: number; maritimo: number };
    }[] = [];
    
    const ejecutarTransaccion = db.transaction(() => {
      for (const cambio of cambios) {
        // ✅ ACTUALIZADO: Destructurando maritimo
        const { id, sugerido_analista_urgente, sugerido_analista_aereo, sugerido_analista_maritimo } = cambio;
        
        try {
          // Obtener registro actual
          const actual = validarStmt.get(id) as { 
            id: number;
            codigo_procesamiento: string;
            codigo_sku: string;
            sugerido_analista_urgente: number; 
            sugerido_analista_aereo: number;
            sugerido_analista_maritimo: number;
            comentario_analista: string;
          } | undefined;

          if (!actual) {
            resultados.push({ id, success: false, error: 'Registro no encontrado' });
            continue;
          }

          // Validar que pertenece al procesamiento correcto (si se especificó)
          if (codigoProcesamiento && actual.codigo_procesamiento !== codigoProcesamiento) {
            resultados.push({ 
              id, 
              sku: actual.codigo_sku,
              success: false, 
              error: `Registro pertenece a otro procesamiento (${actual.codigo_procesamiento})` 
            });
            continue;
          }

          // Usar valor nuevo si viene, sino mantener el actual
          const nuevoUrgente = sugerido_analista_urgente !== undefined 
            ? sugerido_analista_urgente 
            : actual.sugerido_analista_urgente ?? 0;
          
          const nuevoAereo = sugerido_analista_aereo !== undefined 
            ? sugerido_analista_aereo 
            : actual.sugerido_analista_aereo ?? 0;

          // ✅ Lógica para Marítimo
          const nuevoMaritimo = sugerido_analista_maritimo !== undefined 
            ? sugerido_analista_maritimo 
            : actual.sugerido_analista_maritimo ?? 0;

          const nuevoComentario = cambio.comentario_analista !== undefined 
            ? cambio.comentario_analista 
            : actual.comentario_analista ?? '';

          // Ejecutar UPDATE
          // ✅ Orden de params: urgente, aereo, maritimo, usuario, fecha, id
          const result = updateStmt.run(
            nuevoUrgente,
            nuevoAereo,
            nuevoMaritimo,
            nuevoComentario,
            usuarioEmail,
            ahora,
            id
          );

          const exito = result.changes > 0;
          resultados.push({ 
            id, 
            sku: actual.codigo_sku,
            success: exito,
            cambios: { urgente: nuevoUrgente, aereo: nuevoAereo, maritimo: nuevoMaritimo }
          });

          if (exito) {
              // ✅ Audit log actualizado con Marítimo
              const detalles = `Actualizado por ${usuarioEmail}: id=${id}, Sug. Curier=${nuevoUrgente}, Sug. Aereo=${nuevoAereo}, Sug. Maritimo=${nuevoMaritimo} en ${codigoProcesamiento}`;
              AuditService.log(user.id, 'COMPRAS_UPDATE', ip || 'unknown', userAgent || null, detalles);
            }

        } catch (err) {
          console.error(`Error actualizando id ${id}:`, err);
          resultados.push({ 
            id, 
            success: false, 
            error: err instanceof Error ? err.message : 'Error desconocido' 
          });
           AuditService.log(user.id, 'COMPRAS_UPDATE_ERROR', ip || 'unknown', userAgent || null, `Error al actualizar id ${id}: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        }
      }
    });

    // Ejecutar la transacción
    ejecutarTransaccion();

    const exitosos = resultados.filter(r => r.success).length;
    const fallidos = resultados.filter(r => !r.success);

    return json({ 
      success: exitosos > 0,
      message: `${exitosos} de ${cambios.length} registro(s) actualizado(s)`,
      actualizados: resultados.filter(r => r.success).map(r => ({ id: r.id, sku: r.sku })),
      errores: fallidos.length > 0 ? fallidos : undefined
    });

  } catch (error) {
    console.error('Error guardando cambios:', error);
    return json({ 
      error: 'Error al guardar cambios',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
};