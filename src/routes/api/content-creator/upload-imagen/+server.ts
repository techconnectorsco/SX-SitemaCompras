import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs';
import path from 'path';

/**
 * Sube una imagen de referencia (o diseño final) del creador de contenido
 * al disco local (static/uploads/refs) y devuelve la URL pública y el path.
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

        // Limpiar subPath y construir ruta física
        const safeSub = subPath.replace(/[^a-zA-Z0-9/_-]/g, '_').replace(/^\/+|\/+$/g, '');
        const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'content-creator', ...safeSub.split('/'));
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Nombre seguro + timestamp para evitar colisiones
        const ext = path.extname(file.name) || `.${contentType.split('/')[1] || 'jpg'}`;
        const safeBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40) || 'ref';
        const safeFileName = `${Date.now()}_${safeBase}${ext}`;
        const filePath = path.join(uploadDir, safeFileName);

        // Escribir a disco
        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        // URL pública relativa (SvelteKit sirve /static/* en /)
        const publicPath = `/uploads/content-creator/${safeSub}/${safeFileName}`;

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