/**
 * Consultas de solo lectura del Creador de Contenido.
 *
 * Este módulo no usa SQL libre: cada herramienta selecciona explícitamente las
 * columnas que puede exponer y nunca toca credenciales, rutas de archivos ni
 * contenido binario.
 */

import type { ContextoHerramienta, ModuloIA } from '../../tipos';

const LIMITE_DEFECTO = 20;
const LIMITE_MAXIMO = 100;

function limite(args: Record<string, unknown>): number {
	const valor = Number(args.limite ?? LIMITE_DEFECTO);
	return Number.isInteger(valor) && valor > 0 ? Math.min(valor, LIMITE_MAXIMO) : LIMITE_DEFECTO;
}

function fecha(valor: unknown): number | undefined {
	const numero = Number(valor);
	return Number.isFinite(numero) && numero > 0 ? Math.floor(numero) : undefined;
}

function publicaciones(args: Record<string, unknown>, ctx: ContextoHerramienta) {
	const condiciones = ['p.deleted_at IS NULL'];
	const valores: Array<string | number> = [];
	const estado = typeof args.estado === 'string' ? args.estado.trim() : '';
	const marca = typeof args.marca === 'string' ? args.marca.trim() : '';
	const campana = typeof args.campana === 'string' ? args.campana.trim() : '';
	const buscar = typeof args.texto === 'string' ? args.texto.trim() : '';
	const desde = fecha(args.desde);
	const hasta = fecha(args.hasta);

	if (estado) {
		condiciones.push('p.estado = ?');
		valores.push(estado);
	}
	if (marca) {
		condiciones.push('m.nombre LIKE ?');
		valores.push(`%${marca}%`);
	}
	if (campana) {
		condiciones.push('p.campana LIKE ?');
		valores.push(`%${campana}%`);
	}
	if (buscar) {
		condiciones.push('(p.titulo LIKE ? OR p.contexto LIKE ? OR p.objetivo LIKE ?)');
		valores.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`);
	}
	if (desde) {
		condiciones.push('p.fecha_programada >= ?');
		valores.push(desde);
	}
	if (hasta) {
		condiciones.push('p.fecha_programada <= ?');
		valores.push(hasta);
	}

	valores.push(limite(args));
	return ctx.db
		.prepare(
			`SELECT p.id, p.titulo, p.contexto, p.objetivo, p.cta, p.estado, p.campana,
					p.fecha_programada, p.meta_pauta_inicio, p.meta_pauta_fin, p.presupuesto_usd,
					p.created_at, p.updated_at, m.nombre AS marca, c.nombre AS cuenta,
					f.nombre AS formato, a.nombre AS audiencia,
					COALESCE(u.display_name, 'Usuario') AS creador
			 FROM publicaciones p
			 LEFT JOIN marcas m ON m.id = p.marca_id
			 LEFT JOIN cuentas c ON c.id = p.cuenta_id
			 LEFT JOIN formatos f ON f.id = p.formato_id
			 LEFT JOIN audiencias a ON a.id = p.audiencia_id
			 LEFT JOIN users u ON u.id = p.user_id
			 WHERE ${condiciones.join(' AND ')}
			 ORDER BY COALESCE(p.fecha_programada, p.created_at) ASC
			 LIMIT ?`
		)
		.all(...valores);
}

export const moduloContentCreator: ModuloIA = {
	id: 'content_creator',
	nombre: 'Creador de Contenido',
	permisosRequeridos: [],
	contextoSistema: `
Este módulo permite consultar información operativa de Creador de Contenido de todo el equipo:
publicaciones, calendario, campañas, catálogos, recursos de marca, fichas técnicas y consumo de IA.
Las herramientas son exclusivamente de lectura. No exponen tokens de Meta, rutas privadas, binarios,
prompts utilizados por otros flujos de IA ni permiten publicar, modificar o conectar cuentas.`,
	herramientas: [
		{
			nombre: 'resumen_creador_contenido',
			descripcion:
				'Resume las publicaciones activas de todo el equipo por estado, incluyendo las próximas programadas. Usar para preguntas sobre pendientes, aprobaciones o panorama general.',
			parametros: { type: 'object', properties: {} },
			ejecutar: async (_args, ctx) => ({
				porEstado: ctx.db
					.prepare(
						`SELECT estado, COUNT(*) AS total
						 FROM publicaciones WHERE deleted_at IS NULL GROUP BY estado ORDER BY total DESC`
					)
					.all(),
				proximas: ctx.db
					.prepare(
						`SELECT p.id, p.titulo, p.estado, p.fecha_programada, m.nombre AS marca, c.nombre AS cuenta
						 FROM publicaciones p
						 LEFT JOIN marcas m ON m.id = p.marca_id
						 LEFT JOIN cuentas c ON c.id = p.cuenta_id
						 WHERE p.deleted_at IS NULL AND p.fecha_programada IS NOT NULL
						 ORDER BY p.fecha_programada ASC LIMIT 10`
					)
					.all()
			})
		},
		{
			nombre: 'buscar_publicaciones_contenido',
			descripcion:
				'Busca publicaciones de todo el equipo por texto, estado, marca, campaña o rango de fechas. Devuelve información operativa sin copys ni prompts.',
			parametros: {
				type: 'object',
				properties: {
					texto: { type: 'string', description: 'Texto a buscar en título, contexto u objetivo.' },
					estado: {
						type: 'string',
						description: 'Estado exacto, por ejemplo Borrador, En revisión o Publicado.'
					},
					marca: { type: 'string', description: 'Nombre o parte del nombre de marca.' },
					campana: { type: 'string', description: 'Nombre o parte del nombre de campaña.' },
					desde: {
						type: 'integer',
						description: 'Fecha programada mínima como epoch en segundos.'
					},
					hasta: {
						type: 'integer',
						description: 'Fecha programada máxima como epoch en segundos.'
					},
					limite: {
						type: 'integer',
						description: 'Máximo de resultados; por defecto 20, máximo 100.'
					}
				}
			},
			ejecutar: async (args, ctx) => publicaciones(args, ctx)
		},
		{
			nombre: 'calendario_contenido',
			descripcion:
				'Lista publicaciones programadas del equipo dentro de un rango de fechas. Usar para preguntas sobre calendario, publicaciones próximas o pauta.',
			parametros: {
				type: 'object',
				properties: {
					desde: { type: 'integer', description: 'Inicio del rango, epoch en segundos.' },
					hasta: { type: 'integer', description: 'Fin del rango, epoch en segundos.' },
					limite: {
						type: 'integer',
						description: 'Máximo de resultados; por defecto 20, máximo 100.'
					}
				}
			},
			ejecutar: async (args, ctx) => publicaciones(args, ctx)
		},
		{
			nombre: 'catalogos_contenido',
			descripcion:
				'Lista los catálogos compartidos de Creador de Contenido: marcas, cuentas, formatos, audiencias y redes sociales. No incluye identificadores ni tokens de Meta.',
			parametros: {
				type: 'object',
				properties: {
					tipo: {
						type: 'string',
						enum: ['marcas', 'cuentas', 'formatos', 'audiencias', 'redes'],
						description: 'Catálogo que se desea consultar.'
					}
				},
				required: ['tipo']
			},
			ejecutar: async (args, ctx) => {
				switch (args.tipo) {
					case 'marcas':
						return ctx.db
							.prepare('SELECT id, nombre FROM marcas WHERE deleted_at IS NULL ORDER BY nombre')
							.all();
					case 'cuentas':
						return ctx.db
							.prepare('SELECT id, nombre FROM cuentas WHERE deleted_at IS NULL ORDER BY nombre')
							.all();
					case 'formatos':
						return ctx.db
							.prepare(
								'SELECT id, nombre, aspect_ratio, max_size_mb, max_duracion_sec FROM formatos WHERE deleted_at IS NULL ORDER BY nombre'
							)
							.all();
					case 'audiencias':
						return ctx.db
							.prepare('SELECT id, nombre FROM audiencias WHERE deleted_at IS NULL ORDER BY nombre')
							.all();
					case 'redes':
						return ctx.db
							.prepare(
								'SELECT id, nombre FROM redes_sociales WHERE deleted_at IS NULL ORDER BY nombre'
							)
							.all();
					default:
						return { error: 'Catálogo no reconocido.' };
				}
			}
		},
		{
			nombre: 'recursos_marca_contenido',
			descripcion:
				'Lista los recursos y manuales disponibles de una marca, sin exponer rutas ni contenido de archivos. Usar para saber qué recursos existen.',
			parametros: {
				type: 'object',
				properties: {
					marca: { type: 'string', description: 'Nombre o parte del nombre de la marca.' }
				},
				required: ['marca']
			},
			ejecutar: async (args, ctx) => {
				const marca = `%${String(args.marca).trim()}%`;
				return {
					assets: ctx.db
						.prepare(
							`SELECT ma.id, m.nombre AS marca, ma.nombre, ma.tipo, ma.file_name, ma.mime_type, ma.file_size, ma.created_at FROM marca_assets ma JOIN marcas m ON m.id = ma.marca_id WHERE ma.deleted_at IS NULL AND m.nombre LIKE ? ORDER BY ma.created_at DESC`
						)
						.all(marca),
					manuales: ctx.db
						.prepare(
							`SELECT mm.id, m.nombre AS marca, mm.nombre, mm.file_name, mm.mime_type, mm.file_size, mm.analizado_at, mm.created_at FROM marca_manuales mm JOIN marcas m ON m.id = mm.marca_id WHERE mm.deleted_at IS NULL AND m.nombre LIKE ? ORDER BY mm.created_at DESC`
						)
						.all(marca)
				};
			}
		},
		{
			nombre: 'fichas_tecnicas_contenido',
			descripcion:
				'Busca fichas técnicas de productos de todo el equipo por producto o marca. Devuelve nombre, marca, descripción y especificaciones extraídas; no el archivo original.',
			parametros: {
				type: 'object',
				properties: {
					texto: { type: 'string', description: 'Producto, marca o texto descriptivo a buscar.' },
					limite: {
						type: 'integer',
						description: 'Máximo de resultados; por defecto 20, máximo 100.'
					}
				}
			},
			ejecutar: async (args, ctx) => {
				const texto =
					typeof args.texto === 'string' && args.texto.trim() ? `%${args.texto.trim()}%` : '%';
				return ctx.db
					.prepare(
						`SELECT f.id, f.nombre_producto, f.descripcion, f.especificaciones_texto, f.created_at, f.updated_at, m.nombre AS marca FROM fichas_tecnicas f JOIN marcas m ON m.id = f.marca_id WHERE f.deleted_at IS NULL AND (f.nombre_producto LIKE ? OR f.descripcion LIKE ? OR m.nombre LIKE ?) ORDER BY f.updated_at DESC LIMIT ?`
					)
					.all(texto, texto, texto, limite(args));
			}
		},
		{
			nombre: 'consumo_ia_contenido',
			descripcion:
				'Resume consumo de IA de Creador de Contenido por tarea, marca o período. Solo devuelve agregados; nunca prompts, identificadores de usuario ni costos base.',
			parametros: {
				type: 'object',
				properties: {
					desde: { type: 'integer', description: 'Inicio del rango, epoch en segundos.' },
					hasta: { type: 'integer', description: 'Fin del rango, epoch en segundos.' }
				}
			},
			ejecutar: async (args, ctx) => {
				const condiciones = ['1 = 1'];
				const valores: number[] = [];
				const desde = fecha(args.desde);
				const hasta = fecha(args.hasta);
				if (desde) {
					condiciones.push('l.created_at >= ?');
					valores.push(desde);
				}
				if (hasta) {
					condiciones.push('l.created_at <= ?');
					valores.push(hasta);
				}
				return ctx.db
					.prepare(
						`SELECT l.tarea, m.nombre AS marca, COUNT(*) AS interacciones, SUM(l.tokens_totales) AS tokens_totales, SUM(l.costo_estimado) AS costo_estimado FROM ai_token_logs l LEFT JOIN marcas m ON m.id = l.marca_id WHERE ${condiciones.join(' AND ')} GROUP BY l.tarea, m.nombre ORDER BY costo_estimado DESC, interacciones DESC`
					)
					.all(...valores);
			}
		}
	]
};
