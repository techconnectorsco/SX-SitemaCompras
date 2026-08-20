/**
 * ============================================================================
 * MOTOR DE IA VYOWEB — TIPOS CENTRALES
 * ============================================================================
 * Tipos compartidos por el núcleo del motor, los proveedores y los módulos.
 * El núcleo es agnóstico al módulo y al proveedor de IA.
 */

import type BetterSqlite3 from 'better-sqlite3';

export type DB = BetterSqlite3.Database;

// ----------------------------------------------------------------------------
// Contexto del usuario y de la petición
// ----------------------------------------------------------------------------

/** Identidad del usuario que hace la consulta. */
export interface ContextoUsuario {
	userId: string;
	nombre: string;
	modulos: string[];
	/** Gancho para expansión por país. Hoy opcional. */
	pais?: string;
}

/** Contexto de la pantalla desde donde se abre el popup (popup híbrido). */
export interface ContextoPantalla {
	/** Procesamiento que el usuario está viendo, si aplica. */
	codigoProcesamiento?: string;
	/** SKU seleccionado, si aplica. */
	codigoSku?: string;
	/** Ruta actual, ej: '/compras/forecast'. Solo informativa. */
	ruta?: string;
}

/** Un mensaje del historial de la conversación. */
export interface MensajeChat {
	rol: 'usuario' | 'modelo';
	texto: string;
}

/** Entrada al motor para responder una consulta. */
export interface EntradaChat {
	mensaje: string;
	usuario: ContextoUsuario;
	historial?: MensajeChat[];
	/** Id de conversación para agrupar la auditoría (opcional). */
	conversacionId?: string;
}

/** Detalle de costo de una interacción, devuelto al frontend. */
export interface CostoInteraccion {
	proveedor: string;
	modelo: string;
	tokensEntrada: number;
	tokensSalida: number;
	tokensTotal: number;
	/** Costo base que pagamos al proveedor (USD). */
	costoBase: number;
	/** Factor de cobro aplicado al cliente, ej: 1.10. */
	factorCobro: number;
	/** Precio final que se le cobra al cliente (USD). */
	precioFinal: number;
	moneda: string;
}

/** Salida del motor. */
export interface SalidaChat {
	ok: boolean;
	respuesta: string;
	/** Costo de esta interacción (si hubo consumo de tokens). */
	costo?: CostoInteraccion;
	error?: string;
}

// ----------------------------------------------------------------------------
// Contrato de salida del análisis (mapea 1:1 con lo que pide el cliente)
// ----------------------------------------------------------------------------

export type AccionIA =
	| 'COMPRAR'
	| 'NO_COMPRAR'
	| 'ESPERAR'
	| 'REVISAR_PROVEEDOR'
	| 'REVISAR_MANUAL';

export type Severidad = 'alto' | 'medio' | 'bajo';

export interface DatoVisible {
	label: string;
	valor: string;
}

export interface RiesgoIA {
	tipo: string; // 'quiebre' | 'sobrestock' | 'alza_precio' | 'sin_riesgo' | ...
	severidad: Severidad;
	descripcion: string;
}

/**
 * Recomendación estructurada. La produce la capa de cálculo determinista.
 * La IA NUNCA inventa estos valores: solo los traduce a lenguaje simple.
 */
export interface RecomendacionIA {
	caso: string; // SKU o pedido analizado
	accion: AccionIA;
	cantidad?: number;
	metodo?: 'courier' | 'aereo' | 'maritimo';
	porque: string[]; // hechos basados en datos del caso
	datosVisibles: DatoVisible[];
	riesgoSiNoActua: RiesgoIA;
	confianza: number; // 0-100, derivado de calidad de datos
	/** Marca si faltan datos para una conclusión sólida. */
	datosFaltantes?: string[];
}

// ----------------------------------------------------------------------------
// Definición de módulos y herramientas (lo que hace el sistema "adaptativo")
// ----------------------------------------------------------------------------

/** Esquema JSON simple de parámetros de una herramienta (subset de JSON Schema). */
export interface EsquemaParametros {
	type: 'object';
	properties: Record<string, EsquemaPropiedad>;
	required?: string[];
}

export interface EsquemaPropiedad {
	type: 'string' | 'number' | 'integer' | 'boolean' | 'array';
	description?: string;
	enum?: string[];
	items?: EsquemaPropiedad;
}

/** Contexto que recibe cada herramienta al ejecutarse. */
export interface ContextoHerramienta {
	db: DB;
	usuario: ContextoUsuario;
	pantalla?: ContextoPantalla;
}

/** Una herramienta = una consulta/análisis de solo lectura sobre SQLite. */
export interface HerramientaIA {
	nombre: string;
	descripcion: string; // la IA la lee para decidir cuándo usarla
	parametros: EsquemaParametros;
	ejecutar: (args: Record<string, unknown>, ctx: ContextoHerramienta) => Promise<unknown>;
}

/** Un módulo de negocio (compras, finanzas, ...) que se registra en el motor. */
export interface ModuloIA {
	id: string; // 'compras' | 'finanzas' | ...
	nombre: string;
	/** Permisos requeridos para usar este módulo. El usuario debe tenerlos todos. */
	permisosRequeridos: string[];
	/** Contexto de negocio que se inyecta al prompt cuando el módulo está disponible. */
	contextoSistema: string;
	herramientas: HerramientaIA[];
}

// ----------------------------------------------------------------------------
// Interfaz del proveedor de IA (lo que hace al motor agnóstico al modelo)
// ----------------------------------------------------------------------------

/** Declaración normalizada de herramienta que se pasa al proveedor. */
export interface DeclaracionHerramienta {
	nombre: string;
	descripcion: string;
	parametros: EsquemaParametros;
}

/** Solicitud normalizada que el motor entrega al proveedor. */
export interface SolicitudIA {
	instruccionSistema: string;
	mensaje: string;
	historial?: MensajeChat[];
	herramientas: DeclaracionHerramienta[];
	/**
	 * Callback que ejecuta una herramienta por nombre. El motor lo provee e
	 * incluye la verificación de permisos. El proveedor solo lo invoca.
	 */
	ejecutarHerramienta: (nombre: string, args: Record<string, unknown>) => Promise<unknown>;
	maxIteraciones?: number;
}

/** Consumo de tokens ACUMULADO sobre todas las llamadas de una interacción. */
export interface UsoTokens {
	entrada: number;
	salida: number;
	total: number;
}

export interface RespuestaIA {
	texto: string;
	herramientasUsadas: string[];
	iteraciones: number;
	/** Proveedor y modelo usados (para tarifar el costo). */
	proveedor: string;
	modelo: string;
	/** Tokens acumulados de TODAS las llamadas al modelo en esta interacción. */
	uso: UsoTokens;
}

/**
 * Un proveedor de IA encapsula TODO el detalle del SDK (Gemini, OpenAI, Claude).
 * Para cambiar de proveedor, se implementa esta interfaz en un archivo nuevo.
 */
export interface ProveedorIA {
	nombre: string;
	disponible(): boolean;
	responder(solicitud: SolicitudIA): Promise<RespuestaIA>;
}
