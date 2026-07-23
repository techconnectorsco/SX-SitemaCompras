/**
 * @module AuthService
 * @description Manejadores de autenticación del lado del servidor para SQLite con soporte RBAC y Registro de Auditoría
 */
import { redirect } from '@sveltejs/kit';
import { message, setError } from 'sveltekit-superforms';
import type { RequestEvent } from '@sveltejs/kit';
import { UserService } from '$lib/features/auth/services/user-service';
import { SessionService } from '$lib/features/auth/services/session-service';
import { TokenService } from './token-service';
import { setSessionCookie, clearSessionCookie } from '$lib/features/auth/hooks/sqlite-hook.server';
import { AUTH_REDIRECT_PATHS } from '../config/auth';
import { AuditService } from '$lib/features/security/services/audit-service';

/**
 * Función auxiliar para obtener información del cliente de forma segura
 */
function getClientInfo(event: RequestEvent) {
    return {
        ip: event.getClientAddress(),
        userAgent: event.request.headers.get('user-agent') || 'Desconocido'
    };
}

/**
 * Manejar el envío del formulario de inicio de sesión (Login)
 */
export async function handleLogin(event: RequestEvent, form: any) {
    console.log('[auth.server] Acción de Login llamada');
    const { ip, userAgent } = getClientInfo(event);

    if (!form.valid) {
        return message(form, 'Por favor revisa el formulario en busca de errores.');
    }

    try {
        const { email, password } = form.data;

        // Verificar credenciales
        const user = await UserService.verifyCredentials(email, password);

        if (!user) {
            console.log('[auth.server] Credenciales inválidas para:', email);
            
            // 🚨 AUDITORÍA: Login Fallido (Credenciales)
            AuditService.log(null, 'LOGIN_FAILED', ip, userAgent, `Credenciales inválidas para: ${email}`);

            return message(form, 'Correo electrónico o contraseña incorrectos.', { status: 401 });
        }

        // 🔒 VALIDAR ACCOUNT_STATUS
        if (user.account_status === 'PENDING') {
            console.log('[auth.server] ✗ Login bloqueado - Cuenta pendiente de aprobación:', email);
            
            // 🚨 AUDITORÍA: Intento PENDING
            AuditService.log(user.id, 'LOGIN_FAILED', ip, userAgent, 'Login bloqueado: Cuenta PENDIENTE');

            return message(
                form,
                'Tu cuenta está en proceso de aprobación. Un Administrador debe activarla antes de que puedas iniciar sesión.',
                { status: 403 }
            );
        }

        if (user.account_status === 'REJECTED') {
            console.log('[auth.server] ✗ Login bloqueado - Cuenta rechazada:', email);

            // 🚨 AUDITORÍA: Intento REJECTED
            AuditService.log(user.id, 'LOGIN_FAILED', ip, userAgent, 'Login bloqueado: Cuenta RECHAZADA');

            return message(
                form,
                'Tu cuenta ha sido rechazada. Por favor contacta a soporte para más información.',
                { status: 403 }
            );
        }

        // Solo usuarios ACTIVE pueden hacer login
        if (user.account_status !== 'ACTIVE') {
            console.log('[auth.server] ✗ Login bloqueado - Estado inválido:', user.account_status);
            
            // 🚨 AUDITORÍA: Intento Estado Inválido
            AuditService.log(user.id, 'LOGIN_FAILED', ip, userAgent, `Login bloqueado: Estado ${user.account_status}`);

            return message(form, 'No se puede iniciar sesión. Por favor contacta a soporte.', { status: 403 });
        }

        // Crear sesión
        const session = SessionService.createSession(user.id);
        setSessionCookie(event.cookies, session.id);

        console.log('[auth.server] ✓ Login exitoso para:', email, '| Rol:', user.role);

        // ✅ AUDITORÍA: Login Exitoso
        AuditService.log(user.id, 'LOGIN', ip, userAgent, 'Inicio de sesión exitoso');

        // Redirigir al dashboard
        throw redirect(303, AUTH_REDIRECT_PATHS.SUCCESS.LOGIN);

    } catch (error: any) {
        // Si es una redirección, relanzarla
        if (error.status === 303) {
            throw error;
        }

        console.error('[auth.server] Error de Login:', error);
        return message(form, 'Ocurrió un error durante el inicio de sesión. Por favor intenta de nuevo más tarde.', {
            status: 500
        });
    }
}

