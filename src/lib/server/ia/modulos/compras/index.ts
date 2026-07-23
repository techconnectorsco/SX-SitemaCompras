/**
 * ============================================================================
 * MÓDULO COMPRAS — DEFINICIÓN
 * ============================================================================
 * Registra las herramientas que la IA puede usar para el módulo de compras.
 * Cada herramienta resuelve el procesamiento (usa el de pantalla o el más
 * reciente) y delega en la capa de cálculo determinista.
 */

import type { ModuloIA, ContextoHerramienta } from '../../tipos';
import * as calc from './calculos';
import { ESQUEMA_NEGOCIO } from './esquema';
import { ejecutarConsultaSegura, TABLAS_PERMITIDAS } from '../../sql-seguro';

// Resuelve el procesamiento a usar: argumento explícito > pantalla > más reciente.
function resolverProc(
	args: Record<string, unknown>,
	ctx: ContextoHerramienta
): string | null {
	const explicito = typeof args.codigoProcesamiento === 'string' ? args.codigoProcesamiento : undefined;
	const dePantalla = ctx.pantalla?.codigoProcesamiento;
	return calc.procActualOReciente(ctx.db, explicito || dePantalla);
}

const PROP_PROC = {
	type: 'string' as const,
	description:
		'Código del procesamiento (PROC-YYYYMMDD-HHMMSS). Si se omite, se usa el más reciente.'
};

const PROP_LIMITE = {
	type: 'integer' as const,
	description: 'Cantidad máxima de resultados (por defecto 10).'
};

