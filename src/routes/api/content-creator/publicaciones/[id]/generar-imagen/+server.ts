import { json } from '@sveltejs/kit';
import { IAContentService } from '$lib/features/content-creator/services/ia-content-service';
import path from 'path';
import db from '$lib/config/db-config';
import { AssetService } from '$lib/features/content-creator/services/asset-service';
import { readUploadFile } from '$lib/server/uploads-storage';

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
                const fileBuffer = await readUploadFile(imageUrl);
                const ext = path.extname(imageUrl).replace('.', '') || 'jpeg';
                const mime = ext === 'jpg' ? 'jpeg' : ext;
                base64Image = `data:image/${mime};base64,${fileBuffer.toString('base64')}`;
            } catch (e: any) {
                if (e?.code === 'ENOENT') {
                    return json({ success: false, error: `Imagen no encontrada en disco: ${imageUrl}` }, { status: 404 });
                }
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
            const assets = selectedAssetIds.map((id) => ({
                id,
                asset: db.prepare('SELECT * FROM marca_assets WHERE id = ? AND deleted_at IS NULL').get(id) as any
            }));
            const missingRecords = assets.filter(({ asset }) => !asset).map(({ id }) => id);
            if (missingRecords.length > 0) {
                return json({ success: false, error: `Assets no disponibles: ${missingRecords.join(', ')}` }, { status: 404 });
            }

            brandAssets = await Promise.all(
                assets.map(async ({ id, asset }) => {
                    const b64 = await AssetService.readAsBase64(asset);
                    if (!b64) {
                        throw new Error(`El asset seleccionado "${asset.nombre}" (ID ${id}) no está disponible en disco: ${asset.file_path}`);
                    }
                    return { nombre: asset.nombre, tipo: asset.tipo, mimeType: asset.mime_type, base64: b64 };
                })
            );
        }

        const sharepointUrl = await IAContentService.generarImagenEditada(publicacionId, userId, isCrear ? null : base64Image, fallbackData, index, customPrompt, brandAssets, isCrear);

        return json({ success: true, imageUrl: sharepointUrl });
    } catch (error: any) {
        console.error('[API generar-imagen] Error:', error);
        return json({ success: false, error: error.message || 'Error interno al generar imagen' }, { status: 500 });
    }
}
