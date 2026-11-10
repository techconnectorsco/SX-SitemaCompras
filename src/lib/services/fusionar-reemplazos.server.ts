/**
 * Fase C - Fusión de Cálculos de Reemplazos de SKU.
 * Suma existencias y el histórico mes a mes de los SKUs viejos al vigente,
 * y recalcula el forecast usando el núcleo matemático puro.
 */
import { db } from '$lib/config/db-config';
import { calcularEstadisticas, calcularForecast, FACTORES_SEGURIDAD, type Lt } from '$lib/services/forecast-core';

export function fusionarCalculosReemplazo(codigoProcesamiento: string) {
	const inicio = Date.now();

	// 1. Obtener todos los grupos válidos (ignoramos los de estado 'revisar')
	const filas = db.prepare(`
		SELECT * FROM forecast_procesamiento
		WHERE codigo_procesamiento = ? AND reemplazo_estado IN ('reemplazo', 'reemplazado')
	`).all(codigoProcesamiento) as any[];

	const grupos = new Map<string, any[]>();
	for (const f of filas) {
		if (!f.reemplazo_grupo) continue;
		if (!grupos.has(f.reemplazo_grupo)) grupos.set(f.reemplazo_grupo, []);
		grupos.get(f.reemplazo_grupo)!.push(f);
	}

	// Consulta dinámica para agrupar ventas de varios SKUs por mes
	const stmtVentas = db.prepare(`
		SELECT 
			CAST(substr(fecha, 1, 4) AS INTEGER) as año, 
			CAST(substr(fecha, 6, 2) AS INTEGER) as mes, 
			SUM(cantidad) as cantidad
		FROM ventas_mensuales
		WHERE sku_codigo IN (SELECT value FROM json_each(?))
		GROUP BY año, mes
	`);

	const updateVigente = db.prepare(`
		UPDATE forecast_procesamiento SET
			existencia = ?, transito = ?, abc_rotacion_frecuencia = ?,
			frecuencia_ventas_12m = ?, venta_ultimos_12m = ?, promedio_12m = ?,
			promedio_6m = ?, promedio_ajustado = ?, desviacion_estandar = ?,
			coeficiente_variacion = ?, factor_seguridad = ?, stock_seguridad = ?,
			referencia_pedido_courier = ?, referencia_pedido_aereo = ?, referencia_pedido_maritimo = ?,
			cantidad_courier = ?, mensaje_courier = ?, cantidad_final_courier = ?,
			cantidad_aereo = ?, mensaje_aereo = ?, cantidad_final_aereo = ?,
			cantidad_maritimo = ?, mensaje_maritimo = ?, cantidad_final_maritimo = ?
		WHERE codigo_procesamiento = ? AND codigo_sku = ?
	`);

	const apagarViejo = db.prepare(`
		UPDATE forecast_procesamiento SET
			venta_ultimos_12m = 0, promedio_12m = 0, promedio_6m = 0,
			promedio_ajustado = 0, desviacion_estandar = 0, coeficiente_variacion = 0,
			stock_seguridad = 0, referencia_pedido_courier = 0, referencia_pedido_aereo = 0,
			referencia_pedido_maritimo = 0, cantidad_courier = 0, cantidad_final_courier = 0,
			cantidad_aereo = 0, cantidad_final_aereo = 0, cantidad_maritimo = 0,
			cantidad_final_maritimo = 0, mensaje_courier = '', mensaje_aereo = '', mensaje_maritimo = ''
		WHERE codigo_procesamiento = ? AND codigo_sku = ?
	`);

	let gruposFusionados = 0;

	db.transaction(() => {
		for (const [, items] of grupos.entries()) {
			const vigente = items.find((i) => i.reemplazo_estado === 'reemplazo');
			const viejos = items.filter((i) => i.reemplazo_estado === 'reemplazado');

			if (!vigente || viejos.length === 0) continue;

			let sumExistencia = vigente.existencia || 0;
			let sumTransito = vigente.transito || 0;
			const codigosGrupo = [vigente.codigo_sku];

			for (const viejo of viejos) {
				sumExistencia += viejo.existencia || 0;
				sumTransito += viejo.transito || 0;
				codigosGrupo.push(viejo.codigo_sku);
				apagarViejo.run(codigoProcesamiento, viejo.codigo_sku);
			}

			// Historial fusionado exacto
			const ventasFusionadas = stmtVentas.all(JSON.stringify(codigosGrupo)) as any[];

			// Recalcular todo
			const stats = calcularEstadisticas(ventasFusionadas);
			const factorSeg = FACTORES_SEGURIDAD[stats.abcRotacion] || 0;

			// Reutilizar el LT que ya tenía el vigente (respeta marcas y config originales)
			const ltAplicado: Lt = {
				lt_courier: vigente.lt_courier_usado || 0,
				lt_aereo: vigente.lt_aereo_usado || 0,
				lt_maritimo: vigente.lt_maritimo_usado || 0,
				meses_pedido: vigente.meses_pedido_usado || 0
			};

			const forecast = calcularForecast(
				stats,
				factorSeg,
				{ existencia: sumExistencia, transito: sumTransito },
				ltAplicado
			);

			updateVigente.run(
				sumExistencia, sumTransito, stats.abcRotacion,
				stats.frecuencia, stats.total, stats.prom12,
				stats.prom6, stats.promAjustado, stats.desviacion,
				stats.cv, factorSeg, forecast.stockSeguridad,
				forecast.refCourier, forecast.refAereo, forecast.refMaritimo,
				forecast.cantCourier.cantidad, forecast.cantCourier.mensaje, forecast.cantCourier.cantidadFinal,
				forecast.cantAereo.cantidad, forecast.cantAereo.mensaje, forecast.cantAereo.cantidadFinal,
				forecast.cantMaritimo.cantidad, forecast.cantMaritimo.mensaje, forecast.cantMaritimo.cantidadFinal,
				codigoProcesamiento, vigente.codigo_sku
			);

			gruposFusionados++;
		}
	})();

	const dur = ((Date.now() - inicio) / 1000).toFixed(1);
	console.log(`[fusión] 🧬 ${codigoProcesamiento}: ${gruposFusionados} grupos fusionados con recálculo exacto (${dur}s)`);
}