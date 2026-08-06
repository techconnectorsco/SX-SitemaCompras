import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/config/db-config';

// DELETE /api/content-creator/marcas/[id]/manual/[manualId]
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

    const marcaId = parseInt(params.id);
    const manualId = parseInt(params.manualId);

    if (isNaN(marcaId) || isNaN(manualId)) {
      return json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    db.prepare(`
      UPDATE marca_manuales SET deleted_at = strftime('%s','now')
      WHERE id = ? AND marca_id = ?
    `).run(manualId, marcaId);

    return json({ success: true });
  } catch (error: any) {
    console.error('[API DELETE marca manual]', error);
    return json({ error: error.message || 'Error al eliminar el manual de marca' }, { status: 500 });
  }
};
