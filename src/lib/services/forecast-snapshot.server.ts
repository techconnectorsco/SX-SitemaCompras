/**
 * ============================================================================
 * SNAPSHOT DEL PROCESAMIENTO — guarda la "foto" adicional en SQLite
 * ============================================================================
 * Se llama al FINAL del procesamiento de forecast, después de que los SKUs ya
 * están guardados. Trae de Exactus (vía DataSource) y guarda en SQLite:
 *   - existencias por SKU y bodega (solo != 0)
 *   - líneas de pedido de los últimos N meses
 *   - desempeño por proveedor (calculado de las líneas de pedido)
 * Todo ligado al codigo_procesamiento.
 *
 * Es TOLERANTE A FALLOS: si algo falla, se registra el error en
 * forecast_corridas.snapshot_estado pero NO se lanza, para no afectar el
 * forecast ya guardado.
 */

import { db } from '$lib/config/db-config';

const MESES_PEDIDOS = 6;

interface ResultadoSnapshot {
	estado: 'ok' | 'parcial' | 'error';
	detalle: string;
	filasBodega: number;
	filasPedidos: number;
	filasProveedor: number;
	duracionSeg: number;
}

export async function ejecutarSnapshot(
	dataSource: any,
	codigoProcesamiento: string
): Promise<ResultadoSnapshot> {
	const inicio = Date.now();
	let filasBodega = 0;
	let filasPedidos = 0;
	let filasProveedor = 0;
	const errores: string[] = [];

	// ----- 1) Existencias por bodega -----
	try {
		if (typeof dataSource.getExistenciasPorBodega === 'function') {
			const existencias = await dataSource.getExistenciasPorBodega();
			const insert = db.prepare(`
				INSERT INTO forecast_existencia_bodega
					(codigo_procesamiento, codigo_sku, bodega_codigo, existencia, transito)
				VALUES (?, ?, ?, ?, ?)
			`);
			const insertMany = db.transaction((filas: any[]) => {
				for (const f of filas) {
					insert.run(codigoProcesamiento, f.articulo, f.bodega, f.disponible, f.transito);
				}
			});
			insertMany(existencias);
			filasBodega = existencias.length;
			console.log(`[Snapshot] ✅ Existencias por bodega: ${filasBodega} filas`);
		} else {
			errores.push('getExistenciasPorBodega no disponible en el DataSource');
		}
	} catch (e) {
		errores.push(`Existencias por bodega: ${e instanceof Error ? e.message : String(e)}`);
		console.error('[Snapshot] ❌ Existencias por bodega:', e);
	}

	// ----- 2) Pedidos (últimos 6 meses) -----
	let pedidos: any[] = [];
	try {
		if (typeof dataSource.getPedidosLineas === 'function') {
			pedidos = await dataSource.getPedidosLineas(MESES_PEDIDOS);
			const insert = db.prepare(`
				INSERT INTO forecast_pedidos (
					codigo_procesamiento, pedido, pedido_linea, codigo_sku, descripcion,
					proveedor, bodega_codigo, estado, fecha_prometida, fecha_entrega,
					cantidad_pedida, cantidad_facturada, cantidad_pendiente, cantidad_cancelada,
					precio_unitario, dias_diferencia
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);
			const insertMany = db.transaction((filas: any[]) => {
				for (const p of filas) {
					insert.run(
						codigoProcesamiento, p.pedido, p.pedidoLinea, p.articulo, p.descripcion,
						p.proveedor, p.bodega, p.estado, p.fechaPrometida, p.fechaEntrega,
						p.cantidadPedida, p.cantidadFacturada, p.cantidadPendiente, p.cantidadCancelada,
						p.precioUnitario, p.diasDiferencia
					);
				}
			});
			insertMany(pedidos);
			filasPedidos = pedidos.length;
			console.log(`[Snapshot] ✅ Pedidos: ${filasPedidos} líneas`);
		} else {
			errores.push('getPedidosLineas no disponible en el DataSource');
		}
	} catch (e) {
		errores.push(`Pedidos: ${e instanceof Error ? e.message : String(e)}`);
		console.error('[Snapshot] ❌ Pedidos:', e);
	}

	// ----- 3) Desempeño por proveedor (calculado de los pedidos) -----
	try {
		if (pedidos.length > 0) {
			const porProveedor = calcularDesempenoProveedor(pedidos);
			const insert = db.prepare(`
				INSERT INTO forecast_proveedor_desempeno (
					codigo_procesamiento, proveedor, lineas_totales, cantidad_pedida,
					cantidad_facturada, cantidad_cancelada, fill_rate, lead_time_promedio,
					entregas_a_tiempo, entregas_retrasadas, porcentaje_a_tiempo
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);
			const insertMany = db.transaction((filas: any[]) => {
				for (const d of filas) {
					insert.run(
						codigoProcesamiento, d.proveedor, d.lineasTotales, d.cantidadPedida,
						d.cantidadFacturada, d.cantidadCancelada, d.fillRate, d.leadTimePromedio,
						d.entregasATiempo, d.entregasRetrasadas, d.porcentajeATiempo
					);
				}
			});
			insertMany(porProveedor);
			filasProveedor = porProveedor.length;
			console.log(`[Snapshot] ✅ Desempeño de proveedor: ${filasProveedor} proveedores`);
		}
	} catch (e) {
		errores.push(`Proveedor: ${e instanceof Error ? e.message : String(e)}`);
		console.error('[Snapshot] ❌ Desempeño de proveedor:', e);
	}

	const duracionSeg = (Date.now() - inicio) / 1000;

	let estado: 'ok' | 'parcial' | 'error';
	if (errores.length === 0) estado = 'ok';
	else if (filasBodega > 0 || filasPedidos > 0) estado = 'parcial';
	else estado = 'error';

	return {
		estado,
		detalle: errores.join(' | ') || 'Snapshot completo',
		filasBodega,
		filasPedidos,
		filasProveedor,
		duracionSeg
	};
}

/** Agrupa las líneas de pedido por proveedor y calcula los KPIs de desempeño. */
function calcularDesempenoProveedor(pedidos: any[]) {
	const mapa = new Map<string, any>();

	for (const p of pedidos) {
		const prov = p.proveedor || 'SIN_PROVEEDOR';
		if (!mapa.has(prov)) {
			mapa.set(prov, {
				proveedor: prov,
				lineasTotales: 0,
				cantidadPedida: 0,
				cantidadFacturada: 0,
				cantidadCancelada: 0,
				sumaDias: 0,
				lineasConFecha: 0,
				entregasATiempo: 0,
				entregasRetrasadas: 0
			});
		}
		const d = mapa.get(prov);
		d.lineasTotales++;
		d.cantidadPedida += p.cantidadPedida || 0;
		d.cantidadFacturada += p.cantidadFacturada || 0;
		d.cantidadCancelada += p.cantidadCancelada || 0;
		if (p.diasDiferencia != null) {
			d.sumaDias += p.diasDiferencia;
			d.lineasConFecha++;
			if (p.diasDiferencia <= 0) d.entregasATiempo++;
			else d.entregasRetrasadas++;
		}
	}

	return [...mapa.values()].map((d) => {
		const fillRate = d.cantidadPedida > 0 ? (d.cantidadFacturada / d.cantidadPedida) * 100 : 0;
		const leadTimePromedio = d.lineasConFecha > 0 ? d.sumaDias / d.lineasConFecha : 0;
		const porcentajeATiempo = d.lineasConFecha > 0 ? (d.entregasATiempo / d.lineasConFecha) * 100 : 0;
		return {
			proveedor: d.proveedor,
			lineasTotales: d.lineasTotales,
			cantidadPedida: Math.round(d.cantidadPedida),
			cantidadFacturada: Math.round(d.cantidadFacturada),
			cantidadCancelada: Math.round(d.cantidadCancelada),
			fillRate: Math.round(fillRate * 100) / 100,
			leadTimePromedio: Math.round(leadTimePromedio * 10) / 10,
			entregasATiempo: d.entregasATiempo,
			entregasRetrasadas: d.entregasRetrasadas,
			porcentajeATiempo: Math.round(porcentajeATiempo * 100) / 100
		};
	});
}

/** Registra/actualiza la corrida con los tiempos y el estado del snapshot. */
export function registrarCorrida(args: {
	codigoProcesamiento: string;
	fechaProcesamiento: string;
	usuarioProcesamiento: string;
	totalSkus: number;
	duracionForecastSeg: number;
	snapshot: ResultadoSnapshot;
}): void {
	try {
		const totalSeg = args.duracionForecastSeg + args.snapshot.duracionSeg;
		db.prepare(`
			INSERT INTO forecast_corridas (
				codigo_procesamiento, fecha_procesamiento, usuario_procesamiento, total_skus,
				duracion_forecast_seg, duracion_snapshot_seg, duracion_total_seg,
				snapshot_estado, snapshot_detalle, filas_bodega, filas_pedidos, filas_proveedor
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(codigo_procesamiento) DO UPDATE SET
				duracion_forecast_seg = excluded.duracion_forecast_seg,
				duracion_snapshot_seg = excluded.duracion_snapshot_seg,
				duracion_total_seg = excluded.duracion_total_seg,
				snapshot_estado = excluded.snapshot_estado,
				snapshot_detalle = excluded.snapshot_detalle,
				filas_bodega = excluded.filas_bodega,
				filas_pedidos = excluded.filas_pedidos,
				filas_proveedor = excluded.filas_proveedor
		`).run(
			args.codigoProcesamiento, args.fechaProcesamiento, args.usuarioProcesamiento, args.totalSkus,
			args.duracionForecastSeg, args.snapshot.duracionSeg, totalSeg,
			args.snapshot.estado, args.snapshot.detalle,
			args.snapshot.filasBodega, args.snapshot.filasPedidos, args.snapshot.filasProveedor
		);
	} catch (e) {
		console.error('[Snapshot] ❌ No se pudo registrar la corrida:', e);
	}
}