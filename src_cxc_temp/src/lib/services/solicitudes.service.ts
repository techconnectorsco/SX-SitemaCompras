
// ARCHIVO: src/lib/services/solicitudes.service.ts


import type { SupabaseClient } from '@supabase/supabase-js';

export class SolicitudesService {
	constructor(private supabase: SupabaseClient) {}

	/**
	 * Obtener solicitudes de un usuario específico
	 */
	async getByUser(userId: string) {
		const { data, error } = await this.supabase
			.from('solicitudes_acceso')
			.select(
				`
				id,
				cliente_id,
				estado,
				mensaje,
				notas_admin,
				created_at,
				updated_at,
				clientes:cliente_id (id, nombre, slug)
			`
			)
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (error) throw error;
		return data || [];
	}

	/**
	 * Obtener todas las solicitudes (admin) con filtro opcional por estado
	 */
	async getAll(filtroEstado?: 'pendiente' | 'aprobada' | 'rechazada') {
		let query = this.supabase.from('admin_solicitudes_pendientes').select('*');

		if (filtroEstado) {
			query = query.eq('estado', filtroEstado);
		}

		const { data, error } = await query;

		if (error) throw error;
		return data || [];
	}

	/**
	 * Obtener cantidad de solicitudes pendientes (para badge del admin)
	 */
	async contarPendientes(): Promise<number> {
		const { count, error } = await this.supabase
			.from('solicitudes_acceso')
			.select('*', { count: 'exact', head: true })
			.eq('estado', 'pendiente');

		if (error) throw error;
		return count || 0;
	}

	/**
	 * Crear una nueva solicitud de acceso
	 */
	async crear(userId: string, clienteId: string, mensaje?: string) {
		const { data, error } = await this.supabase
			.from('solicitudes_acceso')
			.insert({
				user_id: userId,
				cliente_id: clienteId,
				estado: 'pendiente',
				mensaje: mensaje || null
			})
			.select()
			.single();

		if (error) throw error;
		return data;
	}

	/**
	 * Aprobar solicitud — usa función SQL para transacción atómica
	 * (actualiza solicitud + perfil + user_metadata de una vez)
	 */
	async aprobar(solicitudId: string, adminId: string) {
		const { data, error } = await this.supabase.rpc('aprobar_solicitud', {
			p_solicitud_id: solicitudId,
			p_admin_id: adminId
		});

		if (error) throw error;
		return data;
	}

	/**
	 * Rechazar solicitud
	 */
	async rechazar(solicitudId: string, adminId: string, notas?: string) {
		const { data, error } = await this.supabase.rpc('rechazar_solicitud', {
			p_solicitud_id: solicitudId,
			p_admin_id: adminId,
			p_notas: notas || null
		});

		if (error) throw error;
		return data;
	}
}