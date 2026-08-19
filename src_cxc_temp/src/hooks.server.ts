import { sequence } from '@sveltejs/kit/hooks';
import { supabase } from '$lib/features/auth/hooks/supabase.server';
import { authGuard } from '$lib/features/auth/hooks/auth-guard.server';
import '$lib/utils/supabase-session-warnings';

export const handle = sequence(supabase, authGuard, async ({ event, resolve }) => {
	const response = await resolve(event);
	
	// Security headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	
	// Opcional: Reducir fingerprinting eliminando header de SvelteKit
	response.headers.delete('x-sveltekit-page');
	
	return response;
});