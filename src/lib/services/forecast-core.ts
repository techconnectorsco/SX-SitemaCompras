/**
 * @module forecast-core
 * @description Núcleo de cálculo del forecast de compras (fórmulas puras).
 * Extraído de /api/admin/procesar-forecast SIN cambiar nada del cálculo,
 * para que el procesamiento nuevo y la actualización de snapshot usen
 * exactamente las mismas fórmulas. No depende de `db` ni del DataSource.
 */

// null = usar fecha actual.
export const FECHA_CORTE_TEST: Date | null = null;

// Factores de seguridad
export const FACTORES_SEGURIDAD: Record<string, number> = {
	'A': 2.500551790,
	'B': 2.326347870,
	'C': 1.281551570,
	'D': 0,
	'E': 0
};

// L.T. de respaldo si NO existe la fila '__DEFAULT__' en la tabla
// (equivale al comportamiento histórico 1/1/1/1).
export const LT_RESPALDO = { lt_courier: 1, lt_aereo: 1, lt_maritimo: 1, meses_pedido: 1 };

export type Lt = { lt_courier: number; lt_aereo: number; lt_maritimo: number; meses_pedido: number };

/**
 * Resuelve la CLAVE de L.T. del SKU — MISMA lógica que estaba inline en el orchestrator:
 *  - HUSQVARNA → 'HUSQVARNA-A' si la línea empieza con 'RP', si no 'HUSQVARNA-B'
 *  - resto → marca (mayúsculas, sin espacios)
 */
export function resolverClaveLt(marca: string, linea: string): string {
	const m = (marca || '').toUpperCase().trim();
	const l = (linea || '').toUpperCase().trim();
	const clave = m === 'HUSQVARNA'
		? (l.startsWith('RP') ? 'HUSQVARNA-A' : 'HUSQVARNA-B')
		: m;
	return clave;
}

/**
 * ✅ VERSIÓN FINAL: calcularEstadisticas()
 * - Día < 15: mes actual INCOMPLETO → últimos 12 meses (excluye mes actual)
 * - Día >= 15: incluye mes actual (últimos 11 + actual)
 */
export function calcularEstadisticas(ventas: any[]) {
	const hoy = FECHA_CORTE_TEST || new Date();

	const diaActual = hoy.getDate();
	const yearActual = hoy.getFullYear();
	const mesActual = hoy.getMonth() + 1; // 1-12

	console.log(`\n  🔍 [ESTADÍSTICAS] Fecha: ${hoy.toLocaleDateString('es-CR')} (Día ${diaActual})`);

	// 1. ¿Incluir mes actual?
	const DIA_CORTE_INCLUSION = 15;
	let mesesARetroceder: number;
	let incluirMesActual: boolean;

	if (diaActual < DIA_CORTE_INCLUSION) {
		mesesARetroceder = 12;
		incluirMesActual = false;
		console.log(`  📅 Día ${diaActual} < ${DIA_CORTE_INCLUSION}: Mes actual INCOMPLETO`);
		console.log(`  📊 Buscaremos: Últimos 12 meses COMPLETOS (excluye mes actual)`);
	} else {
		mesesARetroceder = 11;
		incluirMesActual = true;
	}

	// 2. Mes de inicio
	let yearInicio = yearActual;
	let mesInicio = mesActual - mesesARetroceder;
	while (mesInicio <= 0) {
		mesInicio += 12;
		yearInicio -= 1;
	}

	// 3. 12 meses consecutivos
	const mesesConsecutivos: Array<{ año: number; mes: number }> = [];
	const ventasOrdenadas: number[] = [];
	let yearTemp = yearInicio;
	let mesTemp = mesInicio;
	for (let i = 0; i < 12; i++) {
		mesesConsecutivos.push({ año: yearTemp, mes: mesTemp });
		mesTemp += 1;
		if (mesTemp > 12) {
			mesTemp = 1;
			yearTemp += 1;
		}
	}

	// 4. Buscar ventas para cada mes
	let totalVentas = 0;
	let frecuencia = 0;
	for (const mes of mesesConsecutivos) {
		const venta = ventas.find((v) => v.año === mes.año && v.mes === mes.mes);
		const cantidad = venta ? venta.cantidad : 0;
		ventasOrdenadas.push(cantidad);
		totalVentas += cantidad;
		if (cantidad > 0) {
			frecuencia += 1;
		}
	}

	const prom12 = totalVentas / 12;

	// 5. Corte de fecha (proyección)
	const DIA_CORTE = 15;
	let fechaInicioProyeccion = new Date(hoy);
	if (hoy.getDate() > DIA_CORTE) {
		fechaInicioProyeccion.setMonth(fechaInicioProyeccion.getMonth() + 1);
	}

	// 6. Prom. 6 meses por temporada (espejo año anterior)
	let sumaVentasTemporada = 0;
	for (let i = 0; i < 6; i++) {
		const fechaFutura = new Date(fechaInicioProyeccion);
		fechaFutura.setMonth(fechaInicioProyeccion.getMonth() + i);
		const anioHistorico = fechaFutura.getFullYear() - 1;
		const mesHistorico = fechaFutura.getMonth() + 1;
		const venta = ventas.find((v) => v.año === anioHistorico && v.mes === mesHistorico);
		if (venta) {
			sumaVentasTemporada += venta.cantidad;
		}
	}

	const prom6 = sumaVentasTemporada / 6;

	// 7. Estadísticas finales
	const promAjustado = Math.max(prom6, prom12);

	const varianza = ventasOrdenadas.reduce((sum, v) => sum + Math.pow(v - prom12, 2), 0) / 11;
	const desviacion = Math.sqrt(varianza);

	const denominadorCV = prom12 / 1.2;
	const cv = denominadorCV > 0 ? desviacion / denominadorCV : 0;

	let abcRotacion = 'E';
	if (frecuencia >= 6) abcRotacion = 'A';
	else if (frecuencia >= 4) abcRotacion = 'B';
	else if (frecuencia === 3) abcRotacion = 'C';
	else if (frecuencia === 2) abcRotacion = 'D';

	console.log(`  📈 ABC Rotación: ${abcRotacion}, Prom6m: ${prom6.toFixed(2)}, PromAjustado: ${promAjustado.toFixed(2)}\n`);

	return { frecuencia, total: totalVentas, prom12, prom6, promAjustado, desviacion, cv, abcRotacion };
}

