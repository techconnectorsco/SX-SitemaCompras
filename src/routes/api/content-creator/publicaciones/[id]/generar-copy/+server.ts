import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { IAContentService } from '$lib/features/content-creator/services/ia-content-service';
import {
    copyGenerationRequestSchema,
    CopyGenerationError,
    evaluateCopyQuality,
    normalizeCopyPrompt
} from '$lib/features/content-creator/copy-generation';
import { PublicacionService } from '$lib/features/content-creator/services/publicacion-service';

export const POST: RequestHandler = async ({ params, locals, request }) => {
    try {
        if (!locals.user) {
            return json({ error: 'No autorizado' }, { status: 401 });
        }

        if (!/^\d+$/.test(params.id)) {
            return json({ error: 'ID de publicación inválido' }, { status: 400 });
        }

        const id = Number(params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
            return json({ error: 'ID de publicación inválido' }, { status: 400 });
        }

        let rawBody: unknown = {};
        try {
            const bodyText = await request.text();
            rawBody = bodyText.trim() ? JSON.parse(bodyText) : {};
        } catch {
            return json({ error: 'El cuerpo de la solicitud no contiene JSON válido.' }, { status: 400 });
        }

        const parsedBody = copyGenerationRequestSchema.safeParse(rawBody);
        if (!parsedBody.success) {
            return json(
                {
                    error: 'Las instrucciones para generar el copy no son válidas.',
                    fieldErrors: parsedBody.error.flatten().fieldErrors
                },
                { status: 400 }
            );
        }

        const customPrompt = normalizeCopyPrompt(parsedBody.data.prompt);
        const copy = await IAContentService.generarCopy(id, locals.user.id, customPrompt);
        const publicacion = PublicacionService.getById(id, locals.user.id);
        const warnings = evaluateCopyQuality(copy, publicacion?.cta);

        return json({ success: true, copy, warnings });
    } catch (error: any) {
        console.error('[API Generar Copy]', error);
        if (error instanceof CopyGenerationError) {
            return json({ error: error.message, code: error.code }, { status: error.status });
        }
        return json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
};
