import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/config/db-config';
import { SharePointService } from '$lib/features/content-creator/services/sharepoint-service';
import { IAContentService } from '$lib/features/content-creator/services/ia-content-service';

// GET /api/content-creator/marcas/[id]/manual
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

    const marcaId = parseInt(params.id);
    if (isNaN(marcaId)) {
      return json({ error: 'ID de marca inválido' }, { status: 400 });
    }

    const manuales = db.prepare(
      'SELECT id, nombre, file_path, file_name, mime_type, file_size, resumen_ia, analizado_at, created_at FROM marca_manuales WHERE marca_id = ? AND deleted_at IS NULL ORDER BY id DESC'
    ).all(marcaId);

    return json({ success: true, manuales });
  } catch (error: any) {
    console.error('[API GET marca manuales]', error);
    return json({ error: error.message || 'Error interno' }, { status: 500 });
  }
};

// POST /api/content-creator/marcas/[id]/manual
export const POST: RequestHandler = async ({ params, request, locals }) => {
  try {
    if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

    const marcaId = parseInt(params.id);
    if (isNaN(marcaId)) {
      return json({ error: 'ID de marca inválido' }, { status: 400 });
    }

    const marca = db.prepare('SELECT id, nombre FROM marcas WHERE id = ? AND deleted_at IS NULL').get(marcaId);
    if (!marca) {
      return json({ error: 'Marca no encontrada' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const nombre = (formData.get('nombre') as string) || file?.name || 'Manual de Marca';

    if (!file) {
      return json({ error: 'Debes seleccionar un archivo para subir' }, { status: 400 });
    }

    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'image/png',
      'image/jpeg',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      return json({ error: 'Formato no soportado. Usa PDF, TXT, MD, PNG, JPG o WEBP.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { url, size } = await SharePointService.uploadFile(
      file.name,
      buffer,
      file.type,
      `marcas/${marcaId}/manuales`
    );

    const result = db.prepare(`
      INSERT INTO marca_manuales (marca_id, nombre, file_path, file_name, mime_type, file_size)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(marcaId, nombre, url, file.name, file.type, size);

    const manualId = Number(result.lastInsertRowid);
    // Un manual solo se conserva si Gemini deja un resumen persistido y válido.
    try {
      await IAContentService.analizarManualMarca(manualId, locals.user.id);
    } catch (aiErr: any) {
      db.prepare('DELETE FROM marca_manuales WHERE id = ?').run(manualId);
      try {
        await SharePointService.deleteFile(url);
      } catch (cleanupErr) {
        console.error(`[API POST marca manual] No se pudo eliminar el archivo sin análisis ${url}:`, cleanupErr);
      }

      console.warn(`[API POST marca manual] Análisis IA falló para manual ${manualId}; carga revertida:`, aiErr.message);
      return json({ error: `No se pudo analizar el manual. No fue guardado: ${aiErr.message}` }, { status: 422 });
    }

    const nuevoManual = db.prepare(
      'SELECT id, marca_id, nombre, file_path, file_name, mime_type, file_size, resumen_ia, analizado_at, created_at FROM marca_manuales WHERE id = ?'
    ).get(manualId);

    return json({ success: true, manual: nuevoManual });
  } catch (error: any) {
    console.error('[API POST marca manual]', error);
    return json({ error: error.message || 'Error al subir el manual de marca' }, { status: 500 });
  }
};
