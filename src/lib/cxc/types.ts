// Tipos del módulo Químicas Unidas (CXC)
// Portable: no depende de nada del proyecto host.

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

// ── Orden de ejecución ──
// metodo:  'cliente'  -> el estado de cuenta se envía al cliente real
//          'revision' -> el estado de cuenta llega solo a crédito
export type MetodoEnvio = 'cliente' | 'revision';
export type AlcanceEjecucion = 'completo' | 'cliente';

export interface OrdenEjecucion {
    metodo: MetodoEnvio;
    alcance: AlcanceEjecucion;
    /** Vacío cuando alcance === 'completo'. */
    cardCodes: string[];
    /** Solo cuando metodo === 'revision'. Fallback a credito@qu.cr si vacío. */
    correoRevision?: string;
    /** Correo donde la API Python enviará los logs del procesamiento. */
    correoLogs?: string;
}

// ── Auditoría / consulta de cliente (Unificada como el PDF) ──

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
    'mas_120': number;
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