/**
 * Manejar el envío del formulario de registro (Register)
 */
export async function handleRegister(event: RequestEvent, form: any) {
    console.log('[auth.server] Acción de Registro llamada');
    const { ip, userAgent } = getClientInfo(event);

    if (!form.valid) {
        return message(form, 'Por favor revisa el formulario en busca de errores.');
    }

    try {
        const { email, password } = form.data;

        // Verificar si el usuario ya existe
        const existingUser = UserService.getUserByEmail(email);
        if (existingUser) {
            console.log('[auth.server] ✗ Email ya registrado:', email);
            return setError(form, 'email', 'Este correo electrónico ya está registrado.');
        }

        // Crear usuario
        const user = await UserService.createUser({
            email,
            password,
            provider: 'email'
        });

        console.log('[auth.server] ✓ Usuario creado:', email, '| Rol:', user.role, '| Estado:', user.account_status);

        // ✅ AUDITORÍA: Registro Exitoso
        AuditService.log(user.id, 'REGISTER', ip, userAgent, `Registro exitoso. Rol: ${user.role}, Estado: ${user.account_status}`);

        // 🔑 FLUJO SEGÚN STATUS
        if (user.account_status === 'PENDING') {
            console.log('[auth.server] → USUARIO/PENDING: Redirigiendo a página de pendiente');
            throw redirect(
                303,
                `/auth/pending?email=${encodeURIComponent(email)}`
            );
        }

        // Usuario ADMIN/ACTIVE - auto-login directo al dashboard
        if (user.account_status === 'ACTIVE') {
            console.log('[auth.server] → ADMIN/ACTIVE: Auto-login al dashboard');
            
            const session = SessionService.createSession(user.id);
            setSessionCookie(event.cookies, session.id);

            // ✅ AUDITORÍA: Auto-Login tras registro (Primer Admin)
            AuditService.log(user.id, 'LOGIN', ip, userAgent, 'Auto-login tras registro (Primer Admin)');

            throw redirect(303, AUTH_REDIRECT_PATHS.SUCCESS.LOGIN);
        }

        console.log('[auth.server] ✗ Estado inesperado:', user.account_status);
        throw redirect(303, '/auth?mode=login');

    } catch (error: any) {
        if (error.status === 303) throw error;

        if (error.message === 'User already exists') {
            return setError(form, 'email', 'Este correo electrónico ya está registrado.');
        }
        if (error.message.includes('Invalid email')) {
            return setError(form, 'email', 'Por favor ingresa un correo electrónico válido.');
        }
        if (error.message.includes('Password')) {
            // Traducimos mensajes comunes de validación de contraseña si vienen del servicio
            const msg = error.message.includes('8 characters') 
                ? 'La contraseña debe tener al menos 8 caracteres.' 
                : error.message;
            return setError(form, 'password', msg);
        }

        console.error('[auth.server] Error de Registro:', error);
        return message(form, 'Ocurrió un error durante el registro. Por favor intenta de nuevo más tarde.', {
            status: 500
        });
    }
}

/**
 * Manejar el cierre de sesión (Logout)
 */
export async function handleLogout(event: RequestEvent) {
    console.log('[auth.server] Acción de Logout llamada');
    const { ip, userAgent } = getClientInfo(event);

    try {
        const sessionId = event.cookies.get('session');

        if (sessionId) {
            // 🔍 Recuperar la sesión ANTES de borrarla para saber quién era
            const session = SessionService.getSession(sessionId);

            if (session) {
                // ✅ AUDITORÍA: Logout
                AuditService.log(session.user_id, 'LOGOUT', ip, userAgent, 'El usuario cerró sesión voluntariamente');
                
                // Borrar sesión de la base de datos
                SessionService.deleteSession(sessionId);
            } else {
                 // Intentó cerrar una sesión que ya no existe en DB pero sí cookie
                 AuditService.log(null, 'LOGOUT', ip, userAgent, 'Intento de cierre de sesión con cookie obsoleta');
            }
        }

        // Limpiar cookie de sesión
        clearSessionCookie(event.cookies);

        console.log('[auth.server] ✓ Logout exitoso');
        throw redirect(303, AUTH_REDIRECT_PATHS.SUCCESS.LOGOUT);

    } catch (error: any) {
        if (error.status === 303) throw error;

        console.error('[auth.server] Error de Logout:', error);
        clearSessionCookie(event.cookies);
        throw redirect(303, AUTH_REDIRECT_PATHS.SUCCESS.LOGOUT);
    }
}

