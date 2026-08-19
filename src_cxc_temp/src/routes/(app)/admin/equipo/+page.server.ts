import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	const { data: equipo } = await supabase
		.from('equipo')
		.select('id, nombre, cargo, descripcion, email, foto_url, color, orden, visible, esta_activo, redes_sociales')
		.order('orden', { ascending: true });

	return { session, user, equipo: equipo ?? [] };
};

export const actions: Actions = {

	// ── Crear ─────────────────────────────────────────────────────
	crear: async ({ request, locals: { supabase } }) => {
		const form = await request.formData();

		const redes = parseRedes(form.get('redes_sociales') as string);

		const { error } = await supabase.from('equipo').insert({
			nombre:        (form.get('nombre')      as string)?.trim(),
			cargo:         (form.get('cargo')       as string)?.trim(),
			descripcion:   (form.get('descripcion') as string)?.trim() || null,
			email:         (form.get('email')       as string)?.trim() || null,
			foto_url:      (form.get('foto_url')    as string)?.trim() || null,
			color:         (form.get('color')       as string) ?? '#3b82f6',
			orden:         parseInt(form.get('orden') as string) || 0,
			visible:       form.get('visible')   === 'true',
			esta_activo:   form.get('esta_activo') === 'true',
			redes_sociales: redes
		});

		if (error) return fail(500, { error: error.message });
		return { success: true, action: 'crear' };
	},

	// ── Editar ────────────────────────────────────────────────────
	editar: async ({ request, locals: { supabase } }) => {
		const form = await request.formData();
		const id   = form.get('id') as string;
		if (!id) return fail(400, { error: 'ID requerido' });

		const redes = parseRedes(form.get('redes_sociales') as string);

		const { error } = await supabase.from('equipo').update({
			nombre:        (form.get('nombre')      as string)?.trim(),
			cargo:         (form.get('cargo')       as string)?.trim(),
			descripcion:   (form.get('descripcion') as string)?.trim() || null,
			email:         (form.get('email')       as string)?.trim() || null,
			foto_url:      (form.get('foto_url')    as string)?.trim() || null,
			color:         (form.get('color')       as string) ?? '#3b82f6',
			orden:         parseInt(form.get('orden') as string) || 0,
			visible:       form.get('visible')    === 'true',
			esta_activo:   form.get('esta_activo') === 'true',
			redes_sociales: redes,
			updated_at:    new Date().toISOString()
		}).eq('id', id);

		if (error) return fail(500, { error: error.message });
		return { success: true, action: 'editar' };
	},

	// ── Toggle visible ────────────────────────────────────────────
	toggleVisible: async ({ request, locals: { supabase } }) => {
		const form    = await request.formData();
		const id      = form.get('id') as string;
		const visible = form.get('visible') === 'true';
		const { error } = await supabase.from('equipo').update({ visible }).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── Toggle activo ─────────────────────────────────────────────
	toggleActivo: async ({ request, locals: { supabase } }) => {
		const form       = await request.formData();
		const id         = form.get('id') as string;
		const esta_activo = form.get('esta_activo') === 'true';
		const { error }  = await supabase.from('equipo').update({ esta_activo }).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── Eliminar ──────────────────────────────────────────────────
	eliminar: async ({ request, locals: { supabase } }) => {
		const form = await request.formData();
		const id   = form.get('id') as string;
		const { error } = await supabase.from('equipo').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true, action: 'eliminar' };
	},
};

// Helper — parsear redes_sociales desde JSON string del form
function parseRedes(raw: string | null): any[] {
	if (!raw) return [];
	try { return JSON.parse(raw); } catch { return []; }
}