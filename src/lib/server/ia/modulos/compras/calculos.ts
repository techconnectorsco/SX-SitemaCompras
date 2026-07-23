/**
 * ============================================================================
 * MÓDULO COMPRAS — CAPA DE CÁLCULO (DETERMINISTA)
 * ============================================================================
 * Acá vive el cerebro de negocio. Calcula veredictos, riesgos y confianza
 * a partir de datos reales de forecast_procesamiento. La IA NO calcula nada;
 * solo traduce estos resultados a lenguaje simple.
 *
 * Principio: las cantidades sugeridas YA las calculó el motor de forecast
 * (cantidad_final_courier/aereo/maritimo). Acá las explicamos y agregamos
 * veredicto, riesgo y confianza; no las recalculamos para no contradecir
 * la fuente única de verdad.
 */

import { NEGOCIO } from '../../config';
import type { DB, RecomendacionIA, AccionIA, Severidad } from '../../tipos';

// Fila relevante de forecast_procesamiento (solo las columnas que usamos).
interface FilaForecast {
	codigo_sku: string;
	codigo_proveedor: string | null;
	descripcion: string | null;
	linea: string | null;
	marca: string | null;
	abc: string | null;
	activo: number | null;
	existencia: number | null;
	transito: number | null;
	lead_time: number | null;
	frecuencia_ventas_12m: number | null;
	venta_ultimos_12m: number | null;
	promedio_12m: number | null;
	promedio_6m: number | null;
	promedio_ajustado: number | null;
	coeficiente_variacion: number | null;
	stock_seguridad: number | null;
	cantidad_final_courier: number | null;
	cantidad_final_aereo: number | null;
	cantidad_final_maritimo: number | null;
	sugerido_analista_urgente: number | null;
	sugerido_analista_aereo: number | null;
	sugerido_analista_maritimo: number | null;
	costo_ult_dol: number | null;
	costo_prom_dol: number | null;
	ultima_salida: string | null;
	codigo_procesamiento: string | null;
}

const COLS = `codigo_sku, codigo_proveedor, descripcion, linea, marca, abc, activo,
	existencia, transito, lead_time, frecuencia_ventas_12m, venta_ultimos_12m,
	promedio_12m, promedio_6m, promedio_ajustado, coeficiente_variacion, stock_seguridad,
	cantidad_final_courier, cantidad_final_aereo, cantidad_final_maritimo,
	sugerido_analista_urgente, sugerido_analista_aereo, sugerido_analista_maritimo,
	costo_ult_dol, costo_prom_dol, ultima_salida, codigo_procesamiento`;

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function num(v: number | null | undefined): number {
	return typeof v === 'number' && isFinite(v) ? v : 0;
}

function fmt(v: number): string {
	return new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(Math.round(v));
}

/** Procesamiento indicado o, si no, el más reciente. */
export function procActualOReciente(db: DB, codigoProcesamiento?: string): string | null {
	if (codigoProcesamiento) return codigoProcesamiento;
	const fila = db
		.prepare(
			'SELECT codigo_procesamiento FROM forecast_procesamiento ORDER BY fecha_procesamiento DESC, id DESC LIMIT 1'
		)
		.get() as { codigo_procesamiento: string } | undefined;
	return fila?.codigo_procesamiento ?? null;
}

/** Demanda mensual de referencia: prioriza la reciente/ajustada. */
function demandaMensual(f: FilaForecast): number {
	return num(f.promedio_ajustado) || num(f.promedio_6m) || num(f.promedio_12m);
}

/** Cantidad sugerida por el motor de forecast y su método (la mayor positiva). */
function sugeridaDelForecast(f: FilaForecast): {
	cantidad: number;
	metodo?: 'courier' | 'aereo' | 'maritimo';
} {
	const opciones: Array<{ metodo: 'courier' | 'aereo' | 'maritimo'; cant: number }> = [
		{ metodo: 'courier', cant: num(f.cantidad_final_courier) },
		{ metodo: 'aereo', cant: num(f.cantidad_final_aereo) },
		{ metodo: 'maritimo', cant: num(f.cantidad_final_maritimo) }
	];
	const mejor = opciones.reduce((a, b) => (b.cant > a.cant ? b : a), { metodo: 'courier' as const, cant: 0 });
	return mejor.cant > 0 ? { cantidad: mejor.cant, metodo: mejor.metodo } : { cantidad: 0 };
}

// ----------------------------------------------------------------------------
// Evaluación central de un SKU -> RecomendacionIA
// ----------------------------------------------------------------------------

