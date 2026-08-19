// Conexión al Service Layer de SAP Business One (Cloudiax / Novitec).
// Toda la lógica de SAP vive acá; los +server.ts solo la invocan.
// Portable: solo necesita las variables de entorno SAP_SL_*.

import { Agent } from 'undici';
import { env } from '$env/dynamic/private';
import type {
    AuditoriaCliente,
    ClienteSAP,
    CuentaPadre,
    DocUnificado,
    ListaClientesResponse,
    RangosVencimiento,
    EstadoCuenta
} from './types';

// Mismas variables que la automatización Python.
const BASE = (env.SAP_SERVICE_LAYER_URL ?? '').replace(/\/$/, '');
const USER = env.SAP_USERNAME ?? '';
const PASSWORD = env.SAP_PASSWORD ?? '';

const USE_TEST = env.SAP_USE_TEST_DB === 'true';
const COMPANY = (USE_TEST ? env.SAP_COMPANY_DB_TEST : env.SAP_COMPANY_DB_PROD) ?? '';

const TLS_INSECURE = env.SAP_TLS_INSECURE === 'true';

const dispatcher = TLS_INSECURE
    ? new Agent({ connect: { rejectUnauthorized: false } })
    : undefined;

const MONEDAS_USD = ['USD', 'US$', 'DOL'];

