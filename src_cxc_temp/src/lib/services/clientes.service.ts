/**
 * @module ClientesService
 * @description Servicio para interactuar con la tabla clientes
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Cliente } from '$lib/types/database';

export class ClientesService {
	constructor(private supabase: SupabaseClient) {}

	/**
	 * Obtener todos los clientes (solo para administradores)
	 */
	async getAll(): Promise<Cliente[]> {
		const { data, error } = await this.supabase
			.from('clientes')
			.select('*')
			.order('nombre', { ascending: true });

		if (error) throw error;
		return data || [];
	}

	/**
	 * Obtener un cliente por ID
	 */
	async getById(id: string): Promise<Cliente | null> {
		const { data, error } = await this.supabase
			.from('clientes')
			.select('*')
			.eq('id', id)
			.single();

		if (error) throw error;
		return data;
	}

	/**
	 * Obtener un cliente por slug
	 */
	async getBySlug(slug: string): Promise<Cliente | null> {
		const { data, error } = await this.supabase
			.from('clientes')
			.select('*')
			.eq('slug', slug)
			.single();

		if (error) throw error;
		return data;
	}

	/**
	 * Crear un nuevo cliente
	 */
	async create(cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Promise<Cliente> {
		const { data, error } = await this.supabase
			.from('clientes')
			.insert(cliente)
			.select()
			.single();

		if (error) throw error;
		return data;
	}

	/**
	 * Actualizar un cliente
	 */
	async update(id: string, updates: Partial<Cliente>): Promise<Cliente> {
		const { data, error } = await this.supabase
			.from('clientes')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return data;
	}

	/**
	 * Eliminar un cliente
	 */
	async delete(id: string): Promise<void> {
		const { error } = await this.supabase.from('clientes').delete().eq('id', id);
		if (error) throw error;
	}
}
