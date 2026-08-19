import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// =====================================================
// GET - Obtener todos los usuarios con estadísticas
// =====================================================
export const GET: RequestHandler = async ({ url }) => {
	try {
		const busqueda = url.searchParams.get('busqueda') || '';
		const filtroAdmin = url.searchParams.get('filtro_admin') || 'todos';
		const filtroBaneado = url.searchParams.get('filtro_baneado') || 'todos';

		let query = supabase.from('admin_estadisticas_usuarios').select('*');

		// Aplicar filtros
		if (busqueda) {
			query = query.or(
				`nombre_completo.ilike.%${busqueda}%,email.ilike.%${busqueda}%`
			);
		}

		if (filtroAdmin === 'admin') {
			query = query.eq('es_admin', true);
		} else if (filtroAdmin === 'usuario') {
			query = query.eq('es_admin', false);
		}

		if (filtroBaneado === 'baneado') {
			query = query.eq('esta_baneado', true);
		} else if (filtroBaneado === 'activo') {
			query = query.eq('esta_baneado', false);
		}

		query = query.order('fecha_creacion', { ascending: false });

		const { data: usuarios, error } = await query;

		if (error) {
			console.error('Error al obtener usuarios:', error);
			return json({ error: 'Error al cargar usuarios' }, { status: 500 });
		}

		return json({
			success: true,
			usuarios
		});
	} catch (error: any) {
		console.error('💥 Error en GET usuarios:', error);
		return json({ error: error.message }, { status: 500 });
	}
};

// =====================================================
// PATCH - Actualizar usuario (banear, hacer admin, etc)
// =====================================================
export const PATCH: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { usuario_id, campo, valor } = body;

		if (!usuario_id || !campo) {
			return json({ error: 'Faltan parámetros' }, { status: 400 });
		}

		// Validar que solo se puedan cambiar campos permitidos
		const camposPermitidos = ['es_admin', 'esta_baneado'];
		if (!camposPermitidos.includes(campo)) {
			return json({ error: 'Campo no permitido' }, { status: 400 });
		}

		const { error } = await supabase
			.from('perfiles')
			.update({ [campo]: valor })
			.eq('id', usuario_id);

		if (error) {
			console.error('Error al actualizar usuario:', error);
			return json({ error: 'Error al actualizar usuario' }, { status: 500 });
		}

		return json({
			success: true,
			message: 'Usuario actualizado correctamente'
		});
	} catch (error: any) {
		console.error('💥 Error en PATCH usuario:', error);
		return json({ error: error.message }, { status: 500 });
	}
};