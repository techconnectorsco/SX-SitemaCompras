/**
 * @module SQLiteHook
 * @description SvelteKit hook for SQLite session management with RBAC support
 */
import type { Handle } from '@sveltejs/kit';
import { SessionService } from '$lib/features/auth/services/session-service';
import { UserService } from '$lib/features/auth/services/user-service';

const SESSION_COOKIE_NAME = 'session';

export const sqlite: Handle = async ({ event, resolve }) => {
  // Get session cookie
  const sessionId = event.cookies.get(SESSION_COOKIE_NAME);

  // Initialize locals
  event.locals.session = null;
  event.locals.user = null;

  if (sessionId) {
    // Validate session
    const userId = SessionService.validateSession(sessionId);

    if (userId) {
      // Get user
      const user = UserService.getUserById(userId);

      if (user) {
        // 🔒 VERIFICAR ACCOUNT_STATUS
        // Si el usuario ya no está ACTIVE, cerrar sesión automáticamente
        if (user.account_status !== 'ACTIVE') {
          console.log('[sqlite-hook] ✗ User not ACTIVE, clearing session:', user.email, '| Status:', user.account_status);
          SessionService.deleteSession(sessionId);
          event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
          
          // No establecer locals.user
          return resolve(event);
        }

        event.locals.session = { id: sessionId };
        event.locals.user = {
          id: user.id,
          email: user.email,
          email_verified: user.email_verified,
          display_name: user.display_name,
          photo_url: user.photo_url,
          phone_number: user.phone_number,
          provider: user.provider,
          provider_id: user.provider_id,
          is_anonymous: user.is_anonymous,
          role: user.role,
          account_status: user.account_status,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_sign_in_at: user.last_sign_in_at
        };

        // Extend session on activity
        SessionService.extendSession(sessionId);
      } else {
        // User not found, clear cookie
        event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
      }
    } else {
      // Invalid session, clear cookie
      event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
    }
  }

  // Helper function to get session safely
  event.locals.safeGetSession = async () => {
    return {
      session: event.locals.session,
      user: event.locals.user
    };
  };

  return resolve(event);
};

/**
 * Helper to set session cookie
 */
export function setSessionCookie(cookies: any, sessionId: string) {
  cookies.set(SESSION_COOKIE_NAME, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    //secure: process.env.NODE_ENV === 'production',
    secure: false,
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

/**
 * Helper to clear session cookie
 */
export function clearSessionCookie(cookies: any) {
  cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}