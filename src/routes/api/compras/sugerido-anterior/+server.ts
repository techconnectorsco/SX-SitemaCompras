/**
 * GET /api/compras/sugerido-anterior?actual=PROC-YYYYMMDD-HHMMSS
 *
 * Devuelve los sugeridos del analista del procesamiento INMEDIATAMENTE ANTERIOR
 * (por fecha_procesamiento) al que se pasa en `actual`. Opción A: el "anterior"
 * es relativo al procesamiento indicado.
 *
 * Respuesta:
 *   {
 *     codigoAnterior: string | null,
 *     fechaAnterior: string | null,
 *     sugeridos: { [codigo_sku]: { urgente, aereo, maritimo } }
 *   }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user || locals.session?.user;
	if (!user) return json({ error: 'No autenticado' }, { status: 401 });

	const actual = (url.searchParams.get('actual') || '').trim();
	if (!actual) {
		return json({ error: 'Parámetro "actual" requerido' }, { status: 400 });
	}

	try {
		// 1) Fecha del procesamiento actual
		const cab = db.prepare(`
			SELECT fecha_procesamiento AS fecha
			FROM forecast_procesamiento
			WHERE codigo_procesamiento = ?
			LIMIT 1
		`).get(actual) as { fecha: any } | undefined;

		if (!cab) {
			return json({ codigoAnterior: null, fechaAnterior: null, sugeridos: {} });
		}

		// 2) Procesamiento anterior = mayor fecha_procesamiento MENOR a la del actual
		//    (distinto código). Se excluye el propio código por seguridad.
		const anterior = db.prepare(`
			SELECT codigo_procesamiento AS codigo, MAX(fecha_procesamiento) AS fecha
			FROM forecast_procesamiento
			WHERE fecha_procesamiento < ?
			  AND codigo_procesamiento IS NOT NULL
			  AND codigo_procesamiento != ''
			  AND codigo_procesamiento != ?
		`).get(cab.fecha, actual) as { codigo: string | null; fecha: string | null } | undefined;

		if (!anterior || !anterior.codigo) {
			// No hay anterior (es el más viejo)
			return json({ codigoAnterior: null, fechaAnterior: null, sugeridos: {} });
		}

		// 3) Sugeridos del analista de ese procesamiento anterior, por SKU
		const filas = db.prepare(`
			SELECT
				codigo_sku,
				sugerido_analista_urgente  AS urgente,
				sugerido_analista_aereo    AS aereo,
				sugerido_analista_maritimo AS maritimo
			FROM forecast_procesamiento
			WHERE codigo_procesamiento = ?
		`).all(anterior.codigo) as Array<{
			codigo_sku: string;
			urgente: number | null;
			aereo: number | null;
			maritimo: number | null;
		}>;

		// 4) Armar el mapa { codigo_sku: {urgente, aereo, maritimo} }
		//    Solo incluimos SKUs que tengan algún sugerido > 0 (para no inflar el JSON).
		const sugeridos: Record<string, { urgente: number; aereo: number; maritimo: number }> = {};
		for (const f of filas) {
			const u = f.urgente || 0;
			const a = f.aereo || 0;
			const m = f.maritimo || 0;
			if (u !== 0 || a !== 0 || m !== 0) {
				sugeridos[f.codigo_sku] = { urgente: u, aereo: a, maritimo: m };
			}
		}

		return json({
			codigoAnterior: anterior.codigo,
			fechaAnterior: anterior.fecha,
			sugeridos
		});
	} catch (error) {
		console.error('[sugerido-anterior] ❌', error);
		return json({ error: 'Error interno del servidor' }, { status: 500 });
	}
};