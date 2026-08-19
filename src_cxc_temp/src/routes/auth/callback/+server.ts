import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') ?? '/';

	if (code) {
		// ============================================
		// PASO 1: Intercambiar código por sesión
		// ============================================
		const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
		
		if (error) {
			console.error('Auth Exchange Error:', error);
			// ✅ Codificar mensaje en español
			const errorMsg = encodeURIComponent('Error de autenticación');
			throw redirect(303, `/auth/error?message=${errorMsg}`);
		}

		// ============================================
		// PASO 2: Verificar si el usuario está baneado
		// ============================================
		if (sessionData?.user) {
			const userId = sessionData.user.id;
			
			try {
				const { data: perfil, error: perfilError } = await supabase
					.from('perfiles')
					.select('esta_baneado, email')
					.eq('id', userId)
					.maybeSingle();

				if (perfilError) {
					console.error('Error al verificar perfil:', perfilError);
					// No bloqueamos el login por un error de lectura, a menos que sea crítico
				}

				// Si el usuario está baneado, cerrar sesión y mostrar error
				if (perfil?.esta_baneado) {
					// console.log(`🚫 Usuario baneado intentó iniciar sesión con OAuth: ${perfil.email}`);
					
					// Cerrar la sesión que acabamos de crear
					await supabase.auth.signOut();
					
					// ✅ Codificar mensaje en español
					const errorMsg = encodeURIComponent('Tu cuenta ha sido suspendida. Por favor, contacta a soporte para más información.');
					throw redirect(303, `/auth/error?message=${errorMsg}`);
				}
			} catch (error) {
				console.error('Error inesperado al verificar perfil:', error);
				
				// ⚠️ IMPORTANTE: Solo hacer signOut si el error NO es un redirect
				if (!(error instanceof Error && error.message.includes('Redirect'))) {
					await supabase.auth.signOut();
				}
				
				// Si el error ya era un redirect, re-lanzarlo
				if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
					throw error;
				}
				
				// Si es otro tipo de error, crear redirect con mensaje codificado
				const errorMsg = encodeURIComponent('Ocurrió un error. Por favor, intenta de nuevo.');
				throw redirect(303, `/auth/error?message=${errorMsg}`);
			}
		}

		// ============================================
		// PASO 3: Si todo está bien, redirigir
		// ============================================
		throw redirect(303, next);
	}

	// Si no hay código, redirigir a error
	const errorMsg = encodeURIComponent('Código de autenticación inválido');
	throw redirect(303, `/auth/error?message=${errorMsg}`);
};