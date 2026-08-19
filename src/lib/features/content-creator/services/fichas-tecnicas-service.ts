import db from '$lib/config/db-config';
import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';
import { registrarUsoGemini } from './gemini-usage-service';
import { readUploadFile } from '$lib/server/uploads-storage';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY || '' });
const MODELO_FICHA = 'gemini-2.5-flash';

export interface FichaTecnica {
	id: number;
	marca_id: number;
	user_id: string;
	nombre_producto: string;
	descripcion: string | null;
	especificaciones_texto: string;
	file_path: string;
	file_name: string;
	mime_type: string;
	size_bytes: number;
	created_at: number;
	updated_at: number;
	deleted_at: number | null;
	marca_nombre?: string;
}

export class FichasTecnicasService {
	/**
	 * Obtiene todas las fichas técnicas activas de un usuario (opcionalmente filtradas por marca)
	 */
	static getFichas(userId: string, marcaId?: number): FichaTecnica[] {
		if (marcaId) {
			return db
				.prepare(
					`
				SELECT f.*, m.nombre as marca_nombre
				FROM fichas_tecnicas f
				JOIN marcas m ON f.marca_id = m.id
				WHERE f.user_id = ? AND f.marca_id = ? AND f.deleted_at IS NULL
				ORDER BY f.created_at DESC
			`
				)
				.all(userId, marcaId) as FichaTecnica[];
		}

		return db
			.prepare(
				`
			SELECT f.*, m.nombre as marca_nombre
			FROM fichas_tecnicas f
			JOIN marcas m ON f.marca_id = m.id
			WHERE f.user_id = ? AND f.deleted_at IS NULL
			ORDER BY f.created_at DESC
		`
			)
			.all(userId) as FichaTecnica[];
	}

	/**
	 * Crea y procesa una nueva ficha técnica llamando a Gemini para extraer las especificaciones en texto
	 */
	static async crearFicha(data: {
		userId: string;
		marcaId: number;
		nombreProducto: string;
		descripcion?: string;
		filePath: string; // Ruta relativa ej: /uploads/fichas/xyz.pdf
		fileName: string;
		mimeType: string;
		sizeBytes: number;
	}): Promise<FichaTecnica> {
		const now = Math.floor(Date.now() / 1000);
		// 1. Obtener nombre de la marca
		const marca = db.prepare('SELECT nombre FROM marcas WHERE id = ?').get(data.marcaId) as
			| { nombre: string }
			| undefined;
		const marcaNombre = marca?.nombre || 'Marca';

		// 2. Leer archivo y procesar con Gemini si es un archivo soportado (PDF o imagen)
		let especificacionesTexto = '';

		if (['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(data.mimeType)) {
			try {
				const buffer = await readUploadFile(data.filePath);
				const promptText = `Eres un experto en redactar y estructurar especificaciones técnicas de productos para el equipo de marketing y creadores de contenido.
Analiza detenidamente el documento/imagen adjunto correspondiente al producto "${data.nombreProducto}" de la marca "${marcaNombre}".

Sintetiza y extrae toda la información técnica clave en un formato Markdown claro, organizado y fácil de consultar.

Incluye si están presentes:
- **Resumen del Producto**: Propósito principal y uso.
- **Especificaciones Técnicas**: Dimensiones, capacidad, potencia, rendimiento, materiales o características físicas.
- **Ventajas / Beneficios Clave**: Puntos fuertes diferenciadores.
- **Instrucciones / Compatibilidad**: Normas de uso o compatibilidades importantes.

Responde ÚNICAMENTE con el Markdown estructurado.`;

				const contents: any[] = [
					{
						inlineData: {
							mimeType: data.mimeType,
							data: buffer.toString('base64')
						}
					},
					{ text: promptText }
				];

				const response = await ai.models.generateContent({
					model: MODELO_FICHA,
					contents
				});

				especificacionesTexto = response.text || '';

				registrarUsoGemini({
					userId: data.userId,
					marcaId: data.marcaId,
					model: MODELO_FICHA,
					task: 'Extracción Ficha Técnica',
					prompt: promptText,
					usageMetadata: response.usageMetadata,
					fallback: {
						inputTokens: Math.ceil(buffer.length / 100) + Math.ceil(promptText.length / 4),
						textOutputTokens: Math.ceil(especificacionesTexto.length / 4)
					}
				});
			} catch (err) {
				console.error('[FichasTecnicasService] Error procesando archivo con Gemini:', err);
				especificacionesTexto = `Producto: ${data.nombreProducto}\nMarca: ${marcaNombre}\n(No se pudo extraer texto automático del documento)`;
			}
		} else {
			especificacionesTexto = `Producto: ${data.nombreProducto}\nMarca: ${marcaNombre}`;
		}

		// 3. Insertar en BD
		const result = db
			.prepare(
				`
			INSERT INTO fichas_tecnicas (
				marca_id, user_id, nombre_producto, descripcion, especificaciones_texto,
				file_path, file_name, mime_type, size_bytes, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`
			)
			.run(
				data.marcaId,
				data.userId,
				data.nombreProducto,
				data.descripcion || null,
				especificacionesTexto,
				data.filePath,
				data.fileName,
				data.mimeType,
				data.sizeBytes,
				now,
				now
			);

		return db
			.prepare(
				`
			SELECT f.*, m.nombre as marca_nombre
			FROM fichas_tecnicas f
			JOIN marcas m ON f.marca_id = m.id
			WHERE f.id = ?
		`
			)
			.get(result.lastInsertRowid) as FichaTecnica;
	}

	/**
	 * Actualiza los datos o texto de una ficha técnica
	 */
	static updateFicha(
		id: number,
		userId: string,
		data: { nombreProducto?: string; descripcion?: string; especificacionesTexto?: string }
	): FichaTecnica {
		const now = Math.floor(Date.now() / 1000);
		const ficha = db
			.prepare('SELECT * FROM fichas_tecnicas WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
			.get(id, userId) as FichaTecnica | undefined;
		if (!ficha) throw new Error('Ficha técnica no encontrada');

		db.prepare(
			`
			UPDATE fichas_tecnicas
			SET nombre_producto = COALESCE(?, nombre_producto),
				descripcion = COALESCE(?, descripcion),
				especificaciones_texto = COALESCE(?, especificaciones_texto),
				updated_at = ?
			WHERE id = ? AND user_id = ?
		`
		).run(
			data.nombreProducto ?? null,
			data.descripcion ?? null,
			data.especificacionesTexto ?? null,
			now,
			id,
			userId
		);

		return db
			.prepare(
				`
			SELECT f.*, m.nombre as marca_nombre
			FROM fichas_tecnicas f
			JOIN marcas m ON f.marca_id = m.id
			WHERE f.id = ?
		`
			)
			.get(id) as FichaTecnica;
	}

	/**
	 * Elimina suavemente (soft delete) una ficha técnica
	 */
	static deleteFicha(id: number, userId: string): boolean {
		const now = Math.floor(Date.now() / 1000);
		const res = db
			.prepare(
				`
			UPDATE fichas_tecnicas
			SET deleted_at = ?
			WHERE id = ? AND user_id = ?
		`
			)
			.run(now, id, userId);

		return res.changes > 0;
	}
}
