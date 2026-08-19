import db from '$lib/config/db-config';
import type { MarcaAsset } from '../types';
import { readUploadFile } from '$lib/server/uploads-storage';

export class AssetService {
    /** Lista assets activos de una marca */
    static getByMarca(marcaId: number): MarcaAsset[] {
        return db.prepare('SELECT * FROM marca_assets WHERE marca_id = ? AND deleted_at IS NULL ORDER BY created_at DESC').all(marcaId) as MarcaAsset[];
    }

    /** Crea un registro de asset en DB después de subir el archivo */
    static create(data: { marca_id: number; nombre: string; tipo: MarcaAsset['tipo']; file_path: string; file_name: string; mime_type: string; file_size: number }): MarcaAsset {
        const stmt = db.prepare(`
            INSERT INTO marca_assets (marca_id, nombre, tipo, file_path, file_name, mime_type, file_size)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(data.marca_id, data.nombre, data.tipo, data.file_path, data.file_name, data.mime_type, data.file_size);

        return db.prepare('SELECT * FROM marca_assets WHERE id = ?').get(info.lastInsertRowid) as MarcaAsset;
    }

    /** Soft delete */
    static delete(assetId: number, marcaId: number): boolean {
        const info = db.prepare('UPDATE marca_assets SET deleted_at = ? WHERE id = ? AND marca_id = ?').run(Math.floor(Date.now() / 1000), assetId, marcaId);
        return info.changes > 0;
    }

    /** Lee un asset y devuelve su contenido como base64 limpio (para enviar a Gemini) */
    static async readAsBase64(asset: MarcaAsset): Promise<string | null> {
        try {
            const buffer = await readUploadFile(asset.file_path);
            return buffer.toString('base64');
        } catch (e) {
            console.error(`[AssetService] Error leyendo archivo ${asset.file_path}:`, e);
            return null;
        }
    }
}
