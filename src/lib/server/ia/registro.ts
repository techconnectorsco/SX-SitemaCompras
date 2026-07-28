/**
 * ============================================================================
 * MOTOR DE IA SoporteXperto — REGISTRO DE MÓDULOS
 * ============================================================================
 * Punto único donde se registran los módulos. Para agregar finanzas o país,
 * se crea su carpeta en modulos/ y se agrega aquí. El núcleo no se toca.
 */

import type { ModuloIA } from './tipos';
import { moduloCompras } from './modulos/compras';

export const MODULOS: ModuloIA[] = [
	moduloCompras
	// , moduloFinanzas   <- futuro
	// , moduloPais       <- futuro
];

/** Módulos a los que el usuario tiene acceso según sus permisos. */
export function modulosPermitidos(modulosUsuario: string[]): ModuloIA[] {
	return MODULOS.filter((m) => m.permisosRequeridos.every((p) => modulosUsuario.includes(p)));
}

/** IDs de módulos existentes a los que el usuario NO tiene acceso. */
export function modulosNoPermitidos(modulosUsuario: string[]): string[] {
	return MODULOS.filter((m) => !m.permisosRequeridos.every((p) => modulosUsuario.includes(p))).map(
		(m) => m.id
	);
}

/** Lista de módulos de negocio (para la pantalla de gestión de permisos). */
export function listaModulos(): Array<{ id: string; nombre: string }> {
	return MODULOS.map((m) => ({ id: m.id, nombre: m.nombre }));
}