/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ENDPOINT: src/routes/api/admin/marcas-lt/+server.ts
 *
 * CRUD de la tabla marcas_lt_config (lead time por proveedor/marca y por vía).
 * Llave = `clave`:
 *   - Marca normal → clave = marca de Exactus (CLASIFICACION_4)
 *   - HUSQVARNA    → claves especiales HUSQVARNA-A / HUSQVARNA-B (sembradas)
 *   - Default      → clave '__DEFAULT__' (editable, no se puede eliminar)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { AuditService } from '$lib/features/security/services/audit-service';

const CLAVE_DEFAULT = '__DEFAULT__';

// =====================================================================
// HELPERS
// =====================================================================

function requireAdmin(locals: any): { user: any } | { error: Response } {
  const user = locals.user || locals.session?.user;
  if (!user) return { error: json({ error: 'No autenticado' }, { status: 401 }) };
  if (String(user.role).toUpperCase() !== 'ADMIN') {
    return { error: json({ error: 'Solo administradores' }, { status: 403 }) };
  }
  return { user };
}

/** Convierte a número > 0; null si no es válido. */
function numPositivo(valor: any): number | null {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Convierte a número >= 0; null si no es válido. */
function numNoNegativo(valor: any): number | null {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Valida los 4 campos numéricos.
 * Los tres lead times deben ser > 0 (un 0 borraría el horizonte de esa vía).
 * meses_pedido sí admite 0.
 */
function validarCampos(body: any) {
  const valores: Record<string, number> = {};
  for (const c of ['lt_courier', 'lt_aereo', 'lt_maritimo'] as const) {
    const n = numPositivo(body[c]);
    if (n === null) {
      return { ok: false as const, mensaje: `"${c}" debe ser un número mayor que 0 (el lead time de una vía no puede ser 0).` };
    }
    valores[c] = n;
  }
  const mp = numNoNegativo(body['meses_pedido']);
  if (mp === null) {
    return { ok: false as const, mensaje: '"meses_pedido" debe ser un número ≥ 0.' };
  }
  valores['meses_pedido'] = mp;
  return { ok: true as const, valores };
}

// =====================================================================
// GET  → lista todas las tarifas configuradas (default al final)
// =====================================================================
export const GET: RequestHandler = async ({ locals }) => {
  const auth = requireAdmin(locals);
  if ('error' in auth) return auth.error;

  try {
    const marcas = db.prepare(`
      SELECT clave, marca_exactus, etiqueta,
             lt_courier, lt_aereo, lt_maritimo, meses_pedido,
             activo, nota, actualizado_por, fecha_actualizacion
      FROM marcas_lt_config
      ORDER BY (CASE WHEN clave = '${CLAVE_DEFAULT}' THEN 1 ELSE 0 END), etiqueta, clave
    `).all();

    return json({ success: true, marcas });
  } catch (error) {
    console.error('❌ Error en GET /api/admin/marcas-lt:', error);
    return json({ error: String(error) }, { status: 500 });
  }
};

// =====================================================================
// POST  → agrega un proveedor/marca nuevo (caso simple: una marca = una clave)
// Body: { marca_exactus, etiqueta, lt_courier, lt_aereo, lt_maritimo, meses_pedido, nota? }
// La clave se deriva = marca_exactus (en MAYÚSCULAS).
// =====================================================================
export const POST: RequestHandler = async ({ locals, request }) => {
  const auth = requireAdmin(locals);
  if ('error' in auth) return auth.error;
  const { user } = auth;

  try {
    const body = await request.json();
    const marcaExactus = String(body.marca_exactus || '').toUpperCase().trim();
    const etiqueta = String(body.etiqueta || '').trim() || marcaExactus;

    if (!marcaExactus) {
      return json({ error: 'La marca (valor de Exactus) es obligatoria' }, { status: 400 });
    }
    if (marcaExactus === CLAVE_DEFAULT) {
      return json({ error: 'Clave reservada' }, { status: 400 });
    }

    const v = validarCampos(body);
    if (!v.ok) return json({ error: v.mensaje }, { status: 400 });

    const clave = marcaExactus; // caso simple: 1 marca = 1 clave
    const existe = db.prepare('SELECT clave FROM marcas_lt_config WHERE clave = ?').get(clave);
    if (existe) {
      return json({ error: `La marca "${clave}" ya está configurada` }, { status: 409 });
    }

    db.prepare(`
      INSERT INTO marcas_lt_config
        (clave, marca_exactus, etiqueta, lt_courier, lt_aereo, lt_maritimo, meses_pedido, activo, nota, actualizado_por, fecha_actualizacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, datetime('now'))
    `).run(
      clave, marcaExactus, etiqueta,
      v.valores.lt_courier, v.valores.lt_aereo, v.valores.lt_maritimo, v.valores.meses_pedido,
      body.nota ? String(body.nota).trim() : null,
      user.email
    );

    AuditService.log(user.id, 'MARCA_LT_CREAR', 'unknown', 'API',
      `Clave ${clave}: courier=${v.valores.lt_courier}, aereo=${v.valores.lt_aereo}, maritimo=${v.valores.lt_maritimo}, meses=${v.valores.meses_pedido}`);

    return json({ success: true, clave });
  } catch (error) {
    console.error('❌ Error en POST /api/admin/marcas-lt:', error);
    return json({ error: String(error) }, { status: 500 });
  }
};

// =====================================================================
// PATCH  → actualiza una tarifa existente (por clave)
// Body: { clave, etiqueta?, lt_courier, lt_aereo, lt_maritimo, meses_pedido, activo, nota? }
// =====================================================================
export const PATCH: RequestHandler = async ({ locals, request }) => {
  const auth = requireAdmin(locals);
  if ('error' in auth) return auth.error;
  const { user } = auth;

  try {
    const body = await request.json();
    const clave = String(body.clave || '').toUpperCase().trim();

    if (!clave) return json({ error: 'La clave es obligatoria' }, { status: 400 });

    const fila = db.prepare('SELECT clave, etiqueta FROM marcas_lt_config WHERE clave = ?').get(clave) as any;
    if (!fila) return json({ error: `Clave no encontrada: ${clave}` }, { status: 404 });

    const v = validarCampos(body);
    if (!v.ok) return json({ error: v.mensaje }, { status: 400 });

    const activo = body.activo ? 1 : 0;
    const etiqueta = body.etiqueta !== undefined ? String(body.etiqueta).trim() : fila.etiqueta;

    db.prepare(`
      UPDATE marcas_lt_config
      SET etiqueta = ?, lt_courier = ?, lt_aereo = ?, lt_maritimo = ?, meses_pedido = ?, activo = ?,
          nota = ?, actualizado_por = ?, fecha_actualizacion = datetime('now')
      WHERE clave = ?
    `).run(
      etiqueta,
      v.valores.lt_courier, v.valores.lt_aereo, v.valores.lt_maritimo, v.valores.meses_pedido,
      activo,
      body.nota !== undefined ? (body.nota ? String(body.nota).trim() : null) : null,
      user.email,
      clave
    );

    AuditService.log(user.id, 'MARCA_LT_ACTUALIZAR', 'unknown', 'API',
      `Clave ${clave}: courier=${v.valores.lt_courier}, aereo=${v.valores.lt_aereo}, maritimo=${v.valores.lt_maritimo}, meses=${v.valores.meses_pedido}, activo=${activo}`);

    return json({ success: true, clave });
  } catch (error) {
    console.error('❌ Error en PATCH /api/admin/marcas-lt:', error);
    return json({ error: String(error) }, { status: 500 });
  }
};

// =====================================================================
// DELETE /api/admin/marcas-lt?clave=XXX
// (no permite eliminar el default '__DEFAULT__')
// =====================================================================
export const DELETE: RequestHandler = async ({ locals, url }) => {
  const auth = requireAdmin(locals);
  if ('error' in auth) return auth.error;
  const { user } = auth;

  try {
    const clave = String(url.searchParams.get('clave') || '').toUpperCase().trim();
    if (!clave) return json({ error: 'La clave es obligatoria' }, { status: 400 });

    if (clave === CLAVE_DEFAULT) {
      return json({ error: 'No se puede eliminar la fila por defecto (Otras marcas). Podés editar sus valores, pero no borrarla.' }, { status: 400 });
    }

    const fila = db.prepare('SELECT clave FROM marcas_lt_config WHERE clave = ?').get(clave);
    if (!fila) return json({ error: `Clave no encontrada: ${clave}` }, { status: 404 });

    db.prepare('DELETE FROM marcas_lt_config WHERE clave = ?').run(clave);

    AuditService.log(user.id, 'MARCA_LT_ELIMINAR', 'unknown', 'API', `Clave ${clave} eliminada`);

    return json({ success: true, clave });
  } catch (error) {
    console.error('❌ Error en DELETE /api/admin/marcas-lt:', error);
    return json({ error: String(error) }, { status: 500 });
  }
};