/**
 * ✅ calcularForecast() — horizontes por proveedor/marca (idéntico al original)
 */
export function calcularForecast(stats: any, factorSeguridad: number, existenciaData: any, lt: Lt, soloMaritimo: boolean = false) {
	const stockSeguridad = Math.round(factorSeguridad * stats.promAjustado);

	const ltCourier = lt.lt_courier;
	const ltAereo = lt.lt_aereo;
	const ltMaritimo = lt.lt_maritimo;
	const mesesPedido = lt.meses_pedido;

	const refCourier = Math.round(stats.promAjustado * ltCourier);
	const refAereo = Math.round(stats.promAjustado * (ltAereo + mesesPedido) + stockSeguridad);
	const refMaritimo = Math.round(stats.promAjustado * (ltMaritimo + mesesPedido) + stockSeguridad);

	const cantCourierCalc = existenciaData.existencia + existenciaData.transito - refCourier;
	let cantCourier = {
		cantidad: cantCourierCalc,
		mensaje: cantCourierCalc < 0 ? 'PEDIR COURIER' : '',
		cantidadFinal: cantCourierCalc > 0 ? 0 : cantCourierCalc
	};

	const cantAereoCalc = existenciaData.existencia + existenciaData.transito - refAereo - cantCourier.cantidadFinal;
	let cantAereo = {
		cantidad: cantAereoCalc,
		mensaje: cantAereoCalc < 0 ? 'PEDIR AEREO' : '',
		cantidadFinal: cantAereoCalc > 0 ? 0 : cantAereoCalc
	};

	// 🛑 BARRERA DE NEGOCIO: Si la regla dicta que es solo marítimo,
	// borramos los mensajes de urgencia y pasamos un 0 a la cascada.
	// Esto obliga a que el déficit total sea absorbido por el cálculo marítimo.
	if (soloMaritimo) {
		cantCourier = { ...cantCourier, mensaje: '', cantidadFinal: 0 };
		cantAereo = { ...cantAereo, mensaje: '', cantidadFinal: 0 };
	}

	const cantMaritimoCalc = existenciaData.existencia + existenciaData.transito - cantAereo.cantidadFinal - refMaritimo;
	let cantMaritimo = {
		cantidad: cantMaritimoCalc,
		mensaje: cantMaritimoCalc < 0 ? 'PEDIR MARITIMO' : '',
		cantidadFinal: cantMaritimoCalc > 0 ? 0 : cantMaritimoCalc
	};

	const ltUsado = { courier: ltCourier, aereo: ltAereo, maritimo: ltMaritimo, mesesPedido: mesesPedido };

	return { stockSeguridad, refCourier, refAereo, refMaritimo, cantCourier, cantAereo, cantMaritimo, ltUsado };
}