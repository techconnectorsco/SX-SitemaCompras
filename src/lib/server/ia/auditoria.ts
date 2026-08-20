/**
 * ============================================================================
 * MOTOR DE IA VYOWEB — AUDITORÍA DE CONSUMO Y COSTO
 * ============================================================================
 * Guarda cada interacción con su consumo de tokens y costo.
 *
 * IMPORTANTE: el costo base y el factor de cobro SE GUARDAN en la tabla (para
 * registros internos / acceso por base de datos), pero las CONSULTAS de esta
 * capa devuelven ÚNICAMENTE el monto final (precio_final). Nunca exponen el
 * costo base ni el margen, para que no lleguen jamás a la pantalla del cliente.
 *
 * Tabla: ia_uso_tokens (migración 003).
 */

import type { DB, CostoInteraccion } from './tipos';

export interface RegistroUso {
	userId: string;
	usuarioNombre: string;
	conversacionId?: string;
	modulos: string[];
	mensaje: string;
	respuesta?: string;
	herramientasUsadas: string[];
	iteraciones: number;
	costo: CostoInteraccion;
}

/** Inserta un registro de uso. Nunca lanza: si falla, no debe romper el chat. */
export function registrarUso(db: DB, r: RegistroUso): void {
	try {
		db.prepare(
			`INSERT INTO ia_uso_tokens (
				user_id, usuario_nombre, conversacion_id, fecha, proveedor, modelo,
				modulos, mensaje_resumen, respuesta_texto, herramientas_usadas, iteraciones,
				tokens_entrada, tokens_salida, tokens_total,
				costo_base, factor_cobro, precio_final, moneda
			) VALUES (?, ?, ?, strftime('%s','now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).run(
			r.userId,
			r.usuarioNombre,
			r.conversacionId ?? null,
			r.costo.proveedor,
			r.costo.modelo,
			JSON.stringify(r.modulos),
			r.mensaje.slice(0, 2000),
			(r.respuesta ?? '').slice(0, 8000),
			JSON.stringify(r.herramientasUsadas),
			r.iteraciones,
			r.costo.tokensEntrada,
			r.costo.tokensSalida,
			r.costo.tokensTotal,
			r.costo.costoBase,
			r.costo.factorCobro,
			r.costo.precioFinal,
			r.costo.moneda
		);
	} catch (e) {
		console.error('No se pudo registrar el uso de IA:', e);
	}
}

/**
 * Historial reciente de un usuario (últimas N horas), para reconstruir el chat
 * al reabrir la plataforma. Devuelve pregunta + respuesta en orden cronológico.
 */
export function historialReciente(db: DB, userId: string, horas = 24, limite = 100) {
	return db
		.prepare(
			`SELECT mensaje_resumen AS pregunta, respuesta_texto AS respuesta,
			        fecha, tokens_total, precio_final AS costo
			 FROM ia_uso_tokens
			 WHERE user_id = ?
			   AND fecha >= strftime('%s','now') - (? * 3600)
			   AND respuesta_texto IS NOT NULL AND respuesta_texto <> ''
			 ORDER BY fecha ASC
			 LIMIT ?`
		)
		.all(userId, horas, limite);
}

// ----------------------------------------------------------------------------
// Consultas para reportes (SOLO monto final, nunca costo base ni margen)
// ----------------------------------------------------------------------------

export interface FiltroAuditoria {
	/** epoch seconds inicio (incluido). */
	desde?: number;
	/** epoch seconds fin (incluido). */
	hasta?: number;
	userId?: string;
}

function whereYParams(f: FiltroAuditoria): { where: string; params: unknown[] } {
	const cond: string[] = [];
	const params: unknown[] = [];
	if (f.desde != null) {
		cond.push('fecha >= ?');
		params.push(f.desde);
	}
	if (f.hasta != null) {
		cond.push('fecha <= ?');
		params.push(f.hasta);
	}
	if (f.userId) {
		cond.push('user_id = ?');
		params.push(f.userId);
	}
	return { where: cond.length ? `WHERE ${cond.join(' AND ')}` : '', params };
}

/** Detalle de interacciones (sin costo base ni fee). */
export function detalleUso(db: DB, f: FiltroAuditoria = {}, limite = 200) {
	const { where, params } = whereYParams(f);
	return db
		.prepare(
			`SELECT id, user_id, usuario_nombre, conversacion_id, fecha, proveedor, modelo,
			        modulos, mensaje_resumen, iteraciones,
			        tokens_entrada, tokens_salida, tokens_total,
			        precio_final AS costo, moneda
			 FROM ia_uso_tokens ${where}
			 ORDER BY fecha DESC LIMIT ?`
		)
		.all(...params, limite);
}

/** Totales del período (solo monto final). */
export function resumenPeriodo(db: DB, f: FiltroAuditoria = {}) {
	const { where, params } = whereYParams(f);
	return db
		.prepare(
			`SELECT COUNT(*) AS interacciones,
			        COALESCE(SUM(tokens_total),0) AS tokens_total,
			        COALESCE(SUM(precio_final),0) AS costo
			 FROM ia_uso_tokens ${where}`
		)
		.get(...params);
}

/** Resumen agrupado por usuario (lo más importante: quién consume). */
export function resumenPorUsuario(db: DB, f: FiltroAuditoria = {}) {
	const { where, params } = whereYParams(f);
	return db
		.prepare(
			`SELECT user_id, usuario_nombre,
			        COUNT(*) AS interacciones,
			        COALESCE(SUM(tokens_total),0) AS tokens_total,
			        COALESCE(SUM(precio_final),0) AS costo
			 FROM ia_uso_tokens ${where}
			 GROUP BY user_id, usuario_nombre
			 ORDER BY costo DESC`
		)
		.all(...params);
}

/** Resumen agrupado por día (YYYY-MM-DD), para la tabla por fechas. */
export function resumenPorDia(db: DB, f: FiltroAuditoria = {}) {
	const { where, params } = whereYParams(f);
	return db
		.prepare(
			`SELECT date(fecha, 'unixepoch', 'localtime') AS dia,
			        COUNT(*) AS interacciones,
			        COALESCE(SUM(tokens_total),0) AS tokens_total,
			        COALESCE(SUM(precio_final),0) AS costo
			 FROM ia_uso_tokens ${where}
			 GROUP BY dia
			 ORDER BY dia DESC`
		)
		.all(...params);
}
