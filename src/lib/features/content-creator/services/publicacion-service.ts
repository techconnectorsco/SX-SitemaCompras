import db from '$lib/config/db-config';
import type { Publicacion, CreatePublicacionDTO, UpdatePublicacionDTO, FiltrosPublicacion } from '../types';

export class PublicacionService {
    static getByUser(userId: string, filtros?: FiltrosPublicacion): Publicacion[] {
        let query = `
            SELECT p.*, m.nombre as marca, f.nombre as formato, a.nombre as audiencia, c.nombre as cuenta
            FROM publicaciones p
            LEFT JOIN marcas m ON p.marca_id = m.id
            LEFT JOIN formatos f ON p.formato_id = f.id
            LEFT JOIN audiencias a ON p.audiencia_id = a.id
            LEFT JOIN cuentas c ON p.cuenta_id = c.id
            WHERE p.user_id = ? AND p.deleted_at IS NULL
        `;
        
        const params: any[] = [userId];

        if (filtros?.estado) {
            query += ` AND p.estado = ?`;
            params.push(filtros.estado);
        }
        if (filtros?.marca_id) {
            query += ` AND p.marca_id = ?`;
            params.push(filtros.marca_id);
        }
        if (filtros?.campana) {
            query += ` AND p.campana LIKE ?`;
            params.push(`%${filtros.campana}%`);
        }
        
        query += ` ORDER BY p.created_at DESC`;

        const publicaciones = db.prepare(query).all(...params) as Publicacion[];

        // Fetch redes sociales
        const redesStmt = db.prepare(`
            SELECT rs.nombre 
            FROM publicacion_redes pr
            JOIN redes_sociales rs ON pr.red_social_id = rs.id
            WHERE pr.publicacion_id = ?
        `);

        for (const p of publicaciones) {
            const redes = redesStmt.all(p.id) as { nombre: string }[];
            p.redes = redes.map(r => r.nombre);
        }

        return publicaciones;
    }

    static getById(id: number, userId: string): Publicacion | null {
        const p = db.prepare(`
            SELECT p.*, m.nombre as marca, f.nombre as formato, a.nombre as audiencia, c.nombre as cuenta
            FROM publicaciones p
            LEFT JOIN marcas m ON p.marca_id = m.id
            LEFT JOIN formatos f ON p.formato_id = f.id
            LEFT JOIN audiencias a ON p.audiencia_id = a.id
            LEFT JOIN cuentas c ON p.cuenta_id = c.id
            WHERE p.id = ? AND p.user_id = ? AND p.deleted_at IS NULL
        `).get(id, userId) as Publicacion | undefined;

        if (!p) return null;

        const redes = db.prepare(`
            SELECT rs.nombre 
            FROM publicacion_redes pr
            JOIN redes_sociales rs ON pr.red_social_id = rs.id
            WHERE pr.publicacion_id = ?
        `).all(p.id) as { nombre: string }[];
        
        p.redes = redes.map(r => r.nombre);

        return p;
    }

    static create(userId: string, data: CreatePublicacionDTO): number {
        const insertPub = db.prepare(`
            INSERT INTO publicaciones (
                user_id, cuenta_id, marca_id, formato_id, audiencia_id, 
                titulo, contexto, objetivo, cta, presupuesto_usd, campana, 
                fecha_programada, meta_pauta_inicio, meta_pauta_fin, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertRedes = db.prepare(`
            INSERT INTO publicacion_redes (publicacion_id, red_social_id)
            VALUES (?, ?)
        `);

        const transaction = db.transaction(() => {
            const result = insertPub.run(
                userId,
                data.cuenta_id,
                data.marca_id,
                data.formato_id || null,
                data.audiencia_id || null,
                data.titulo,
                data.contexto || null,
                data.objetivo || null,
                data.cta || null,
                data.presupuesto_usd || null,
                data.campana || null,
                data.fecha_programada || null,
                data.meta_pauta_inicio || null,
                data.meta_pauta_fin || null,
                data.estado || 'Borrador'
            );

            const pubId = result.lastInsertRowid as number;

            if (data.redes_ids && data.redes_ids.length > 0) {
                for (const redId of data.redes_ids) {
                    insertRedes.run(pubId, redId);
                }
            }

            return pubId;
        });

        return transaction();
    }

    static update(id: number, userId: string, data: UpdatePublicacionDTO): void {
        const allowedFields = [
            'cuenta_id', 'marca_id', 'formato_id', 'audiencia_id', 
            'titulo', 'contexto', 'objetivo', 'cta', 'presupuesto_usd', 
            'campana', 'fecha_programada', 'meta_pauta_inicio', 'meta_pauta_fin',
            'estado', 'copy_final'
        ];

        const updates: string[] = [];
        const params: any[] = [];

        for (const field of allowedFields) {
            if (data[field as keyof UpdatePublicacionDTO] !== undefined) {
                updates.push(`${field} = ?`);
                params.push(data[field as keyof UpdatePublicacionDTO]);
            }
        }

        if (updates.length > 0) {
            updates.push('updated_at = ?');
            params.push(Math.floor(Date.now() / 1000));
            updates.push('modificado_por = ?');
            params.push(userId);
            
            params.push(id, userId);

            const query = `UPDATE publicaciones SET ${updates.join(', ')} WHERE id = ? AND user_id = ? AND deleted_at IS NULL`;
            db.prepare(query).run(...params);
        }

        if (data.redes_ids) {
            const transaction = db.transaction(() => {
                db.prepare('DELETE FROM publicacion_redes WHERE publicacion_id = ?').run(id);
                const insertRedes = db.prepare(`
                    INSERT INTO publicacion_redes (publicacion_id, red_social_id)
                    VALUES (?, ?)
                `);
                for (const redId of data.redes_ids!) {
                    insertRedes.run(id, redId);
                }
            });
            transaction();
        }
    }

    static softDelete(id: number, userId: string): void {
        db.prepare(`
            UPDATE publicaciones 
            SET deleted_at = ?, modificado_por = ? 
            WHERE id = ? AND user_id = ?
        `).run(Math.floor(Date.now() / 1000), userId, id, userId);
    }

    static aprobar(id: number, aprobadorId: string): void {
        db.prepare(`
            UPDATE publicaciones 
            SET estado = 'Aprobado', 
                aprobado_por = ?, 
                aprobado_at = ?,
                updated_at = ?
            WHERE id = ? AND deleted_at IS NULL
        `).run(aprobadorId, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000), id);
    }

    static rechazar(id: number, userId: string, notas: string): void {
        db.prepare(`
            UPDATE publicaciones 
            SET estado = 'Borrador', 
                notas_revision = ?,
                modificado_por = ?,
                updated_at = ?
            WHERE id = ? AND user_id = ? AND deleted_at IS NULL
        `).run(notas, userId, Math.floor(Date.now() / 1000), id, userId);
    }
}
