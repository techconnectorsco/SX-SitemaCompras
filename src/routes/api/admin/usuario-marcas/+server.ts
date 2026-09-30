import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { AuditService } from '$lib/features/security/services/audit-service';

function requireAdmin(locals: any): { user: any } | { error: Response } {
  const user = locals.user || locals.session?.user;
  if (!user) return { error: json({ error: 'No autenticado' }, { status: 401 }) };
  if (String(user.role).toUpperCase() !== 'ADMIN') {
    return { error: json({ error: 'Solo administradores' }, { status: 403 }) };
  }
  return { user };
}

// GET → usuarios activos + etiquetas disponibles + asignaciones actuales
export const GET: RequestHandler = async ({ locals }) => {
  const auth = requireAdmin(locals);
  if ('error' in auth) return auth.error;

  try {
    const usuarios = db.prepare(`
      SELECT id, email, display_name, role
      FROM users
      WHERE account_status = 'ACTIVE'
      ORDER BY COALESCE(NULLIF(display_name, ''), email) COLLATE NOCASE
    `).all();

    const etiquetas = (db.prepare(`
      SELECT etiqueta, MAX(CASE WHEN clave = '__DEFAULT__' THEN 1 ELSE 0 END) AS es_def
      FROM marcas_lt_config
      WHERE activo = 1 AND etiqueta IS NOT NULL AND etiqueta != ''
      GROUP BY etiqueta
      ORDER BY es_def, etiqueta
    `).all() as Array<{ etiqueta: string }>).map((r) => r.etiqueta);

    const filas = db.prepare(`SELECT usuario_id, etiqueta FROM usuario_marcas_lt`)
      .all() as Array<{ usuario_id: string; etiqueta: string }>;
    const asignaciones: Record<string, string[]> = {};
    for (const f of filas) (asignaciones[f.usuario_id] ||= []).push(f.etiqueta);

    return json({ success: true, usuarios, etiquetas, asignaciones });
  } catch (error) {
    console.error('❌ Error en GET /api/admin/usuario-marcas:', error);
    return json({ error: String(error) }, { status: 500 });
  }
};

// PUT → reemplaza TODAS las asignaciones de un usuario
// Body: { usuario_id, etiquetas: string[] }
export const PUT: RequestHandler = async ({ locals, request }) => {
  const auth = requireAdmin(locals);
  if ('error' in auth) return auth.error;
  const { user } = auth;

  try {
    const body = await request.json();
    const usuarioId = String(body.usuario_id || '').trim();
    const etiquetas: string[] = Array.isArray(body.etiquetas)
      ? [...new Set(body.etiquetas.map((e: any) => String(e).trim()).filter(Boolean))]
      : [];

    if (!usuarioId) return json({ error: 'usuario_id es obligatorio' }, { status: 400 });

    const destino = db.prepare('SELECT id FROM users WHERE id = ?').get(usuarioId);
    if (!destino) return json({ error: 'Usuario no encontrado' }, { status: 404 });

    // Validar que las etiquetas existan y estén activas (evita basura)
    if (etiquetas.length) {
      const validas = new Set(
        (db.prepare(`SELECT DISTINCT etiqueta FROM marcas_lt_config WHERE activo = 1`)
          .all() as Array<{ etiqueta: string }>).map((r) => r.etiqueta)
      );
      for (const e of etiquetas) {
        if (!validas.has(e)) return json({ error: `Etiqueta inválida: ${e}` }, { status: 400 });
      }
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM usuario_marcas_lt WHERE usuario_id = ?').run(usuarioId);
      const ins = db.prepare(`
        INSERT INTO usuario_marcas_lt (usuario_id, etiqueta, asignado_por, fecha_asignacion)
        VALUES (?, ?, ?, datetime('now'))
      `);
      for (const e of etiquetas) ins.run(usuarioId, e, user.email);
    });
    tx();

    AuditService.log(user.id, 'USUARIO_MARCAS_ASIGNAR', 'unknown', 'API',
      `Usuario ${usuarioId}: [${etiquetas.join(', ')}]`);

    return json({ success: true, usuario_id: usuarioId, etiquetas });
  } catch (error) {
    console.error('❌ Error en PUT /api/admin/usuario-marcas:', error);
    return json({ error: String(error) }, { status: 500 });
  }
};