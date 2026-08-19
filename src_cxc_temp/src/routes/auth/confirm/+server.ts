// Handles email verification OTP token validation and user confirmation
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AUTH_REDIRECT_PATHS } from '$lib/features/auth/config/auth';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	// console.log('[auth/confirm/+server.ts] Verification request received');

	const code = url.searchParams.get('code') ?? url.searchParams.get('token_hash');
	const type = url.searchParams.get('type');
	const next = url.searchParams.get('next') ?? AUTH_REDIRECT_PATHS.SUCCESS.OAUTH;

	// console.log('[auth/confirm/+server.ts] Params:', { code, type, next });

	// Clean up redirect URL
	const redirectTo = new URL(url);
	redirectTo.pathname = next;
	redirectTo.searchParams.delete('code');
	redirectTo.searchParams.delete('token_hash');
	redirectTo.searchParams.delete('type');
	redirectTo.searchParams.delete('next');

	if (!code) {
		console.error('[auth/confirm/+server.ts] Missing code param');
		redirectTo.pathname = AUTH_REDIRECT_PATHS.ERROR.VERIFICATION;
		redirectTo.searchParams.set('error', 'missing-params');
		throw redirect(303, redirectTo);
	}

	// Use exchangeCodeForSession instead of verifyOtp
	const { data, error } = await supabase.auth.exchangeCodeForSession(code);

	if (error) {
		console.error('[auth/confirm/+server.ts] Verification failed:', error.message);
		redirectTo.pathname = AUTH_REDIRECT_PATHS.ERROR.VERIFICATION;
		redirectTo.searchParams.set('error', 'verification-failed');
		throw redirect(303, redirectTo);
	}

	// console.log('[auth/confirm/+server.ts] ✓ Verification successful');
	// Redirigir al success page
	redirectTo.pathname = '/auth/success';
	redirectTo.searchParams.set('email', data.user?.email ?? '');
	throw redirect(303, redirectTo);
};