/**
 * Manejar solicitud de restablecimiento de contraseña
 */
export async function handleResetPasswordRequest(event: RequestEvent, form: any) {
    console.log('[auth.server] Solicitud de restablecimiento de contraseña');
    const { ip, userAgent } = getClientInfo(event);

    if (!form.valid) {
        return message(form, 'Por favor revisa el formulario en busca de errores.');
    }

    try {
        const { email } = form.data;
        const user = UserService.getUserByEmail(email);

        if (!user) {
            console.log('[auth.server] Reset solicitado para email no existente:', email);
            // 🚨 AUDITORÍA: Reset para email no existente (potencial enumeración)
            AuditService.log(null, 'PASSWORD_RESET', ip, userAgent, `Solicitud de reset para email no existente: ${email}`);
            
            // Mensaje genérico por seguridad
            return message(
                form,
                'Si existe una cuenta con este correo electrónico, recibirás un enlace para restablecer tu contraseña.'
            );
        }

        const resetToken = TokenService.createPasswordResetToken(user.id);
        const siteUrl = new URL(event.request.url);
        const resetUrl = `${siteUrl.protocol}//${siteUrl.host}/auth/update-password?token=${resetToken}`;

        console.log('[auth.server] URL de reset:', resetUrl);
        console.log('[auth.server] ✓ Token de reset creado para:', email);

        // ✅ AUDITORÍA: Solicitud de Reset
        AuditService.log(user.id, 'PASSWORD_RESET', ip, userAgent, 'Enlace de restablecimiento de contraseña generado');

        return message(
            form,
            'Si existe una cuenta con este correo electrónico, recibirás un enlace para restablecer tu contraseña.'
        );
    } catch (error) {
        console.error('[auth.server] Error en reset de contraseña:', error);
        return message(form, 'Ocurrió un error. Por favor intenta de nuevo más tarde.', { status: 500 });
    }
}

/**
 * Manejar actualización de contraseña con token
 */
export async function handleUpdatePassword(event: RequestEvent, form: any, token: string) {
    console.log('[auth.server] Actualización de contraseña con token');
    const { ip, userAgent } = getClientInfo(event);

    if (!form.valid) {
        return message(form, 'Por favor revisa el formulario en busca de errores.');
    }

    try {
        const userId = TokenService.verifyPasswordResetToken(token);

        if (!userId) {
            console.log('[auth.server] ✗ Token inválido o expirado');
            // 🚨 AUDITORÍA: Token inválido
            AuditService.log(null, 'PASSWORD_RESET', ip, userAgent, 'Actualización fallida: Token inválido o expirado');
            
            return message(form, 'El enlace es inválido o ha expirado. Por favor solicita uno nuevo.', {
                status: 400
            });
        }

        const { password } = form.data;
        await UserService.updatePassword(userId, password);
        TokenService.deletePasswordResetToken(token);
        
        // Cerrar todas las sesiones existentes por seguridad
        SessionService.deleteUserSessions(userId);

        console.log('[auth.server] ✓ Contraseña actualizada exitosamente');

        // ✅ AUDITORÍA: Contraseña Actualizada
        AuditService.log(userId, 'PASSWORD_RESET', ip, userAgent, 'Contraseña actualizada exitosamente vía token');

        throw redirect(303, `${AUTH_REDIRECT_PATHS.FLOW.RESET}?message=Contraseña actualizada exitosamente`);
    } catch (error: any) {
        if (error.status === 303) throw error;

        console.error('[auth.server] Error actualizando contraseña:', error);
        return message(form, 'Ocurrió un error. Por favor intenta de nuevo más tarde.', { status: 500 });
    }
}