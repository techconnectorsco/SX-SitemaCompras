import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/config/db-config';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

    const marcas = db.prepare('SELECT id, nombre, prompt_sistema FROM marcas WHERE deleted_at IS NULL ORDER BY nombre ASC').all() as any[];

    for (const m of marcas) {
      m.manuales = db.prepare(
        'SELECT id, nombre, file_path, file_name, mime_type, file_size, created_at FROM marca_manuales WHERE marca_id = ? AND deleted_at IS NULL ORDER BY id DESC'
      ).all(m.id);
    }

    return json({ marcas });
  } catch (error: any) {
    console.error('[API marcas prompts GET]', error);
    return json({ error: error.message || 'Error interno' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

    const data = await request.json();
    const { id, prompt_sistema } = data;

    if (!id || prompt_sistema === undefined) {
      return json({ error: 'Faltan campos requeridos: id, prompt_sistema' }, { status: 400 });
    }

    db.prepare('UPDATE marcas SET prompt_sistema = ?, updated_at = ? WHERE id = ?')
      .run(prompt_sistema, Math.floor(Date.now() / 1000), id);

    return json({ success: true });
  } catch (error: any) {
    console.error('[API marcas prompts PUT]', error);
    return json({ error: error.message || 'Error interno' }, { status: 500 });
  }
};
