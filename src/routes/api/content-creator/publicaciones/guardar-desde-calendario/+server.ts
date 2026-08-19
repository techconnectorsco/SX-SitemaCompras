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

/**
 * Resuelve los nombres de catálogo a IDs y retorna los datos listos para insertar/actualizar.
 * Lanza `ValidationError` si falla una validación de redes/cuenta (el caller la convirte en 400).
 */
class ValidationError extends Error {}

function validarCarousel(data: any) {
    if (!data.esCarrusel) return;

    if (!Array.isArray(data.carouselImages) || data.carouselImages.length === 0) {
        throw new ValidationError('El carrusel debe incluir al menos una imagen');
    }

    const promptGeneral = typeof data.prompt === 'string' ? data.prompt.trim() : '';
    for (let index = 0; index < data.carouselImages.length; index++) {
        const slide = data.carouselImages[index] || {};
        const tieneReferencia = [slide.imageBase64, slide.imagePreview]
            .some((value) => typeof value === 'string' && value.trim().length > 0);
        const promptSlide = typeof slide.prompt === 'string' ? slide.prompt.trim() : '';
        const tienePrompt = Boolean(promptSlide || promptGeneral);
        const modoCrear = slide.modo === 'crear';

        if (!tieneReferencia && (!modoCrear || !tienePrompt)) {
            throw new ValidationError(
                `El slide #${index + 1} requiere una imagen de referencia o activar “Crear (sin ref)” con un prompt propio o general.`
            );
        }
    }
}

function resolverDatos(data: any) {
    const marca    = db.prepare('SELECT id FROM marcas WHERE nombre = ?').get(data.brand) as { id: number } | undefined;
    const formato  = db.prepare('SELECT id FROM formatos WHERE nombre = ?').get(data.format) as { id: number } | undefined;
    const audiencia = db.prepare('SELECT id FROM audiencias WHERE nombre = ?').get(data.audience) as { id: number } | undefined;

    // Cuenta Meta: prioriza `cuentaId` (número, FK a cuentas.id).
    // Fallback a búsqueda por nombre data.cuenta o 'Vedoba' (compat legacy — cuentas demos viejas).
    let cuenta: { id: number } | undefined;
    if (data.cuentaId && Number.isFinite(Number(data.cuentaId))) {
        cuenta = db.prepare('SELECT id FROM cuentas WHERE id = ? AND deleted_at IS NULL')
            .get(Number(data.cuentaId)) as { id: number } | undefined;
    }
    if (!cuenta && data.cuenta) {
        cuenta = db.prepare('SELECT id FROM cuentas WHERE nombre = ? AND deleted_at IS NULL')
            .get(data.cuenta) as { id: number } | undefined;
    }

    // Resolver redes destino a IDs numéricos.
    // Acepta `redes_ids` (numérico[], preferido) o el string `network` (split por coma, legacy).
    let redes_ids: number[] = [];
    if (Array.isArray(data.redes_ids) && data.redes_ids.length > 0) {
        redes_ids = data.redes_ids.map((id: number) => Number(id)).filter((id: number) => Number.isFinite(id));
    } else if (data.network) {
        const redesNames = String(data.network).split(',').map((r: string) => r.trim()).filter(Boolean);
        for (const nombre of redesNames) {
            const red = db.prepare('SELECT id FROM redes_sociales WHERE nombre = ?').get(nombre) as { id: number } | undefined;
            if (red) redes_ids.push(red.id);
        }
    }

    if (redes_ids.length === 0) {
        throw new ValidationError('Selecciona al menos una red social de destino');
    }

    // Validar que la cuenta tenga habilitada cada red solicitada (N:M cuenta_redes)
    if (cuenta) {
        const redesCuenta = db.prepare(
            'SELECT red_social_id FROM cuenta_redes WHERE cuenta_id = ?'
        ).all(cuenta.id) as { red_social_id: number }[];
        const permitidas = new Set(redesCuenta.map((r) => r.red_social_id));
        const invalidas = redes_ids.filter((id) => !permitidas.has(id));
        if (invalidas.length > 0) {
            throw new ValidationError('La cuenta seleccionada no tiene habilitada(s) toda(s) la(s) red(es) de destino');
        }
    }

    let fecha_programada: number | null = null;
    if (data.date) {
        const timeStr = data.time && data.time.includes(':') ? data.time : '12:00';
        fecha_programada = Math.floor(new Date(`${data.date}T${timeStr}:00`).getTime() / 1000);
    }

    let meta_pauta_inicio: number | null = null;
    if (data.metaStartDate) {
        meta_pauta_inicio = Math.floor(new Date(data.metaStartDate + 'T12:00:00').getTime() / 1000);
    }

    let meta_pauta_fin: number | null = null;
    if (data.metaEndDate) {
        meta_pauta_fin = Math.floor(new Date(data.metaEndDate + 'T12:00:00').getTime() / 1000);
    }

    // `published` es un indicador técnico que solo debe modificar el proceso
    // que realmente entrega el contenido a Meta. Guardar desde el calendario
    // nunca significa que la publicación ya fue enviada.
    const estado = data.status === 'Guardado'
        ? 'Guardado'
        : data.status === 'Aprobado'
            ? 'Aprobado'
            : data.status === 'Publicado'
                ? 'Publicado'
            : 'Borrador';

    return { marca, formato, audiencia, cuenta, redes_ids, fecha_programada, meta_pauta_inicio, meta_pauta_fin, estado };
}

/**
 * POST: Crear nueva publicación desde el calendario
 */
export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

        const data = await request.json();

        let resolved;
        try {
            validarCarousel(data);
            resolved = resolverDatos(data);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error de validación';
            return json({ error: msg }, { status: 400 });
        }
        const { marca, formato, audiencia, cuenta, redes_ids, fecha_programada, meta_pauta_inicio, meta_pauta_fin, estado } = resolved;

        if (!marca) return json({ error: `Marca no encontrada: ${data.brand}` }, { status: 400 });
        if (!cuenta) return json({ error: 'Selecciona una cuenta Meta válida (conéctala en el sidebar).' }, { status: 400 });
        const inicioHoy = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
        if (fecha_programada !== null && fecha_programada < inicioHoy) {
            return json({ error: 'No se puede programar una publicación en una fecha pasada' }, { status: 400 });
        }

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

        let resolved;
        try {
            validarCarousel(data);
            resolved = resolverDatos(data);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error de validación';
            return json({ error: msg }, { status: 400 });
        }
        const { marca, formato, audiencia, cuenta, redes_ids, fecha_programada, meta_pauta_inicio, meta_pauta_fin, estado } = resolved;

        if (!marca) return json({ error: `Marca no encontrada: ${data.brand}` }, { status: 400 });
        if (!cuenta) return json({ error: 'Selecciona una cuenta Meta válida (conéctala en el sidebar).' }, { status: 400 });

        // No permitir mover una publicación a una fecha pasada.
        // Las publicaciones legadas con fecha pasada intactas pueden seguir editándose
        // siempre que no cambien la fecha_programada a un día anterior al de hoy.
        const inicioHoy = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
        if (fecha_programada !== null && fecha_programada < inicioHoy) {
            const actual = db.prepare('SELECT fecha_programada FROM publicaciones WHERE id = ? AND user_id = ?')
                .get(id, locals.user.id) as { fecha_programada: number | null } | undefined;
            const fechaActual = actual?.fecha_programada ?? null;
            if (fechaActual !== fecha_programada) {
                return json({ error: 'No se puede mover la publicación a una fecha pasada' }, { status: 400 });
            }
        }

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