export function evaluarSku(f: FilaForecast): RecomendacionIA {
	const disponible = num(f.existencia) + num(f.transito);
	const demanda = demandaMensual(f);
	const stockSeg = num(f.stock_seguridad);
	const leadDias = NEGOCIO.LEAD_TIME_EN_DIAS
		? num(f.lead_time)
		: num(f.lead_time) * NEGOCIO.DIAS_POR_MES;
	const demandaLead = demanda * (leadDias / NEGOCIO.DIAS_POR_MES);
	const puntoReorden = demandaLead + stockSeg;
	const cobertura = demanda > 0 ? disponible / demanda : Infinity; // meses
	const sugerida = sugeridaDelForecast(f);
	const frecuencia = num(f.frecuencia_ventas_12m);
	const hayDemanda = demanda > 0 || frecuencia > 0;

	const datosFaltantes: string[] = [];
	if (demanda === 0 && frecuencia === 0) datosFaltantes.push('historial de ventas');
	if (num(f.lead_time) === 0) datosFaltantes.push('lead time del proveedor');

	// --- Veredicto ---
	let accion: AccionIA;
	if (f.activo === 0) {
		accion = 'REVISAR_MANUAL';
	} else if (!hayDemanda && disponible > 0) {
		accion = 'NO_COMPRAR'; // sin movimiento; candidato a liquidación
	} else if (disponible <= puntoReorden && sugerida.cantidad > 0) {
		accion = 'COMPRAR';
	} else if (disponible <= puntoReorden && sugerida.cantidad === 0) {
		accion = 'REVISAR_MANUAL'; // bajo el punto de reorden pero el motor no sugirió cantidad
	} else if (cobertura > NEGOCIO.COBERTURA_SOBRESTOCK_MESES && demanda > 0) {
		accion = 'NO_COMPRAR'; // sobrestock
	} else {
		accion = 'ESPERAR';
	}

	// --- Riesgo si no actúa ---
	const riesgo = calcularRiesgo(f, { disponible, demandaLead, puntoReorden, cobertura, accion });

	// --- Confianza ---
	const confianza = calcularConfianza(f, { demanda, frecuencia, hayDemanda });

	// --- Justificación en lenguaje simple ---
	const porque: string[] = [];
	porque.push(
		`Disponible ${fmt(disponible)} (existencia ${fmt(num(f.existencia))} + tránsito ${fmt(num(f.transito))}).`
	);
	if (demanda > 0) {
		porque.push(`Demanda mensual estimada ${fmt(demanda)}; cobertura de ${cobertura.toFixed(1)} meses.`);
	} else {
		porque.push('Sin demanda mensual estimada (producto sin movimiento reciente).');
	}
	if (stockSeg > 0 || leadDias > 0) {
		porque.push(`Stock de seguridad ${fmt(stockSeg)}; reabastecer tarda ~${fmt(leadDias)} días.`);
	}
	const divergencia = divergenciaDemanda(f);
	if (divergencia !== null && Math.abs(divergencia) > NEGOCIO.DIVERGENCIA_DEMANDA) {
		const dir = divergencia > 0 ? 'subió' : 'bajó';
		porque.push(
			`La demanda reciente ${dir} respecto al histórico (6m ${fmt(num(f.promedio_6m))} vs 12m ${fmt(num(f.promedio_12m))}).`
		);
	}
	const alza = alzaPrecio(f);
	if (alza) {
		porque.push(
			`El costo subió: último $${fmt(num(f.costo_ult_dol))} vs promedio $${fmt(num(f.costo_prom_dol))}.`
		);
	}

	// --- Datos visibles ---
	const datosVisibles = [
		{ label: 'Disponible', valor: fmt(disponible) },
		{ label: 'Demanda mensual', valor: demanda > 0 ? fmt(demanda) : 'sin dato' },
		{ label: 'Stock seguridad', valor: fmt(stockSeg) },
		{ label: 'Cobertura', valor: isFinite(cobertura) ? `${cobertura.toFixed(1)} meses` : 'sin demanda' },
		{ label: 'Lead time', valor: `${fmt(leadDias)} días` },
		{ label: 'Clasificación ABC', valor: f.abc ?? 'sin dato' }
	];
	if (sugerida.cantidad > 0) {
		datosVisibles.push({ label: 'Cantidad sugerida', valor: `${fmt(sugerida.cantidad)} (${sugerida.metodo})` });
	}

	return {
		caso: `${f.codigo_sku}${f.descripcion ? ' — ' + f.descripcion : ''}`,
		accion,
		cantidad: sugerida.cantidad > 0 ? sugerida.cantidad : undefined,
		metodo: sugerida.metodo,
		porque,
		datosVisibles,
		riesgoSiNoActua: riesgo,
		confianza,
		datosFaltantes: datosFaltantes.length ? datosFaltantes : undefined
	};
}

