import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import path from 'path';
import { writeUploadFile } from '$lib/server/uploads-storage';

/**
 * Sube una imagen de referencia (o diseño final) del creador de contenido
 * al almacenamiento persistente y devuelve la URL pública y el path.
 * En el futuro, este mismo contrato puede reemplazarse por SharePoint/Graph.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

        const formData = await request.formData();
        const file = formData.get('file');
        const subPath = (formData.get('subPath') as string | null) || 'refs';

        if (!(file instanceof File)) {
            return json({ error: 'No se envió ningún archivo (campo "file")' }, { status: 400 });
        }

        // Validar tipo MIME
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
        const contentType = file.type || '';
        if (!allowed.includes(contentType)) {
            return json({ error: `Tipo de archivo no permitido: ${contentType}` }, { status: 400 });
        }

        // Limpiar subPath y construir la ruta lógica dentro de /uploads
        const safeSub = subPath.replace(/[^a-zA-Z0-9/_-]/g, '_').replace(/^\/+|\/+$/g, '');

        // Nombre seguro + timestamp para evitar colisiones
        const ext = path.extname(file.name) || `.${contentType.split('/')[1] || 'jpg'}`;
        const safeBase =
            path
                .basename(file.name, ext)
                .replace(/[^a-zA-Z0-9-_]/g, '_')
                .slice(0, 40) || 'ref';
        const safeFileName = `${Date.now()}_${safeBase}${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const publicPath = await writeUploadFile(`content-creator/${safeSub}`, safeFileName, buffer);

        return json({
            success: true,
            imageUrl: publicPath,
            imagePath: publicPath,
            fileName: safeFileName,
            originalName: file.name,
            size: file.size
        });
    } catch (error: any) {
        console.error('[API content-creator upload-imagen] Error:', error);
        return json({ error: error.message || 'Error interno al subir la imagen' }, { status: 500 });
    }
};
