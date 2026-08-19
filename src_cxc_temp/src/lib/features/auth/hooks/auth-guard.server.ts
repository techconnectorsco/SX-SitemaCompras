
// ARCHIVO: src/lib/features/auth/hooks/auth-guard.server.ts


import { type Handle, redirect, error } from '@sveltejs/kit';
import { AUTH_PATHS, AUTH_REDIRECT_PATHS } from '../config/auth';

// Rutas que requieren tener un cliente_id asignado (aprobado por admin)
const RUTAS_REQUIEREN_CLIENTE = ['/robots', '/mensajes'];

export const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	const pathname = event.url.pathname;

	// ============================================
	// 1. Proteger rutas bajo /private
	// ============================================
	if (!session && pathname.startsWith('/private')) {
		throw redirect(303, AUTH_PATHS.LOGIN);
	}

	// ============================================
	// 2. Proteger rutas de admin (UI)
	// ============================================
	if (pathname.startsWith('/admin')) {
		if (!session) {
			throw redirect(303, `${AUTH_PATHS.LOGIN}&redirect=${encodeURIComponent(pathname)}`);
		}

		const { data: perfil } = await event.locals.supabase
			.from('perfiles')
			.select('es_admin')
			.eq('id', user!.id)
			.maybeSingle();

		if (!perfil?.es_admin) {
			throw redirect(303, '/');
		}
	}

	// ============================================
	// 3. Proteger rutas de admin (API)
	// ============================================
	if (pathname.startsWith('/api/admin')) {
		if (!session) {
			throw error(401, 'No autorizado');
		}

		const { data: perfil } = await event.locals.supabase
			.from('perfiles')
			.select('es_admin')
			.eq('id', user!.id)
			.maybeSingle();

		if (!perfil?.es_admin) {
			throw error(403, 'Acceso denegado');
		}
	}

	// ============================================
	// 4. Proteger rutas que requieren cliente_id
	//    (/robots, /robots/*, /mensajes)
	// ============================================
	const requiereCliente = RUTAS_REQUIEREN_CLIENTE.some(
		(ruta) => pathname === ruta || pathname.startsWith(ruta + '/')
	);

	if (requiereCliente) {
		if (!session) {
			throw redirect(303, `${AUTH_PATHS.LOGIN}&redirect=${encodeURIComponent(pathname)}`);
		}

		// Verificar si tiene cliente_id asignado o es admin
		const { data: perfil } = await event.locals.supabase
			.from('perfiles')
			.select('es_admin, cliente_id')
			.eq('id', user!.id)
			.maybeSingle();

		const esAdmin = perfil?.es_admin === true;
		const tieneCliente =
			perfil?.cliente_id != null || user?.user_metadata?.cliente_id != null;

		if (!esAdmin && !tieneCliente) {
			// Redirigir a página de solicitar acceso
			throw redirect(303, '/solicitar-acceso');
		}
	}

	// ============================================
	// 5. Proteger rutas de Químicas Unidas (UI + API)
	//    Solo accesible con es_qu === true o es_admin
	// ============================================
	const esRutaQU =
		pathname.startsWith('/quimicas_unidas') ||
		pathname.startsWith('/quimicas_unidas/api');

	if (esRutaQU) {
		if (!session) {
			// API: 401. UI: redirigir al login
			if (pathname.startsWith('/quimicas_unidas/api')) {
				throw error(401, 'No autorizado');
			}
			throw redirect(303, `${AUTH_PATHS.LOGIN}&redirect=${encodeURIComponent(pathname)}`);
		}

		const { data: perfil } = await event.locals.supabase
			.from('perfiles')
			.select('es_admin, es_qu')
			.eq('id', user!.id)
			.maybeSingle();

		const tieneAcceso = perfil?.es_admin === true || perfil?.es_qu === true;

		if (!tieneAcceso) {
			if (pathname.startsWith('/quimicas_unidas/api')) {
				throw error(403, 'Acceso denegado');
			}
			throw redirect(303, '/');
		}
	}

	// ============================================
	// 6. Proteger rutas bajo /(app) que requieren auth
	//    (dashboard, apps, solicitar-acceso, perfil)
	// ============================================
	const rutasApp = ['/solicitar-acceso', '/perfil', '/bots'];
	const requiereAuth = rutasApp.some(
		(ruta) => pathname === ruta || pathname.startsWith(ruta + '/')
	);

	if (requiereAuth && !session) {
		throw redirect(303, `${AUTH_PATHS.LOGIN}&redirect=${encodeURIComponent(pathname)}`);
	}

	// ============================================
	// 7. Redirigir usuarios autenticados fuera de /auth
	// ============================================
	if (session && pathname === '/auth') {
		throw redirect(303, AUTH_REDIRECT_PATHS.SUCCESS.LOGIN);
	}

	return resolve(event);
};