/**
 * Layout server para rutas protegidas (app)
 * Valida sesión y carga información del usuario
 */
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { AUTH_PATHS } from '$lib/features/auth/config/auth';

export const load: LayoutServerLoad = async (event) => {
  // Obtener sesión y usuario desde locals (viene del sqlite-hook)
  const { session, user } = await event.locals.safeGetSession();

  // Si no hay sesión, redirigir al login
  if (!session) {
    throw redirect(302, AUTH_PATHS.LOGIN);
  }

  // Si no hay usuario (sesión inválida), redirigir al login
  if (!user) {
    throw redirect(302, AUTH_PATHS.LOGIN);
  }

  console.log('[layout.server] ✅ Usuario cargado:', {
    email: user.email,
    role: user.role,
    status: user.account_status
  });

  // Retornar datos del usuario para todas las páginas dentro de (app)
  return {
    session: {
      id: session.id,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role, // 'ADMIN' o 'USER'
        account_status: user.account_status,
        photo_url: user.photo_url,
        created_at: user.created_at
      }
    }
  };
};