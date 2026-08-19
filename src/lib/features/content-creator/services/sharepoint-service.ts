import { deleteUploadFile, writeUploadFile } from '$lib/server/uploads-storage';

/**
 * Servicio Mock de SharePoint.
 * Actualmente guarda las imágenes en el sistema local hasta que se obtengan las credenciales de Microsoft Graph.
 */
export class SharePointService {
    /**
     * Sube un archivo a SharePoint (Simulado)
     * @param fileName Nombre del archivo a guardar
     * @param base64Data Contenido del archivo en Base64
     * @param subPath Ruta adicional opcional (ej: 'marcas/1/assets')
     * @returns La URL pública (local por ahora) donde se puede ver la imagen
     */
    static async uploadImage(fileName: string, base64Data: string, subPath?: string): Promise<string> {
        // En el futuro, aquí irá la lógica de fetch a https://graph.microsoft.com/...

        // Simulación de retraso de red
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Remover el encabezado 'data:image/jpeg;base64,' si existe
        const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Content, 'base64');

        const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        return writeUploadFile(subPath || '.', safeFileName, buffer);
    }

    /**
     * Sube un archivo Buffer a SharePoint (Simulado), usado para multipart/form-data
     */
    static async uploadFile(fileName: string, buffer: Buffer, mimeType: string, subPath: string): Promise<{ url: string; size: number }> {
        // Simulación de retraso de red
        await new Promise((resolve) => setTimeout(resolve, 600));

        const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const url = await writeUploadFile(subPath, safeFileName, buffer);

        return {
            url,
            size: buffer.length
        };
    }

    /** Elimina un archivo guardado por la implementación local de SharePoint. */
    static async deleteFile(url: string): Promise<void> {
        // Cuando se reemplace esta simulación por SharePoint real, esta operación
        // debe delegarse a Microsoft Graph usando la URL/ID almacenado.
        if (!url.startsWith('/uploads/')) {
            throw new Error('La ruta del archivo no pertenece al almacenamiento local');
        }

        await deleteUploadFile(url);
    }
}
