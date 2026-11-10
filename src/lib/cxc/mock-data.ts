// Mock robusto del módulo CxC + Giras para la réplica demo de SX.
// Todo determinista: el mismo cardCode siempre produce los mismos documentos
// y el mismo "destino" en una gira. Nada aquí conecta a SAP ni al VPS.

import type {
	AgenteSAP,
	ArbolAgenteZona,
	AuditoriaCliente,
	ClienteSAP,
	ClienteZona,
	CuentaPadre,
	DocUnificado,
	EstadoGiraZonaResponse,
	ListaClientesResponse,
	OrdenEjecucionGira,
	OrdenGiraZona,
	RangosVencimiento,
	ResultadoGiraZona,
	ZonaConClientes,
	ZonaSAP
} from './types';

const CORREO_DEMO = 'cxc@soportexperto.com';

// ═══════════════════════════════════════════════════════════════════════
// AGENTES — 7 agentes con reparto creíble por zonas de Costa Rica
// ═══════════════════════════════════════════════════════════════════════

export const MOCK_AGENTES: AgenteSAP[] = [
	{ codigo: 6, nombre: 'Siviany González', correo: CORREO_DEMO },
	{ codigo: 7, nombre: 'Berny Marín Chávez', correo: CORREO_DEMO },
	{ codigo: 9, nombre: 'José Chacón', correo: CORREO_DEMO },
	{ codigo: 10, nombre: 'María Fernanda Rojas', correo: CORREO_DEMO },
	{ codigo: 11, nombre: 'Luis Alberto Vargas', correo: CORREO_DEMO },
	{ codigo: 12, nombre: 'Carolina Jiménez', correo: CORREO_DEMO },
	{ codigo: 13, nombre: 'Diego Castillo', correo: CORREO_DEMO },
	{ codigo: 14, nombre: 'Patricia Mora', correo: CORREO_DEMO }
];

// ═══════════════════════════════════════════════════════════════════════
// ZONAS — 14 zonas geográficas + 1 inactiva (para probar el badge)
// ═══════════════════════════════════════════════════════════════════════

export const MOCK_ZONAS: ZonaSAP[] = [
	{ codigo: '1', nombre: 'GUANACASTE 1 LIBERIA' },
	{ codigo: '2', nombre: 'GUANACASTE 2 NICOYA' },
	{ codigo: '3', nombre: 'LIMÓN CENTRAL' },
	{ codigo: '4', nombre: 'LIMÓN SIQUIRRES' },
	{ codigo: '5', nombre: 'ZONA NORTE SAN CARLOS' },
	{ codigo: '6', nombre: 'ZONA NORTE UPALA' },
	{ codigo: '7', nombre: 'MESETA 1 ESTE' },
	{ codigo: '8', nombre: 'MESETA 2 OESTE' },
	{ codigo: '9', nombre: 'CARTAGO CENTRAL' },
	{ codigo: '10', nombre: 'HEREDIA NORTE' },
	{ codigo: '11', nombre: 'PÉREZ ZELEDÓN' },
	{ codigo: '12', nombre: 'PUNTARENAS CENTRAL' },
	{ codigo: '13', nombre: 'ALAJUELA SUR' },
	{ codigo: '14', nombre: 'SAN JOSÉ CENTRO' },
	{ codigo: '99', nombre: 'INACTIVAS' }
];

const ZONA_POR_CODIGO = new Map(MOCK_ZONAS.map((z) => [z.codigo, z]));
const AGENTE_POR_CODIGO = new Map(MOCK_AGENTES.map((a) => [a.codigo, a]));

// ═══════════════════════════════════════════════════════════════════════
// CLIENTES — base de datos interna del mock
// ═══════════════════════════════════════════════════════════════════════

type EstadoCarga = 'elegible' | 'sin_documentos' | 'otro_vendedor';

interface ClienteMock {
	cardCode: string;
	cardName: string;
	fatherCard: string | null;
	tipo: 'padre' | 'hijo' | 'individual';
	salesPersonCode: number;
	zonaCode: string;
	telefono: string;
	correoPrincipal: string;
	correoCxc: string;
	envioAutomatico: 'Y' | 'N';
	/** Estado de carga del cliente — define si aparece elegible en el árbol. */
	estado: EstadoCarga;
	/** Si estado === 'otro_vendedor', el código del agente al que rutea. */
	ruteadoA?: number;
}

/**
 * Base de clientes. Todo lo que se ve en la UI deriva de acá.
 * Distribución pensada para que cada agente tenga 2-3 zonas con mezcla de
 * elegibles / sin pendientes / ruteados a otro agente, para demos ricas.
 */
