/**
 * ============================================================================
 * PROVEEDOR: GEMINI (@google/genai)
 * ============================================================================
 * Encapsula el SDK unificado de Google y el loop de function calling.
 * El SDK viejo (@google/generative-ai) está deprecado; este usa @google/genai.
 *
 * Instalación:  npm i @google/genai
 *
 * Acumula el consumo de tokens de TODAS las llamadas de la interacción
 * (cada paso de tool use es una llamada con su propio consumo).
 * comentario ajuste
 */

import { GoogleGenAI, Type } from '@google/genai';
import { IA_CONFIG } from '../config';
import type {
	ProveedorIA,
	SolicitudIA,
	RespuestaIA,
	EsquemaParametros,
	EsquemaPropiedad,
	UsoTokens
} from '../tipos';

function tipoGemini(t: string): Type {
	switch (t) {
		case 'string': return Type.STRING;
		case 'number': return Type.NUMBER;
		case 'integer': return Type.INTEGER;
		case 'boolean': return Type.BOOLEAN;
		case 'array': return Type.ARRAY;
		case 'object': return Type.OBJECT;
		default: return Type.STRING;
	}
}

function propiedadGemini(p: EsquemaPropiedad): Record<string, unknown> {
	const out: Record<string, unknown> = { type: tipoGemini(p.type) };
	if (p.description) out.description = p.description;
	if (p.enum) out.enum = p.enum;
	if (p.items) out.items = propiedadGemini(p.items);
	return out;
}

function parametrosGemini(params: EsquemaParametros): Record<string, unknown> {
	const properties: Record<string, unknown> = {};
	for (const [clave, prop] of Object.entries(params.properties)) {
		properties[clave] = propiedadGemini(prop);
	}
	return { type: Type.OBJECT, properties, required: params.required ?? [] };
}

export class ProveedorGemini implements ProveedorIA {
	nombre = 'gemini';
	private ai: GoogleGenAI | null;
	private modelo: string;

	constructor(apiKey?: string, modelo: string = IA_CONFIG.modelo) {
		this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
		this.modelo = modelo;
	}

	disponible(): boolean {
		return this.ai !== null;
	}

	/**
	 * Llama a generateContent con reintentos ante errores transitorios
	 * (429 rate limit, 503 saturación). Si el modelo principal sigue saturado
	 * tras los reintentos, prueba una vez con el modelo de respaldo (lite).
	 */
	private async generarConReintento(
		params: Record<string, unknown>,
		maxIntentos = 4
	): Promise<any> {
		let ultimoError: unknown;
		for (let intento = 1; intento <= maxIntentos; intento++) {
			try {
				return await this.ai!.models.generateContent(params as any);
			} catch (e) {
				ultimoError = e;
				const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
				const esTransitorio =
					msg.includes('429') || msg.includes('rate') || msg.includes('quota') ||
					msg.includes('resource_exhausted') || msg.includes('503') ||
					msg.includes('overloaded') || msg.includes('unavailable');
				if (!esTransitorio || intento === maxIntentos) break;
				// Espera creciente con algo de aleatoriedad: ~1.5s, 3s, 6s.
				const base = 1500 * Math.pow(2, intento - 1);
				const esperaMs = base + Math.floor(Math.random() * 500);
				console.warn(`[Gemini] Reintento ${intento}/${maxIntentos} en ${esperaMs}ms (${msg.slice(0, 70)})`);
				await new Promise((r) => setTimeout(r, esperaMs));
			}
		}

		// Último recurso: si el modelo principal está saturado, probar el de respaldo.
		const modeloActual = (params as any).model;
		if (IA_CONFIG.modeloRespaldo && modeloActual !== IA_CONFIG.modeloRespaldo) {
			console.warn(`[Gemini] Modelo ${modeloActual} no disponible. Probando respaldo: ${IA_CONFIG.modeloRespaldo}`);
			try {
				return await this.ai!.models.generateContent({
					...(params as any),
					model: IA_CONFIG.modeloRespaldo
				});
			} catch (e2) {
				console.error('[Gemini] El modelo de respaldo también falló:', e2 instanceof Error ? e2.message : e2);
				throw e2;
			}
		}
		throw ultimoError;
	}

	async responder(solicitud: SolicitudIA): Promise<RespuestaIA> {
		if (!this.ai) {
			throw new Error('Gemini no está configurado (falta GEMINI_API_KEY).');
		}

		const tools = [
			{
				functionDeclarations: solicitud.herramientas.map((h) => ({
					name: h.nombre,
					description: h.descripcion,
					parameters: parametrosGemini(h.parametros)
				}))
			}
		];

		const contents: Array<Record<string, unknown>> = [];
		for (const m of solicitud.historial ?? []) {
			contents.push({
				role: m.rol === 'usuario' ? 'user' : 'model',
				parts: [{ text: m.texto }]
			});
		}
		contents.push({ role: 'user', parts: [{ text: solicitud.mensaje }] });

		const config = {
			systemInstruction: solicitud.instruccionSistema,
			temperature: IA_CONFIG.temperatura,
			tools
		};

		const herramientasUsadas: string[] = [];
		const uso: UsoTokens = { entrada: 0, salida: 0, total: 0 };
		const maxIter = solicitud.maxIteraciones ?? IA_CONFIG.maxIteraciones;
		let iteraciones = 0;

		while (iteraciones < maxIter) {
			iteraciones++;

			const resp = await this.generarConReintento({
				model: this.modelo,
				contents,
				config
			});

			// Acumular consumo de ESTA llamada.
			const meta = resp.usageMetadata;
			if (meta) {
				const entrada = meta.promptTokenCount ?? 0;
				const total = meta.totalTokenCount ?? entrada;
				// salida = todo lo que no es entrada (incluye tokens de "thinking").
				uso.entrada += entrada;
				uso.salida += Math.max(0, total - entrada);
				uso.total += total;
			}

			const llamadas = resp.functionCalls ?? [];

			if (llamadas.length === 0) {
				return {
					texto: resp.text ?? '',
					herramientasUsadas,
					iteraciones,
					proveedor: this.nombre,
					modelo: this.modelo,
					uso
				};
			}

			const contenidoModelo = resp.candidates?.[0]?.content;
			if (contenidoModelo) contents.push(contenidoModelo as Record<string, unknown>);

			const partesRespuesta: Array<Record<string, unknown>> = [];
			for (const llamada of llamadas) {
				const nombre = llamada.name ?? '';
				const args = (llamada.args ?? {}) as Record<string, unknown>;
				herramientasUsadas.push(nombre);

				let resultado: unknown;
				try {
					resultado = await solicitud.ejecutarHerramienta(nombre, args);
				} catch (e) {
					resultado = { error: e instanceof Error ? e.message : 'Error ejecutando la herramienta' };
				}

				partesRespuesta.push({
					functionResponse: { id: llamada.id, name: nombre, response: { result: resultado } }
				});
			}

			contents.push({ role: 'user', parts: partesRespuesta });
		}

		return {
			texto: 'No pude completar el análisis en el número de pasos permitido. Probá una pregunta más específica.',
			herramientasUsadas,
			iteraciones,
			proveedor: this.nombre,
			modelo: this.modelo,
			uso
		};
	}
}