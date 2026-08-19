import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { IAContentService } from '$lib/features/content-creator/services/ia-content-service';

/**
 * Recibe los posts del feed de Meta (obtenidos por el cliente desde /api/content-creator/meta/feed)
 * y devuelve un diagnóstico IA, sugerencias de pauta y tópicos recomendados.
 *
 * El front envía { posts, pageInfo, periodLabel } en el body.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
    if (!locals.user) {
        return json({ error: 'No autorizado' }, { status: 401 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Body JSON inválido' }, { status: 400 });
    }

    const posts = body?.posts;
    const pageInfo = body?.pageInfo ?? null;
    const periodLabel = body?.periodLabel ?? 'período desconocido';

    if (!Array.isArray(posts) || posts.length === 0) {
        return json({ error: 'No se enviaron posts para analizar.' }, { status: 400 });
    }

    try {
        const result = await IAContentService.analizarMetricasFeed(
            locals.user.id,
            pageInfo,
            posts,
            periodLabel
        );
        return json({ success: true, ...result });
    } catch (err: any) {
        const msg = err?.message || 'Error inesperado en el análisis IA';
        const status = msg.includes('No autorizado') || msg.includes('bloqueada') ? 403 : 500;
        return json({ error: msg }, { status });
    }
};