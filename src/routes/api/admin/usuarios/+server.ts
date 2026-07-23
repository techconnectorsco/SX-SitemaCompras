import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { UserService } from '$lib/features/auth/services/user-service';
import { generateTemporaryPassword } from '$lib/features/auth/services/auth-utils';

// GET: Listar usuarios
export const GET: RequestHandler = async ({ url, locals }) => {
    const user = locals.user;
    if (!user || user.role !== 'ADMIN') return json({ error: 'No autorizado' }, { status: 403 });

    try {
        const search = url.searchParams.get('search')?.toLowerCase() || '';
        const statusParam = url.searchParams.get('status'); // Params opcional

        // 1. OBTENER TODOS LOS USUARIOS (Sin filtros) para estadísticas reales
        const allUsers = UserService.getAllUsers(); 

        // 2. CALCULAR ESTADÍSTICAS GLOBALES (Basado en el total real)
        const stats = {
            usuariosTotales: allUsers.length,
            usuariosPendientes: allUsers.filter(u => u.account_status === 'PENDING').length,
            usuariosActivos: allUsers.filter(u => u.account_status === 'ACTIVE').length
        };

        // 3. APLICAR FILTROS (Para la tabla)
        let usuariosFiltrados = allUsers;

        // Filtro por Estado (si viene en URL)
        if (statusParam) {
            usuariosFiltrados = usuariosFiltrados.filter(u => u.account_status === statusParam);
        }

        // Filtro por Búsqueda (nombre o email)
        if (search) {
            usuariosFiltrados = usuariosFiltrados.filter(u => 
                u.email.toLowerCase().includes(search) || 
                u.display_name?.toLowerCase().includes(search)
            );
        }

        // 4. FORMATEAR PARA FRONTEND
        const usuariosFrontend = usuariosFiltrados.map(u => ({
            id: u.id,
            email: u.email,
            nombre: u.display_name || '---',
            rol: u.role,
            estado: u.account_status,
            fechaRegistro: new Date(u.created_at).toLocaleString('es-CR'),
            emailVerificado: u.email_verified
        }));

        return json({
            usuarios: usuariosFrontend,
            estadisticas: stats // ¡Ahora esto siempre enviará los totales correctos!
        });

    } catch (error) {
        console.error('Error GET usuarios:', error);
        return json({ error: 'Error interno' }, { status: 500 });
    }
};

// PUT: Activar o Cambiar Rol (Sin cambios, estaba bien)
export const PUT: RequestHandler = async ({ request, locals }) => {
    const user = locals.user;
    if (!user || user.role !== 'ADMIN') return json({ error: 'No autorizado' }, { status: 403 });

    try {
        const { userId, action, nuevoEstado, nuevoRol } = await request.json();

        if (userId === user.id) return json({ error: 'No puedes auto-modificarte' }, { status: 400 });

        let result = false;

        if (action === 'activate') {
            result = UserService.updateAccountStatus(userId, nuevoEstado || 'ACTIVE');
            if (result) return json({ exito: true, mensaje: 'Usuario activado' });
        }

        if (action === 'role') {
            const updated = UserService.updateUser(userId, { role: nuevoRol });
            if (updated) return json({ exito: true, mensaje: 'Rol actualizado' });
        }

        return json({ error: 'No se pudo actualizar' }, { status: 400 });

    } catch (error) {
        console.error('Error PUT usuarios:', error);
        return json({ error: 'Error al actualizar' }, { status: 500 });
    }
};

// POST: Reset Password (Correcto, usando UserService)
export const POST: RequestHandler = async ({ request, locals }) => {
    const user = locals.user;
    if (!user || user.role !== 'ADMIN') return json({ error: 'No autorizado' }, { status: 403 });

    try {
        const { userId } = await request.json();

        // 1. Generar contraseña temporal
        const tempPassword = generateTemporaryPassword();

        // 2. Actualizar (UserService usa bcrypt internamente)
        const exito = await UserService.updatePassword(userId, tempPassword);

        if (exito) {
            return json({
                exito: true,
                mensaje: 'Contraseña reseteada',
                passwordTemporal: tempPassword
            });
        } else {
            return json({ error: 'No se encontró el usuario' }, { status: 404 });
        }

    } catch (error) {
        console.error('Error Reset Password:', error);
        return json({ error: 'Error interno' }, { status: 500 });
    }
};