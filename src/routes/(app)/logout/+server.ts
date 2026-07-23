// Endpoint de Logout - limpia la sesión, audita y redirige al inicio
import type { RequestHandler, RequestEvent } from './$types';
import { redirect } from '@sveltejs/kit';
import { SessionService } from '$lib/features/auth/services/session-service';
import { clearSessionCookie } from '$lib/features/auth/hooks/sqlite-hook.server';
import { AuditService } from '$lib/features/security/services/audit-service';

/**
 * Lógica compartida para el cierre de sesión
 */
async function performLogout(event: RequestEvent) {
    const { cookies, request, getClientAddress } = event;
    const sessionId = cookies.get('session');
    
    // Obtener datos para auditoría
    const ip = getClientAddress();
    const userAgent = request.headers.get('user-agent') || 'Desconocido';

    if (sessionId) {
        // 1. Intentar obtener la sesión ANTES de borrarla para saber quién es el usuario
        const session = SessionService.getSession(sessionId);

        if (session) {
            // ✅ AUDITORÍA: Registrar quién cerró sesión
            AuditService.log(
                session.user_id, 
                'LOGOUT', 
                ip, 
                userAgent, 
                'Cierre de sesión manual exitoso'
            );

            // 2. Eliminar sesión de la base de datos
            SessionService.deleteSession(sessionId);
        } else {
            // El usuario tenía cookie, pero la sesión ya no existía en DB
            AuditService.log(
                null, 
                'LOGOUT', 
                ip, 
                userAgent, 
                'Intento de logout con sesión expirada o inválida'
            );
        }
    }

    // 3. Limpiar cookie del navegador
    clearSessionCookie(cookies);

    console.log('[logout] ✓ Logout exitoso');

    // 4. Redirigir al home
    throw redirect(303, '/');
}

export const POST: RequestHandler = async (event) => {
    return performLogout(event);
};

// También permitir GET para logout directo desde URL
export const GET: RequestHandler = async (event) => {
    return performLogout(event);
};