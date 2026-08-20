/**
 * ============================================================================
 * PROVEEDOR: CLAUDE (@anthropic-ai/sdk)
 * ============================================================================
 * Encapsula el SDK de Anthropic y el loop de tool use.
 * REQUIERE una API key de Anthropic (ANTHROPIC_API_KEY), igual que cualquier
 * otro proveedor. No hay forma de usar Claude desde el servidor sin key.
 *
 * Instalación:  npm i @anthropic-ai/sdk
 *
 * Acumula el consumo de tokens de TODAS las llamadas de la interacción.
 */

import Anthropic from '@anthropic-ai/sdk';
import { IA_CONFIG } from '../config';
import type { ProveedorIA, SolicitudIA, RespuestaIA, EsquemaParametros, UsoTokens } from '../tipos';

export class ProveedorClaude implements ProveedorIA {
	nombre = 'claude';
	private client: Anthropic | null;
	private modelo: string;

	constructor(apiKey?: string, modelo: string = IA_CONFIG.modeloClaude) {
		this.client = apiKey ? new Anthropic({ apiKey }) : null;
		this.modelo = modelo;
	}

	disponible(): boolean {
		return this.client !== null;
	}

	async responder(solicitud: SolicitudIA): Promise<RespuestaIA> {
		if (!this.client) {
			throw new Error('Claude no está configurado (falta ANTHROPIC_API_KEY).');
		}

		const tools = solicitud.herramientas.map((h) => ({
			name: h.nombre,
			description: h.descripcion,
			input_schema: aInputSchema(h.parametros)
		}));

		const messages: Anthropic.MessageParam[] = [];
		for (const m of solicitud.historial ?? []) {
			messages.push({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto });
		}
		messages.push({ role: 'user', content: solicitud.mensaje });

		const herramientasUsadas: string[] = [];
		const uso: UsoTokens = { entrada: 0, salida: 0, total: 0 };
		const maxIter = solicitud.maxIteraciones ?? IA_CONFIG.maxIteraciones;
		let iteraciones = 0;

		while (iteraciones < maxIter) {
			iteraciones++;

			const resp = await this.client.messages.create({
				model: this.modelo,
				max_tokens: 1500,
				temperature: IA_CONFIG.temperatura,
				system: solicitud.instruccionSistema,
				...(tools.length ? { tools } : {}),
				messages
			});

			// Acumular consumo de ESTA llamada.
			if (resp.usage) {
				const entrada = resp.usage.input_tokens ?? 0;
				const salida = resp.usage.output_tokens ?? 0;
				uso.entrada += entrada;
				uso.salida += salida;
				uso.total += entrada + salida;
			}

			const usos = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');

			if (resp.stop_reason !== 'tool_use' || usos.length === 0) {
				const texto = resp.content
					.filter((b): b is Anthropic.TextBlock => b.type === 'text')
					.map((b) => b.text)
					.join('\n');
				return {
					texto,
					herramientasUsadas,
					iteraciones,
					proveedor: this.nombre,
					modelo: this.modelo,
					uso
				};
			}

			messages.push({ role: 'assistant', content: resp.content });

			const resultados: Anthropic.ToolResultBlockParam[] = [];
			for (const u of usos) {
				herramientasUsadas.push(u.name);
				let resultado: unknown;
				try {
					resultado = await solicitud.ejecutarHerramienta(
						u.name,
						(u.input ?? {}) as Record<string, unknown>
					);
				} catch (e) {
					resultado = { error: e instanceof Error ? e.message : 'Error ejecutando la herramienta' };
				}
				resultados.push({
					type: 'tool_result',
					tool_use_id: u.id,
					content: JSON.stringify(resultado)
				});
			}

			messages.push({ role: 'user', content: resultados });
		}

		return {
			texto:
				'No pude completar el análisis en el número de pasos permitido. Probá una pregunta más específica.',
			herramientasUsadas,
			iteraciones,
			proveedor: this.nombre,
			modelo: this.modelo,
			uso
		};
	}
}

function aInputSchema(params: EsquemaParametros): Anthropic.Tool.InputSchema {
	return {
		type: 'object',
		properties: params.properties as Record<string, unknown>,
		required: params.required ?? []
	} as Anthropic.Tool.InputSchema;
}
