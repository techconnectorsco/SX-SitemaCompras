
// ARCHIVO: src/lib/services/api.service.ts


import type {
	Automatizacion,
	Ejecucion,
	ProyectoSoftware,
	EstadoEjecucion
} from '$lib/types/database';

export class ApiService {
	private baseUrl = '';

	constructor() {
		if (typeof window !== 'undefined') {
			this.baseUrl = '';
		}
	}

	private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options?.headers
			}
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
			throw new Error(error.message || `Error ${response.status}`);
		}

		return response.json();
	}

	// ==================== AUTOMATIZACIONES ====================

	async getAutomatizaciones(clienteId?: string): Promise<Automatizacion[]> {
		const params = clienteId ? `?cliente_id=${clienteId}` : '';
		const data = await this.fetchApi<{ automatizaciones: Automatizacion[] }>(
			`/api/automatizaciones${params}`
		);
		return data.automatizaciones;
	}

	/**
	 * Toggle estado activo de un robot (solo admin)
	 */
	async toggleRobot(
		automatizacionId: string,
		estaActiva: boolean
	): Promise<{ success: boolean }> {
		return this.fetchApi<{ success: boolean }>(
			`/api/automatizaciones/${automatizacionId}/toggle`,
			{
				method: 'PATCH',
				body: JSON.stringify({ esta_activa: estaActiva })
			}
		);
	}

	// ==================== EJECUCIONES ====================

	async getEjecuciones(options?: {
		automatizacionId?: string;
		limit?: number;
	}): Promise<Ejecucion[]> {
		const params = new URLSearchParams();
		if (options?.automatizacionId) {
			params.append('automatizacion_id', options.automatizacionId);
		}
		if (options?.limit) {
			params.append('limit', options.limit.toString());
		}

		const queryString = params.toString();
		const data = await this.fetchApi<{ ejecuciones: Ejecucion[] }>(
			`/api/ejecuciones${queryString ? `?${queryString}` : ''}`
		);
		return data.ejecuciones;
	}

	async crearEjecucion(ejecucion: {
		automatizacion_id: string;
		fecha_inicio?: string;
		estado: EstadoEjecucion;
		metricas?: Record<string, any>;
		log_salida?: string;
		observaciones?: string;
	}): Promise<Ejecucion> {
		const data = await this.fetchApi<{ ejecucion: Ejecucion }>('/api/ejecuciones', {
			method: 'POST',
			body: JSON.stringify(ejecucion)
		});
		return data.ejecucion;
	}

	// ==================== PROYECTOS ====================

	async getProyectos(clienteId?: string): Promise<ProyectoSoftware[]> {
		const params = clienteId ? `?cliente_id=${clienteId}` : '';
		const data = await this.fetchApi<{ proyectos: ProyectoSoftware[] }>(
			`/api/proyectos${params}`
		);
		return data.proyectos;
	}

	// ==================== ESTADÍSTICAS ====================

	async getEstadisticas(clienteId?: string): Promise<any> {
		const params = clienteId ? `?cliente_id=${clienteId}` : '';
		const data = await this.fetchApi<{ estadisticas: any }>(`/api/estadisticas${params}`);
		return data.estadisticas;
	}

	// ==================== SOLICITUDES DE ACCESO ====================

	/**
	 * Obtener mis solicitudes de acceso
	 */
	async getMisSolicitudes(): Promise<any[]> {
		const data = await this.fetchApi<{ solicitudes: any[] }>('/api/solicitudes');
		return data.solicitudes;
	}

	/**
	 * Crear una solicitud de acceso a un cliente
	 */
	async crearSolicitud(
		clienteId: string,
		mensaje?: string
	): Promise<any> {
		const data = await this.fetchApi<{ solicitud: any }>('/api/solicitudes', {
			method: 'POST',
			body: JSON.stringify({ cliente_id: clienteId, mensaje })
		});
		return data.solicitud;
	}

	/**
	 * Obtener todas las solicitudes (admin)
	 */
	async getSolicitudesAdmin(
		filtroEstado?: string
	): Promise<any[]> {
		const params = filtroEstado ? `?estado=${filtroEstado}` : '';
		const data = await this.fetchApi<{ solicitudes: any[] }>(
			`/api/solicitudes${params}`
		);
		return data.solicitudes;
	}

	/**
	 * Aprobar o rechazar solicitud (admin)
	 */
	async procesarSolicitud(
		solicitudId: string,
		accion: 'aprobar' | 'rechazar',
		notas?: string
	): Promise<any> {
		return this.fetchApi<any>(`/api/solicitudes/${solicitudId}`, {
			method: 'PATCH',
			body: JSON.stringify({ accion, notas })
		});
	}

	// ==================== MENSAJES ====================

	/**
	 * Obtener mensajes (del cliente del usuario, o todos si admin)
	 */
	async getMensajes(): Promise<any[]> {
		const data = await this.fetchApi<{ mensajes: any[] }>('/api/mensajes');
		return data.mensajes;
	}

	/**
	 * Obtener un mensaje con sus respuestas
	 */
	async getMensaje(mensajeId: string): Promise<any> {
		const data = await this.fetchApi<{ mensaje: any }>(`/api/mensajes/${mensajeId}`);
		return data.mensaje;
	}

	/**
	 * Crear un nuevo mensaje/ticket
	 */
	async crearMensaje(params: {
		asunto: string;
		contenido: string;
		tipo?: string;
		automatizacion_id?: string;
	}): Promise<any> {
		const data = await this.fetchApi<{ mensaje: any }>('/api/mensajes', {
			method: 'POST',
			body: JSON.stringify(params)
		});
		return data.mensaje;
	}

	/**
	 * Responder a un mensaje
	 */
	async responderMensaje(mensajeId: string, contenido: string): Promise<any> {
		const data = await this.fetchApi<{ respuesta: any }>(
			`/api/mensajes/${mensajeId}/responder`,
			{
				method: 'POST',
				body: JSON.stringify({ contenido })
			}
		);
		return data.respuesta;
	}

	// ==================== CLIENTES (lista pública) ====================

	/**
	 * Obtener lista de clientes (para selects, etc.)
	 */
	async getClientes(): Promise<Array<{ id: string; nombre: string }>> {
		const data = await this.fetchApi<{ clientes: Array<{ id: string; nombre: string }> }>(
			'/api/public/clientes'
		);
		return data.clientes;
	}

	// ==================== CONTENIDO PÚBLICO ====================

	/**
	 * Obtener estadísticas públicas para la landing
	 */
	async getPublicStats(): Promise<any> {
		const data = await this.fetchApi<{ stats: any }>('/api/public/stats');
		return data.stats;
	}

	/**
	 * Obtener casos de éxito publicados
	 */
	async getCasosExito(): Promise<any[]> {
		const data = await this.fetchApi<{ casos: any[] }>('/api/public/casos-exito');
		return data.casos;
	}
}

// Instancia singleton
export const apiService = new ApiService();