function checkConfig(): void {
    if (!BASE || !COMPANY || !USER || !PASSWORD) {
        throw new Error(
            'Faltan variables de entorno del Service Layer (SAP_SERVICE_LAYER_URL, SAP_USERNAME, SAP_PASSWORD, SAP_COMPANY_DB_PROD/TEST)'
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sesión
// ─────────────────────────────────────────────────────────────────────────────

async function login(): Promise<string> {
    checkConfig();

    const res = await fetch(`${BASE}/Login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CompanyDB: COMPANY, UserName: USER, Password: PASSWORD }),
        // @ts-expect-error 'dispatcher' es válido en el fetch de Node (undici)
        dispatcher
    });

    if (!res.ok) {
        const detalle = await res.text().catch(() => '');
        throw new Error(`Login Service Layer falló (${res.status}): ${detalle}`);
    }

    const headers = res.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies =
        typeof headers.getSetCookie === 'function'
            ? headers.getSetCookie()
            : [res.headers.get('set-cookie') ?? ''];

    const cookie = setCookies
        .map((c) => c.split(';')[0])
        .filter(Boolean)
        .join('; ');

    if (!cookie.includes('B1SESSION')) {
        throw new Error('No se recibió la cookie B1SESSION del Service Layer');
    }
    return cookie;
}

async function logout(cookie: string): Promise<void> {
    try {
        await fetch(`${BASE}/Logout`, {
            method: 'POST',
            headers: { Cookie: cookie },
            // @ts-expect-error dispatcher
            dispatcher
        });
    } catch {
        /* no-op */
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de consulta
// ─────────────────────────────────────────────────────────────────────────────

async function getJson(cookie: string, url: string): Promise<any> {
    const res = await fetch(url, {
        headers: { Cookie: cookie, Prefer: 'odata.maxpagesize=500' },
        // @ts-expect-error dispatcher
        dispatcher
    });
    if (!res.ok) {
        const detalle = await res.text().catch(() => '');
        throw new Error(`GET ${url} -> ${res.status}: ${detalle}`);
    }
    return res.json();
}

async function getPaginado(cookie: string, entidad: string, query: string): Promise<any[]> {
    let next: string | null = `${BASE}/${entidad}?${query}`;
    const todos: any[] = [];
    while (next) {
        const data = await getJson(cookie, next);
        todos.push(...(data.value ?? []));
        next = data['odata.nextLink'] ? `${BASE}/${data['odata.nextLink']}` : null;
    }
    return todos;
}

async function ejecutarSql(cookie: string, sql: string): Promise<any[]> {
    const code = `QU_W_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const url = `${BASE}/SQLQueries`;

    const post = await fetch(url, {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ SqlCode: code, SqlName: 'Consulta Web QU', SqlText: sql }),
        // @ts-expect-error dispatcher
        dispatcher
    });
    if (post.status !== 200 && post.status !== 201) return [];

    let resultado: any[] = [];
    try {
        const list = await getJson(cookie, `${BASE}/SQLQueries('${code}')/List`);
        resultado = list?.value ?? [];
    } finally {
        await fetch(`${url}('${code}')`, {
            method: 'DELETE',
            headers: { Cookie: cookie },
            // @ts-expect-error dispatcher
            dispatcher
        }).catch(() => {});
    }
    return resultado;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lista de clientes (padre/hijo)
// ─────────────────────────────────────────────────────────────────────────────

interface RawBP {
    CardCode: string;
    CardName: string;
    FatherCard: string | null;
    FatherType?: string | null;
}

function agrupar(bps: RawBP[]): ListaClientesResponse {
    const porCodigo = new Map<string, RawBP>(bps.map((b) => [b.CardCode, b]));
    const hijosDe = new Map<string, ClienteSAP[]>();

    for (const b of bps) {
        const padre = b.FatherCard?.trim();
        if (padre && porCodigo.has(padre)) {
            const hijo: ClienteSAP = {
                cardCode: b.CardCode,
                cardName: b.CardName,
                fatherCard: padre,
                tipo: 'hijo'
            };
            const lista = hijosDe.get(padre);
            if (lista) lista.push(hijo);
            else hijosDe.set(padre, [hijo]);
        }
    }

    const clientes: ClienteSAP[] = bps.map((b) => {
        const padre = b.FatherCard?.trim();
        const esHijo = !!padre && porCodigo.has(padre);
        const esPadre = hijosDe.has(b.CardCode);
        const tipo: EstadoCuenta = esPadre ? 'padre' : esHijo ? 'hijo' : 'individual';
        return {
            cardCode: b.CardCode,
            cardName: b.CardName,
            fatherCard: esHijo ? padre! : null,
            tipo
        };
    });

    const padres: CuentaPadre[] = [...hijosDe.entries()]
        .map(([code, hijos]) => {
            const p = porCodigo.get(code)!;
            return {
                cardCode: p.CardCode,
                cardName: p.CardName,
                hijos: hijos.sort((a, b) => a.cardCode.localeCompare(b.cardCode))
            };
        })
        .sort((a, b) => a.cardCode.localeCompare(b.cardCode));

    return { total: clientes.length, clientes, padres };
}

export async function obtenerClientes(): Promise<ListaClientesResponse> {
    const cookie = await login();
    try {
        // 🔥 FILTRO VITAL PARA EVITAR TIMEOUT DE VERCEL (CurrentAccountBalance ne 0)
        const crudo = (await getPaginado(
            cookie,
            'BusinessPartners',
            "$select=CardCode,CardName,FatherCard,FatherType&$filter=CardType eq 'cCustomer' and CurrentAccountBalance ne 0&$orderby=CardCode"
        )) as RawBP[];
        return agrupar(crudo);
    } finally {
        await logout(cookie);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auditoría / consulta de un cliente (Idéntico al PDF de Python)
// ─────────────────────────────────────────────────────────────────────────────

const TIPOS_QUE_RESTAN = new Set(['DEP', 'N', 'N/C', 'NC', 'REC', 'TEF', 'O/C', 'RC', 'PR', 'REM', 'NCM']);

const TRADUCCION_TIPOS: Record<string, string> = {
    'FRM': 'FRM', 'FRT': 'FRT', 'FEC': 'FEC', 'FEM': 'FEM',
    'NC': 'NC', 'NCM': 'NCM', 'N/C': 'N/C', 'RC': 'RC', 'REM': 'REM',
    'PR': 'PR', 'ND': 'ND', 'NDM': 'NDM', 'N/D': 'N/D', 'AS': 'AS',
};

function calcularDiasVencido(fechaVenceStr: string): number {
    if (!fechaVenceStr) return 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(fechaVenceStr.slice(0, 10));
    vencimiento.setHours(0, 0, 0, 0);
    const diffTime = hoy.getTime() - vencimiento.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function mapearDocumento(d: any, tipoOrigen: 'invoice' | 'creditnote'): DocUnificado | null {
    const isUSD = MONEDAS_USD.includes(d.DocCurrency);
    const moneda = isUSD ? 'USD' : 'CRC';
    
    let total = isUSD ? (d.DocTotalFc || d.DocTotal || 0) : (d.DocTotal || 0);
    let pagado = isUSD ? (d.PaidToDateFC || d.PaidToDate || 0) : (d.PaidToDate || 0);
    let saldo = total - pagado;

    if (Math.abs(saldo) < 0.01) return null;

    const tipoDocStr = String(d.U_TDOC || '').trim().toUpperCase();
    
    if (tipoOrigen === 'creditnote' || TIPOS_QUE_RESTAN.has(tipoDocStr) || tipoDocStr === 'PR') {
        saldo = -Math.abs(saldo);
    }

    const fechaVenceStr = String(d.DocDueDate || '').slice(0, 10);
    const diasVencido = calcularDiasVencido(fechaVenceStr);
    
    let estatus = 'Al día';
    if (saldo < 0) estatus = 'A favor';
    else if (diasVencido > 0) estatus = 'Vencido';

    return {
        consecutivo: d.U_NVT_ConsecutivoFE || d.U_NUM_CONSE || d.DocNum,
        ordenCompra: d.NumAtCard || '',
        fecha: String(d.DocDate || '').slice(0, 10),
        fechaVence: fechaVenceStr,
        tipoDoc: TRADUCCION_TIPOS[tipoDocStr] || tipoDocStr || 'Doc',
        descripcion: (d.Comments || '').substring(0, 76),
        saldo,
        moneda,
        diasVencido,
        estatus
    };
}

function mapearPR(r: any): DocUnificado | null {
    const isUSD = MONEDAS_USD.includes(r.FCCurrency);
    const moneda = isUSD ? 'USD' : 'CRC';
    const sobrante = isUSD ? Number(r.BalFcCred || 0) : Number(r.BalDueCred || 0);

    if (sobrante <= 0.05) return null;

    let fecha = String(r.RefDate || '').slice(0, 10);
    if (fecha && !fecha.includes('-') && fecha.length >= 8) {
        fecha = `${fecha.slice(0, 4)}-${fecha.slice(4, 6)}-${fecha.slice(6, 8)}`;
    }

    return {
        consecutivo: r.DocNum,
        ordenCompra: '',
        fecha,
        fechaVence: fecha,
        tipoDoc: 'PR',
        descripcion: (r.LineMemo || 'Saldo a favor no aplicado').substring(0, 76),
        saldo: -Math.abs(sobrante),
        moneda,
        diasVencido: 0,
        estatus: 'A favor'
    };
}

function generarRangosVacios(): RangosVencimiento {
    return { '0_30': 0, '31_60': 0, '61_90': 0, '91_120': 0, 'mas_120': 0, totalVencido: 0 };
}

function calcularRangos(docs: DocUnificado[]): RangosVencimiento {
    const r = generarRangosVacios();
    for (const d of docs) {
        if (d.saldo <= 0 || d.diasVencido <= 0) continue;
        
        r.totalVencido += d.saldo;
        if (d.diasVencido <= 30) r['0_30'] += d.saldo;
        else if (d.diasVencido <= 60) r['31_60'] += d.saldo;
        else if (d.diasVencido <= 90) r['61_90'] += d.saldo;
        else if (d.diasVencido <= 120) r['91_120'] += d.saldo;
        else r.mas_120 += d.saldo;
    }
    return r;
}

function auditoriaVacia(cardCode: string): AuditoriaCliente {
    return {
        existe: false,
        cliente: { cardCode, cardName: '', saldoActual: 0, envioAutomatico: '', correoPrincipal: '', correoCxc: '' },
        documentos: { usd: [], crc: [] },
        totales: { usd: 0, crc: 0 },
        rangos: { usd: generarRangosVacios(), crc: generarRangosVacios() }
    };
}

async function obtenerCodigosFamilia(cookie: string, cardCode: string): Promise<string[]> {
    const codigos = [cardCode];
    // Buscar todas las cuentas hijas que tengan a este cliente como Padre
    const hijas = await getPaginado(cookie, 'BusinessPartners', `$filter=FatherCard eq '${cardCode}'&$select=CardCode`);
    for (const h of hijas) {
        if (h.CardCode) codigos.push(h.CardCode);
    }
    return codigos;
}


export async function auditarCliente(cardCodeRaw: string): Promise<AuditoriaCliente> {
    const code = cardCodeRaw.trim().toUpperCase();
    const cookie = await login();
    try {
        let bp: any;
        try {
            bp = await getJson(cookie, `${BASE}/BusinessPartners('${code}')?$select=CardCode,CardName,CurrentAccountBalance,U_NTV_EnvioAutomatico,EmailAddress,U_NVT_CorreoEstadoCuenta`);
        } catch {
            return auditoriaVacia(code);
        }
        if (!bp) return auditoriaVacia(code);

        // 🔥 1. OBTENER TODA LA FAMILIA (Padre e Hijas)
        const familia = await obtenerCodigosFamilia(cookie, code);
        
        // 🔥 2. CONSTRUIR FILTROS DINÁMICOS
        // Para OData (Facturas y Notas de Crédito): "(CardCode eq 'C0161' or CardCode eq 'C0161-1' ...)"
        const filtroCodigos = familia.map(c => `CardCode eq '${c}'`).join(' or ');
        
        // Para SQL (Asientos/Saldos a favor): "'C0161', 'C0161-1'"
        const listaIn = familia.map(c => `'${c}'`).join(', ');

        const selectCampos = "$select=DocNum,DocDate,DocDueDate,DocTotal,DocTotalFc,PaidToDate,PaidToDateFC,DocCurrency,U_TDOC,U_NVT_ConsecutivoFE,U_NUM_CONSE,NumAtCard,Comments";

        // 🔥 3. APLICAR EL FILTRO DE FAMILIA A LAS CONSULTAS
        const facturasRaw = await getPaginado(cookie, 'Invoices', `$filter=(${filtroCodigos}) and DocumentStatus eq 'bost_Open'&${selectCampos}`);
        const ncRaw = await getPaginado(cookie, 'CreditNotes', `$filter=(${filtroCodigos}) and DocumentStatus eq 'bost_Open' and DocDate ge '2022-01-01'&${selectCampos}`);
        
        const sqlPr = `SELECT T0."RefDate", T0."BaseRef" AS "DocNum", T0."TransType", T0."BalDueCred", T0."BalFcCred", T0."FCCurrency", T0."LineMemo" FROM "JDT1" T0 WHERE T0."ShortName" IN (${listaIn}) AND T0."BalDueCred" > 0 AND T0."RefDate" >= '20220101' AND T0."TransType" NOT IN ('13', '14', '30')`;
        const prRaw = await ejecutarSql(cookie, sqlPr);

        const todos: DocUnificado[] = [
            ...facturasRaw.map(f => mapearDocumento(f, 'invoice')),
            ...ncRaw.map(nc => mapearDocumento(nc, 'creditnote')),
            ...prRaw.map(pr => mapearPR(pr))
        ].filter(Boolean) as DocUnificado[];

        const usd = todos.filter(d => d.moneda === 'USD');
        const crc = todos.filter(d => d.moneda === 'CRC');

        return {
            existe: true,
            cliente: {
                cardCode: bp.CardCode,
                cardName: bp.CardName ?? '',
                saldoActual: Number(bp.CurrentAccountBalance ?? 0),
                envioAutomatico: String(bp.U_NTV_EnvioAutomatico ?? ''),
                correoPrincipal: bp.EmailAddress ?? '',
                correoCxc: bp.U_NVT_CorreoEstadoCuenta ?? ''
            },
            documentos: { usd, crc },
            totales: {
                usd: usd.reduce((acc, curr) => acc + curr.saldo, 0),
                crc: crc.reduce((acc, curr) => acc + curr.saldo, 0)
            },
            rangos: {
                usd: calcularRangos(usd),
                crc: calcularRangos(crc)
            }
        };
    } finally {
        await logout(cookie);
    }
}