function divergenciaDemanda(f: FilaForecast): number | null {
	const p6 = num(f.promedio_6m);
	const p12 = num(f.promedio_12m);
	if (p12 === 0) return null;
	return (p6 - p12) / p12;
}

function alzaPrecio(f: FilaForecast): boolean {
	const ult = num(f.costo_ult_dol);
	const prom = num(f.costo_prom_dol);
	if (prom === 0 || ult === 0) return false;
	return (ult - prom) / prom > NEGOCIO.ALZA_PRECIO;
}

function calcularRiesgo(
	f: FilaForecast,
	ctx: { disponible: number; demandaLead: number; puntoReorden: number; cobertura: number; accion: AccionIA }
): RecomendacionIA['riesgoSiNoActua'] {
	const { disponible, demandaLead, puntoReorden, cobertura, accion } = ctx;

	if (accion === 'COMPRAR' || disponible <= puntoReorden) {
		const severidad: Severidad = disponible < demandaLead ? 'alto' : 'medio';
		return {
			tipo: 'quiebre',
			severidad,
			descripcion:
				severidad === 'alto'
					? 'El inventario no cubre la demanda durante el tiempo de reabastecimiento: riesgo real de quiebre.'
					: 'El inventario está por debajo del punto de reorden: puede quebrar si no se repone pronto.'
		};
	}

	if (accion === 'NO_COMPRAR' && isFinite(cobertura) && cobertura > NEGOCIO.COBERTURA_SOBRESTOCK_MESES) {
		const costo = num(f.costo_ult_dol) || num(f.costo_prom_dol);
		const exceso = Math.max(0, disponible - puntoReorden);
		const capital = exceso * costo;
		return {
			tipo: 'sobrestock',
			severidad: capital > 0 ? 'medio' : 'bajo',
			descripcion: capital > 0
				? `Hay ~${fmt(exceso)} unidades de más, inmovilizando aprox. $${fmt(capital)}.`
				: 'Hay cobertura muy alta: capital inmovilizado en inventario.'
		};
	}

	if (alzaPrecio(f)) {
		return {
			tipo: 'alza_precio',
			severidad: 'medio',
			descripcion: 'El costo de compra viene en aumento; conviene vigilar antes de comprometer volumen.'
		};
	}

	return { tipo: 'sin_riesgo', severidad: 'bajo', descripcion: 'Sin riesgo relevante en este momento.' };
}

function calcularConfianza(
	f: FilaForecast,
	ctx: { demanda: number; frecuencia: number; hayDemanda: boolean }
): number {
	let conf = 100;
	const cv = f.coeficiente_variacion;
	if (cv != null) {
		if (cv > 1) conf -= 30;
		else if (cv > 0.5) conf -= 15;
	}
	if (ctx.frecuencia < 3) conf -= 25;
	else if (ctx.frecuencia < 6) conf -= 10;

	const div = divergenciaDemanda(f);
	if (div !== null && Math.abs(div) > NEGOCIO.DIVERGENCIA_DEMANDA) conf -= 10;

	if (!ctx.hayDemanda) conf -= 20;
	if (num(f.lead_time) === 0) conf -= 10;

	return Math.max(5, Math.min(99, Math.round(conf)));
}

// ----------------------------------------------------------------------------
// Análisis (consultan filas y reusan evaluarSku)
// ----------------------------------------------------------------------------

function traerSku(db: DB, proc: string, sku: string): FilaForecast | undefined {
	return db
		.prepare(
			`SELECT ${COLS} FROM forecast_procesamiento WHERE codigo_procesamiento = ? AND codigo_sku = ? LIMIT 1`
		)
		.get(proc, sku) as FilaForecast | undefined;
}

function traerProc(db: DB, proc: string): FilaForecast[] {
	return db
		.prepare(`SELECT ${COLS} FROM forecast_procesamiento WHERE codigo_procesamiento = ?`)
		.all(proc) as FilaForecast[];
}

