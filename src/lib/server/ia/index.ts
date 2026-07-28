/**
 * ============================================================================
 * MOTOR DE IA SoporteXperto — ENTRADA PÚBLICA
 * ============================================================================
 * Importá desde aquí: import { crearMotor } from '$lib/server/ia';
 *
 * SELECCIÓN DE PROVEEDOR (uno u otro, sin tocar el motor):
 *  - Por variable de entorno IA_PROVEEDOR = 'gemini' | 'claude'.
 *  - Si no se define, usa IA_CONFIG.proveedorPorDefecto.
 *  - Se pueden tener AMBOS SDKs instalados a la vez; solo se instancia el elegido.
 *
 * Keys necesarias (cada proveedor requiere la suya):
 *  - Gemini  -> GEMINI_API_KEY      (gratis en Google AI Studio)
 *  - Claude  -> ANTHROPIC_API_KEY   (de pago en console.anthropic.com)
 */

import { env } from '$env/dynamic/private';
import { IA_CONFIG } from './config';
import { MotorIA } from './motor';
import { ProveedorGemini } from './proveedores/gemini';
import { ProveedorClaude } from './proveedores/claude';
import type { DB, ProveedorIA } from './tipos';

export { MotorIA } from './motor';
export * from './tipos';
export {
	modulosDelUsuario,
	otorgarModulo,
	revocarModulo,
	esIaAdmin,
	esIaConsumo,
	hayAlgunIaAdmin,
	puedeGestionarIA,
	puedeVerConsumo,
	IA_ADMIN_CAP,
	IA_CONSUMO_CAP
} from './permisos';
export { listaModulos } from './registro';

/** Resuelve qué proveedor usar según la env IA_PROVEEDOR o el default. */
function seleccionarProveedor(): ProveedorIA {
	const elegido = (env.IA_PROVEEDOR || IA_CONFIG.proveedorPorDefecto).trim().toLowerCase();
	switch (elegido) {
		case 'claude':
			return new ProveedorClaude(env.ANTHROPIC_API_KEY?.trim() || undefined);
		case 'gemini':
		default:
			return new ProveedorGemini(env.GEMINI_API_KEY?.trim() || undefined);
	}
}

/**
 * Crea el motor con el proveedor configurado.
 * @param db Instancia de better-sqlite3 ya abierta (la de SoporteXperto).
 * @param proveedor Opcional: inyectá tu propio proveedor (tests u otro modelo).
 */
export function crearMotor(db: DB, proveedor?: ProveedorIA): MotorIA {
	const prov = proveedor ?? seleccionarProveedor();
	return new MotorIA({ db, proveedor: prov });
}