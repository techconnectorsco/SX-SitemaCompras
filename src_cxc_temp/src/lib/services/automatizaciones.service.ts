/**
 * @module AutomatizacionesService
 * @description Servicio para interactuar con automatizaciones y ejecuciones
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Automatizacion, Ejecucion } from '$lib/types/database';

export class AutomatizacionesService {
	constructor(private supabase: SupabaseClient) {}

	/**
	 * Obtener todas las automatizaciones de un cliente
	 */
	async getByCliente(clienteId: string): Promise<Automatizacion[]> {
		const { data, error } = await this.supabase
			.from('automatizaciones')
			.select('*, cliente:clientes(*)')
			.eq('cliente_id', clienteId)
			.order('nombre', { ascending: true });

		if (error) throw error;
		return data || [];
	}

	/**
	 * Obtener todas las automatizaciones (solo para administradores)
	 */
	async getAll(): Promise<Automatizacion[]> {
		const { data, error } = await this.supabase
			.from('automatizaciones')
			.select('*, cliente:clientes(*)')
			.order('nombre', { ascending: true });

		if (error) throw error;
		return data || [];
	}

	/**
	 * Obtener una automatización con su última ejecución
	 */
	async getByIdWithLastExecution(id: string): Promise<Automatizacion | null> {
		const { data, error } = await this.supabase
			.from('automatizaciones')
			.select('*, cliente:clientes(*)')
			.eq('id', id)
			.single();

		if (error) throw error;
		if (!data) return null;

		const { data: ultimaEjecucion } = await this.supabase
			.from('ejecuciones')
			.select('*')
			.eq('automatizacion_id', id)
			.order('fecha_inicio', { ascending: false })
			.limit(1)
			.single();

		return {
			...data,
			ultima_ejecucion: ultimaEjecucion || undefined
		};
	}

	/**
	 * Obtener ejecuciones de una automatización
	 */
	async getEjecuciones(automatizacionId: string, limit: number = 50): Promise<Ejecucion[]> {
		const { data, error } = await this.supabase
			.from('ejecuciones')
			.select('*, automatizacion:automatizaciones(*)')
			.eq('automatizacion_id', automatizacionId)
			.order('fecha_inicio', { ascending: false })
			.limit(limit);

		if (error) throw error;
		return data || [];
	}

	/**
	 * Obtener ejecuciones recientes de un cliente
	 */
	async getEjecucionesRecientes(clienteId: string, limit: number = 20): Promise<Ejecucion[]> {
		const { data, error } = await this.supabase
			.from('ejecuciones')
			.select('*, automatizacion:automatizaciones!inner(*)')
			.eq('automatizacion.cliente_id', clienteId)
			.order('fecha_inicio', { ascending: false })
			.limit(limit);

		if (error) throw error;
		return data || [];
	}

	/**
	 * Obtener todas las ejecuciones recientes (para administradores)
	 */
	async getAllEjecucionesRecientes(limit: number = 50): Promise<Ejecucion[]> {
		const { data, error } = await this.supabase
			.from('ejecuciones')
			.select('*, automatizacion:automatizaciones(*)')
			.order('fecha_inicio', { ascending: false })
			.limit(limit);

		if (error) throw error;
		return data || [];
	}

	/**
	 * Crear una nueva ejecución
	 */
	async crearEjecucion(ejecucion: Omit<Ejecucion, 'id' | 'created_at' | 'updated_at'>): Promise<Ejecucion> {
		const { data, error } = await this.supabase
			.from('ejecuciones')
			.insert(ejecucion)
			.select()
			.single();

		if (error) throw error;
		return data;
	}

	/**
	 * Obtener estadísticas de ejecuciones para un cliente
	 */
	async getEstadisticas(clienteId: string) {
		const automatizaciones = await this.getByCliente(clienteId);
		const ejecuciones = await this.getEjecucionesRecientes(clienteId, 1000);

		const totalEjecuciones = ejecuciones.length;
		const exitosas = ejecuciones.filter((e) => e.estado === 'Exitoso').length;
		const conAdvertencia = ejecuciones.filter((e) => e.estado === 'Advertencia').length;
		const conError = ejecuciones.filter((e) => e.estado === 'Error').length;

		const botsActivos = automatizaciones.filter((a) => a.esta_activa).length;
		const tasaExito = totalEjecuciones > 0 ? (exitosas / totalEjecuciones) * 100 : 0;

		const hoy = new Date();
		const hace7Dias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
		const ejecucionesSemana = ejecuciones.filter(
			(e) => new Date(e.fecha_inicio) >= hace7Dias
		);

		const ejecucionesPorDia: Record<string, number> = {};
		ejecucionesSemana.forEach((e) => {
			const fecha = new Date(e.fecha_inicio).toISOString().split('T')[0];
			ejecucionesPorDia[fecha] = (ejecucionesPorDia[fecha] || 0) + 1;
		});

		return {
			totalAutomatizaciones: automatizaciones.length,
			botsActivos,
			totalEjecuciones,
			exitosas,
			conAdvertencia,
			conError,
			tasaExito: Math.round(tasaExito * 100) / 100,
			ejecucionesPorDia
		};
	}

	/**
	 * Suscribirse a cambios en ejecuciones (Realtime)
	 */
	subscribeEjecuciones(
		clienteId: string | null,
		callback: (ejecucion: Ejecucion) => void
	) {
		const channel = this.supabase
			.channel('ejecuciones-changes')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'ejecuciones'
				},
				async (payload) => {
					const { data: automatizacion } = await this.supabase
						.from('automatizaciones')
						.select('*, cliente:clientes(*)')
						.eq('id', payload.new.automatizacion_id)
						.single();

					if (clienteId && automatizacion?.cliente_id !== clienteId) {
						return;
					}

					const ejecucion: Ejecucion = {
						...payload.new,
						automatizacion
					} as Ejecucion;

					callback(ejecucion);
				}
			)
			.subscribe();

		return {
			unsubscribe: () => {
				this.supabase.removeChannel(channel);
			}
		};
	}

	/**
	 * Toggle estado activo de una automatización (robot)
	 */
	async toggleRobot(automatizacionId: string, estaActiva: boolean): Promise<Automatizacion> {
		const { data, error } = await this.supabase
			.from('automatizaciones')
			.update({ esta_activa: estaActiva })
			.eq('id', automatizacionId)
			.select()
			.single();

		if (error) throw error;
		return data;
	}
}