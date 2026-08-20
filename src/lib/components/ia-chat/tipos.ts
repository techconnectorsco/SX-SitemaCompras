/**
 * Tipos del lado cliente para el chat de IA.
 */

export interface CostoInteraccion {
	proveedor: string;
	modelo: string;
	tokensEntrada: number;
	tokensSalida: number;
	tokensTotal: number;
	costoBase: number;
	factorCobro: number;
	precioFinal: number;
	moneda: string;
}

export interface MensajeUI {
	rol: 'usuario' | 'modelo';
	texto: string;
	/** Costo de la respuesta del modelo (solo en mensajes del modelo). */
	costo?: CostoInteraccion;
	/** Marca de error para estilizar distinto. */
	error?: boolean;
	/** Si es un error reintentable, guarda la pregunta original para reenviar. */
	reintentar?: string;
}

export interface RespuestaApi {
	ok: boolean;
	respuesta: string;
	costo?: CostoInteraccion;
	error?: string;
}
