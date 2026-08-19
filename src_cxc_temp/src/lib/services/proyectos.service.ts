/**
 * @module ProyectosService
 * @description Servicio para interactuar con proyectos_software
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProyectoSoftware } from '$lib/types/database';

export class ProyectosService {
	constructor(private supabase: SupabaseClient) {}

	/**
	 * Obtener todos los proyectos de un cliente
	 */
	async getByCliente(clienteId: string): Promise<ProyectoSoftware[]> {
		const { data, error } = await this.supabase
			.from('proyectos_software')
			.select('*, cliente:clientes(*)')
			.eq('cliente_id', clienteId)
			.order('nombre', { ascending: true });

		if (error) throw error;
		return data || [];
	}

	/**
	 * Obtener todos los proyectos (solo para administradores)
	 */
	async getAll(): Promise<ProyectoSoftware[]> {
		const { data, error } = await this.supabase
			.from('proyectos_software')
			.select('*, cliente:clientes(*)')
			.order('nombre', { ascending: true });

		if (error) throw error;
		return data || [];
	}

	/**
	 * Obtener un proyecto por ID
	 */
	async getById(id: string): Promise<ProyectoSoftware | null> {
		const { data, error } = await this.supabase
			.from('proyectos_software')
			.select('*, cliente:clientes(*)')
			.eq('id', id)
			.single();

		if (error) throw error;
		return data;
	}

	/**
	 * Crear un nuevo proyecto
	 */
	async create(
		proyecto: Omit<ProyectoSoftware, 'id' | 'created_at' | 'updated_at'>
	): Promise<ProyectoSoftware> {
		const { data, error } = await this.supabase
			.from('proyectos_software')
			.insert(proyecto)
			.select()
			.single();

		if (error) throw error;
		return data;
	}

	/**
	 * Actualizar un proyecto
	 */
	async update(id: string, updates: Partial<ProyectoSoftware>): Promise<ProyectoSoftware> {
		const { data, error } = await this.supabase
			.from('proyectos_software')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return data;
	}

	/**
	 * Eliminar un proyecto
	 */
	async delete(id: string): Promise<void> {
		const { error } = await this.supabase.from('proyectos_software').delete().eq('id', id);
		if (error) throw error;
	}
}
