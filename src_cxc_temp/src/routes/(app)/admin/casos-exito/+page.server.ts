import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	const [{ data: casos }, { data: clientes }] = await Promise.all([
		supabase
			.from('casos_exito')
			.select(`
				id, titulo, descripcion, industria, tipo_automatizacion,
				metricas_publicas, imagen_url, esta_publicado, orden,
				mostrar_cliente, cliente_id,
				clientes ( id, nombre, logo_url )
			`)
			.order('orden', { ascending: true }),
		supabase
			.from('clientes')
			.select('id, nombre')
			.eq('esta_activo', true)
			.order('nombre', { ascending: true })
	]);

	return { session, user, casos: casos ?? [], clientes: clientes ?? [] };
};

export const actions: Actions = {

	crear: async ({ request, locals: { supabase } }) => {
		const form = await request.formData();
		const stats = parseStats(form.get('stats') as string);

		const { error } = await supabase.from('casos_exito').insert({
			titulo:             (form.get('titulo')       as string)?.trim(),
			descripcion:        (form.get('descripcion')  as string)?.trim(),
			industria:          (form.get('industria')    as string)?.trim() || null,
			tipo_automatizacion:(form.get('tipo')         as string) || null,
			imagen_url:         (form.get('imagen_url')   as string)?.trim() || null,
			esta_publicado:      form.get('esta_publicado') === 'true',
			mostrar_cliente:     form.get('mostrar_cliente') === 'true',
			cliente_id:         (form.get('cliente_id')  as string) || null,
			orden:              parseInt(form.get('orden') as string) || 0,
			metricas_publicas: {
				icon:  (form.get('icon') as string)?.trim() || '⚡',
				stats
			}
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	editar: async ({ request, locals: { supabase } }) => {
		const form = await request.formData();
		const id   = form.get('id') as string;
		if (!id) return fail(400, { error: 'ID requerido' });

		const stats = parseStats(form.get('stats') as string);

		const { error } = await supabase.from('casos_exito').update({
			titulo:             (form.get('titulo')       as string)?.trim(),
			descripcion:        (form.get('descripcion')  as string)?.trim(),
			industria:          (form.get('industria')    as string)?.trim() || null,
			tipo_automatizacion:(form.get('tipo')         as string) || null,
			imagen_url:         (form.get('imagen_url')   as string)?.trim() || null,
			esta_publicado:      form.get('esta_publicado') === 'true',
			mostrar_cliente:     form.get('mostrar_cliente') === 'true',
			cliente_id:         (form.get('cliente_id')  as string) || null,
			orden:              parseInt(form.get('orden') as string) || 0,
			metricas_publicas: {
				icon:  (form.get('icon') as string)?.trim() || '⚡',
				stats
			},
			updated_at: new Date().toISOString()
		}).eq('id', id);

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	togglePublicado: async ({ request, locals: { supabase } }) => {
		const form          = await request.formData();
		const id            = form.get('id') as string;
		const esta_publicado = form.get('esta_publicado') === 'true';
		const { error }     = await supabase.from('casos_exito').update({ esta_publicado }).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	eliminar: async ({ request, locals: { supabase } }) => {
		const form = await request.formData();
		const id   = form.get('id') as string;
		const { error } = await supabase.from('casos_exito').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},
};

function parseStats(raw: string | null): { valor: string; label: string }[] {
	if (!raw) return [];
	try { return JSON.parse(raw); } catch { return []; }
}