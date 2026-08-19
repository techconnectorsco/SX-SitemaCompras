import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

/**
 * Cliente de Supabase con service role — bypasea RLS.
 * Usar solo en endpoints del servidor con autorización explícita.
 */
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Obtiene el perfil de un usuario desde la tabla perfiles.
 * Fuente de verdad para es_admin y esta_baneado.
 */
export async function getUserPerfil(userId: string): Promise<{ 
	es_admin: boolean; 
	esta_baneado: boolean;
	cliente_id: string | null;
} | null> {
	const { data } = await supabaseAdmin
		.from('perfiles')
		.select('es_admin, esta_baneado, cliente_id')
		.eq('id', userId)
		.single();
	return data ?? null;
}
