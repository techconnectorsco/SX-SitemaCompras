import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/config/db-config';
import { IAContentService } from '$lib/features/content-creator/services/ia-content-service';

// POST /api/content-creator/marcas/[id]/manual/[manualId]/analizar
export const POST: RequestHandler = async ({ params, locals }) => {
  try {
    if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

    const marcaId = parseInt(params.id);
    const manualId = parseInt(params.manualId);

    if (isNaN(marcaId) || isNaN(manualId)) {
      return json({ error: 'IDs inválidos' }, { status: 400 });
    }

    const manual = db.prepare(
      'SELECT id, marca_id FROM marca_manuales WHERE id = ? AND marca_id = ? AND deleted_at IS NULL'
    ).get(manualId, marcaId);

    if (!manual) {
      return json({ error: 'Manual no encontrado para esta marca' }, { status: 404 });
    }

    const resumen_ia = await IAContentService.analizarManualMarca(manualId, locals.user.id);

    const manualActualizado = db.prepare(
      'SELECT id, marca_id, nombre, file_path, file_name, mime_type, file_size, resumen_ia, analizado_at, created_at FROM marca_manuales WHERE id = ?'
    ).get(manualId);

    return json({ success: true, manual: manualActualizado, resumen_ia });
  } catch (error: any) {
    console.error('[API POST re-analizar manual]', error);
    return json({ error: error.message || 'Error al analizar el manual de marca' }, { status: 500 });
  }
};
