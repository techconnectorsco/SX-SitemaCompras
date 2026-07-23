import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { UserService } from '$lib/features/auth/services/user-service';
import { AuditService } from '$lib/features/security/services/audit-service';

const errorResponse = (status: number, message: string) => {
  return json({ error: message }, { status });
};

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user?.id) return errorResponse(401, 'No autenticado');

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(locals.user.id);
    if (!user) return errorResponse(404, 'Usuario no encontrado');

    return json({
      id: user.id,
      email: user.email,
      display_name: user.display_name || '',
      photo_url: user.photo_url || null,
      phone_number: user.phone_number || '',
      role: user.role || 'USER',
      account_status: user.account_status || 'PENDING'
    });
  } catch (err) {
    return errorResponse(500, 'Error al obtener perfil');
  }
};

export const PUT: RequestHandler = async ({ request, locals, getClientAddress }) => {
  if (!locals.user?.id) return errorResponse(401, 'No autenticado');

  try {
    const formData = await request.formData();
    const display_name = formData.get('display_name')?.toString().trim() || '';
    const phone_number = formData.get('phone_number')?.toString().trim() || '';
    const photoFile = formData.get('photo') as File | null;

    if (!display_name || display_name.length < 2) {
      return errorResponse(400, 'El nombre debe tener mínimo 2 caracteres');
    }

    let photoUrl = undefined;
    // Procesamiento de imagen
    if (photoFile && photoFile.size > 0) {
      if (!photoFile.type.startsWith('image/')) return errorResponse(400, 'Solo imágenes');
      if (photoFile.size > 5 * 1024 * 1024) return errorResponse(400, 'Máximo 5MB');
      
      const buffer = await photoFile.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      photoUrl = `data:${photoFile.type};base64,${base64}`;
    }

    const updateData: any = { display_name, phone_number, updated_at: Date.now() };
    if (photoUrl) updateData.photo_url = photoUrl;

    const keys = Object.keys(updateData);
    const values = Object.values(updateData);
    
    // Transacción DB
    db.prepare(`UPDATE users SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`)
      .run(...values, locals.user.id);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(locals.user.id);

    // Auditoría (Sin await para no bloquear la respuesta innecesariamente si es muy lento, 
    // aunque en SQLite es síncrono, es buena práctica preparar los datos antes)
    const ip = getClientAddress();
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
      AuditService.log(locals.user.id, 'PROFILE_UPDATE', ip, userAgent, 'Perfil actualizado');
    } catch (e) {
      console.error('Error guardando log auditoria', e);
    }

    return json(updated);

  } catch (err) {
    console.error('Error:', err);
    return errorResponse(500, 'Error al actualizar perfil');
  }
};

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  if (!locals.user?.id) return errorResponse(401, 'No autenticado');

  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) return errorResponse(400, 'Campos incompletos');
    if (newPassword.length < 8) return errorResponse(400, 'Mínimo 8 caracteres');
    if (newPassword !== confirmPassword) return errorResponse(400, 'Contraseñas no coinciden');
    
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(locals.user.id);
    if (!user) return errorResponse(404, 'Usuario no encontrado');

    const isValid = await UserService.verifyCredentials(user.email, currentPassword);
    if (!isValid) return errorResponse(400, 'La contraseña actual es incorrecta');

    await UserService.updatePassword(locals.user.id, newPassword);

    const ip = getClientAddress();
    const userAgent = request.headers.get('user-agent') || 'unknown';
    AuditService.log(locals.user.id, 'PASSWORD_CHANGE', ip, userAgent, 'Contraseña cambiada');
    
    return json({ success: true, message: 'Contraseña actualizada correctamente' });

  } catch (err) {
    return errorResponse(500, 'Error interno al cambiar contraseña');
  }
};