/** Lista los procesamientos disponibles (más reciente primero). */
export function listarProcesamientos(db: DB, limite = 10) {
	return db
		.prepare(
			`SELECT codigo_procesamiento AS codigo,
			        MAX(fecha_procesamiento) AS fecha,
			        COUNT(*) AS skus,
			        usuario_procesamiento AS usuario
			 FROM forecast_procesamiento
			 GROUP BY codigo_procesamiento
			 ORDER BY fecha DESC
			 LIMIT ?`
		)
		.all(limite);
}

/** Análisis completo de un SKU. */
export function analizarSku(db: DB, proc: string, sku: string): RecomendacionIA | { error: string } {
	const fila = traerSku(db, proc, sku);
	if (!fila) return { error: `No encontré el SKU ${sku} en el procesamiento ${proc}.` };
	return evaluarSku(fila);
}

/** SKUs con mayor riesgo de quiebre. */
export function riesgosQuiebre(db: DB, proc: string, limite = 10): RecomendacionIA[] {
	return traerProc(db, proc)
		.map(evaluarSku)
		.filter((r) => r.riesgoSiNoActua.tipo === 'quiebre')
		.sort((a, b) => sevValor(b.riesgoSiNoActua.severidad) - sevValor(a.riesgoSiNoActua.severidad))
		.slice(0, limite);
}

/** SKUs con dinero inmovilizado (sobrestock / sin movimiento). */
export function dineroInmovilizado(db: DB, proc: string, limite = 10): RecomendacionIA[] {
	return traerProc(db, proc)
		.map(evaluarSku)
		.filter((r) => r.riesgoSiNoActua.tipo === 'sobrestock' || r.accion === 'NO_COMPRAR')
		.sort((a, b) => sevValor(b.riesgoSiNoActua.severidad) - sevValor(a.riesgoSiNoActua.severidad))
		.slice(0, limite);
}

/** Compras a priorizar hoy (las que el motor sugiere comprar, por severidad). */
export function prioridadesCompra(db: DB, proc: string, limite = 10): RecomendacionIA[] {
	return traerProc(db, proc)
		.map(evaluarSku)
		.filter((r) => r.accion === 'COMPRAR')
		.sort((a, b) => sevValor(b.riesgoSiNoActua.severidad) - sevValor(a.riesgoSiNoActua.severidad))
		.slice(0, limite);
}

/** Productos creciendo y decreciendo (6m vs 12m). */
export function crecimientoDecrecimiento(db: DB, proc: string, limite = 10) {
	const filas = traerProc(db, proc)
		.map((f) => ({ f, div: divergenciaDemanda(f) }))
		.filter((x) => x.div !== null) as Array<{ f: FilaForecast; div: number }>;

	const map = (x: { f: FilaForecast; div: number }) => ({
		sku: x.f.codigo_sku,
		descripcion: x.f.descripcion,
		variacionPct: Math.round(x.div * 100),
		promedio6m: num(x.f.promedio_6m),
		promedio12m: num(x.f.promedio_12m)
	});

	const ordenadas = [...filas].sort((a, b) => b.div - a.div);
	return {
		creciendo: ordenadas.slice(0, limite).map(map),
		decreciendo: ordenadas.slice(-limite).reverse().map(map)
	};
}

/** Sugiere el pedido para un método (items con cantidad_final > 0). */
export function sugerirPedido(
	db: DB,
	proc: string,
	metodo: 'courier' | 'aereo' | 'maritimo',
	limite = 50
) {
	const col = `cantidad_final_${metodo}`;
	const filas = db
		.prepare(
			`SELECT codigo_sku, descripcion, codigo_proveedor, ${col} AS cantidad, costo_ult_dol
			 FROM forecast_procesamiento
			 WHERE codigo_procesamiento = ? AND ${col} > 0
			 ORDER BY ${col} DESC LIMIT ?`
		)
		.all(proc, limite) as Array<{
		codigo_sku: string;
		descripcion: string | null;
		codigo_proveedor: string | null;
		cantidad: number;
		costo_ult_dol: number | null;
	}>;

	const costoTotal = filas.reduce((s, f) => s + num(f.cantidad) * num(f.costo_ult_dol), 0);
	return {
		metodo,
		lineas: filas.map((f) => ({
			sku: f.codigo_sku,
			descripcion: f.descripcion,
			proveedor: f.codigo_proveedor,
			cantidad: num(f.cantidad),
			costoEstimado: Math.round(num(f.cantidad) * num(f.costo_ult_dol))
		})),
		costoTotalEstimado: Math.round(costoTotal),
		totalLineas: filas.length
	};
}

