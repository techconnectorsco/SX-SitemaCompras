import type { PageServerLoad, Actions } from './$types';
import { getUserPerfil } from '$lib/server/supabase-admin';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	// Sin sesión — redirigir al login
	if (!user) throw redirect(303, '/auth?mode=login');

	const perfil    = await getUserPerfil(user.id);
	const esAdmin   = perfil?.es_admin === true;
	const clienteId = perfil?.cliente_id ?? null;

	// Admin o ya tiene acceso — no necesita solicitar
	if (esAdmin || clienteId) throw redirect(303, '/apps');

	// Detectar dominio
	const emailDominio = user.email?.split('@')[1] ?? '';

	const { data: dominioData } = await supabase
		.from('dominios_empresa')
		.select('dominio, cliente_id, clientes(id, nombre)')
		.eq('dominio', emailDominio)
		.eq('esta_activo', true)
		.single();

	// Verificar solicitud existente
	const { data: solicitudExistente } = await supabase
		.from('solicitudes_acceso')
		.select('id, estado, created_at')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	return {
		session,
		user,
		emailDominio,
		dominioValido:     !!dominioData,
		dominioCliente:    (dominioData?.clientes as any)?.nombre ?? null,
		dominioClienteId:  (dominioData?.clientes as any)?.id ?? null,
		solicitudExistente
	};
};

export const actions: Actions = {
	solicitar: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { error: 'No autenticado' });

		const form    = await request.formData();
		const mensaje = (form.get('mensaje') as string)?.trim() ?? '';
		const clienteId = form.get('cliente_id') as string;

		if (!clienteId) return fail(400, { error: 'Cliente no identificado' });

		// Verificar que no tenga ya una solicitud pendiente
		const { data: existing } = await supabase
			.from('solicitudes_acceso')
			.select('id, estado')
			.eq('user_id', user.id)
			.in('estado', ['pendiente', 'en_revision'])
			.maybeSingle();

		if (existing) {
			return fail(400, { error: 'Ya tienes una solicitud en proceso' });
		}

		const { error } = await supabase
			.from('solicitudes_acceso')
			.insert({
				user_id:    user.id,
				cliente_id: clienteId,
				estado:     'pendiente',
				mensaje:    mensaje || null
			});

		if (error) {
			console.error('[solicitar-acceso] Error:', error.message);
			return fail(500, { error: 'Error al enviar la solicitud. Intenta de nuevo.' });
		}

		return { success: true };
	}
};