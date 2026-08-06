/**
 * @module AuthGuard
 * @description Route protection middleware for SQLite authentication with RBAC support
 */
import { redirect, type Handle } from '@sveltejs/kit';

/**
 * Routes that require authentication
 */
const PROTECTED_ROUTES = [
  '/AsistenteCompras',
  '/servers',
  '/domains',
  '/email',
  '/databases',
  '/files',
  '/settings',
  '/billing',
  '/support',
  '/account',
  '/contentCreator'
];

/**
 * Routes that should redirect to dashboard if authenticated
 */
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/register'
];

/**
 * Routes accessible to PENDING users
 */
const PENDING_ALLOWED_ROUTES = [
  '/auth',
  '/auth/pending',
  '/auth/logout'
];

/**
 * Check if route is protected
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if route is an auth route
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if PENDING user can access route
 */
function isPendingAllowedRoute(pathname: string): boolean {
  return PENDING_ALLOWED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Auth guard middleware
 */
export const authGuard: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;
  const { user } = event.locals;

  // Protected routes - require authentication AND ACTIVE status
  if (isProtectedRoute(pathname)) {
    if (!user) {
      throw redirect(303, `/auth?mode=login&redirect=${encodeURIComponent(pathname)}`);
    }

    // 🔒 VERIFICAR QUE EL USUARIO SEA ACTIVE
    if (user.account_status !== 'ACTIVE') {
      console.log('[auth-guard] ✗ Access denied - User not ACTIVE:', user.email, '| Status:', user.account_status);
      throw redirect(303, '/auth/pending');
    }
  }

  // Si el usuario está PENDING, solo puede acceder a rutas permitidas
  if (user && user.account_status === 'PENDING') {
    if (!isPendingAllowedRoute(pathname)) {
      console.log('[auth-guard] ✗ PENDING user blocked from:', pathname);
      throw redirect(303, '/auth/pending');
    }
  }

  // Auth routes - redirect if already authenticated AND ACTIVE
  if (isAuthRoute(pathname) && user && user.account_status === 'ACTIVE') {
    const redirectTo = event.url.searchParams.get('redirect') || '/';
    throw redirect(303, redirectTo);
  }

  return resolve(event);
};