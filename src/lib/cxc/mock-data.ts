import type { ClienteSAP, CuentaPadre, ListaClientesResponse, AuditoriaCliente, DocUnificado, RangosVencimiento } from './types';

export const MOCK_CLIENTES: ClienteSAP[] = [
    { cardCode: 'C0001', cardName: 'DISTRIBUIDORA NACIONAL S.A.', fatherCard: null, tipo: 'padre' },
    { cardCode: 'C0001-1', cardName: 'DISTRIBUIDORA NACIONAL — SUC. ALAJUELA', fatherCard: 'C0001', tipo: 'hijo' },
    { cardCode: 'C0001-2', cardName: 'DISTRIBUIDORA NACIONAL — SUC. HEREDIA', fatherCard: 'C0001', tipo: 'hijo' },
    { cardCode: 'C0050', cardName: 'INDUSTRIAS CENTROAMERICANAS S.A.', fatherCard: null, tipo: 'individual' },
    { cardCode: 'C0051', cardName: 'MATERIALES DE CONSTRUCCIÓN EL ROBLE', fatherCard: null, tipo: 'individual' },
    { cardCode: 'C0052', cardName: 'SUPERMERCADOS UNIDOS', fatherCard: null, tipo: 'individual' },
    { cardCode: 'C0053', cardName: 'FARMACIAS LA SALUD', fatherCard: null, tipo: 'individual' },
    { cardCode: 'C0054', cardName: 'GRUPO COMERCIAL DEL NORTE', fatherCard: null, tipo: 'individual' },
    { cardCode: 'C0055', cardName: 'ABASTECEDOR LA ESTRELLA', fatherCard: null, tipo: 'individual' },
    { cardCode: 'C0056', cardName: 'CENTRO FERRETERO GLOBAL', fatherCard: null, tipo: 'individual' },
];

export const MOCK_PADRES: CuentaPadre[] = [
    {
        cardCode: 'C0001',
        cardName: 'DISTRIBUIDORA NACIONAL S.A.',
        hijos: [
            { cardCode: 'C0001-1', cardName: 'DISTRIBUIDORA NACIONAL — SUC. ALAJUELA', fatherCard: 'C0001', tipo: 'hijo' },
            { cardCode: 'C0001-2', cardName: 'DISTRIBUIDORA NACIONAL — SUC. HEREDIA', fatherCard: 'C0001', tipo: 'hijo' }
        ]
    }
];

