import { json } from '@sveltejs/kit';
import { IAContentService } from '$lib/features/content-creator/services/ia-content-service';
import fs from 'fs';
import path from 'path';
import db from '$lib/config/db-config';
import { AssetService } from '$lib/features/content-creator/services/asset-service';

export async function POST({ params, request, locals }) {
    try {
        const userId = locals?.user?.id || 'admin_user_id';
        const publicacionId = parseInt(params.id);

        if (isNaN(publicacionId)) {
            return json({ success: false, error: 'ID de publicación inválido' }, { status: 400 });
        }

        const body = await request.json();
        let { base64Image, imageUrl, brand, title, context, objective, format, index, customPrompt, selectedAssetIds, modo } = body;

        // Modo 'crear' = text-to-image puro (sin imagen de referencia)
        const isCrear = modo === 'crear';

        // Si no hay base64 pero sí hay una URL local (/uploads/...), leer el archivo del disco
        if (!isCrear && !base64Image && imageUrl) {
            try {
                const filePath = path.join(process.cwd(), 'static', imageUrl.replace(/^\//, ''));
                if (fs.existsSync(filePath)) {
                    const fileBuffer = fs.readFileSync(filePath);
                    const ext = path.extname(filePath).replace('.', '') || 'jpeg';
                    const mime = ext === 'jpg' ? 'jpeg' : ext;
                    base64Image = `data:image/${mime};base64,${fileBuffer.toString('base64')}`;
                } else {
                    return json({ success: false, error: `Imagen no encontrada en disco: ${imageUrl}` }, { status: 404 });
                }
            } catch (e) {
                return json({ success: false, error: 'Error al leer la imagen del servidor' }, { status: 500 });
            }
        }

        if (!isCrear && !base64Image) {
            return json({ success: false, error: 'Se requiere base64Image, imageUrl o modo=crear' }, { status: 400 });
        }

        const fallbackData = { brand, title, context, objective, format };

        // Leer assets del disco y convertir a base64
        let brandAssets: any[] = [];
        if (selectedAssetIds && Array.isArray(selectedAssetIds) && selectedAssetIds.length > 0) {
            brandAssets = selectedAssetIds
                .map(id => db.prepare('SELECT * FROM marca_assets WHERE id = ? AND deleted_at IS NULL').get(id))
                .filter(Boolean)
                .map((asset: any) => {
                    const b64 = AssetService.readAsBase64(asset);
                    return b64 ? { nombre: asset.nombre, tipo: asset.tipo, mimeType: asset.mime_type, base64: b64 } : null;
                })
                .filter(Boolean);
        }

        const sharepointUrl = await IAContentService.generarImagenEditada(publicacionId, userId, isCrear ? null : base64Image, fallbackData, index, customPrompt, brandAssets, isCrear);

        return json({ success: true, imageUrl: sharepointUrl });
    } catch (error: any) {
        console.error('[API generar-imagen] Error:', error);
        return json({ success: false, error: error.message || 'Error interno al generar imagen' }, { status: 500 });
    }
}

