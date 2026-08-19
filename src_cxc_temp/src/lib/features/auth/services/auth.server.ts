// ============================================================
// ARCHIVO: src/lib/features/auth/services/auth.server.ts


import { fail, setError } from 'sveltekit-superforms';
import { redirect, type RequestEvent } from '@sveltejs/kit';
import type { SuperValidated } from 'sveltekit-superforms';
import type { z } from 'zod';
import { loginSchema, registerSchema, type RegisterSchema } from '../schemas/auth';
import { AUTH_REDIRECT_PATHS } from '$lib/features/auth/config/auth';
import { supabaseAdmin } from '$lib/features/auth/config/supabase-admin';

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = RegisterSchema;

/**
 * Handles user login (sin cambios)
 */
export async function handleLogin(event: RequestEvent, form: SuperValidated<LoginFormData>) {
	if (!form.valid) {
		return fail(400, { form });
	}

	const supabase = event.locals.supabase;
	const { email, password } = form.data;

	// PASO 1: Autenticar
	const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
		email,
		password
	});

	if (signInError) {
		const errorMessage =
			signInError.message === 'Invalid login credentials'
				? 'Email o contraseña incorrectos'
				: 'Ocurrió un error durante el inicio de sesión. Por favor, intenta de nuevo más tarde.';
		return setError(form, '', errorMessage);
	}

	// PASO 2: Verificar si baneado
	if (signInData?.user) {
		const userId = signInData.user.id;

		try {
			const { data: perfil, error: perfilError } = await supabase
				.from('perfiles')
				.select('esta_baneado, email')
				.eq('id', userId)
				.single();

			if (perfilError) {
				console.error('Error al verificar perfil:', perfilError);
				await supabase.auth.signOut();
				return setError(form, '', 'Ocurrió un error. Por favor, intenta de nuevo más tarde.');
			}

			if (perfil?.esta_baneado) {
				console.log(`🚫 Usuario baneado intentó iniciar sesión: ${perfil.email}`);
				await supabase.auth.signOut();
				return setError(
					form,
					'',
					'Tu cuenta ha sido suspendida. Por favor, contacta a soporte para más información.'
				);
			}
		} catch (error) {
			console.error('Error inesperado al verificar perfil:', error);
			await supabase.auth.signOut();
			return setError(form, '', 'Ocurrió un error. Por favor, intenta de nuevo más tarde.');
		}
	}

	// PASO 3: Redirect
	throw redirect(303, AUTH_REDIRECT_PATHS.SUCCESS.LOGIN);
}

/**
 * Handles user registration con campos nuevos del perfil + solicitud de acceso
 */
export async function handleRegister(
	event: RequestEvent,
	form: SuperValidated<RegisterFormData>
) {
	if (!form.valid) {
		return fail(400, { form });
	}

	const {
		email,
		password,
		nombre_completo,
		empresa,
		cargo,
		telefono,
		solicitar_acceso,
		cliente_id,
		mensaje_solicitud
	} = form.data;

	// PASO 1: Verificar email existente
	try {
		const { data: existingUser, error: getUserError } =
			await supabaseAdmin.auth.admin.getUserByEmail(email);

		if (existingUser && existingUser.user) {
			return setError(form, 'email', 'Este correo electrónico ya está registrado');
		}

		if (getUserError && !getUserError.message.includes('User not found')) {
			return setError(form, '', 'Ocurrió un error. Por favor, intenta de nuevo más tarde.');
		}
	} catch (error) {
		return setError(form, '', 'Ocurrió un error. Por favor, intenta de nuevo más tarde.');
	}

	// PASO 2: Crear usuario
	const supabase = event.locals.supabase;

	const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
		email,
		password,
		options: {
			data: {
				nombre_completo,
				created_at: new Date().toISOString()
			}
		}
	});

	if (signUpError) {
		let errorMessage = 'Error al crear la cuenta';

		if (signUpError.message.includes('already registered')) {
			errorMessage = 'Este correo electrónico ya está registrado';
		} else if (signUpError.message.includes('password')) {
			errorMessage = 'La contraseña no cumple con los requisitos';
		}

		return setError(
			form,
			signUpError.message.includes('already registered') ? 'email' : 'password',
			errorMessage
		);
	}

	// PASO 3: Crear perfil
	if (signUpData?.user) {
		const userId = signUpData.user.id;

		try {
			await supabaseAdmin.from('perfiles').upsert(
				{
					id: userId,
					nombre_completo: nombre_completo || null,
					empresa: empresa || null,
					cargo: cargo || null,
					telefono: telefono || null,
					es_admin: false,
					esta_baneado: false
				},
				{ onConflict: 'id' }
			);

			// PASO 4: Crear solicitud de acceso si aplica
			if (solicitar_acceso && cliente_id && cliente_id !== '') {
				await supabaseAdmin.from('solicitudes_acceso').insert({
					user_id: userId,
					cliente_id: cliente_id,
					estado: 'pendiente',
					mensaje: mensaje_solicitud || null
				});

				console.log(
					`[auth.server.ts] ✓ Solicitud creada: user ${userId} → cliente ${cliente_id}`
				);
			}
		} catch (err) {
			console.error('[auth.server.ts] Error en post-registro:', err);
		}
	}

	throw redirect(303, AUTH_REDIRECT_PATHS.SUCCESS.REGISTER);
}