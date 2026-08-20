/**
 * ============================================================================
 * MOTOR DE IA VYOWEB — NÚCLEO
 * ============================================================================
 * Agnóstico al módulo y al proveedor. Su trabajo:
 *  1. Resolver qué módulos puede usar el usuario (compuerta de permisos).
 *  2. Exponer SOLO las herramientas de esos módulos al proveedor.
 *     (El permiso es a nivel de capacidad: la IA no puede llamar lo que no recibe.)
 *  3. Construir el prompt de sistema con las reglas del cliente.
 *  4. Orquestar el loop de function calling vía el proveedor.
 *  5. Calcular el costo de la interacción, guardarlo en auditoría y devolverlo.
 */

import { construirPromptSistema } from './config';
import { calcularCosto } from './costos';
import { registrarUso } from './auditoria';
import type { DB, EntradaChat, SalidaChat, ProveedorIA } from './tipos';

export interface OpcionesMotor {
	db: DB;
	proveedor: ProveedorIA;
}

export class MotorIA {
	private db: DB;
	private proveedor: ProveedorIA;

	constructor(opciones: OpcionesMotor) {
		this.db = opciones.db;
		this.proveedor = opciones.proveedor;
	}

	async responder(entrada: EntradaChat): Promise<SalidaChat> {
		const { usuario, mensaje, historial, conversacionId } = entrada;
		const instruccionSistema = construirPromptSistema({ usuario });

		try {
			const resp = await this.proveedor.responder({
				instruccionSistema,
				mensaje,
				historial,
				herramientas: [],
				ejecutarHerramienta: async () => ({
					error: 'El chat general no tiene herramientas internas.'
				})
			});

			// Costo de la interacción (tokens acumulados de todas las llamadas).
			const costo = calcularCosto(resp.proveedor, resp.modelo, resp.uso);

			// Auditoría (no rompe el chat si falla).
			registrarUso(this.db, {
				userId: usuario.userId,
				usuarioNombre: usuario.nombre,
				conversacionId,
				modulos: [],
				mensaje,
				respuesta: resp.texto,
				herramientasUsadas: [],
				iteraciones: resp.iteraciones,
				costo
			});

			return {
				ok: true,
				respuesta: resp.texto,
				costo
			};
		} catch (e) {
			// Registrar el error REAL en consola del servidor para diagnóstico.
			const detalle = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
			console.error('[MotorIA] ❌ Error procesando consulta:', detalle);
			if (e instanceof Error && e.stack) console.error(e.stack);

			// Mensaje al usuario según el tipo de error.
			let mensajeUsuario =
				'Tuve un problema procesando tu consulta. Intentá de nuevo en un momento.';
			const txt = detalle.toLowerCase();
			if (
				txt.includes('429') ||
				txt.includes('rate') ||
				txt.includes('quota') ||
				txt.includes('resource_exhausted')
			) {
				mensajeUsuario =
					'El asistente está recibiendo muchas consultas seguidas. Esperá unos segundos y volvé a preguntar.';
			} else if (
				txt.includes('api key') ||
				txt.includes('apikey') ||
				txt.includes('permission') ||
				txt.includes('401') ||
				txt.includes('403')
			) {
				mensajeUsuario =
					'Hay un problema con la configuración del asistente (clave de IA). Avisá al administrador.';
			} else if (
				txt.includes('timeout') ||
				txt.includes('etimedout') ||
				txt.includes('econnreset') ||
				txt.includes('fetch failed')
			) {
				mensajeUsuario = 'La conexión con el servicio de IA tardó demasiado. Intentá de nuevo.';
			}

			return {
				ok: false,
				respuesta: mensajeUsuario,
				error: detalle
			};
		}
	}
}