const CLIENTES_BASE: ClienteMock[] = [
	// ── AGENTE 6: SIVIANY GONZÁLEZ — Guanacaste + Puntarenas ─────────────
	{ cardCode: 'C0001', cardName: 'FERRETERÍA EL SOL LIBERIA', fatherCard: null, tipo: 'individual', salesPersonCode: 6, zonaCode: '1', telefono: '2666-1230', correoPrincipal: 'gerencia@ferreteriaelsol.cr', correoCxc: 'pagos@ferreteriaelsol.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0002', cardName: 'AGROVETERINARIA GUANACASTE S.A.', fatherCard: null, tipo: 'individual', salesPersonCode: 6, zonaCode: '1', telefono: '2666-4521', correoPrincipal: 'compras@agroguanacaste.com', correoCxc: 'cxc@agroguanacaste.com', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0003', cardName: 'SUPERMERCADO LA UNIÓN LIBERIA', fatherCard: null, tipo: 'individual', salesPersonCode: 6, zonaCode: '1', telefono: '2666-7812', correoPrincipal: 'admin@sulaunion.cr', correoCxc: 'contabilidad@sulaunion.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0004', cardName: 'FARMACIA SAN BLAS', fatherCard: null, tipo: 'individual', salesPersonCode: 6, zonaCode: '1', telefono: '2666-3345', correoPrincipal: 'info@farmasanblas.cr', correoCxc: '', envioAutomatico: 'N', estado: 'sin_documentos' },
	{ cardCode: 'C0005', cardName: 'DISTRIBUIDORA LA PAMPA', fatherCard: null, tipo: 'individual', salesPersonCode: 6, zonaCode: '1', telefono: '2666-9910', correoPrincipal: 'ventas@dlapampa.com', correoCxc: 'pagos@dlapampa.com', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0006', cardName: 'MATERIALES NICOYA S.A.', fatherCard: null, tipo: 'individual', salesPersonCode: 6, zonaCode: '2', telefono: '2685-2210', correoPrincipal: 'admin@matnicoya.cr', correoCxc: 'cxc@matnicoya.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0007', cardName: 'ABASTECEDOR LA ESQUINA NICOYA', fatherCard: null, tipo: 'individual', salesPersonCode: 6, zonaCode: '2', telefono: '2685-5544', correoPrincipal: 'compras@abastelaesquina.cr', correoCxc: 'pagos@abastelaesquina.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0008', cardName: 'FERRETERÍA EL CENTENARIO', fatherCard: null, tipo: 'individual', salesPersonCode: 6, zonaCode: '2', telefono: '2685-1177', correoPrincipal: 'ferre@centenario.cr', correoCxc: '', envioAutomatico: 'N', estado: 'otro_vendedor', ruteadoA: 14 },
	{ cardCode: 'C0009', cardName: 'COMERCIAL EL PUERTO PUNTARENAS', fatherCard: null, tipo: 'individual', salesPersonCode: 6, zonaCode: '12', telefono: '2661-3344', correoPrincipal: 'gerencia@comercialelpuerto.cr', correoCxc: 'cxc@comercialelpuerto.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0010', cardName: 'FERRETERÍA DEL PACÍFICO', fatherCard: null, tipo: 'individual', salesPersonCode: 6, zonaCode: '12', telefono: '2661-8899', correoPrincipal: 'contacto@ferrpacifico.com', correoCxc: 'pagos@ferrpacifico.com', envioAutomatico: 'Y', estado: 'elegible' },

	// ── AGENTE 7: BERNY MARÍN CHÁVEZ — Limón ─────────────────────────────
	{ cardCode: 'C0011', cardName: 'FERRETERÍA LIMONENSE', fatherCard: null, tipo: 'individual', salesPersonCode: 7, zonaCode: '3', telefono: '2758-2211', correoPrincipal: 'ventas@ferrlimonense.cr', correoCxc: 'cxc@ferrlimonense.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0012', cardName: 'DISTRIBUIDORA DEL CARIBE', fatherCard: null, tipo: 'individual', salesPersonCode: 7, zonaCode: '3', telefono: '2758-6677', correoPrincipal: 'admin@distcaribe.com', correoCxc: 'contabilidad@distcaribe.com', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0013', cardName: 'SUPERMERCADO MARINA LIMÓN', fatherCard: null, tipo: 'individual', salesPersonCode: 7, zonaCode: '3', telefono: '2758-4421', correoPrincipal: 'compras@supmarina.cr', correoCxc: 'pagos@supmarina.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0014', cardName: 'AGROSERVICIOS LIMÓN', fatherCard: null, tipo: 'individual', salesPersonCode: 7, zonaCode: '3', telefono: '2758-9988', correoPrincipal: 'info@agroserviciosltda.cr', correoCxc: '', envioAutomatico: 'N', estado: 'sin_documentos' },
	{ cardCode: 'C0015', cardName: 'MATERIALES SIQUIRRES S.A.', fatherCard: null, tipo: 'individual', salesPersonCode: 7, zonaCode: '4', telefono: '2765-3321', correoPrincipal: 'admin@matsiquirres.cr', correoCxc: 'cxc@matsiquirres.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0016', cardName: 'ABASTECEDOR LA BANANERA', fatherCard: null, tipo: 'individual', salesPersonCode: 7, zonaCode: '4', telefono: '2765-7788', correoPrincipal: 'compras@labananera.cr', correoCxc: 'pagos@labananera.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0017', cardName: 'FARMACIA DEL ATLÁNTICO', fatherCard: null, tipo: 'individual', salesPersonCode: 7, zonaCode: '4', telefono: '2765-1133', correoPrincipal: 'farmacia@delatlantico.cr', correoCxc: 'cobros@delatlantico.cr', envioAutomatico: 'Y', estado: 'elegible' },

	// ── AGENTE 9: JOSÉ CHACÓN — Zona Norte ───────────────────────────────
	{ cardCode: 'C0018', cardName: 'FERRETERÍA SANCARLEÑA', fatherCard: null, tipo: 'individual', salesPersonCode: 9, zonaCode: '5', telefono: '2460-4455', correoPrincipal: 'gerencia@ferrsancarlena.cr', correoCxc: 'cxc@ferrsancarlena.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0019', cardName: 'AGROPECUARIA DEL NORTE S.A.', fatherCard: null, tipo: 'individual', salesPersonCode: 9, zonaCode: '5', telefono: '2460-8899', correoPrincipal: 'ventas@agronorte.cr', correoCxc: 'pagos@agronorte.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0020', cardName: 'DISTRIBUIDORA LA FORTUNA', fatherCard: null, tipo: 'individual', salesPersonCode: 9, zonaCode: '5', telefono: '2460-2277', correoPrincipal: 'admin@distlafortuna.cr', correoCxc: 'contabilidad@distlafortuna.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0021', cardName: 'FARMACIA SAN RAFAEL', fatherCard: null, tipo: 'individual', salesPersonCode: 9, zonaCode: '5', telefono: '2460-6633', correoPrincipal: 'info@farmasanrafael.cr', correoCxc: '', envioAutomatico: 'N', estado: 'sin_documentos' },
	{ cardCode: 'C0022', cardName: 'FERRETERÍA UPALA', fatherCard: null, tipo: 'individual', salesPersonCode: 9, zonaCode: '6', telefono: '2470-1122', correoPrincipal: 'contacto@ferrupala.cr', correoCxc: 'cxc@ferrupala.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0023', cardName: 'MATERIALES EL VOLCÁN', fatherCard: null, tipo: 'individual', salesPersonCode: 9, zonaCode: '6', telefono: '2470-5566', correoPrincipal: 'ventas@matelvolcan.cr', correoCxc: 'pagos@matelvolcan.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0024', cardName: 'COMERCIAL CAÑO NEGRO', fatherCard: null, tipo: 'individual', salesPersonCode: 9, zonaCode: '6', telefono: '2470-9900', correoPrincipal: 'admin@canonegro.cr', correoCxc: 'contabilidad@canonegro.cr', envioAutomatico: 'Y', estado: 'otro_vendedor', ruteadoA: 11 },

	// ── AGENTE 10: MARÍA FERNANDA ROJAS — Meseta Central ─────────────────
	{ cardCode: 'C0025', cardName: 'FERRETERÍA LA PRIMERA', fatherCard: null, tipo: 'individual', salesPersonCode: 10, zonaCode: '7', telefono: '2273-4455', correoPrincipal: 'gerencia@ferrlaprimera.cr', correoCxc: 'cxc@ferrlaprimera.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0026', cardName: 'DISTRIBUIDORA CENTRO S.A.', fatherCard: null, tipo: 'individual', salesPersonCode: 10, zonaCode: '7', telefono: '2273-8899', correoPrincipal: 'ventas@distcentro.cr', correoCxc: 'pagos@distcentro.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0027', cardName: 'SUPERMERCADO EL BUEN PRECIO', fatherCard: null, tipo: 'individual', salesPersonCode: 10, zonaCode: '7', telefono: '2273-2211', correoPrincipal: 'admin@elbuenprecio.cr', correoCxc: 'contabilidad@elbuenprecio.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0028', cardName: 'FARMACIA SANTA ANA', fatherCard: null, tipo: 'individual', salesPersonCode: 10, zonaCode: '7', telefono: '2273-6677', correoPrincipal: 'info@farmasantaana.cr', correoCxc: '', envioAutomatico: 'N', estado: 'sin_documentos' },
	{ cardCode: 'C0029', cardName: 'MATERIALES DEL OESTE S.A.', fatherCard: null, tipo: 'individual', salesPersonCode: 10, zonaCode: '8', telefono: '2282-1133', correoPrincipal: 'admin@matdeloeste.cr', correoCxc: 'cxc@matdeloeste.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0030', cardName: 'COMERCIAL ESCAZÚ', fatherCard: null, tipo: 'individual', salesPersonCode: 10, zonaCode: '8', telefono: '2282-5577', correoPrincipal: 'compras@comescazu.cr', correoCxc: 'pagos@comescazu.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0031', cardName: 'FERRETERÍA SANTA ANA', fatherCard: null, tipo: 'individual', salesPersonCode: 10, zonaCode: '8', telefono: '2282-9988', correoPrincipal: 'ventas@ferrsantaana.cr', correoCxc: 'cobros@ferrsantaana.cr', envioAutomatico: 'Y', estado: 'elegible' },

	// ── AGENTE 11: LUIS ALBERTO VARGAS — Cartago + Alajuela Sur ──────────
	{ cardCode: 'C0032', cardName: 'FERRETERÍA CARTAGINESA', fatherCard: null, tipo: 'individual', salesPersonCode: 11, zonaCode: '9', telefono: '2552-3344', correoPrincipal: 'gerencia@ferrcartaginesa.cr', correoCxc: 'cxc@ferrcartaginesa.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0033', cardName: 'MATERIALES COLONIALES S.A.', fatherCard: null, tipo: 'individual', salesPersonCode: 11, zonaCode: '9', telefono: '2552-7788', correoPrincipal: 'admin@matcoloniales.cr', correoCxc: 'pagos@matcoloniales.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0034', cardName: 'SUPERMERCADO EL BRUJO', fatherCard: null, tipo: 'individual', salesPersonCode: 11, zonaCode: '9', telefono: '2552-1122', correoPrincipal: 'compras@elbrujo.cr', correoCxc: 'contabilidad@elbrujo.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0035', cardName: 'AGROVETERINARIA CARTAGO', fatherCard: null, tipo: 'individual', salesPersonCode: 11, zonaCode: '9', telefono: '2552-5566', correoPrincipal: 'info@agrocartago.cr', correoCxc: '', envioAutomatico: 'N', estado: 'sin_documentos' },
	{ cardCode: 'C0036', cardName: 'COMERCIAL ALAJUELA', fatherCard: null, tipo: 'individual', salesPersonCode: 11, zonaCode: '13', telefono: '2440-9900', correoPrincipal: 'admin@comalajuela.cr', correoCxc: 'cxc@comalajuela.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0037', cardName: 'FERRETERÍA EL MANGO', fatherCard: null, tipo: 'individual', salesPersonCode: 11, zonaCode: '13', telefono: '2440-4455', correoPrincipal: 'ventas@ferrelmango.cr', correoCxc: 'pagos@ferrelmango.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0038', cardName: 'DISTRIBUIDORA LA GARITA', fatherCard: null, tipo: 'individual', salesPersonCode: 11, zonaCode: '13', telefono: '2440-8811', correoPrincipal: 'contacto@distlagarita.cr', correoCxc: 'cobros@distlagarita.cr', envioAutomatico: 'Y', estado: 'elegible' },

	// ── AGENTE 12: CAROLINA JIMÉNEZ — Heredia + San José Centro ──────────
	{ cardCode: 'C0039', cardName: 'FERRETERÍA HEREDIANA', fatherCard: null, tipo: 'individual', salesPersonCode: 12, zonaCode: '10', telefono: '2237-2244', correoPrincipal: 'gerencia@ferrheredia.cr', correoCxc: 'cxc@ferrheredia.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0040', cardName: 'MATERIALES BARVA S.A.', fatherCard: null, tipo: 'individual', salesPersonCode: 12, zonaCode: '10', telefono: '2237-6688', correoPrincipal: 'admin@matbarva.cr', correoCxc: 'pagos@matbarva.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0041', cardName: 'DISTRIBUIDORA SAN JOAQUÍN', fatherCard: null, tipo: 'individual', salesPersonCode: 12, zonaCode: '10', telefono: '2237-1177', correoPrincipal: 'ventas@distsanjoaquin.cr', correoCxc: 'contabilidad@distsanjoaquin.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0042', cardName: 'FARMACIA FLORES', fatherCard: null, tipo: 'individual', salesPersonCode: 12, zonaCode: '10', telefono: '2237-5533', correoPrincipal: 'info@farmaflores.cr', correoCxc: '', envioAutomatico: 'N', estado: 'otro_vendedor', ruteadoA: 10 },
	{ cardCode: 'C0043', cardName: 'COMERCIAL CAPITALINA', fatherCard: null, tipo: 'individual', salesPersonCode: 12, zonaCode: '14', telefono: '2258-9922', correoPrincipal: 'admin@comcapitalina.cr', correoCxc: 'cxc@comcapitalina.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0044', cardName: 'FERRETERÍA DEL VALLE', fatherCard: null, tipo: 'individual', salesPersonCode: 12, zonaCode: '14', telefono: '2258-4477', correoPrincipal: 'ventas@ferrdelvalle.cr', correoCxc: 'pagos@ferrdelvalle.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0045', cardName: 'DISTRIBUIDORA METROPOLITANA', fatherCard: null, tipo: 'individual', salesPersonCode: 12, zonaCode: '14', telefono: '2258-8833', correoPrincipal: 'contacto@distmetro.cr', correoCxc: 'cobros@distmetro.cr', envioAutomatico: 'Y', estado: 'elegible' },

	// ── AGENTE 13: DIEGO CASTILLO — Pérez Zeledón ────────────────────────
	{ cardCode: 'C0046', cardName: 'FERRETERÍA GENERALEÑA', fatherCard: null, tipo: 'individual', salesPersonCode: 13, zonaCode: '11', telefono: '2771-3322', correoPrincipal: 'gerencia@ferrgeneralena.cr', correoCxc: 'cxc@ferrgeneralena.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0047', cardName: 'MATERIALES SAN ISIDRO S.A.', fatherCard: null, tipo: 'individual', salesPersonCode: 13, zonaCode: '11', telefono: '2771-7766', correoPrincipal: 'admin@matsanisidro.cr', correoCxc: 'pagos@matsanisidro.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0048', cardName: 'COMERCIAL DEL SUR', fatherCard: null, tipo: 'individual', salesPersonCode: 13, zonaCode: '11', telefono: '2771-1199', correoPrincipal: 'ventas@comdelsur.cr', correoCxc: 'contabilidad@comdelsur.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0049', cardName: 'AGROSERVICIOS PÉREZ', fatherCard: null, tipo: 'individual', salesPersonCode: 13, zonaCode: '11', telefono: '2771-5544', correoPrincipal: 'info@agroperez.cr', correoCxc: '', envioAutomatico: 'N', estado: 'sin_documentos' },

	// ── AGENTE 14: PATRICIA MORA — resto ─────────────────────────────────
	{ cardCode: 'C0050', cardName: 'FERRETERÍA NANDAYURE', fatherCard: null, tipo: 'individual', salesPersonCode: 14, zonaCode: '2', telefono: '2659-2211', correoPrincipal: 'ventas@ferrnandayure.cr', correoCxc: 'cxc@ferrnandayure.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0051', cardName: 'COMERCIAL HOJANCHA', fatherCard: null, tipo: 'individual', salesPersonCode: 14, zonaCode: '2', telefono: '2659-6655', correoPrincipal: 'admin@comhojancha.cr', correoCxc: 'pagos@comhojancha.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0052', cardName: 'COMERCIAL BELÉN', fatherCard: null, tipo: 'individual', salesPersonCode: 14, zonaCode: '8', telefono: '2293-8877', correoPrincipal: 'gerencia@combelen.cr', correoCxc: 'contabilidad@combelen.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'C0053', cardName: 'FERRETERÍA LA RIBERA', fatherCard: null, tipo: 'individual', salesPersonCode: 14, zonaCode: '8', telefono: '2293-4411', correoPrincipal: 'ventas@ferrlaribera.cr', correoCxc: 'cobros@ferrlaribera.cr', envioAutomatico: 'Y', estado: 'elegible' },

	// ── PADRES CON SUCURSALES ────────────────────────────────────────────
	// DISTRIBUIDORA NACIONAL — padre + 2 sucursales
	{ cardCode: 'P0001', cardName: 'DISTRIBUIDORA NACIONAL S.A.', fatherCard: null, tipo: 'padre', salesPersonCode: 10, zonaCode: '7', telefono: '2222-1000', correoPrincipal: 'gerencia@distnacional.cr', correoCxc: 'pagos@distnacional.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'P0001-1', cardName: 'DISTRIBUIDORA NACIONAL — SUC. ALAJUELA', fatherCard: 'P0001', tipo: 'hijo', salesPersonCode: 11, zonaCode: '13', telefono: '2440-1001', correoPrincipal: 'alajuela@distnacional.cr', correoCxc: 'pagos@distnacional.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'P0001-2', cardName: 'DISTRIBUIDORA NACIONAL — SUC. HEREDIA', fatherCard: 'P0001', tipo: 'hijo', salesPersonCode: 12, zonaCode: '10', telefono: '2237-1002', correoPrincipal: 'heredia@distnacional.cr', correoCxc: 'pagos@distnacional.cr', envioAutomatico: 'Y', estado: 'elegible' },

	// GRUPO AGROCOMERCIAL EL ROBLE — padre + 2 sucursales
	{ cardCode: 'P0002', cardName: 'GRUPO AGROCOMERCIAL EL ROBLE S.A.', fatherCard: null, tipo: 'padre', salesPersonCode: 9, zonaCode: '5', telefono: '2460-2000', correoPrincipal: 'gerencia@grupoelroble.cr', correoCxc: 'contabilidad@grupoelroble.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'P0002-1', cardName: 'GRUPO EL ROBLE — SUC. SAN CARLOS', fatherCard: 'P0002', tipo: 'hijo', salesPersonCode: 9, zonaCode: '5', telefono: '2460-2001', correoPrincipal: 'sancarlos@grupoelroble.cr', correoCxc: 'contabilidad@grupoelroble.cr', envioAutomatico: 'Y', estado: 'elegible' },
	{ cardCode: 'P0002-2', cardName: 'GRUPO EL ROBLE — SUC. UPALA', fatherCard: 'P0002', tipo: 'hijo', salesPersonCode: 9, zonaCode: '6', telefono: '2470-2002', correoPrincipal: 'upala@grupoelroble.cr', correoCxc: 'contabilidad@grupoelroble.cr', envioAutomatico: 'Y', estado: 'elegible' }
];

const CLIENTE_POR_CARDCODE = new Map(CLIENTES_BASE.map((c) => [c.cardCode, c]));

// ═══════════════════════════════════════════════════════════════════════
// GENERACIÓN DE DOCUMENTOS Y SALDOS — determinista por cardCode
// ═══════════════════════════════════════════════════════════════════════

/** Hash determinista: mismo string → mismo número. */
function hashCode(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
	return h;
}

/** Generador pseudoaleatorio sembrado — mismo seed, misma secuencia. */
function rng(seed: number) {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

function formatearFecha(d: Date): string {
	return d.toISOString().slice(0, 10);
}

/** Documentos de un cliente — determinista por su cardCode. */
function generarDocumentos(cardCode: string, estado: EstadoCarga): {
	usd: DocUnificado[];
	crc: DocUnificado[];
} {
	if (estado === 'sin_documentos') return { usd: [], crc: [] };

	const random = rng(hashCode(cardCode));
	const hoy = new Date();

	const nDocsCrc = 1 + Math.floor(random() * 4); // 1-4
	const nDocsUsd = Math.floor(random() * 3); // 0-2
	const consecutivoBase = Math.floor(random() * 90000) + 10000;

	const crc: DocUnificado[] = [];
	for (let i = 0; i < nDocsCrc; i++) {
		const diasVencido = Math.floor(random() * 140) - 20; // -20 a 120
		const vencimiento = new Date(hoy.getTime() - diasVencido * 86400000);
		const emision = new Date(vencimiento.getTime() - 30 * 86400000);
		const saldo = Math.round((50000 + random() * 1800000) / 100) * 100;
		const esNC = random() < 0.1;
		const monto = esNC ? -saldo : saldo;
		const tipoDoc = esNC ? 'NC' : 'FRM';

		crc.push({
			consecutivo: `FE-${consecutivoBase + i}`,
			ordenCompra: `OC-${Math.floor(random() * 90000) + 10000}`,
			fecha: formatearFecha(emision),
			fechaVence: formatearFecha(vencimiento),
			tipoDoc,
			descripcion: esNC ? 'Nota de crédito por devolución' : 'Factura por mercadería',
			saldo: monto,
			moneda: 'CRC',
			diasVencido: Math.max(0, diasVencido),
			estatus: monto < 0 ? 'A favor' : diasVencido > 0 ? 'Vencido' : 'Al día'
		});
	}

	const usd: DocUnificado[] = [];
	for (let i = 0; i < nDocsUsd; i++) {
		const diasVencido = Math.floor(random() * 140) - 20;
		const vencimiento = new Date(hoy.getTime() - diasVencido * 86400000);
		const emision = new Date(vencimiento.getTime() - 30 * 86400000);
		const saldo = Math.round((500 + random() * 18000) * 100) / 100;

		usd.push({
			consecutivo: `FE-${consecutivoBase + 500 + i}`,
			ordenCompra: `OC-${Math.floor(random() * 90000) + 10000}`,
			fecha: formatearFecha(emision),
			fechaVence: formatearFecha(vencimiento),
			tipoDoc: 'FRM',
			descripcion: 'Factura por mercadería importada',
			saldo,
			moneda: 'USD',
			diasVencido: Math.max(0, diasVencido),
			estatus: diasVencido > 0 ? 'Vencido' : 'Al día'
		});
	}

	return { crc, usd };
}

/** Cache de documentos — se genera una vez al cargar el módulo. */
const DOCS_CACHE = new Map<string, { usd: DocUnificado[]; crc: DocUnificado[] }>();
for (const c of CLIENTES_BASE) {
	DOCS_CACHE.set(c.cardCode, generarDocumentos(c.cardCode, c.estado));
}

function totalDocs(docs: DocUnificado[]): number {
	return docs.reduce((sum, d) => sum + d.saldo, 0);
}

function rangosDe(docs: DocUnificado[]): RangosVencimiento {
	const r: RangosVencimiento = {
		'0_30': 0,
		'31_60': 0,
		'61_90': 0,
		'91_120': 0,
		mas_120: 0,
		totalVencido: 0
	};
	for (const d of docs) {
		if (d.diasVencido <= 0 || d.saldo < 0) continue;
		if (d.diasVencido <= 30) r['0_30'] += d.saldo;
		else if (d.diasVencido <= 60) r['31_60'] += d.saldo;
		else if (d.diasVencido <= 90) r['61_90'] += d.saldo;
		else if (d.diasVencido <= 120) r['91_120'] += d.saldo;
		else r.mas_120 += d.saldo;
		r.totalVencido += d.saldo;
	}
	return r;
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS: CLIENTES
// ═══════════════════════════════════════════════════════════════════════

export const MOCK_CLIENTES: ClienteSAP[] = CLIENTES_BASE.map((c) => ({
	cardCode: c.cardCode,
	cardName: c.cardName,
	fatherCard: c.fatherCard,
	tipo: c.tipo
}));

export const MOCK_PADRES: CuentaPadre[] = CLIENTES_BASE.filter((c) => c.tipo === 'padre').map(
	(padre) => ({
		cardCode: padre.cardCode,
		cardName: padre.cardName,
		hijos: CLIENTES_BASE.filter((c) => c.fatherCard === padre.cardCode).map((h) => ({
			cardCode: h.cardCode,
			cardName: h.cardName,
			fatherCard: h.fatherCard,
			tipo: h.tipo
		}))
	})
);

export function obtenerClientesMock(): ListaClientesResponse {
	return {
		total: MOCK_CLIENTES.length,
		clientes: MOCK_CLIENTES,
		padres: MOCK_PADRES
	};
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS: AUDITORÍA
// ═══════════════════════════════════════════════════════════════════════

export function auditarClienteMock(cardCode: string): AuditoriaCliente | null {
	const base = CLIENTE_POR_CARDCODE.get(cardCode);
	if (!base) return null;

	const docs = DOCS_CACHE.get(cardCode) ?? { usd: [], crc: [] };
	const totalCrc = totalDocs(docs.crc);
	const totalUsd = totalDocs(docs.usd);

	return {
		existe: true,
		cliente: {
			cardCode: base.cardCode,
			cardName: base.cardName,
			saldoActual: totalCrc,
			envioAutomatico: base.envioAutomatico,
			correoPrincipal: base.correoPrincipal,
			correoCxc: base.correoCxc
		},
		documentos: docs,
		totales: { usd: totalUsd, crc: totalCrc },
		rangos: { usd: rangosDe(docs.usd), crc: rangosDe(docs.crc) }
	};
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS: AGENTES Y ÁRBOL
// ═══════════════════════════════════════════════════════════════════════

export function obtenerAgentesMock() {
	return {
		total: MOCK_AGENTES.length,
		agentes: MOCK_AGENTES
	};
}

/** Arma el árbol zona → clientes para un agente dado. */
export function obtenerArbolAgenteMock(codigoAgente: number): ArbolAgenteZona | null {
	const agente = AGENTE_POR_CODIGO.get(codigoAgente);
	if (!agente) return null;

	const propios = CLIENTES_BASE.filter((c) => c.salesPersonCode === codigoAgente && c.tipo !== 'padre');

	const clientesZona: ClienteZona[] = propios.map((c) => construirClienteZona(c, codigoAgente));

	// Agrupar por zona
	const porZona = new Map<string, ClienteZona[]>();
	const sinZona: ClienteZona[] = [];
	for (const cz of clientesZona) {
		if (!cz.zonaCode || !ZONA_POR_CODIGO.has(cz.zonaCode)) {
			sinZona.push(cz);
			continue;
		}
		if (!porZona.has(cz.zonaCode)) porZona.set(cz.zonaCode, []);
		porZona.get(cz.zonaCode)!.push(cz);
	}

	const zonas: ZonaConClientes[] = [];
	for (const [codigo, clientes] of porZona) {
		const zona = ZONA_POR_CODIGO.get(codigo)!;
		const totalElegibles = clientes.filter((c) => c.elegible).length;
		const totalNoElegibles = clientes.length - totalElegibles;
		zonas.push({ zona, clientes, totalElegibles, totalNoElegibles });
	}
	// Ordenar zonas por nombre
	zonas.sort((a, b) => a.zona.nombre.localeCompare(b.zona.nombre));

	const totalElegibles = clientesZona.filter((c) => c.elegible).length;
	const totalNoElegibles = clientesZona.length - totalElegibles;

	// Montos aproximados: suma de la carga de los elegibles
	const montosAproximados = clientesZona.reduce(
		(acc, c) => ({ crc: acc.crc + c.crc, usd: acc.usd + c.usd }),
		{ crc: 0, usd: 0 }
	);

	return {
		agente,
		zonas,
		sinZona,
		totalElegibles,
		totalNoElegibles,
		montosAproximados
	};
}

function construirClienteZona(c: ClienteMock, agenteActual: number): ClienteZona {
	const zona = ZONA_POR_CODIGO.get(c.zonaCode);
	const docs = DOCS_CACHE.get(c.cardCode) ?? { crc: [], usd: [] };

	// Elegible: ruteado a este agente Y tiene docs abiertos
	let elegible = c.estado === 'elegible';
	let motivo: 'sin_documentos' | 'otro_vendedor' | undefined;
	let vendedorNombre: string | undefined;

	if (c.estado === 'sin_documentos') {
		elegible = false;
		motivo = 'sin_documentos';
	} else if (c.estado === 'otro_vendedor') {
		elegible = false;
		motivo = 'otro_vendedor';
		if (c.ruteadoA) vendedorNombre = AGENTE_POR_CODIGO.get(c.ruteadoA)?.nombre;
	}

	const crc = elegible ? totalDocs(docs.crc.filter((d) => d.saldo > 0)) : 0;
	const usd = elegible ? totalDocs(docs.usd.filter((d) => d.saldo > 0)) : 0;
	const nDocs = elegible ? docs.crc.length + docs.usd.length : 0;

	return {
		cardCode: c.cardCode,
		cardName: c.cardName,
		telefono: c.telefono,
		zonaCode: c.zonaCode,
		zonaNombre: zona?.nombre ?? 'Sin zona',
		vendedorCode: c.salesPersonCode,
		fatherCard: c.fatherCard,
		elegible,
		docs: nDocs,
		crc,
		usd,
		motivo,
		vendedorNombre
	};
}

// ═══════════════════════════════════════════════════════════════════════
// JOBS DE GIRA — simulación en memoria del ciclo del VPS
// ═══════════════════════════════════════════════════════════════════════

interface JobGiraZona {
	tipo: 'gira_zona';
	createdAt: number;
	orden: OrdenGiraZona;
}

interface JobGira {
	tipo: 'gira';
	createdAt: number;
	orden: OrdenEjecucionGira;
}

type Job = JobGiraZona | JobGira;

const JOBS = new Map<string, Job>();

/** Limpieza automática: jobs más viejos de 10 minutos se descartan. */
function purgarJobsViejos() {
	const limite = Date.now() - 10 * 60 * 1000;
	for (const [id, job] of JOBS) {
		if (job.createdAt < limite) JOBS.delete(id);
	}
}

/** Crea un job de gira-zona y devuelve su id. */
export function crearJobGiraZonaMock(orden: OrdenGiraZona): string {
	purgarJobsViejos();
	const jobId = crypto.randomUUID();
	JOBS.set(jobId, { tipo: 'gira_zona', createdAt: Date.now(), orden });
	return jobId;
}

/** Crea un job de gira (manual) y devuelve su id. */
export function crearJobGiraMock(orden: OrdenEjecucionGira): string {
	purgarJobsViejos();
	const jobId = crypto.randomUUID();
	JOBS.set(jobId, { tipo: 'gira', createdAt: Date.now(), orden });
	return jobId;
}

/**
 * Consulta el estado de un job. Las fases se derivan del tiempo transcurrido
 * desde su creación, para que el polling del panel se vea real:
 *   0 - 3s   → en_cola
 *   3 - 7s   → procesando
 *   7s +     → terminado / con_avisos (según si hay omitidos)
 */
export function obtenerEstadoJobMock(jobId: string): EstadoGiraZonaResponse {
	const job = JOBS.get(jobId);
	if (!job) return { estado: 'desconocido' };

	const elapsed = Date.now() - job.createdAt;
	if (elapsed < 3000) return { estado: 'en_cola' };
	if (elapsed < 7000) return { estado: 'procesando' };

	// Terminado: calcular resultado (solo para gira-zona; gira manual no hace polling)
	if (job.tipo === 'gira_zona') {
		const resultado = computarResultadoGiraZona(job.orden);
		const estado = resultado.omitidos.length > 0 ? 'con_avisos' : 'terminado';
		return { estado, resultado };
	}

	return { estado: 'terminado' };
}

/**
 * Reparto determinista de los cardCodes solicitados:
 * la mayoría se procesan, unos pocos caen en cada categoría de omitido
 * según un hash del cardCode. El mismo cliente siempre tiene el mismo
 * destino, para que las demos sean reproducibles.
 */
function computarResultadoGiraZona(orden: OrdenGiraZona): ResultadoGiraZona {
	const sin_documentos: string[] = [];
	const otro_vendedor: string[] = [];
	const inexistentes: string[] = [];
	const no_evaluables: string[] = [];
	let procesados = 0;

	for (const code of orden.cardCodes) {
		if (!CLIENTE_POR_CARDCODE.has(code)) {
			inexistentes.push(code);
			continue;
		}
		const bucket = hashCode(code + '::fate') % 30;
		if (bucket === 0) sin_documentos.push(code);
		else if (bucket === 1) otro_vendedor.push(code);
		else if (bucket === 2) no_evaluables.push(code);
		else procesados++;
	}

	const omitidos = [...sin_documentos, ...otro_vendedor, ...inexistentes, ...no_evaluables];
	const total = orden.cardCodes.length;

	let mensaje: string;
	if (procesados === total) {
		mensaje = `Gira generada: ${procesados} ${procesados === 1 ? 'cliente' : 'clientes'} en el PDF.`;
	} else if (procesados === 0) {
		mensaje = `No se pudo generar la gira: todos los clientes quedaron fuera.`;
	} else {
		mensaje = `Gira generada con avisos: ${procesados} de ${total} clientes entraron al PDF.`;
	}

	return {
		ok: true,
		solicitados: total,
		procesados,
		omitidos,
		omitidos_detalle: { sin_documentos, otro_vendedor, inexistentes, no_evaluables },
		mensaje
	};
}

// ═══════════════════════════════════════════════════════════════════════
// EJECUCIONES HISTÓRICAS — para el dashboard de RPAs
// ═══════════════════════════════════════════════════════════════════════

function generarEjecuciones(tipo: 'cxc' | 'giras') {
	const ejecuciones = [];
	const random = rng(hashCode(tipo));
	for (let i = 0; i < 20; i++) {
		const date = new Date();
		date.setDate(date.getDate() - i * 2);
		const falla = i % 10 === 0 && i !== 0;
		ejecuciones.push({
			id: crypto.randomUUID(),
			automatizacion_id: tipo === 'cxc' ? 'cxc-mock' : 'giras-mock',
			fecha_inicio: date.toISOString(),
			fecha_fin: new Date(date.getTime() + 150000).toISOString(),
			estado: falla ? 'Error' : 'Exitoso',
			metricas:
				tipo === 'cxc'
					? {
							tiempo_ejecucion: 140 + random() * 60,
							total_clientes: 250,
							clientes_procesados: 225 + Math.floor(random() * 20),
							clientes_omitidos_N: 5 + Math.floor(random() * 5),
							clientes_sin_documentos: 10 + Math.floor(random() * 5),
							clientes_sin_correo: 3 + Math.floor(random() * 4),
							total_documentos_procesados: 1100 + Math.floor(random() * 200),
							emails_exitosos: 215 + Math.floor(random() * 15),
							emails_fallidos: Math.floor(random() * 6),
							monto_total_usd: 145000 + random() * 15000,
							monto_total_colones: 44000000 + random() * 6000000,
							monto_vencido_usd: 23000 + random() * 6000,
							monto_vencido_colones: 7500000 + random() * 2500000
						}
					: {
							tiempo_ejecucion: 85 + random() * 35,
							total_agentes: 8,
							reportes_generados: 8,
							total_documentos_procesados: 420 + Math.floor(random() * 60),
							emails_exitosos: 8,
							emails_fallidos: 0,
							monto_total_usd: 95000 + random() * 15000,
							monto_total_colones: 29000000 + random() * 5000000,
							monto_vencido_usd: 14000 + random() * 6000,
							monto_vencido_colones: 4500000 + random() * 1500000
						}
		});
	}
	return ejecuciones;
}

export const MOCK_EJECUCIONES_CXC = generarEjecuciones('cxc');
export const MOCK_EJECUCIONES_GIRAS = generarEjecuciones('giras');