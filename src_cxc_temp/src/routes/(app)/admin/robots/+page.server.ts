// ARCHIVO: src/routes/(app)/admin/robots/+page.server.ts

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { AutomatizacionesService } from '$lib/services/automatizaciones.service';
import { ClientesService } from '$lib/services/clientes.service';

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();

	// Verificar autenticación
	if (!session) {
		throw redirect(303, '/auth?mode=login');
	}

	// Verificar permisos de admin
	const { data: perfil, error: perfilError } = await locals.supabase
		.from('perfiles')
		.select('es_admin')
		.eq('id', session.user.id)
		.single();

	if (perfilError || !perfil?.es_admin) {
		throw redirect(303, '/dashboard');
	}

	try {
		// Obtener todos los robots y clientes
		const automatizacionesService = new AutomatizacionesService(locals.supabase);
		const clientesService = new ClientesService(locals.supabase);

		const [automatizaciones, clientes] = await Promise.all([
			automatizacionesService.getAll(),
			clientesService.getAll()
		]);

		// Enriquecer automatizaciones con nombre del cliente
		const robotsEnriquecidos = automatizaciones.map((auto) => ({
			...auto,
			clienteNombre: clientes.find((c) => c.id === auto.cliente_id)?.nombre || 'Cliente desconocido'
		}));

		return {
			robots: robotsEnriquecidos,
			clientes
		};
	} catch (error) {
		console.error('[admin/robots] Load error:', error);
		return {
			robots: [],
			clientes: [],
			error: 'Error cargando robots'
		};
	}
};