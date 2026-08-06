import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { IAContentService } from '$lib/features/content-creator/services/ia-content-service';

export const POST: RequestHandler = async ({ params, locals, request }) => {
    try {
        if (!locals.user) {
            return json({ error: 'No autorizado' }, { status: 401 });
        }

        const id = parseInt(params.id);

        // El prompt de copy es opcional; si llega, sobreescribe el guardado en la publicación
        let customPrompt: string | undefined;
        try {
            const body = await request.json();
            customPrompt = typeof body?.prompt === 'string' ? body.prompt : undefined;
            if (customPrompt !== undefined && customPrompt.trim() === '') customPrompt = undefined;
        } catch {
            // Cuerpo vacío o no-JSON: se genera con el prompt_copy guardado o el fallback
            customPrompt = undefined;
        }

        const copy = await IAContentService.generarCopy(id, locals.user.id, customPrompt);

        return json({ success: true, copy });
    } catch (error: any) {
        console.error('[API Generar Copy]', error);
        return json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
};