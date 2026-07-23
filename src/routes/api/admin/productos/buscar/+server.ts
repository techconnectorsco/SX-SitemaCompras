import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config'; // Asegúrate de que esta ruta apunte a tu db-config

export const GET: RequestHandler = async ({ url, locals }) => {
  // Verificación de seguridad básica (opcional pero recomendada)
  const user = locals.user || locals.session?.user;
  if (!user) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const query = url.searchParams.get('q');
    
    // Si la búsqueda es muy corta, devolvemos un array vacío para no sobrecargar
    if (!query || query.trim().length < 2) {
      return json({ productos: [] });
    }

    const terminoBusqueda = `%${query.trim().toLowerCase()}%`;

    // Seleccionamos distinct para no repetir el mismo producto si está en varios procesamientos
    // Usamos 'codigo_sku as sku' para que el frontend lo lea directamente sin cambios
    const sql = `
      SELECT DISTINCT 
        codigo_sku as sku, 
        descripcion 
      FROM forecast_procesamiento 
      WHERE LOWER(codigo_sku) LIKE ? OR LOWER(descripcion) LIKE ?
      ORDER BY descripcion ASC
      LIMIT 15
    `;

    const productos = db.prepare(sql).all(terminoBusqueda, terminoBusqueda);

    return json({
      success: true,
      productos
    });
  } catch (error) {
    console.error('❌ Error buscando productos en forecast_procesamiento:', error);
    return json({ error: String(error) }, { status: 500 });
  }
};