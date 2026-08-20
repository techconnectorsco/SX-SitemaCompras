/**
 * ============================================================================
 * ENDPOINT: GET /api/ia/auditoria   (consumo y costo — SOLO monto final)
 * ============================================================================
 * Query params:
 *   ?desde=epoch&hasta=epoch&userId=...&vista=resumen|dia|usuario|detalle
 *
 * Autorización: rol ADMIN.
 * Nunca devuelve costo base ni margen: solo el monto final que paga el cliente.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import {
	detalleUso,
	resumenPeriodo,
	resumenPorUsuario,
	resumenPorDia,
	type FiltroAuditoria
} from '$lib/server/ia/auditoria';

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;
	if (!user) throw error(401, 'No autenticado.');
	if (user.role !== 'ADMIN') throw error(403, 'No autorizado.');

	const numero = (k: string): number | undefined => {
		const v = url.searchParams.get(k);
		const n = v ? parseInt(v, 10) : NaN;
		return isFinite(n) ? n : undefined;
	};

	const filtro: FiltroAuditoria = {
		desde: numero('desde'),
		hasta: numero('hasta'),
		userId: url.searchParams.get('userId') ?? undefined
	};

	const vista = url.searchParams.get('vista') ?? 'usuario';

	switch (vista) {
		case 'dia':
			return json({ vista, datos: resumenPorDia(db, filtro) });
		case 'detalle':
			return json({ vista, datos: detalleUso(db, filtro, 500) });
		case 'resumen':
			return json({ vista, datos: resumenPeriodo(db, filtro) });
		case 'usuario':
		default:
			return json({ vista: 'usuario', datos: resumenPorUsuario(db, filtro) });
	}
};
