import { json } from '@sveltejs/kit';
import { AssetService } from '$lib/features/content-creator/services/asset-service';
import { SharePointService } from '$lib/features/content-creator/services/sharepoint-service';
import db from '$lib/config/db-config';

// GET /api/content-creator/marcas/[id]/assets
export async function GET({ params }) {
    try {
        const marcaId = parseInt(params.id);
        if (isNaN(marcaId)) {
            return json({ success: false, error: 'ID de marca inválido' }, { status: 400 });
        }

        const assets = AssetService.getByMarca(marcaId);
        return json({ success: true, assets });
    } catch (error: any) {
        console.error('[API GET marca assets] Error:', error);
        return json({ success: false, error: 'Error al obtener assets' }, { status: 500 });
    }
}

// POST /api/content-creator/marcas/[id]/assets
export async function POST({ params, request }) {
    try {
        const marcaId = parseInt(params.id);
        if (isNaN(marcaId)) {
            return json({ success: false, error: 'ID de marca inválido' }, { status: 400 });
        }

        // Verificar que la marca exista
        const marca = db.prepare('SELECT id FROM marcas WHERE id = ?').get(marcaId);
        if (!marca) {
            return json({ success: false, error: 'Marca no encontrada' }, { status: 404 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const nombre = formData.get('nombre') as string;
        const tipo = formData.get('tipo') as 'logo' | 'isotipo' | 'sello' | 'fondo' | 'other';

        if (!file || !nombre || !tipo) {
            return json({ success: false, error: 'Faltan campos requeridos (file, nombre, tipo)' }, { status: 400 });
        }

        // Límite de 5MB
        if (file.size > 5 * 1024 * 1024) {
            return json({ success: false, error: 'El archivo excede el límite de 5MB' }, { status: 400 });
        }

        // Validar tipos MIME
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            return json({ success: false, error: 'Tipo de archivo no soportado. Usa PNG, JPG, WEBP o SVG.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Guardar físicamente
        const { url, size } = await SharePointService.uploadFile(
            file.name,
            buffer,
            file.type,
            `marcas/${marcaId}/assets`
        );

        // Crear registro en BD
        const asset = AssetService.create({
            marca_id: marcaId,
            nombre,
            tipo,
            file_path: url,
            file_name: file.name,
            mime_type: file.type,
            file_size: size
        });

        return json({ success: true, asset });
    } catch (error: any) {
        console.error('[API POST marca assets] Error:', error);
        return json({ success: false, error: 'Error al subir el asset' }, { status: 500 });
    }
}