function generarDocUnificado(consecutivo: string, tipoDoc: string, saldo: number, diasVencido: number, moneda: 'CRC' | 'USD'): DocUnificado {
    const hoy = new Date();
    const vencimiento = new Date(hoy.getTime() - diasVencido * 24 * 60 * 60 * 1000);
    const emision = new Date(vencimiento.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let estatus = 'Al día';
    if (saldo < 0) estatus = 'A favor';
    else if (diasVencido > 0) estatus = 'Vencido';

    return {
        consecutivo,
        ordenCompra: `OC-${Math.floor(Math.random() * 10000)}`,
        fecha: emision.toISOString().slice(0, 10),
        fechaVence: vencimiento.toISOString().slice(0, 10),
        tipoDoc,
        descripcion: tipoDoc === 'PR' ? 'Pago recibido no aplicado' : 'Factura por mercadería',
        saldo,
        moneda,
        diasVencido,
        estatus
    };
}

export const MOCK_AUDITORIAS: Record<string, AuditoriaCliente> = {
    'C0001': {
        existe: true,
        cliente: {
            cardCode: 'C0001',
            cardName: 'DISTRIBUIDORA NACIONAL S.A.',
            saldoActual: 1540000,
            envioAutomatico: 'Y',
            correoPrincipal: 'gerencia@distnacional.com',
            correoCxc: 'pagos@distnacional.com'
        },
        documentos: {
            usd: [
                generarDocUnificado('FE-1020', 'FRM', 1500.50, 15, 'USD'),
                generarDocUnificado('FE-1045', 'FRM', 2300.00, -5, 'USD')
            ],
            crc: [
                generarDocUnificado('FE-2010', 'FRM', 540000, 45, 'CRC'),
                generarDocUnificado('FE-2011', 'FRM', 1000000, 10, 'CRC')
            ]
        },
        totales: { usd: 3800.50, crc: 1540000 },
        rangos: {
            usd: { '0_30': 1500.50, '31_60': 0, '61_90': 0, '91_120': 0, 'mas_120': 0, totalVencido: 1500.50 },
            crc: { '0_30': 1000000, '31_60': 540000, '61_90': 0, '91_120': 0, 'mas_120': 0, totalVencido: 1540000 }
        }
    },
    'C0050': {
        existe: true,
        cliente: {
            cardCode: 'C0050',
            cardName: 'INDUSTRIAS CENTROAMERICANAS S.A.',
            saldoActual: 5000,
            envioAutomatico: 'Y',
            correoPrincipal: 'info@indca.com',
            correoCxc: 'contabilidad@indca.com'
        },
        documentos: {
            usd: [
                generarDocUnificado('FE-3001', 'FRM', 5000, 10, 'USD')
            ],
            crc: []
        },
        totales: { usd: 5000, crc: 0 },
        rangos: {
            usd: { '0_30': 5000, '31_60': 0, '61_90': 0, '91_120': 0, 'mas_120': 0, totalVencido: 5000 },
            crc: { '0_30': 0, '31_60': 0, '61_90': 0, '91_120': 0, 'mas_120': 0, totalVencido: 0 }
        }
    }
};

function generarEjecuciones(tipo: 'cxc' | 'giras') {
    const ejecuciones = [];
    for (let i = 0; i < 20; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i * 2);
        ejecuciones.push({
            id: crypto.randomUUID(),
            automatizacion_id: tipo === 'cxc' ? 'cxc-mock' : 'giras-mock',
            fecha_inicio: date.toISOString(),
            fecha_fin: new Date(date.getTime() + 150000).toISOString(),
            estado: i % 10 === 0 && i !== 0 ? 'Error' : 'Exitoso',
            metricas: tipo === 'cxc' ? {
                tiempo_ejecucion: 150 + Math.random() * 50,
                total_clientes: 250,
                clientes_procesados: 230 + Math.floor(Math.random() * 20),
                clientes_omitidos_N: 5,
                clientes_sin_documentos: 10,
                clientes_sin_correo: 5,
                total_documentos_procesados: 1200,
                emails_exitosos: 220 + Math.floor(Math.random() * 10),
                emails_fallidos: Math.floor(Math.random() * 5),
                monto_total_usd: 150000 + Math.random() * 10000,
                monto_total_colones: 45000000 + Math.random() * 5000000,
                monto_vencido_usd: 25000 + Math.random() * 5000,
                monto_vencido_colones: 8000000 + Math.random() * 2000000,
            } : {
                tiempo_ejecucion: 90 + Math.random() * 30,
                total_agentes: 12,
                reportes_generados: 12,
                total_documentos_procesados: 450,
                emails_exitosos: 12,
                emails_fallidos: 0,
                monto_total_usd: 100000 + Math.random() * 10000,
                monto_total_colones: 30000000 + Math.random() * 5000000,
                monto_vencido_usd: 15000 + Math.random() * 5000,
                monto_vencido_colones: 0,
            }
        });
    }
    return ejecuciones;
}

export const MOCK_EJECUCIONES_CXC = generarEjecuciones('cxc');
export const MOCK_EJECUCIONES_GIRAS = generarEjecuciones('giras');

export function obtenerClientesMock(): ListaClientesResponse {
    return {
        total: MOCK_CLIENTES.length,
        clientes: MOCK_CLIENTES,
        padres: MOCK_PADRES
    };
}

export function auditarClienteMock(cardCode: string): AuditoriaCliente | null {
    if (MOCK_AUDITORIAS[cardCode]) return MOCK_AUDITORIAS[cardCode];
    
    const c = MOCK_CLIENTES.find(c => c.cardCode === cardCode);
    if (!c) return null;

    return {
        existe: true,
        cliente: {
            cardCode: c.cardCode,
            cardName: c.cardName,
            saldoActual: 8500,
            envioAutomatico: 'Y',
            correoPrincipal: `contacto@${cardCode.toLowerCase()}.com`,
            correoCxc: `pagos@${cardCode.toLowerCase()}.com`
        },
        documentos: {
            usd: [generarDocUnificado(`FE-${Math.floor(Math.random()*10000)}`, 'FRM', 8500, 20, 'USD')],
            crc: []
        },
        totales: { usd: 8500, crc: 0 },
        rangos: {
            usd: { '0_30': 8500, '31_60': 0, '61_90': 0, '91_120': 0, 'mas_120': 0, totalVencido: 8500 },
            crc: { '0_30': 0, '31_60': 0, '61_90': 0, '91_120': 0, 'mas_120': 0, totalVencido: 0 }
        }
    };
}
