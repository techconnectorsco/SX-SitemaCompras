// Tipos del módulo CxC + Giras (réplica demo con mock)
// Portable: no depende de nada del proyecto host.

// ═══════════════════════════════════════════════════════════════════════
// CLIENTES / AUDITORÍA
// ═══════════════════════════════════════════════════════════════════════

export type EstadoCuenta = 'padre' | 'hijo' | 'individual';

export interface ClienteSAP {
	cardCode: string;
	cardName: string;
	/** CardCode del padre si esta cuenta es hija; null en cualquier otro caso. */
	fatherCard: string | null;
	tipo: EstadoCuenta;
}

export interface CuentaPadre {
	cardCode: string;
	cardName: string;
	hijos: ClienteSAP[];
}

export interface ListaClientesResponse {
	total: number;
	/** Lista plana de todas las cuentas (para búsqueda por código/nombre). */
	clientes: ClienteSAP[];
	/** Solo cuentas que tienen hijos, agrupadas (para mostrar consolidación). */
	padres: CuentaPadre[];
}

// ── Orden de ejecución CxC ──
export type MetodoEnvio = 'cliente' | 'revision';
export type AlcanceEjecucion = 'completo' | 'cliente';

export interface OrdenEjecucion {
	metodo: MetodoEnvio;
	alcance: AlcanceEjecucion;
	/** Vacío cuando alcance === 'completo'. */
	cardCodes: string[];
	/** Solo cuando metodo === 'revision'. */
	correoRevision?: string;
	/** Correo donde la API enviará los logs del procesamiento. */
	correoLogs?: string;
}

// ── Auditoría de cliente (vista unificada idéntica al PDF) ──

export interface DocUnificado {
	consecutivo: string;
	ordenCompra: string;
	fecha: string;
	fechaVence: string;
	tipoDoc: string;
	descripcion: string;
	saldo: number;
	moneda: 'CRC' | 'USD';
	diasVencido: number;
	estatus: string;
}

export interface RangosVencimiento {
	'0_30': number;
	'31_60': number;
	'61_90': number;
	'91_120': number;
	mas_120: number;
	totalVencido: number;
}

export interface AuditoriaCliente {
	existe: boolean;
	cliente: {
		cardCode: string;
		cardName: string;
		saldoActual: number;
		envioAutomatico: string;
		correoPrincipal: string;
		correoCxc: string;
	};
	documentos: {
		usd: DocUnificado[];
		crc: DocUnificado[];
	};
	totales: {
		usd: number;
		crc: number;
	};
	rangos: {
		usd: RangosVencimiento;
		crc: RangosVencimiento;
	};
}

// ═══════════════════════════════════════════════════════════════════════
// GIRAS DE AGENTES (envío manual + por zona)
// ═══════════════════════════════════════════════════════════════════════

/** Modo de envío de la gira: directo al agente o a oficina para revisión. */
export type MetodoEnvioGira = 'agente' | 'revision';

/** Agente comercial con correo registrado — único que puede recibir giras. */
export interface AgenteSAP {
	codigo: number;
	nombre: string;
	correo: string;
}

/** Orden del envío manual (uno o todos los agentes). */
export interface OrdenEjecucionGira {
	/** null = todos los agentes con correo asignado. */
	agenteCodigo: string | null;
	metodo: MetodoEnvioGira;
	correoRevision?: string;
}

// ── Árbol agente → zona → clientes (para gira selectiva por zona) ──

export interface ZonaSAP {
	codigo: string;
	nombre: string;
}

/** Cliente dentro del árbol de un agente, con la carga que aporta al PDF. */
export interface ClienteZona {
	cardCode: string;
	cardName: string;
	telefono: string;
	zonaCode: string;
	zonaNombre: string;
	vendedorCode: number;
	fatherCard: string | null;
	/** Aporta algo al PDF: tiene documentos abiertos ruteados a este agente. */
	elegible: boolean;
	docs: number;
	crc: number;
	usd: number;
	/** Si no es elegible, por qué: sin documentos o ruteado a otro vendedor. */
	motivo?: 'sin_documentos' | 'otro_vendedor';
	/** Nombre del otro vendedor, cuando motivo === 'otro_vendedor'. */
	vendedorNombre?: string;
}

export interface ZonaConClientes {
	zona: ZonaSAP;
	clientes: ClienteZona[];
	totalElegibles: number;
	totalNoElegibles: number;
}

export interface ArbolAgenteZona {
	agente: AgenteSAP;
	zonas: ZonaConClientes[];
	sinZona: ClienteZona[];
	totalElegibles: number;
	totalNoElegibles: number;
	montosAproximados: { crc: number; usd: number };
}

// ── Orden de la gira selectiva por zona ──

export interface OrdenGiraZona {
	agenteCodigo: string;
	cardCodes: string[];
	metodo: MetodoEnvioGira;
	correoRevision?: string;
	/** Nombre de la zona si toda la selección cae en una sola; va al PDF. */
	zonaNombre?: string;
}

/** Resultado del job: lo que entró al PDF y por qué quedó algo fuera. */
export interface ResultadoGiraZona {
	ok: boolean;
	solicitados: number;
	procesados: number;
	/** Lista plana de códigos omitidos (compatibilidad hacia atrás). */
	omitidos: string[];
	/** Omitidos agrupados por motivo — el panel pinta un grupo por tipo. */
	omitidos_detalle?: {
		sin_documentos: string[];
		otro_vendedor: string[];
		inexistentes: string[];
		/** El sistema no pudo evaluar: NO significa que no deban nada. */
		no_evaluables?: string[];
	};
	pdf?: string;
	mensaje: string;
}

// ── Seguimiento del job por polling ──

export type EstadoJobGiraZona =
	| 'en_cola'
	| 'procesando'
	| 'terminado'
	| 'con_avisos'
	| 'error'
	| 'desconocido';

export interface EstadoGiraZonaResponse {
	estado: EstadoJobGiraZona;
	resultado?: ResultadoGiraZona;
}