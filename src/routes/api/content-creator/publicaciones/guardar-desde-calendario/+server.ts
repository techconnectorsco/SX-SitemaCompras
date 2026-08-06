import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/config/db-config';
import { PublicacionService } from '$lib/features/content-creator/services/publicacion-service';

/** Normaliza y serializa carousel_images descartando los base64 transitorios */
function serializarCarouselImages(carouselImages: any): string | null {
    if (!Array.isArray(carouselImages) || carouselImages.length === 0) return null;
    const limpio = carouselImages.map((img: any) => {
        // Solo persistimos imagePreview si es una URL real (http/https o /uploads/…),
        // no blob: de una imagen recién subida que aún no fue procesada por la IA.
        let preview: string | null = null;
        if (typeof img.imagePreview === 'string') {
            const p = img.imagePreview;
            if (p.startsWith('http') || p.startsWith('/uploads') || p.startsWith('/api/')) {
                preview = p;
            }
        }
        return {
            imagePreview: preview,
            imageName: img.imageName || '',
            imageBase64: '', // nunca persistimos el base64 en BD
            prompt: img.prompt || '',
            modo: img.modo === 'crear' ? 'crear' : 'editar'
        };
    });
    return JSON.stringify(limpio);
}

/** Resuelve los nombres de catálogo a IDs y retorna los datos listos para insertar/actualizar */
function resolverDatos(data: any) {
    const marca    = db.prepare('SELECT id FROM marcas WHERE nombre = ?').get(data.brand) as any;
    const formato  = db.prepare('SELECT id FROM formatos WHERE nombre = ?').get(data.format) as any;
    const audiencia = db.prepare('SELECT id FROM audiencias WHERE nombre = ?').get(data.audience) as any;
    const cuenta   = db.prepare('SELECT id FROM cuentas WHERE nombre = ?').get(data.cuenta || 'Vedoba') as any;

    let redes_ids: number[] = [];
    if (data.network) {
        const redesNames = data.network.split(',').map((r: string) => r.trim());
        for (const nombre of redesNames) {
            const red = db.prepare('SELECT id FROM redes_sociales WHERE nombre = ?').get(nombre) as any;
            if (red) redes_ids.push(red.id);
        }
    }

    let fecha_programada: number | null = null;
    if (data.date) {
        fecha_programada = Math.floor(new Date(data.date + 'T12:00:00').getTime() / 1000);
    }

    let meta_pauta_inicio: number | null = null;
    if (data.metaStartDate) {
        meta_pauta_inicio = Math.floor(new Date(data.metaStartDate + 'T12:00:00').getTime() / 1000);
    }

    let meta_pauta_fin: number | null = null;
    if (data.metaEndDate) {
        meta_pauta_fin = Math.floor(new Date(data.metaEndDate + 'T12:00:00').getTime() / 1000);
    }

    // Estado derivado de los checkboxes
    let estado = 'Borrador';
    if (data.published) estado = 'Publicado';

    return { marca, formato, audiencia, cuenta, redes_ids, fecha_programada, meta_pauta_inicio, meta_pauta_fin, estado };
}

/**
 * POST: Crear nueva publicación desde el calendario
 */
export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

        const data = await request.json();
        const { marca, formato, audiencia, cuenta, redes_ids, fecha_programada, meta_pauta_inicio, meta_pauta_fin, estado } = resolverDatos(data);

        if (!marca) return json({ error: `Marca no encontrada: ${data.brand}` }, { status: 400 });
        if (!cuenta) return json({ error: 'Cuenta no encontrada' }, { status: 400 });

        const id = PublicacionService.create(locals.user.id, {
            cuenta_id: cuenta.id,
            marca_id: marca.id,
            formato_id: formato?.id || null,
            audiencia_id: audiencia?.id || null,
            titulo: data.title,
            contexto: data.context || null,
            objetivo: data.objective || null,
            cta: data.cta || null,
            presupuesto_usd: data.budget || null,
            campana: data.week || null,
            fecha_programada,
            meta_pauta_inicio,
            meta_pauta_fin,
            estado,
            redes_ids
        });

        // Guardar campos de checkboxes que no están en el DTO estándar + prompt personalizado + prompt de copy + vigencia meta
        const now = Math.floor(Date.now() / 1000);
        db.prepare(`
            UPDATE publicaciones SET
                designed = ?,
                published = ?,
                published_at = ?,
                promoted = ?,
                prompt_personalizado = ?,
                prompt_copy = ?,
                meta_pauta_inicio = ?,
                meta_pauta_fin = ?,
                es_carrusel = ?,
                carousel_images = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            data.designed ? 1 : 0,
            data.published ? 1 : 0,
            data.published ? now : null,
            data.promoted ? 1 : 0,
            data.prompt || null,
            data.promptCopy || null,
            meta_pauta_inicio,
            meta_pauta_fin,
            data.esCarrusel ? 1 : 0,
            serializarCarouselImages(data.carouselImages),
            now,
            id
        );

        return json({ success: true, id }, { status: 201 });
    } catch (error: any) {
        console.error('[API guardar-publicacion POST]', error);
        return json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
};

/**
 * PUT: Actualizar publicación existente desde el calendario (modo edición)
 */
export const PUT: RequestHandler = async ({ request, locals }) => {
    try {
        if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

        const data = await request.json();
        const id = parseInt(data.id);
        if (isNaN(id)) return json({ error: 'ID inválido' }, { status: 400 });

        const { marca, formato, audiencia, cuenta, redes_ids, fecha_programada, meta_pauta_inicio, meta_pauta_fin, estado } = resolverDatos(data);

        if (!marca) return json({ error: `Marca no encontrada: ${data.brand}` }, { status: 400 });

        PublicacionService.update(id, locals.user.id, {
            cuenta_id: cuenta?.id,
            marca_id: marca.id,
            formato_id: formato?.id || null,
            audiencia_id: audiencia?.id || null,
            titulo: data.title,
            contexto: data.context || null,
            objetivo: data.objective || null,
            cta: data.cta || null,
            presupuesto_usd: data.budget || null,
            campana: data.week || null,
            fecha_programada,
            meta_pauta_inicio,
            meta_pauta_fin,
            estado,
            redes_ids
        });

        // Actualizar checkboxes + prompt personalizado + prompt de copy + vigencia meta
        const now = Math.floor(Date.now() / 1000);
        db.prepare(`
            UPDATE publicaciones SET
                designed = ?,
                published = ?,
                published_at = ?,
                promoted = ?,
                prompt_personalizado = ?,
                prompt_copy = ?,
                meta_pauta_inicio = ?,
                meta_pauta_fin = ?,
                es_carrusel = ?,
                carousel_images = ?,
                updated_at = ?
            WHERE id = ? AND user_id = ?
        `).run(
            data.designed ? 1 : 0,
            data.published ? 1 : 0,
            data.published ? now : null,
            data.promoted ? 1 : 0,
            data.prompt || null,
            data.promptCopy || null,
            meta_pauta_inicio,
            meta_pauta_fin,
            data.esCarrusel ? 1 : 0,
            serializarCarouselImages(data.carouselImages),
            now,
            id,
            locals.user.id
        );

        return json({ success: true });
    } catch (error: any) {
        console.error('[API guardar-publicacion PUT]', error);
        return json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
};
