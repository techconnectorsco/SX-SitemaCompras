// ARCHIVO: src/routes/(app)/admin/solicitudes/+page.server.ts

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { SolicitudesService } from '$lib/services/solicitudes.service';

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

	// Cargar solicitudes
	try {
		const solicitudesService = new SolicitudesService(locals.supabase);
		const solicitudes = await solicitudesService.getAll();

		return {
			solicitudes
		};
	} catch (error) {
		console.error('[admin/solicitudes] Load error:', error);
		return {
			solicitudes: [],
			error: 'Error cargando solicitudes'
		};
	}
};

export const actions = {
	aprobar: async ({ locals, request }) => {
		const { session } = await locals.safeGetSession();

		if (!session) {
			return { error: 'No autenticado' };
		}

		const formData = await request.formData();
		const solicitudId = formData.get('solicitudId') as string;

		try {
			const solicitudesService = new SolicitudesService(locals.supabase);
			const resultado = await solicitudesService.aprobar(solicitudId, session.user.id);

			return { success: true, resultado };
		} catch (error) {
			console.error('[admin/solicitudes] Aprobar error:', error);
			return { error: error instanceof Error ? error.message : 'Error al aprobar' };
		}
	},

	rechazar: async ({ locals, request }) => {
		const { session } = await locals.safeGetSession();

		if (!session) {
			return { error: 'No autenticado' };
		}

		const formData = await request.formData();
		const solicitudId = formData.get('solicitudId') as string;
		const notas = formData.get('notas') as string;

		try {
			const solicitudesService = new SolicitudesService(locals.supabase);
			const resultado = await solicitudesService.rechazar(
				solicitudId,
				session.user.id,
				notas
			);

			return { success: true, resultado };
		} catch (error) {
			console.error('[admin/solicitudes] Rechazar error:', error);
			return { error: error instanceof Error ? error.message : 'Error al rechazar' };
		}
	}
};