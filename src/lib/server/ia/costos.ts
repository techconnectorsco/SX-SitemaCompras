/**
 * ============================================================================
 * MOTOR DE IA SoporteXperto — TARIFAS Y CÁLCULO DE COSTO
 * ============================================================================
 * Tabla de precios por modelo y cálculo del costo de cada interacción, con el
 * factor de cobro (markup) que se le suma al cliente.
 *
 * ⚠️ IMPORTANTE: los precios cambian con el tiempo. Estos son VALORES DE
 * REFERENCIA — confirmá los precios vigentes de tu proveedor y actualizalos
 * acá antes de facturarle al cliente. Las unidades son USD por 1 millón de
 * tokens (es como los publican los proveedores).
 */

import type { UsoTokens, CostoInteraccion } from './tipos';

export interface TarifaModelo {
	/** USD por 1.000.000 de tokens de entrada. */
	entradaPorMillon: number;
	/** USD por 1.000.000 de tokens de salida. */
	salidaPorMillon: number;
}

/**
 * Precios de referencia (VERIFICAR Y ACTUALIZAR). La clave es el nombre exacto
 * del modelo que usa cada proveedor.
 */
export const TARIFAS: Record<string, TarifaModelo> = {
	// Gemini (verificar en la página de precios de Google)
	'gemini-2.5-flash': { entradaPorMillon: 0.3, salidaPorMillon: 2.5 },
	'gemini-2.5-flash-lite': { entradaPorMillon: 0.1, salidaPorMillon: 0.4 },
	'gemini-2.5-pro': { entradaPorMillon: 1.25, salidaPorMillon: 10.0 },
	// Claude (verificar en la página de precios de Anthropic)
	'claude-opus-4-6': { entradaPorMillon: 15.0, salidaPorMillon: 75.0 },
	'claude-sonnet-4-6': { entradaPorMillon: 3.0, salidaPorMillon: 15.0 }
};

/** Tarifa usada si el modelo no está en la tabla (evita cobrar 0 por error). */
const TARIFA_FALLBACK: TarifaModelo = { entradaPorMillon: 5.0, salidaPorMillon: 15.0 };

/**
 * Factor de cobro al cliente. 1.10 = se cobra 10% por encima del costo base.
 * Ejemplo del cliente: si el costo es $1.00, se cobra $1.10.
 * Configurable por env IA_FACTOR_COBRO.
 */
export function factorCobro(): number {
	const env = typeof process !== 'undefined' ? process.env?.IA_FACTOR_COBRO : undefined;
	const v = env ? parseFloat(env) : NaN;
	return isFinite(v) && v > 0 ? v : 1.1;
}

export const MONEDA = 'USD';

/** Calcula el costo de una interacción a partir de los tokens usados. */
export function calcularCosto(
	proveedor: string,
	modelo: string,
	uso: UsoTokens
): CostoInteraccion {
	const tarifa = TARIFAS[modelo] ?? TARIFA_FALLBACK;

	const costoEntrada = (uso.entrada / 1_000_000) * tarifa.entradaPorMillon;
	const costoSalida = (uso.salida / 1_000_000) * tarifa.salidaPorMillon;
	const costoBase = costoEntrada + costoSalida;

	const factor = factorCobro();
	const precioFinal = costoBase * factor;

	// Redondeo a 6 decimales para no perder centésimas de centavo en montos chicos.
	const r = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

	return {
		proveedor,
		modelo,
		tokensEntrada: uso.entrada,
		tokensSalida: uso.salida,
		tokensTotal: uso.total,
		costoBase: r(costoBase),
		factorCobro: factor,
		precioFinal: r(precioFinal),
		moneda: MONEDA
	};
}