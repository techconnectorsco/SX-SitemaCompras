/**
 * ============================================================================
 * MOTOR DE IA SoporteXperto — PERMISOS POR MÓDULO Y CAPACIDAD DE ADMIN DE IA
 * ============================================================================
 * Tabla única ia_permisos_usuario (migración 001). Una fila por (usuario, módulo).
 *
 * Los módulos de negocio ('compras', 'finanzas', ...) habilitan herramientas.
 * Además existe una CAPACIDAD especial 'ia_admin' que habilita la pantalla de
 * gestión de IA (permisos, tokens, costos). Vive en la misma tabla pero NO es
 * un módulo de negocio: el motor la ignora porque no está en el registro.
 */

import type { DB } from './tipos';

/** Capacidad especial para administrar la IA (permisos, tokens, costos). */
export const IA_ADMIN_CAP = 'ia_admin';

/** Capacidad para SOLO ver el consumo (sin gestionar permisos). Para el cliente. */
export const IA_CONSUMO_CAP = 'ia_consumo';

export interface PermisoModulo {
	user_id: string;
	modulo: string;
	otorgado_por: string | null;
	fecha: number;
}

/** Módulos/capacidades que tiene el usuario (incluye 'ia_admin' si lo tiene). */
export function modulosDelUsuario(db: DB, userId: string): string[] {
	const filas = db
		.prepare('SELECT modulo FROM ia_permisos_usuario WHERE user_id = ?')
		.all(userId) as Array<{ modulo: string }>;
	return filas.map((f) => f.modulo);
}

/** Otorga un módulo/capacidad a un usuario (idempotente). */
export function otorgarModulo(
	db: DB,
	userId: string,
	modulo: string,
	otorgadoPor: string | null = null
): void {
	db.prepare(
		`INSERT INTO ia_permisos_usuario (user_id, modulo, otorgado_por, fecha)
		 VALUES (?, ?, ?, strftime('%s','now'))
		 ON CONFLICT(user_id, modulo) DO NOTHING`
	).run(userId, modulo, otorgadoPor);
}

/** Revoca un módulo/capacidad de un usuario. */
export function revocarModulo(db: DB, userId: string, modulo: string): void {
	db.prepare('DELETE FROM ia_permisos_usuario WHERE user_id = ? AND modulo = ?').run(
		userId,
		modulo
	);
}

/** Verdadero si el usuario tiene TODOS los permisos requeridos. */
export function tienePermisos(modulosUsuario: string[], requeridos: string[]): boolean {
	return requeridos.every((p) => modulosUsuario.includes(p));
}

// ----------------------------------------------------------------------------
// Capacidad de administración de IA
// ----------------------------------------------------------------------------

/** ¿El usuario tiene la capacidad ia_admin? */
export function esIaAdmin(db: DB, userId: string): boolean {
	const fila = db
		.prepare('SELECT 1 FROM ia_permisos_usuario WHERE user_id = ? AND modulo = ? LIMIT 1')
		.get(userId, IA_ADMIN_CAP);
	return !!fila;
}

/** ¿Existe al menos un ia_admin en todo el sistema? (para el bootstrap) */
export function hayAlgunIaAdmin(db: DB): boolean {
	const fila = db
		.prepare('SELECT 1 FROM ia_permisos_usuario WHERE modulo = ? LIMIT 1')
		.get(IA_ADMIN_CAP);
	return !!fila;
}

/**
 * ¿Puede el usuario gestionar la IA?
 * - Debe ser ADMIN del sistema.
 * - Y tener ia_admin, O ser ADMIN cuando todavía no existe ningún ia_admin
 *   (ventana de bootstrap para que el primero pueda auto-asignarse).
 */
export function puedeGestionarIA(db: DB, userId: string, role: string): boolean {
	if (role !== 'ADMIN') return false;
	return esIaAdmin(db, userId) || !hayAlgunIaAdmin(db);
}

/** ¿El usuario tiene la capacidad de ver el consumo (sin gestionar)? */
export function esIaConsumo(db: DB, userId: string): boolean {
	const fila = db
		.prepare('SELECT 1 FROM ia_permisos_usuario WHERE user_id = ? AND modulo = ? LIMIT 1')
		.get(userId, IA_CONSUMO_CAP);
	return !!fila;
}

/**
 * ¿Puede el usuario VER el consumo/costos?
 * Debe ser ADMIN del sistema, y tener ia_admin (gestión completa) o ia_consumo
 * (solo lectura del consumo, pensado para los administradores del cliente).
 */
export function puedeVerConsumo(db: DB, userId: string, role: string): boolean {
	if (role !== 'ADMIN') return false;
	return esIaAdmin(db, userId) || esIaConsumo(db, userId) || !hayAlgunIaAdmin(db);
}