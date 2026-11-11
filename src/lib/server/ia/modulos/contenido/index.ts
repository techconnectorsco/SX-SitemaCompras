/**
 * ============================================================================
 * MÓDULO CONTENIDO — DEFINICIÓN
 * ============================================================================
 * Herramientas de BettiIA para el Creador de Contenido. Reutilizan los
 * servicios del módulo y siempre operan con el userId del usuario autenticado.
 * Las herramientas que escriben exigen `confirmado: true`.
 */

import type { ModuloIA, HerramientaIA } from '../../tipos';
import * as calc from '../compras/calculos';
import { PublicacionService } from '$lib/features/content-creator/services/publicacion-service';
import { DashboardService } from '$lib/features/content-creator/services/dashboard-service';
import { CatalogoService } from '$lib/features/content-creator/services/catalogo-service';
import { IAContentService } from '$lib/features/content-creator/services/ia-content-service';

const PROP_CONFIRMADO = {
	type: 'boolean' as const,
	description:
		'Solo true después de que el usuario confirmó explícitamente. Si se omite, no se ejecuta nada y se devuelve un resumen para confirmar.'
};

const num = (v: unknown): number => Number(v);

/** Envuelve una acción de escritura: sin `confirmado` devuelve el resumen y no ejecuta. */
function conConfirmacion(
	resumen: (args: Record<string, unknown>) => string,
	accion: (args: Record<string, unknown>, userId: string) => Promise<unknown> | unknown
): HerramientaIA['ejecutar'] {
	return async (args, ctx) => {
		if (args.confirmado !== true) {
			return { requiereConfirmacion: true, resumen: resumen(args) };
		}
		try {
			return await accion(args, ctx.usuario.userId);
		} catch (e) {
			return { error: e instanceof Error ? e.message : 'No se pudo completar la acción.' };
		}
	};
}

