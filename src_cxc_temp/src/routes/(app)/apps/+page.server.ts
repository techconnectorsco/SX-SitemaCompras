import type { PageServerLoad } from './$types';
import { getUserPerfil } from '$lib/server/supabase-admin';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	const perfil    = user ? await getUserPerfil(user.id) : null;
	const esAdmin   = perfil?.es_admin === true;
	const clienteId = perfil?.cliente_id ?? null;

	// ── Detectar estado del dominio del usuario ───────────────────
	type AccesoEstado = 'sin_sesion' | 'con_acceso' | 'dominio_valido_sin_solicitud' | 'dominio_invalido' | 'solicitud_pendiente';
	let accesoEstado: AccesoEstado = 'sin_sesion';
	let dominioCliente: string | null = null;

	if (user) {
    if (esAdmin || clienteId) {
        accesoEstado = 'con_acceso';
    } else {
			// Extraer dominio del email
			const emailDominio = user.email?.split('@')[1] ?? '';

			// Buscar si ese dominio está registrado
			const { data: dominioData } = await supabase
				.from('dominios_empresa')
				.select('dominio, cliente_id, clientes(nombre)')
				.eq('dominio', emailDominio)
				.eq('esta_activo', true)
				.single();

			if (dominioData) {
				dominioCliente = (dominioData.clientes as any)?.nombre ?? null;

				// Verificar si ya tiene solicitud pendiente
				const { data: solicitud } = await supabase
					.from('solicitudes_acceso')
					.select('id, estado')
					.eq('user_id', user.id)
					.in('estado', ['pendiente', 'en_revision'])
					.limit(1)
					.single();

				accesoEstado = solicitud ? 'solicitud_pendiente' : 'dominio_valido_sin_solicitud';
			} else {
				accesoEstado = 'dominio_invalido';
			}
		}
	}

	// ── Datos principales ─────────────────────────────────────────
	const { data: casos } = await supabase
		.from('casos_exito')
		.select(`
			id, titulo, descripcion, industria,
			tipo_automatizacion, metricas_publicas,
			imagen_url, orden, mostrar_cliente,
			clientes ( id, nombre, slug, logo_url )
		`)
		.eq('esta_publicado', true)
		.order('orden', { ascending: true });

	const { data: proyectos } = await supabase
		.from('proyectos_software')
		.select('id, nombre, url_acceso, captura_pantalla_url, tecnologias, estado, cliente_id');

	const proyectoMap: Record<string, any> = {};
	proyectos?.forEach((p: any) => {
		if (p.cliente_id) proyectoMap[p.cliente_id] = p;
	});

	return {
		session,
		user,
		esAdmin,
		clienteId,
		accesoEstado,
		dominioCliente,
		casos:       casos ?? [],
		proyectoMap
	};
};