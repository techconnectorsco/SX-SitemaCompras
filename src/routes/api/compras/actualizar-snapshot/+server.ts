/**
 * POST /api/compras/actualizar-snapshot
 * Refresca EN SITIO el procesamiento indicado (mismo codigo_procesamiento) y
 * emite el progreso por Server-Sent Events, IGUAL que /api/admin/procesar-forecast.
 *
 * Vuelve a traer de Exactus, recalcula con forecast-core y hace UPSERT pisando
 * SOLO columnas de sistema. NUNCA toca los campos del analista
 * (sugerido_analista_*, comentario_analista, usuario/fecha_modificacion).
 * No crea un procesamiento nuevo. No borra SKUs que ya no aparezcan.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { createDataSource } from '$lib/services/data-source-factory';
import { AuditService } from '$lib/features/security/services/audit-service';
import { ejecutarSnapshot, registrarCorrida } from '$lib/services/forecast-snapshot.server';
import {
	FACTORES_SEGURIDAD,
	LT_RESPALDO,
	resolverClaveLt,
	calcularEstadisticas,
	calcularForecast,
	type Lt
} from '$lib/services/forecast-core';
import { detectarYMarcarReemplazos } from '$lib/services/reemplazos-detector.server';
import { fusionarCalculosReemplazo } from '$lib/services/fusionar-reemplazos.server';
import { env } from '$env/dynamic/private';


const CRON_SECRET = env.CRON_SECRET || ''

const BATCH_SIZE = 500;

export const POST: RequestHandler = async ({ request, locals }) => {
	// Puerta para automatización: Python entra con el token; humanos con su sesión.
	const isCron = !!CRON_SECRET && request.headers.get('x-cron-secret') === CRON_SECRET;
	const sessionUser = locals.user || locals.session?.user;
	if (!sessionUser && !isCron) return json({ error: 'No autenticado' }, { status: 401 });

	// Usuario efectivo para la auditoría (real o sistema)
	const user = sessionUser ?? { id: 'SISTEMA_AUTOMATICO', email: 'SISTEMA_AUTOMATICO', name: 'SISTEMA_AUTOMATICO', role: 'ADMIN' } as any;

	// Leer y validar el body ANTES de abrir el stream
	let codigoProcesamiento = '';
	try {
		const body = await request.json();
		codigoProcesamiento = String(body?.codigoProcesamiento || '').trim();
	} catch {
		return json({ error: 'Body inválido' }, { status: 400 });
	}
	// Python puede mandar 'LATEST' para refrescar el último procesamiento vigente
	if (codigoProcesamiento.toUpperCase() === 'LATEST') {
		const ultimo = db.prepare(`
			SELECT codigo_procesamiento
			FROM forecast_procesamiento
			WHERE codigo_procesamiento IS NOT NULL AND codigo_procesamiento != ''
			ORDER BY fecha_procesamiento DESC
			LIMIT 1
		`).get() as { codigo_procesamiento: string } | undefined;
		if (!ultimo) return json({ error: 'No hay procesamientos para actualizar' }, { status: 400 });
		codigoProcesamiento = ultimo.codigo_procesamiento;
	}

	if (!codigoProcesamiento) {
		return json({ error: 'codigoProcesamiento requerido' }, { status: 400 });
	}

	// Validar que exista y traer su identidad ORIGINAL (no se toca)
	const cab = db.prepare(`
		SELECT fecha_procesamiento, usuario_procesamiento
		FROM forecast_procesamiento
		WHERE codigo_procesamiento = ?
		LIMIT 1
	`).get(codigoProcesamiento) as { fecha_procesamiento: any; usuario_procesamiento: string } | undefined;

	if (!cab) {
		return json({ error: `Procesamiento ${codigoProcesamiento} no encontrado` }, { status: 404 });
	}

	const ahora = new Date().toISOString();
	const usuarioActual = user.email || user.name || 'Analista';

	AuditService.log(user.id, 'FORECAST_SNAPSHOT_UPDATE_START', 'unknown', 'VYOWEB-App',
		`Actualización de snapshot iniciada para ${codigoProcesamiento} por ${usuarioActual}`);

	// ===== STREAM DE PROGRESO (SSE), igual que el orchestrator =====
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			const sendEvent = (data: any) => {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
			};

			const tiempoInicio = Date.now();
			const dataSource = createDataSource();

			try {
				sendEvent({ type: 'progress', mensaje: 'Cargando histórico de ventas...', procesados: 0, total: 0, codigoProcesamiento });
				if (typeof (dataSource as any).cargarVentasHistoricasEnBD === 'function') {
					await (dataSource as any).cargarVentasHistoricasEnBD();
				}

				sendEvent({ type: 'progress', mensaje: 'Cargando artículos...', procesados: 0, total: 0, codigoProcesamiento });
				const todosArticulos = await dataSource.getArticulos();
				const totalArticulos = todosArticulos.length;

				// Config L.T. + bodegas excluidas (igual que el orchestrator)
				const marcasLtRegistros = db.prepare(
					'SELECT clave, lt_courier, lt_aereo, lt_maritimo, meses_pedido FROM marcas_lt_config WHERE activo = 1'
				).all() as any[];
				const marcasLtMap = new Map<string, Lt>(
					marcasLtRegistros.map((m) => [
						String(m.clave).toUpperCase().trim(),
						{
							lt_courier: Number(m.lt_courier),
							lt_aereo: Number(m.lt_aereo),
							lt_maritimo: Number(m.lt_maritimo),
							meses_pedido: Number(m.meses_pedido)
						}
					])
				);
				const defaultLt: Lt = marcasLtMap.get('__DEFAULT__') || LT_RESPALDO;

				const bodegasExcluidas = (db.prepare('SELECT bodega_codigo FROM bodegas WHERE excluida = 1').all() as any[])
					.map((b) => b.bodega_codigo);

				// UPDATE solo columnas de SISTEMA (48 SET + 2 WHERE)
				const updateStmt = db.prepare(`
					UPDATE forecast_procesamiento SET
						codigo_proveedor = ?, descripcion = ?, categoria = ?, linea = ?, marca = ?,
						abc = ?, abc_rotacion_frecuencia = ?, activo = ?, existencia = ?, transito = ?,
						frecuencia_ventas_12m = ?, venta_ultimos_12m = ?, promedio_12m = ?, promedio_6m = ?,
						promedio_ajustado = ?, desviacion_estandar = ?, coeficiente_variacion = ?,
						factor_seguridad = ?, stock_seguridad = ?,
						referencia_pedido_courier = ?, referencia_pedido_aereo = ?, referencia_pedido_maritimo = ?,
						cantidad_courier = ?, mensaje_courier = ?, cantidad_final_courier = ?,
						cantidad_aereo = ?, mensaje_aereo = ?, cantidad_final_aereo = ?,
						cantidad_maritimo = ?, mensaje_maritimo = ?, cantidad_final_maritimo = ?,
						costo_prom_loc = ?, costo_prom_dol = ?, costo_ult_loc = ?, costo_ult_dol = ?,
						costo_std_loc = ?, costo_std_dol = ?, costo_comparativo = ?, costo_fiscal = ?,
						costo_prom_comparativo_loc = ?,
						fecha_creacion = ?, ultima_salida = ?, ultimo_movimiento = ?,
						lt_courier_usado = ?, lt_aereo_usado = ?, lt_maritimo_usado = ?, meses_pedido_usado = ?,
						fecha_actualizacion_snapshot = ?
					WHERE codigo_procesamiento = ? AND codigo_sku = ?
				`);

				// INSERT para SKUs NUEVOS (sugeridos del analista nacen en 0/'')
				const insertStmt = db.prepare(`
					INSERT INTO forecast_procesamiento (
						codigo_procesamiento, fecha_procesamiento, usuario_procesamiento, codigo_sku,
						codigo_proveedor, descripcion, categoria, linea, marca, abc, abc_rotacion_frecuencia,
						activo, existencia, transito, lead_time, meses_pedido,
						frecuencia_ventas_12m, venta_ultimos_12m, promedio_12m, promedio_6m,
						promedio_ajustado, desviacion_estandar, coeficiente_variacion,
						factor_seguridad, stock_seguridad, referencia_pedido_courier,
						referencia_pedido_aereo, referencia_pedido_maritimo,
						cantidad_courier, mensaje_courier, cantidad_final_courier,
						cantidad_aereo, mensaje_aereo, cantidad_final_aereo,
						cantidad_maritimo, mensaje_maritimo, cantidad_final_maritimo,
						usuario_modificacion, fecha_modificacion,
						costo_prom_loc, costo_prom_dol, costo_ult_loc, costo_ult_dol,
						costo_std_loc, costo_std_dol, costo_comparativo, costo_fiscal,
						costo_prom_comparativo_loc,
						fecha_creacion, ultima_salida, ultimo_movimiento,
						lt_courier_usado, lt_aereo_usado, lt_maritimo_usado, meses_pedido_usado,
						sugerido_analista_urgente, sugerido_analista_aereo, sugerido_analista_maritimo,
						comentario_analista, fecha_actualizacion_snapshot
					) VALUES (
						?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
						?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
						?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
						?, ?, ?, ?, ?, ?, ?,
						0, 0, 0, '', ?
					)
				`);

				const existeStmt = db.prepare(
					'SELECT 1 FROM forecast_procesamiento WHERE codigo_procesamiento = ? AND codigo_sku = ?'
				);

				sendEvent({ type: 'progress', mensaje: `Actualizando ${totalArticulos.toLocaleString()} SKUs...`, procesados: 0, total: totalArticulos, codigoProcesamiento });

				let actualizados = 0;
				let insertados = 0;
				let totalProcesados = 0;
				const totalBatches = Math.ceil(totalArticulos / BATCH_SIZE);

				for (let b = 0; b < totalBatches; b++) {
					const lote = todosArticulos.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
					const codigosLote = lote.map((a) => a.codigo);

					const [existenciasMap, abcMap, ventasMap] = await Promise.all([
						dataSource.getExistenciasConExclusiones(codigosLote, bodegasExcluidas),
						dataSource.getClasificacionesABC(codigosLote),
						dataSource.getVentas12Meses(codigosLote)
					]);

					const tx = db.transaction(() => {
						for (const articulo of lote) {
							const codigo = articulo.codigo;
							const existenciaData = existenciasMap.get(codigo) || { existencia: 0, transito: 0 };
							const abc = abcMap.get(codigo) || 'N/D';
							const ventas = ventasMap.get(codigo) || [];

							const stats = calcularEstadisticas(ventas);
							const factorSeg = FACTORES_SEGURIDAD[stats.abcRotacion] || 0;
							const clave = resolverClaveLt(articulo.marca, articulo.linea);
							const ltAplicado = marcasLtMap.get(clave) || defaultLt;
							const f = calcularForecast(stats, factorSeg, existenciaData, ltAplicado);

							if (existeStmt.get(codigoProcesamiento, codigo)) {
								updateStmt.run(
									articulo.proveedor || '', articulo.descripcion || '', articulo.categoria || '',
									articulo.linea || '', articulo.marca || '',
									abc, stats.abcRotacion, articulo.activo ? 1 : 0, existenciaData.existencia, existenciaData.transito,
									stats.frecuencia, stats.total, stats.prom12, stats.prom6,
									stats.promAjustado, stats.desviacion, stats.cv,
									factorSeg, f.stockSeguridad,
									f.refCourier, f.refAereo, f.refMaritimo,
									f.cantCourier.cantidad, f.cantCourier.mensaje, f.cantCourier.cantidadFinal,
									f.cantAereo.cantidad, f.cantAereo.mensaje, f.cantAereo.cantidadFinal,
									f.cantMaritimo.cantidad, f.cantMaritimo.mensaje, f.cantMaritimo.cantidadFinal,
									articulo.costo_prom_loc || 0, articulo.costo_prom_dol || 0, articulo.costo_ult_loc || 0, articulo.costo_ult_dol || 0,
									articulo.costo_std_loc || 0, articulo.costo_std_dol || 0, articulo.costo_comparativo || 0, articulo.costo_fiscal || 0,
									articulo.costo_prom_comparativo_loc || 0,
									articulo.fecha_creacion || null, articulo.ultima_salida || null, articulo.ultimo_movimiento || null,
									f.ltUsado.courier, f.ltUsado.aereo, f.ltUsado.maritimo, f.ltUsado.mesesPedido,
									ahora,
									codigoProcesamiento, codigo
								);
								actualizados++;
							} else {
								insertStmt.run(
									codigoProcesamiento, cab.fecha_procesamiento, cab.usuario_procesamiento, codigo,
									articulo.proveedor || '', articulo.descripcion || '', articulo.categoria || '',
									articulo.linea || '', articulo.marca || '', abc, stats.abcRotacion,
									articulo.activo ? 1 : 0, existenciaData.existencia, existenciaData.transito, 30, '1',
									stats.frecuencia, stats.total, stats.prom12, stats.prom6,
									stats.promAjustado, stats.desviacion, stats.cv,
									factorSeg, f.stockSeguridad, f.refCourier,
									f.refAereo, f.refMaritimo,
									f.cantCourier.cantidad, f.cantCourier.mensaje, f.cantCourier.cantidadFinal,
									f.cantAereo.cantidad, f.cantAereo.mensaje, f.cantAereo.cantidadFinal,
									f.cantMaritimo.cantidad, f.cantMaritimo.mensaje, f.cantMaritimo.cantidadFinal,
									usuarioActual, ahora,
									articulo.costo_prom_loc || 0, articulo.costo_prom_dol || 0, articulo.costo_ult_loc || 0, articulo.costo_ult_dol || 0,
									articulo.costo_std_loc || 0, articulo.costo_std_dol || 0, articulo.costo_comparativo || 0, articulo.costo_fiscal || 0,
									articulo.costo_prom_comparativo_loc || 0,
									articulo.fecha_creacion || null, articulo.ultima_salida || null, articulo.ultimo_movimiento || null,
									f.ltUsado.courier, f.ltUsado.aereo, f.ltUsado.maritimo, f.ltUsado.mesesPedido,
									ahora
								);
								insertados++;
							}
						}
					});
					tx();

					totalProcesados += lote.length;
					sendEvent({
						type: 'progress',
						mensaje: `Actualizando lote ${b + 1} de ${totalBatches}...`,
						procesados: totalProcesados,
						total: totalArticulos,
						codigoProcesamiento
					});
				}

				const duracionForecastSeg = (Date.now() - tiempoInicio) / 1000;

				// 🔗 Re-detectar y re-fusionar tras haber actualizado todos los números individuales
				try {
					detectarYMarcarReemplazos(codigoProcesamiento);
					fusionarCalculosReemplazo(codigoProcesamiento);
				} catch (e) {
					console.error('[reemplazos-snapshot] ❌ (no detiene actualización):', e);
				}

				// Rehacer la "foto" adicional SIN duplicar: borrar del código y re-ejecutar
				sendEvent({ type: 'progress', mensaje: 'Actualizando datos de bodegas, pedidos y proveedores...', procesados: totalProcesados, total: totalArticulos, codigoProcesamiento });

				db.prepare('DELETE FROM forecast_existencia_bodega WHERE codigo_procesamiento = ?').run(codigoProcesamiento);
				db.prepare('DELETE FROM forecast_pedidos WHERE codigo_procesamiento = ?').run(codigoProcesamiento);
				db.prepare('DELETE FROM forecast_proveedor_desempeno WHERE codigo_procesamiento = ?').run(codigoProcesamiento);

				let resultadoSnapshot;
				try {
					resultadoSnapshot = await ejecutarSnapshot(dataSource, codigoProcesamiento);
				} catch (e) {
					resultadoSnapshot = {
						estado: 'error' as const,
						detalle: e instanceof Error ? e.message : String(e),
						filasBodega: 0, filasPedidos: 0, filasProveedor: 0, duracionSeg: 0
					};
				}

				registrarCorrida({
					codigoProcesamiento,
					fechaProcesamiento: String(cab.fecha_procesamiento),
					usuarioProcesamiento: cab.usuario_procesamiento,
					totalSkus: actualizados + insertados,
					duracionForecastSeg,
					snapshot: resultadoSnapshot
				});

				try { await dataSource.close(); } catch { /* noop */ }

				AuditService.log(user.id, 'FORECAST_SNAPSHOT_UPDATE', 'unknown', 'VYOWEB-App',
					`Snapshot actualizado ${codigoProcesamiento}: ${actualizados} actualizados, ${insertados} nuevos`);

				const tiempoTotal = ((Date.now() - tiempoInicio) / 1000).toFixed(1);
				console.log(`[actualizar-snapshot] ✅ ${codigoProcesamiento}: ${actualizados} act., ${insertados} nuevos, snapshot ${resultadoSnapshot.estado} (${tiempoTotal}s)`);

				sendEvent({
					type: 'complete',
					codigoProcesamiento,
					actualizados,
					insertados,
					fechaActualizacionSnapshot: ahora,
					snapshot: resultadoSnapshot.estado,
					tiempoTotal: `${tiempoTotal}s`
				});

				controller.close();
			} catch (error) {
				try { await dataSource.close(); } catch { /* noop */ }
				console.error('[actualizar-snapshot] ❌', error);
				AuditService.log(user.id, 'FORECAST_SNAPSHOT_UPDATE_ERROR', 'unknown', 'VYOWEB-App',
					`Error actualizando ${codigoProcesamiento}: ${error instanceof Error ? error.message : 'desconocido'}`);
				sendEvent({ type: 'error', error: error instanceof Error ? error.message : 'Error desconocido', codigoProcesamiento });
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
};