/** Compara el pedido de un comprador con la recomendación del sistema. */
export function analizarPedido(db: DB, proc: string, pedidoId: number) {
	const lineas = db
		.prepare(
			`SELECT sku_codigo, cantidad, tipo_envio FROM pedidos_lineas WHERE pedido_id = ?`
		)
		.all(pedidoId) as Array<{ sku_codigo: string; cantidad: number; tipo_envio: string | null }>;

	if (lineas.length === 0) return { error: `El pedido ${pedidoId} no tiene líneas o no existe.` };

	const detalle = lineas.map((l) => {
		const fila = traerSku(db, proc, l.sku_codigo);
		if (!fila) return { sku: l.sku_codigo, comprador: l.cantidad, observacion: 'SKU no está en este procesamiento.' };
		const rec = evaluarSku(fila);
		const sugerido = rec.cantidad ?? 0;
		let observacion = 'Coincide con la recomendación.';
		if (rec.accion === 'NO_COMPRAR') observacion = 'El sistema NO recomienda comprar este SKU.';
		else if (sugerido > 0 && l.cantidad > sugerido * 1.2) observacion = `Pide más de lo sugerido (${fmt(sugerido)}).`;
		else if (sugerido > 0 && l.cantidad < sugerido * 0.8) observacion = `Pide menos de lo sugerido (${fmt(sugerido)}).`;
		return {
			sku: l.sku_codigo,
			comprador: l.cantidad,
			sugerido,
			accionSistema: rec.accion,
			riesgo: rec.riesgoSiNoActua.severidad,
			observacion
		};
	});

	return { pedidoId, lineas: detalle };
}

/** Busca SKUs por texto (código o descripción) dentro de un procesamiento. */
export function buscarSku(db: DB, proc: string, texto: string, limite = 10) {
	const patron = `%${texto}%`;
	return db
		.prepare(
			`SELECT codigo_sku, descripcion, marca, abc, existencia
			 FROM forecast_procesamiento
			 WHERE codigo_procesamiento = ? AND (codigo_sku LIKE ? OR descripcion LIKE ?)
			 LIMIT ?`
		)
		.all(proc, patron, patron, limite);
}

function sevValor(s: Severidad): number {
	return s === 'alto' ? 3 : s === 'medio' ? 2 : 1;
}

// ----------------------------------------------------------------------------
// Snapshot: proveedor y bodega (datos del paso nuevo del procesamiento)
// ----------------------------------------------------------------------------

/** Desempeño de proveedores en un procesamiento, peor fill rate primero. */
export function desempenoProveedores(db: DB, proc: string, limite = 20) {
	return db
		.prepare(
			`SELECT proveedor, lineas_totales, fill_rate, lead_time_promedio,
			        porcentaje_a_tiempo, entregas_retrasadas, cantidad_cancelada
			 FROM forecast_proveedor_desempeno
			 WHERE codigo_procesamiento = ?
			 ORDER BY porcentaje_a_tiempo ASC, fill_rate ASC
			 LIMIT ?`
		)
		.all(proc, limite);
}

/** Distribución de un SKU por bodega en un procesamiento. */
export function existenciaPorBodega(db: DB, proc: string, sku: string) {
	const filas = db
		.prepare(
			`SELECT b.bodega_nombre, feb.bodega_codigo, feb.existencia, feb.transito
			 FROM forecast_existencia_bodega feb
			 LEFT JOIN bodegas b ON b.bodega_codigo = feb.bodega_codigo
			 WHERE feb.codigo_procesamiento = ? AND feb.codigo_sku = ?
			 ORDER BY feb.existencia DESC`
		)
		.all(proc, sku);
	if (filas.length === 0) {
		return { error: `No hay datos de bodega para el SKU ${sku} en el procesamiento ${proc}. Puede que el snapshot de bodega no se haya capturado en esa corrida.` };
	}
	return { sku, procesamiento: proc, bodegas: filas };
}

/** Pedidos pendientes (en tránsito) de un procesamiento, opcionalmente por proveedor. */
export function pedidosPendientes(db: DB, proc: string, proveedor?: string, limite = 50) {
	const params: unknown[] = [proc];
	let filtro = `codigo_procesamiento = ? AND estado = 'N'`;
	if (proveedor) {
		filtro += ' AND proveedor = ?';
		params.push(proveedor);
	}
	params.push(limite);
	return db
		.prepare(
			`SELECT pedido, codigo_sku, descripcion, proveedor, bodega_codigo,
			        cantidad_pendiente, fecha_prometida
			 FROM forecast_pedidos
			 WHERE ${filtro}
			 ORDER BY fecha_prometida
			 LIMIT ?`
		)
		.all(...params);
}