export const moduloCompras: ModuloIA = {
	id: 'compras',
	nombre: 'Compras',
	permisosRequeridos: ['compras'],
	contextoSistema: `
Este módulo analiza el forecast de compras (tabla forecast_procesamiento). Cada "procesamiento"
es una corrida identificada por su código y contiene una fila por SKU con: existencia, tránsito,
demanda (promedios 6m/12m/ajustado), stock de seguridad, lead time, clasificación ABC, costos y
las cantidades sugeridas de compra por método (courier, aéreo, marítimo).
El veredicto, el riesgo y la confianza ya vienen calculados por las herramientas: presentalos, no los recalcules.
Por defecto trabajá sobre el procesamiento más reciente salvo que el usuario indique otro.`,
	herramientas: [
		{
			nombre: 'listar_procesamientos',
			descripcion: 'Lista los procesamientos de forecast disponibles, del más reciente al más antiguo, con su fecha y cantidad de SKUs. Útil cuando el usuario quiere elegir o comparar corridas.',
			parametros: { type: 'object', properties: { limite: PROP_LIMITE } },
			ejecutar: async (args, ctx) =>
				calc.listarProcesamientos(ctx.db, (args.limite as number) || 10)
		},
		{
			nombre: 'analizar_sku',
			descripcion: 'Analiza un SKU específico y devuelve la recomendación completa (comprar/no/esperar/revisar), cantidad sugerida, justificación con datos, riesgo y confianza. Usar para "¿por qué recomiendas esta cantidad?", "¿qué pasa con este producto?".',
			parametros: {
				type: 'object',
				properties: {
					codigoSku: { type: 'string', description: 'Código del SKU a analizar.' },
					codigoProcesamiento: PROP_PROC
				},
				required: ['codigoSku']
			},
			ejecutar: async (args, ctx) => {
				const proc = resolverProc(args, ctx);
				if (!proc) return { error: 'No hay procesamientos disponibles.' };
				const sku = (args.codigoSku as string) || ctx.pantalla?.codigoSku || '';
				if (!sku) return { error: 'Falta indicar el SKU.' };
				return calc.analizarSku(ctx.db, proc, sku);
			}
		},
		{
			nombre: 'riesgos_quiebre',
			descripcion: 'Devuelve los SKUs con mayor riesgo de quiebre de stock, ordenados por severidad. Usar para "¿dónde tengo mayor riesgo de quiebre?".',
			parametros: { type: 'object', properties: { codigoProcesamiento: PROP_PROC, limite: PROP_LIMITE } },
			ejecutar: async (args, ctx) => {
				const proc = resolverProc(args, ctx);
				if (!proc) return { error: 'No hay procesamientos disponibles.' };
				return calc.riesgosQuiebre(ctx.db, proc, (args.limite as number) || 10);
			}
		},
		{
			nombre: 'dinero_inmovilizado',
			descripcion: 'Devuelve los SKUs con sobrestock o sin movimiento que inmovilizan capital, con el monto aproximado. Usar para "¿dónde estoy inmovilizando dinero?", "¿qué SKUs no debería comprar?".',
			parametros: { type: 'object', properties: { codigoProcesamiento: PROP_PROC, limite: PROP_LIMITE } },
			ejecutar: async (args, ctx) => {
				const proc = resolverProc(args, ctx);
				if (!proc) return { error: 'No hay procesamientos disponibles.' };
				return calc.dineroInmovilizado(ctx.db, proc, (args.limite as number) || 10);
			}
		},
		{
			nombre: 'prioridades_compra',
			descripcion: 'Devuelve las compras a priorizar, ordenadas por severidad del riesgo. Usar para "¿qué compras debo priorizar hoy?".',
			parametros: { type: 'object', properties: { codigoProcesamiento: PROP_PROC, limite: PROP_LIMITE } },
			ejecutar: async (args, ctx) => {
				const proc = resolverProc(args, ctx);
				if (!proc) return { error: 'No hay procesamientos disponibles.' };
				return calc.prioridadesCompra(ctx.db, proc, (args.limite as number) || 10);
			}
		},
		{
			nombre: 'crecimiento_decrecimiento',
			descripcion: 'Devuelve los productos que están creciendo y decreciendo comparando la demanda reciente (6 meses) con la histórica (12 meses). Usar para "¿qué productos estamos creciendo y cuáles decreciendo?".',
			parametros: { type: 'object', properties: { codigoProcesamiento: PROP_PROC, limite: PROP_LIMITE } },
			ejecutar: async (args, ctx) => {
				const proc = resolverProc(args, ctx);
				if (!proc) return { error: 'No hay procesamientos disponibles.' };
				return calc.crecimientoDecrecimiento(ctx.db, proc, (args.limite as number) || 10);
			}
		},
		{
			nombre: 'sugerir_pedido',
			descripcion: 'Arma el pedido sugerido para un método de envío (courier, aéreo o marítimo) con líneas, cantidades y costo estimado. Usar para "armá el pedido", "qué debo pedir por marítimo".',
			parametros: {
				type: 'object',
				properties: {
					metodo: { type: 'string', enum: ['courier', 'aereo', 'maritimo'], description: 'Método de envío.' },
					codigoProcesamiento: PROP_PROC,
					limite: PROP_LIMITE
				},
				required: ['metodo']
			},
			ejecutar: async (args, ctx) => {
				const proc = resolverProc(args, ctx);
				if (!proc) return { error: 'No hay procesamientos disponibles.' };
				const metodo = args.metodo as 'courier' | 'aereo' | 'maritimo';
				return calc.sugerirPedido(ctx.db, proc, metodo, (args.limite as number) || 50);
			}
		},
		{
			nombre: 'analizar_pedido',
			descripcion: 'Compara el pedido de un comprador (por su id) contra la recomendación del sistema, señalando dónde pide de más, de menos o productos que no debería comprar.',
			parametros: {
				type: 'object',
				properties: {
					pedidoId: { type: 'integer', description: 'ID del pedido a analizar.' },
					codigoProcesamiento: PROP_PROC
				},
				required: ['pedidoId']
			},
			ejecutar: async (args, ctx) => {
				const proc = resolverProc(args, ctx);
				if (!proc) return { error: 'No hay procesamientos disponibles.' };
				return calc.analizarPedido(ctx.db, proc, args.pedidoId as number);
			}
		},
		{
			nombre: 'buscar_sku',
			descripcion: 'Busca SKUs por código o por texto en la descripción, dentro de un procesamiento. Usar cuando el usuario menciona un producto por nombre aproximado y no por código.',
			parametros: {
				type: 'object',
				properties: {
					texto: { type: 'string', description: 'Texto a buscar en código o descripción.' },
					codigoProcesamiento: PROP_PROC,
					limite: PROP_LIMITE
				},
				required: ['texto']
			},
			ejecutar: async (args, ctx) => {
				const proc = resolverProc(args, ctx);
				if (!proc) return { error: 'No hay procesamientos disponibles.' };
				return calc.buscarSku(ctx.db, proc, args.texto as string, (args.limite as number) || 10);
			}
		},
		{
			nombre: 'desempeno_proveedores',
			descripcion: 'Devuelve el desempeño de los proveedores en un procesamiento (fill rate, lead time real, % de entregas a tiempo, retrasos), ordenado del peor al mejor. Usar para "¿qué proveedores tienen problemas?", "¿cuál proveedor entrega tarde?".',
			parametros: { type: 'object', properties: { codigoProcesamiento: PROP_PROC, limite: PROP_LIMITE } },
			ejecutar: async (args, ctx) => {
				const proc = resolverProc(args, ctx);
				if (!proc) return { error: 'No hay procesamientos disponibles.' };
				return calc.desempenoProveedores(ctx.db, proc, (args.limite as number) || 20);
			}
		},
		{
			nombre: 'existencia_por_bodega',
			descripcion: 'Muestra cómo está distribuido el stock de un SKU entre las bodegas en un procesamiento. Usar para "¿dónde está el stock de este producto?", "impacto por bodega".',
			parametros: {
				type: 'object',
				properties: { codigoSku: { type: 'string', description: 'Código del SKU.' }, codigoProcesamiento: PROP_PROC },
				required: ['codigoSku']
			},
			ejecutar: async (args, ctx) => {
				const proc = resolverProc(args, ctx);
				if (!proc) return { error: 'No hay procesamientos disponibles.' };
				const sku = (args.codigoSku as string) || ctx.pantalla?.codigoSku || '';
				if (!sku) return { error: 'Falta indicar el SKU.' };
				return calc.existenciaPorBodega(ctx.db, proc, sku);
			}
		},
		{
			nombre: 'pedidos_pendientes',
			descripcion: 'Lista los pedidos pendientes (en tránsito, no facturados) de un procesamiento, opcionalmente filtrados por proveedor. Usar para "¿qué tengo en tránsito?", "pedidos pendientes del proveedor X".',
			parametros: {
				type: 'object',
				properties: {
					proveedor: { type: 'string', description: 'Proveedor a filtrar (opcional).' },
					codigoProcesamiento: PROP_PROC,
					limite: PROP_LIMITE
				}
			},
			ejecutar: async (args, ctx) => {
				const proc = resolverProc(args, ctx);
				if (!proc) return { error: 'No hay procesamientos disponibles.' };
				return calc.pedidosPendientes(ctx.db, proc, args.proveedor as string | undefined, (args.limite as number) || 50);
			}
		},
		{
			nombre: 'consultar_datos',
			descripcion:
				'Ejecuta una consulta SQL de SOLO LECTURA (SELECT) sobre las tablas de negocio para responder preguntas que las otras herramientas no cubren: conteos, totales, agrupaciones, rankings, promedios, comparaciones. Usar para preguntas como "total de productos por categoría", "cuántos SKUs activos hay", "ventas por mes", "productos más vendidos", "cuántos pedidos por proveedor". NO sirve para modificar datos. Si la consulta es rechazada, leé el error, corregí la consulta y volvé a intentar.\n\n' +
				ESQUEMA_NEGOCIO,
			parametros: {
				type: 'object',
				properties: {
					sql: {
						type: 'string',
						description:
							'Una única consulta SELECT (o WITH ... SELECT) sobre las tablas permitidas: ' +
							TABLAS_PERMITIDAS.join(', ') +
							'. Sin punto y coma intermedio, sin INSERT/UPDATE/DELETE/CREATE.'
					}
				},
				required: ['sql']
			},
			ejecutar: async (args, ctx) => {
				const sql = String(args.sql ?? '');
				const res = ejecutarConsultaSegura(ctx.db, sql);
				if (!res.ok) {
					// Devolver el error para que la IA corrija y reintente.
					return { error: res.error, sugerencia: 'Corregí la consulta según el error y volvé a intentar.' };
				}
				return {
					totalFilas: res.totalFilas,
					filas: res.filas,
					consultaEjecutada: res.consultaEjecutada
				};
			}
		}
	]
};