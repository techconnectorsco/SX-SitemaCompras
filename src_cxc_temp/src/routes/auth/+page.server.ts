// ============================================================
// ARCHIVO: src/routes/auth/+page.server.ts


import { redirect, type Actions } from '@sveltejs/kit';
import { loginSchema, registerSchema } from '$lib/features/auth/schemas/auth';
import { message, superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';
import type { RequestEvent } from '@sveltejs/kit';
import { AUTH_REDIRECT_PATHS } from '$lib/features/auth/config/auth';
import { supabaseAdmin } from '$lib/features/auth/config/supabase-admin';

// ============================================================
// LOAD: Inicializa forms + carga lista de clientes
// ============================================================
export const load: PageServerLoad = async ({ parent, url }) => {
	const parentData = await parent();

	// Redirect si ya está logueado
	if (parentData.session) {
		throw redirect(303, AUTH_REDIRECT_PATHS.SUCCESS.LOGIN);
	}

	const mode = url.searchParams.get('mode');

	// Inicializar ambos forms
	const loginForm = await superValidate(zod(loginSchema));
	const registerForm = await superValidate(zod(registerSchema));

	// Cargar lista de clientes para el select de registro
	let clientes: Array<{ id: string; nombre: string }> = [];
	try {
		const { data, error } = await supabaseAdmin
			.from('clientes')
			.select('id, nombre')
			.order('nombre');

		if (!error && data) {
			clientes = data;
		}
	} catch (err) {
		console.error('[auth/+page.server.ts] Error cargando clientes:', err);
	}

	return {
		...parentData,
		form: mode === 'register' ? registerForm : loginForm,
		clientes
	};
};

// ============================================================
// ACTIONS
// ============================================================
export const actions: Actions = {
	// ========== LOGIN (sin cambios) ==========
	login: async ({ request, locals: { supabase }, url }: RequestEvent) => {
		const form = await superValidate(request, zod(loginSchema));

		if (!form.valid) {
			return message(form, 'Por favor revisa los errores en el formulario');
		}

		// PASO 1: Autenticar
		const { data: signInData, error } = await supabase.auth.signInWithPassword({
			email: form.data.email,
			password: form.data.password
		});

		if (error) {
			const errorMessage =
				error.message === 'Invalid login credentials'
					? 'Email o contraseña incorrectos'
					: 'Ocurrió un error durante el inicio de sesión. Por favor, intenta de nuevo más tarde.';
			return message(form, errorMessage, { status: 400 });
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
					return message(form, 'Ocurrió un error. Por favor, intenta de nuevo más tarde.', {
						status: 500
					});
				}

				if (perfil?.esta_baneado) {
					await supabase.auth.signOut();
					return message(
						form,
						'Tu cuenta ha sido suspendida. Por favor, contacta a soporte para más información.',
						{ status: 403 }
					);
				}
			} catch (error) {
				console.error('Error inesperado al verificar perfil:', error);
				await supabase.auth.signOut();
				return message(form, 'Ocurrió un error. Por favor, intenta de nuevo más tarde.', {
					status: 500
				});
			}
		}

		// PASO 3: Redirect
		const redirectTo = url.searchParams.get('redirect');
		if (redirectTo) {
			throw redirect(303, redirectTo);
		}

		return message(form, 'Inicio de sesión exitoso');
	},

	// ========== REGISTER (modificado con campos nuevos) ==========
	register: async ({ request, locals: { supabase } }: RequestEvent) => {
		const form = await superValidate(request, zod(registerSchema));

		console.log('========== DEBUG REGISTRO ==========');
		console.log('[PASO 0] form.valid:', form.valid);
		console.log('[PASO 0] form.data completo:', JSON.stringify(form.data, null, 2));
		console.log('[PASO 0] form.errors:', form.errors);

		if (!form.valid) {
			console.log('[ERROR] Formulario no válido. Errores:', form.errors);
			return message(form, 'Por favor revisa los errores en el formulario');
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

		console.log('[PASO 0.5] Valores desestructurados:');
		console.log('  - email:', email);
		console.log('  - nombre_completo:', nombre_completo);
		console.log('  - nombre_completo type:', typeof nombre_completo);
		console.log('  - nombre_completo === null:', nombre_completo === null);
		console.log('  - nombre_completo === undefined:', nombre_completo === undefined);
		console.log('  - nombre_completo === "":', nombre_completo === '');
		console.log('  - empresa:', empresa);
		console.log('  - cargo:', cargo);
		console.log('  - telefono:', telefono);

		// ============================================
		// PASO 1: Verificar email existente
		// ============================================
		try {
			const { data: userData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

			if (listError) {
				console.error('[auth/+page.server.ts] Error listing users:', listError);
				return message(form, 'Ocurrió un error. Por favor, intenta de nuevo más tarde.', {
					status: 500
				});
			}

			const existingUser = userData?.users?.find(
				(user) => user.email?.toLowerCase() === email.toLowerCase()
			);

			if (existingUser) {
				return setError(form, 'email', 'Este correo electrónico ya está registrado');
			}
		} catch (error) {
			console.error('[auth/+page.server.ts] Unexpected error during email check:', error);
			return message(form, 'Ocurrió un error. Por favor, intenta de nuevo más tarde.', {
				status: 500
			});
		}

		// ============================================
		// PASO 2: Crear usuario en Supabase Auth
		// ============================================
		const siteUrl = new URL(request.url);
		const redirectTo = `${siteUrl.protocol}//${siteUrl.host}/auth/confirm`;

		const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: redirectTo,
				data: {
					nombre_completo,
					created_at: new Date().toISOString()
				}
			}
		});

		if (signUpError) {
			console.error('[auth/+page.server.ts] SignUp error:', signUpError);

			if (signUpError.message.includes('already registered')) {
				return setError(form, 'email', 'Este correo electrónico ya está registrado');
			}

			return message(form, signUpError.message, { status: 400 });
		}

		console.log('[PASO 2.5] SignUp exitoso. signUpData:', {
			userId: signUpData?.user?.id,
			email: signUpData?.user?.email,
			userMetadata: signUpData?.user?.user_metadata
		});

		// ============================================
		// PASO 3: Crear perfil en tabla perfiles
		// (usamos supabaseAdmin porque el user aún no confirmó email)
		// ============================================
		if (signUpData?.user) {
			const userId = signUpData.user.id;

			try {
				// DEBUG: Log el objeto que vamos a insertar
				const perfilData = {
					id: userId,
					email: email,
					nombre_completo: nombre_completo,
					empresa: empresa || null,
					cargo: cargo || null,
					telefono: telefono || null,
					es_admin: false,
					esta_baneado: false
				};

				console.log('[PASO 3] Datos de perfil a insertar:', JSON.stringify(perfilData, null, 2));

				// Insertar perfil con los datos extra
				const { error: perfilError, data: perfilInsertData } = await supabaseAdmin
					.from('perfiles')
					.upsert(perfilData, { onConflict: 'id' });

				if (perfilError) {
					console.error('[auth/+page.server.ts] Error creando perfil:', perfilError);
					console.error('[PASO 3] Error details:', {
						message: perfilError.message,
						code: perfilError.code,
						details: perfilError.details
					});
				} else {
					console.log('[PASO 3] ✓ Perfil creado exitosamente');
					console.log('[PASO 3] Datos retornados por Supabase:', perfilInsertData);
				}

				// ============================================
				// PASO 4: Crear solicitud de acceso (si aplica)
				// ============================================
				if (solicitar_acceso && cliente_id && cliente_id !== '') {
					console.log('[PASO 4] Creando solicitud de acceso:', {
						user_id: userId,
						cliente_id,
						estado: 'pendiente',
						mensaje: mensaje_solicitud
					});

					const { error: solicitudError } = await supabaseAdmin
						.from('solicitudes_acceso')
						.insert({
							user_id: userId,
							cliente_id: cliente_id,
							estado: 'pendiente',
							mensaje: mensaje_solicitud || null
						});

					if (solicitudError) {
						console.error(
							'[auth/+page.server.ts] Error creando solicitud:',
							solicitudError
						);
					} else {
						console.log(
							`[auth/+page.server.ts] ✓ Solicitud de acceso creada para user ${userId} → cliente ${cliente_id}`
						);
					}
				} else {
					console.log('[PASO 4] No se crea solicitud de acceso', {
						solicitar_acceso,
						cliente_id
					});
				}
			} catch (err) {
				console.error('[auth/+page.server.ts] Error en post-registro:', err);
			}
		}

		console.log('========== FIN DEBUG ==========');

		// ============================================
		// PASO 5: Redirect a verificación de email
		// ============================================
		throw redirect(
			303,
			`${AUTH_REDIRECT_PATHS.FLOW.VERIFY}?email=${encodeURIComponent(email)}`
		);
	}
};