import fs from 'fs';
import path from 'path';

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
        await new Promise(resolve => setTimeout(resolve, 800));

        // Remover el encabezado 'data:image/jpeg;base64,' si existe
        const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Content, 'base64');

        // Definir la ruta de guardado (static/uploads)
        const uploadDir = subPath 
            ? path.join(process.cwd(), 'static', 'uploads', ...subPath.split('/'))
            : path.join(process.cwd(), 'static', 'uploads');
        
        // Crear carpeta si no existe
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = path.join(uploadDir, safeFileName);

        // Guardar el archivo físicamente
        fs.writeFileSync(filePath, buffer);

        // Devolver la URL relativa que SvelteKit puede servir
        const relativeUrlPath = subPath ? `/uploads/${subPath}/${safeFileName}` : `/uploads/${safeFileName}`;
        return relativeUrlPath;
    }

    /**
     * Sube un archivo Buffer a SharePoint (Simulado), usado para multipart/form-data
     */
    static async uploadFile(
        fileName: string,
        buffer: Buffer,
        mimeType: string,
        subPath: string
    ): Promise<{ url: string; size: number }> {
        // Simulación de retraso de red
        await new Promise(resolve => setTimeout(resolve, 600));

        const uploadDir = path.join(process.cwd(), 'static', 'uploads', ...subPath.split('/'));
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = path.join(uploadDir, safeFileName);

        fs.writeFileSync(filePath, buffer);

        return {
            url: `/uploads/${subPath}/${safeFileName}`,
            size: buffer.length
        };
    }
}
