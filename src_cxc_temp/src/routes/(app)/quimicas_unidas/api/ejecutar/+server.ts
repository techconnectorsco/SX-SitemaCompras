import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { OrdenEjecucion } from '$lib/quimicas_unidas/types';
// 🔥 Importación nativa de SvelteKit para variables privadas dinámicas
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request, locals }) => {
    // ── Auth ──
    const { session, user } = await locals.safeGetSession();
    if (!session || !user) throw error(401, 'No autorizado');

    const body = (await request.json().catch(() => null)) as OrdenEjecucion | null;
    if (!body) throw error(400, 'Body inválido');

    // 🔥 Extraemos la URL directamente del entorno (con un fallback seguro si no existiera)
    const VPS_API_URL = env.VPS_API_URL || 'https://statistic-auction-snowstorm.ngrok-free.dev';

    const { metodo, alcance } = body;

    if (metodo !== 'cliente' && metodo !== 'revision') {
        throw error(400, "metodo inválido: usá 'cliente' o 'revision'");
    }
    if (alcance !== 'completo' && alcance !== 'cliente') {
        throw error(400, "alcance inválido: usá 'completo' o 'cliente'");
    }
    if (metodo === 'revision' && alcance === 'completo') {
        throw error(400, 'El método de revisión solo aplica a clientes específicos');
    }

    const codigos = Array.isArray(body.cardCodes)
        ? body.cardCodes.map((c) => c.trim().toUpperCase()).filter(Boolean)
        : [];

    if (alcance === 'cliente' && codigos.length === 0) {
        throw error(400, 'Seleccioná al menos un cliente');
    }

    // ── Payload para la API Python ──
    const payloadPython = {
        clientes: alcance === 'cliente' ? codigos : [],
        solo_prueba: metodo === 'revision',
        ejecutar_todos: alcance === 'completo',
        correo_destino:
            metodo === 'revision' ? (body.correoRevision?.trim() || 'credito@qu.cr') : null,
        correo_logs: body.correoLogs?.trim() || null
    };

    // ── Registro base para auditoría (se completa al final) ──
    const registroBase = {
        user_id: user.id,
        metodo,
        alcance,
        card_codes: codigos.length > 0 ? codigos : null,
        correo_rev: metodo === 'revision' ? payloadPython.correo_destino : null
    };

    try {
        // 🔥 Realiza la petición usando la ruta limpia
        const res = await fetch(`${VPS_API_URL}/api/ejecutar-cxc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadPython)
        });

        if (!res.ok) {
            throw new Error(`El VPS respondió con estado: ${res.status}`);
        }

        const data = await res.json();

        // ── Guardar ejecución exitosa ──
        await locals.supabase.from('quimicas_unidas_ejecuciones').insert({
            ...registroBase,
            resultado: true,
            mensaje: data.mensaje ?? 'Orden enviada'
        });

        return json({ ok: true, mensaje: data.mensaje, job_id: data.job_id });
    } catch (e) {
        console.error('[quimicas_unidas] Error conectando al RPA en el VPS:', e);

        // ── Guardar ejecución fallida ──
        await locals.supabase.from('quimicas_unidas_ejecuciones').insert({
            ...registroBase,
            resultado: false,
            mensaje: e instanceof Error ? e.message : 'Error desconocido'
        });

        throw error(502, 'No se pudo comunicar con el servidor de automatización.');
    }
};