export const moduloContenido: ModuloIA = {
	id: 'contenido',
	nombre: 'Contenido',
	permisosRequeridos: ['contenido'],
	contextoSistema: `
Este módulo es el Creador de Contenido (publicaciones para redes sociales). Estados: Borrador, En revisión, Guardado, Aprobado, Publicado, Error API.
Solo ves las publicaciones del propio usuario.
REGLA DE CONFIRMACIÓN: crear_borrador, generar_copy, aprobar_publicacion y rechazar_publicacion NO se ejecutan sin confirmado=true. Primero llamalas sin ese campo, mostrale al usuario el resumen que devuelven, preguntale si confirma y solo con un "sí" explícito en su siguiente mensaje volvé a llamarlas con confirmado=true.
Para crear un borrador necesitás los ids de marca y cuenta: obtenelos con catalogos_contenido, no los inventes.
No podés publicar en redes ni generar imágenes: indicale al usuario que eso se hace desde la pantalla del Creador de Contenido.`,
	herramientas: [
		{
			nombre: 'listar_publicaciones',
			descripcion:
				'Lista las publicaciones del usuario con filtros opcionales. Usar para "¿qué publicaciones tengo en revisión?", "¿cuáles fallaron?" (estado Error API), "publicaciones de la campaña X".',
			parametros: {
				type: 'object',
				properties: {
					estado: {
						type: 'string',
						enum: ['Borrador', 'En revisión', 'Guardado', 'Aprobado', 'Publicado', 'Error API']
					},
					marcaId: { type: 'integer', description: 'Id de la marca.' },
					campana: { type: 'string', description: 'Texto a buscar en el nombre de campaña.' },
					limite: { type: 'integer', description: 'Máximo de resultados (por defecto 20).' }
				}
			},
			ejecutar: async (args, ctx) => {
				const lista = PublicacionService.getByUser(ctx.usuario.userId, {
					estado: args.estado as string | undefined,
					marca_id: args.marcaId as number | undefined,
					campana: args.campana as string | undefined
				});
				const limite = Math.min(Math.max(num(args.limite) || 20, 1), 50);
				return {
					total: lista.length,
					publicaciones: lista.slice(0, limite).map((p) => ({
						id: p.id,
						titulo: p.titulo,
						estado: p.estado,
						marca: p.marca,
						redes: p.redes,
						fechaProgramada: p.fecha_programada,
						error: p.api_error_log
					}))
				};
			}
		},
		{
			nombre: 'ver_publicacion',
			descripcion: 'Devuelve el detalle de una publicación (copy, estado, notas de revisión).',
			parametros: {
				type: 'object',
				properties: { id: { type: 'integer', description: 'Id de la publicación.' } },
				required: ['id']
			},
			ejecutar: async (args, ctx) =>
				PublicacionService.getById(num(args.id), ctx.usuario.userId) ?? {
					error: 'Publicación no encontrada.'
				}
		},
		{
			nombre: 'resumen_contenido',
			descripcion:
				'Resumen del Creador de Contenido: conteos por estado y consumo de IA (tokens y costo). Usar para "¿cuánto llevo gastado en IA?", "¿cómo va mi contenido?".',
			parametros: { type: 'object', properties: {} },
			ejecutar: async (_args, ctx) => ({
				estadisticas: DashboardService.getStats(ctx.usuario.userId),
				consumoIA: DashboardService.getConsumoIA(ctx.usuario.userId)
			})
		},
		{
			nombre: 'catalogos_contenido',
			descripcion:
				'Devuelve marcas, formatos, audiencias, redes y cuentas con sus ids. Usar antes de crear un borrador.',
			parametros: { type: 'object', properties: {} },
			ejecutar: async () => CatalogoService.getAllCatalogos()
		},
		{
			nombre: 'productos_para_promocionar',
			descripcion:
				'Productos con sobrestock o capital inmovilizado (datos de Compras) que conviene promocionar. Usar para "¿qué productos me conviene promocionar?".',
			parametros: {
				type: 'object',
				properties: { limite: { type: 'integer', description: 'Máximo de resultados (por defecto 10).' } }
			},
			ejecutar: async (args, ctx) => {
				if (!ctx.usuario.modulos.includes('compras')) {
					return { error: 'Necesitás acceso al módulo de Compras para consultar el inventario.' };
				}
				const proc = calc.procActualOReciente(ctx.db, ctx.pantalla?.codigoProcesamiento);
				if (!proc) return { error: 'No hay procesamientos disponibles.' };
				return calc.dineroInmovilizado(ctx.db, proc, num(args.limite) || 10);
			}
		},
		{
			nombre: 'crear_borrador',
			descripcion: 'Crea una publicación en estado Borrador. Requiere confirmación del usuario.',
			parametros: {
				type: 'object',
				properties: {
					titulo: { type: 'string' },
					cuentaId: { type: 'integer' },
					marcaId: { type: 'integer' },
					formatoId: { type: 'integer' },
					audienciaId: { type: 'integer' },
					contexto: { type: 'string', description: 'De qué trata la publicación.' },
					objetivo: { type: 'string' },
					cta: { type: 'string', description: 'Llamado a la acción.' },
					redesIds: { type: 'array', items: { type: 'integer' } },
					confirmado: PROP_CONFIRMADO
				},
				required: ['titulo', 'cuentaId', 'marcaId']
			},
			ejecutar: conConfirmacion(
				(a) => `Crear borrador "${a.titulo}" (marca ${a.marcaId}, cuenta ${a.cuentaId}).`,
				(a, userId) => {
					const id = PublicacionService.create(userId, {
						titulo: String(a.titulo),
						cuenta_id: num(a.cuentaId),
						marca_id: num(a.marcaId),
						formato_id: a.formatoId ? num(a.formatoId) : null,
						audiencia_id: a.audienciaId ? num(a.audienciaId) : null,
						contexto: (a.contexto as string) ?? null,
						objetivo: (a.objetivo as string) ?? null,
						cta: (a.cta as string) ?? null,
						redes_ids: Array.isArray(a.redesIds) ? a.redesIds.map(num) : [],
						estado: 'Borrador'
					});
					return { ok: true, id };
				}
			)
		},
		{
			nombre: 'generar_copy',
			descripcion:
				'Genera con IA el texto (copy) de una publicación existente, respetando el manual de la marca. Requiere confirmación y tiene costo de IA.',
			parametros: {
				type: 'object',
				properties: {
					id: { type: 'integer', description: 'Id de la publicación.' },
					prompt: { type: 'string', description: 'Indicaciones extra para el copy (opcional).' },
					confirmado: PROP_CONFIRMADO
				},
				required: ['id']
			},
			ejecutar: conConfirmacion(
				(a) => `Generar el copy con IA de la publicación ${a.id} (tiene costo de IA).`,
				async (a, userId) => ({
					ok: true,
					copy: await IAContentService.generarCopy(num(a.id), userId, (a.prompt as string) ?? null)
				})
			)
		},
		{
			nombre: 'aprobar_publicacion',
			descripcion: 'Aprueba una publicación (debe tener copy final). Requiere confirmación.',
			parametros: {
				type: 'object',
				properties: { id: { type: 'integer' }, confirmado: PROP_CONFIRMADO },
				required: ['id']
			},
			ejecutar: conConfirmacion(
				(a) => `Aprobar la publicación ${a.id}.`,
				(a, userId) => {
					const pub = PublicacionService.getById(num(a.id), userId);
					if (!pub) throw new Error('Publicación no encontrada.');
					if (!pub.copy_final?.trim())
						throw new Error('La publicación debe tener un copy final antes de aprobarse.');
					PublicacionService.aprobar(pub.id, userId);
					return { ok: true };
				}
			)
		},
		{
			nombre: 'rechazar_publicacion',
			descripcion: 'Rechaza una publicación con una nota explicando el motivo. Requiere confirmación.',
			parametros: {
				type: 'object',
				properties: {
					id: { type: 'integer' },
					notas: { type: 'string', description: 'Motivo del rechazo.' },
					confirmado: PROP_CONFIRMADO
				},
				required: ['id', 'notas']
			},
			ejecutar: conConfirmacion(
				(a) => `Rechazar la publicación ${a.id} con la nota: "${a.notas}".`,
				(a, userId) => {
					if (!PublicacionService.getById(num(a.id), userId))
						throw new Error('Publicación no encontrada.');
					PublicacionService.rechazar(num(a.id), userId, String(a.notas));
					return { ok: true };
				}
			)
		}
	]
};
