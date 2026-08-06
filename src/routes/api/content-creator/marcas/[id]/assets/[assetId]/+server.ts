import { json } from '@sveltejs/kit';
import { AssetService } from '$lib/features/content-creator/services/asset-service';

// DELETE /api/content-creator/marcas/[id]/assets/[assetId]
export async function DELETE({ params }) {
    try {
        const marcaId = parseInt(params.id);
        const assetId = parseInt(params.assetId);

        if (isNaN(marcaId) || isNaN(assetId)) {
            return json({ success: false, error: 'IDs inválidos' }, { status: 400 });
        }

        const deleted = AssetService.delete(assetId, marcaId);
        
        if (deleted) {
            return json({ success: true, message: 'Asset eliminado correctamente' });
        } else {
            return json({ success: false, error: 'Asset no encontrado o no pertenece a la marca' }, { status: 404 });
        }
    } catch (error: any) {
        console.error('[API DELETE marca asset] Error:', error);
        return json({ success: false, error: 'Error al eliminar el asset' }, { status: 500 });
    }
}
