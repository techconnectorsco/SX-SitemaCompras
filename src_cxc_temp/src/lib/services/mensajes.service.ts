
// ARCHIVO: src/lib/services/mensajes.service.ts


import type { SupabaseClient } from '@supabase/supabase-js';

export class MensajesService {
	constructor(private supabase: SupabaseClient) {}

	/**
	 * Obtener mensajes de un cliente específico
	 */
	async getByCliente(clienteId: string) {
		const { data, error } = await this.supabase
			.from('mensajes')
			.select(
				`
				id,
				asunto,
				contenido,
				tipo,
				estado,
				leido_por_admin,
				leido_por_cliente,
				created_at,
				updated_at,
				autor:autor_id (id, email, raw_user_meta_data),
				automatizacion:automatizacion_id (id, nombre)
			`
			)
			.eq('cliente_id', clienteId)
			.order('created_at', { ascending: false });

		if (error) throw error;
		return data || [];
	}

	/**
	 * Obtener todos los mensajes (admin)
	 */
	async getAll(filtroEstado?: string) {
		let query = this.supabase
			.from('mensajes')
			.select(
				`
				id,
				asunto,
				contenido,
				tipo,
				estado,
				leido_por_admin,
				leido_por_cliente,
				created_at,
				updated_at,
				cliente:cliente_id (id, nombre),
				autor:autor_id (id, email, raw_user_meta_data),
				automatizacion:automatizacion_id (id, nombre)
			`
			)
			.order('created_at', { ascending: false });

		if (filtroEstado) {
			query = query.eq('estado', filtroEstado);
		}

		const { data, error } = await query;

		if (error) throw error;
		return data || [];
	}

	/**
	 * Obtener un mensaje con sus respuestas
	 */
	async getById(mensajeId: string) {
		// Obtener mensaje
		const { data: mensaje, error: msgError } = await this.supabase
			.from('mensajes')
			.select(
				`
				*,
				cliente:cliente_id (id, nombre),
				autor:autor_id (id, email, raw_user_meta_data),
				automatizacion:automatizacion_id (id, nombre)
			`
			)
			.eq('id', mensajeId)
			.single();

		if (msgError) throw msgError;

		// Obtener respuestas
		const { data: respuestas, error: respError } = await this.supabase
			.from('respuestas_mensaje')
			.select(
				`
				id,
				contenido,
				created_at,
				autor:autor_id (id, email, raw_user_meta_data)
			`
			)
			.eq('mensaje_id', mensajeId)
			.order('created_at', { ascending: true });

		if (respError) throw respError;

		return {
			...mensaje,
			respuestas: respuestas || []
		};
	}

	/**
	 * Crear un nuevo mensaje/ticket
	 */
	async crear(params: {
		clienteId: string;
		autorId: string;
		asunto: string;
		contenido: string;
		tipo?: string;
		automatizacionId?: string;
	}) {
		const { data, error } = await this.supabase
			.from('mensajes')
			.insert({
				cliente_id: params.clienteId,
				autor_id: params.autorId,
				asunto: params.asunto,
				contenido: params.contenido,
				tipo: params.tipo || 'general',
				automatizacion_id: params.automatizacionId || null,
				estado: 'abierto',
				leido_por_admin: false,
				leido_por_cliente: true // El autor ya lo "leyó"
			})
			.select()
			.single();

		if (error) throw error;
		return data;
	}

	/**
	 * Responder a un mensaje existente
	 */
	async responder(mensajeId: string, autorId: string, contenido: string) {
		const { data, error } = await this.supabase
			.from('respuestas_mensaje')
			.insert({
				mensaje_id: mensajeId,
				autor_id: autorId,
				contenido
			})
			.select()
			.single();

		if (error) throw error;

		// Actualizar estado del mensaje a "en_proceso" si estaba "abierto"
		await this.supabase
			.from('mensajes')
			.update({
				estado: 'en_proceso',
				leido_por_cliente: false // Nueva respuesta, marcar como no leída para cliente
			})
			.eq('id', mensajeId)
			.eq('estado', 'abierto');

		return data;
	}

	/**
	 * Cambiar estado de un mensaje
	 */
	async cambiarEstado(
		mensajeId: string,
		nuevoEstado: 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado'
	) {
		const { data, error } = await this.supabase
			.from('mensajes')
			.update({ estado: nuevoEstado })
			.eq('id', mensajeId)
			.select()
			.single();

		if (error) throw error;
		return data;
	}

	/**
	 * Marcar mensaje como leído
	 */
	async marcarLeido(mensajeId: string, porAdmin: boolean) {
		const campo = porAdmin ? 'leido_por_admin' : 'leido_por_cliente';

		const { error } = await this.supabase
			.from('mensajes')
			.update({ [campo]: true })
			.eq('id', mensajeId);

		if (error) throw error;
	}

	/**
	 * Contar mensajes no leídos (para badges)
	 */
	async contarNoLeidos(params: { clienteId?: string; porAdmin?: boolean }): Promise<number> {
		const campo = params.porAdmin ? 'leido_por_admin' : 'leido_por_cliente';

		let query = this.supabase
			.from('mensajes')
			.select('*', { count: 'exact', head: true })
			.eq(campo, false);

		if (params.clienteId) {
			query = query.eq('cliente_id', params.clienteId);
		}

		const { count, error } = await query;

		if (error) throw error;
		return count || 0;
	}
}