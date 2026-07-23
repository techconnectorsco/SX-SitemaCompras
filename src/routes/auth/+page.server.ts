// Main authentication page handling both login and registration (SQLite version)
import { redirect, type Actions } from '@sveltejs/kit';
import { loginSchema, registerSchema } from '$lib/features/auth/schemas/auth-schema';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';
import type { RequestEvent } from '@sveltejs/kit';
import { AUTH_REDIRECT_PATHS } from '$lib/features/auth/config/auth';
import { handleLogin, handleRegister } from '$lib/features/auth/services/auth-service.server';

console.log('[auth/+page.server.ts] File loaded (SQLite version)');

// Initialize auth forms based on mode (login/register)
export const load: PageServerLoad = async ({ parent, url, locals }) => {
	console.log('[auth/+page.server.ts] Load function called');
	const parentData = await parent();

	// Redirect to dashboard if already logged in
	if (locals.user) {
		console.log('[auth/+page.server.ts] User already logged in, redirecting to dashboard');
		throw redirect(303, AUTH_REDIRECT_PATHS.SUCCESS.LOGIN);
	}

	const mode = url.searchParams.get('mode');
	console.log('[auth/+page.server.ts] Mode:', mode);

	// Initialize both forms
	const loginForm = await superValidate(zod(loginSchema));
	const registerForm = await superValidate(zod(registerSchema));

	return {
		...parentData,
		form: mode === 'register' ? registerForm : loginForm,
		mode: mode || 'login'
	};
};

// Handle form submissions for both login and registration
export const actions: Actions = {
	login: async (event: RequestEvent) => {
		console.log('[auth/+page.server.ts] Login action called');
		const form = await superValidate(event, zod(loginSchema));
		return handleLogin(event, form);
	},

	register: async (event: RequestEvent) => {
		console.log('[auth/+page.server.ts] Register action called');
		const form = await superValidate(event, zod(registerSchema));
		return handleRegister(event, form);
	}
};