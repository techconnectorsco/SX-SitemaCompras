import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';

export const GET: RequestHandler = async ({ locals }) => {
  // DEBUG: Ver estructura completa
  console.log('🔍 [DEBUG] locals completo:', Object.keys(locals));
  console.log('🔍 [DEBUG] locals.session:', locals.session);
  console.log('🔍 [DEBUG] locals.user:', locals.user);
  
  // Intentar obtener usuario de diferentes lugares
  const user = locals.user || locals.session?.user;
  
  console.log('🔍 [DEBUG] Usuario final:', user);
  
  if (!user) {
    console.log('❌ [DEBUG] No hay usuario');
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  console.log('🔍 [DEBUG] Email:', user.email);
  console.log('🔍 [DEBUG] Rol:', user.role);

  // Verificar que sea ADMIN (case-insensitive)
  const userRole = String(user.role).toUpperCase();
  if (userRole !== 'ADMIN') {
    console.log(`❌ [DEBUG] Rol '${user.role}' no es ADMIN`);
    return json({ error: 'Solo administradores' }, { status: 403 });
  }

  console.log('✅ [DEBUG] Usuario es ADMIN');

  try {
    const result = db.prepare(`
      SELECT 
        fecha_procesamiento,
        usuario_procesamiento,
        COUNT(*) as total_skus
      FROM forecast_procesamiento
      GROUP BY fecha_procesamiento, usuario_procesamiento
      ORDER BY fecha_procesamiento DESC
      LIMIT 1
    `).get() as any;

    if (!result) {
      console.log('ℹ️ [DEBUG] No hay procesamientos previos');
      return json(null);
    }

    console.log('✅ [DEBUG] Último procesamiento encontrado');
    return json({
      fecha: result.fecha_procesamiento,
      usuario: result.usuario_procesamiento,
      total: result.total_skus
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error obteniendo último procesamiento:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};