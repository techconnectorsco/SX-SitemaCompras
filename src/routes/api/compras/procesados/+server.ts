/**
 * Obtener datos procesados de forecast para Gestión de Compras
 * GET /api/compras/procesados
 * 
 * ✅ ACTUALIZADO: Filtra por código de procesamiento
 * ✅ NUEVO: Retorna lista de procesamientos disponibles
 * ✅ NUEVO: Incluye campos de costo (costo_ult_loc, costo_ult_dol)
 * ✅ NUEVO: Filtro por categoría (CLASIFICACION_1)
 * 
 * Query params:
 * - procesamiento: código específico (ej: PROC-20250109-143052)
 * - limit, offset: paginación
 * - search, abc, rotacion, marca, linea, categoria: filtros
 * - sort: ordenamiento
 * - solo_pedido, solo_8020: filtros booleanos
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';

export const GET: RequestHandler = async ({ url, locals }) => {
  const user = locals.user || locals.session?.user;
  
  if (!user) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    // ===== OBTENER LISTA DE PROCESAMIENTOS DISPONIBLES =====
    const procesamientosDisponibles = db.prepare(`
      SELECT 
        codigo_procesamiento as codigo,
        fecha_procesamiento as fecha,
        usuario_procesamiento as usuario,
        COUNT(*) as totalSKUs
      FROM forecast_procesamiento
      WHERE codigo_procesamiento IS NOT NULL AND codigo_procesamiento != ''
      GROUP BY codigo_procesamiento
      ORDER BY fecha_procesamiento DESC
      LIMIT 20
    `).all() as Array<{ codigo: string; fecha: string; usuario: string; totalSKUs: number }>;

    // ===== DETERMINAR QUÉ PROCESAMIENTO USAR =====
    let codigoProcesamiento = url.searchParams.get('procesamiento') || '';
    
    if (!codigoProcesamiento && procesamientosDisponibles.length > 0) {
      codigoProcesamiento = procesamientosDisponibles[0].codigo;
    }

    // Si no hay código de procesamiento (datos antiguos)
    if (!codigoProcesamiento) {
      return json({
        sinDatos: true,
        mensaje: 'No hay procesamientos disponibles. Ejecute un nuevo procesamiento.',
        datos: [],
        total: 0,
        filtros: { abcs: [], marcas: [], lineas: [], categorias: [] },
        metadata: { codigo: null, fecha: null, usuario: '' },
        procesamientosDisponibles: []
      });
    }

    // ===== PARÁMETROS DE FILTRADO =====
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const search = url.searchParams.get('search') || '';
    const abc = url.searchParams.get('abc') || '';
    const rotacion = url.searchParams.get('rotacion') || '';
    const marca = url.searchParams.get('marca') || '';
    const linea = url.searchParams.get('linea') || '';
    // ✅ NUEVO: filtro de categoría
    const categoria = url.searchParams.get('categoria') || '';
    const sort = url.searchParams.get('sort') || 'codigo_asc';
    const soloPedido = url.searchParams.get('solo_pedido') === 'true';
    const solo8020 = url.searchParams.get('solo_8020') === 'true';

    // ===== CONSTRUIR WHERE CLAUSE =====
    const conditions: string[] = ['codigo_procesamiento = ?'];
    const params: any[] = [codigoProcesamiento];

    if (search) {
      conditions.push(`(codigo_sku LIKE ? OR descripcion LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }

    if (abc) {
      conditions.push(`abc = ?`);
      params.push(abc);
    }

    if (rotacion) {
      conditions.push(`abc_rotacion_frecuencia = ?`);
      params.push(rotacion);
    }

    if (marca) {
      conditions.push(`marca = ?`);
      params.push(marca);
    }

    if (linea) {
      conditions.push(`linea = ?`);
      params.push(linea);
    }

    // ✅ NUEVO: condición de categoría
    if (categoria) {
      conditions.push(`categoria = ?`);
      params.push(categoria);
    }

    if (soloPedido) {
  conditions.push(`(mensaje_courier != '' OR mensaje_aereo != '' OR mensaje_maritimo != '')`);
}

    /* if (solo8020) {
      conditions.push(`abc IN ('A', 'B')`);
    } */

     // 2. AGREGA ESTO DEBAJO (EL FILTRO NUEVO)
    // Esto hace que solo muestre artículos con proyección de venta > 0
    if (solo8020) {
       conditions.push(`promedio_6m > 0`); 
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // ===== ORDENAMIENTO =====
    let orderClause = 'ORDER BY codigo_sku ASC';

    // 3. AQUÍ ES DONDE CAMBIA LA LÓGICA DE ORDENAMIENTO
    if (solo8020) {
       // SI ES 80/20: Ignoramos el selector y ordenamos por IMPORTANCIA (Promedio 6m)
       orderClause = 'ORDER BY promedio_6m DESC, venta_ultimos_12m DESC';
       
    } else {
       // SI NO ES 80/20: Usamos el switch normal
       switch (sort) {
         case 'codigo_asc':
           orderClause = 'ORDER BY codigo_sku ASC';
           break;
         case 'codigo_desc':
           orderClause = 'ORDER BY codigo_sku DESC';
           break;
         case 'existencia_asc':
           orderClause = 'ORDER BY existencia ASC';
           break;
         case 'existencia_desc':
           orderClause = 'ORDER BY existencia DESC';
           break;
         case 'ventas_asc':
           orderClause = 'ORDER BY venta_ultimos_12m ASC';
           break;
         case 'ventas_desc':
           orderClause = 'ORDER BY venta_ultimos_12m DESC';
           break;
       }
    }

    // ===== OBTENER TOTAL =====
    const totalQuery = `SELECT COUNT(*) as total FROM forecast_procesamiento ${whereClause}`;
    const totalResult = db.prepare(totalQuery).get(...params) as { total: number };

    // ===== OBTENER DATOS =====
    const dataQuery = `
      SELECT 
        id,
        codigo_procesamiento,
        codigo_sku,
        codigo_proveedor,
        descripcion,
        categoria,
        linea,
        marca,
        abc,
        abc_rotacion_frecuencia,
        activo,
        existencia,
        transito,
        lead_time,
        meses_pedido,
        frecuencia_ventas_12m,
        venta_ultimos_12m,
        promedio_12m,
        promedio_6m,
        promedio_ajustado,
        desviacion_estandar,
        coeficiente_variacion,
        factor_seguridad,
        stock_seguridad,
        referencia_pedido_courier,
        referencia_pedido_aereo,
        referencia_pedido_maritimo,
        cantidad_courier,
        mensaje_courier,
        cantidad_final_courier,
        cantidad_aereo,
        mensaje_aereo,
        cantidad_final_aereo,
        cantidad_maritimo,
        mensaje_maritimo,
        cantidad_final_maritimo,
        costo_prom_loc,
        costo_prom_dol,
        costo_ult_loc,
        costo_ult_dol,
        sugerido_analista_urgente,
        sugerido_analista_aereo,
        sugerido_analista_maritimo,
        usuario_modificacion,
        fecha_modificacion,
        comentario_analista
      FROM forecast_procesamiento 
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const datos = db.prepare(dataQuery).all(...params, limit, offset);

    // ===== OBTENER FILTROS DISPONIBLES (para el procesamiento actual) =====
    const abcsQuery = db.prepare(`
      SELECT DISTINCT abc 
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento = ? AND abc IS NOT NULL AND abc != ''
      ORDER BY abc
    `).all(codigoProcesamiento) as Array<{ abc: string }>;

    const marcasQuery = db.prepare(`
      SELECT DISTINCT marca 
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento = ? AND marca IS NOT NULL AND marca != ''
      ORDER BY marca
      LIMIT 100
    `).all(codigoProcesamiento) as Array<{ marca: string }>;

    const lineasQuery = db.prepare(`
      SELECT DISTINCT linea 
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento = ? AND linea IS NOT NULL AND linea != ''
      ORDER BY linea
    `).all(codigoProcesamiento) as Array<{ linea: string }>;

    // ✅ NUEVO: lista de categorías disponibles
    const categoriasQuery = db.prepare(`
      SELECT DISTINCT categoria 
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento = ? AND categoria IS NOT NULL AND categoria != ''
      ORDER BY categoria
    `).all(codigoProcesamiento) as Array<{ categoria: string }>;

    // ===== METADATA DEL PROCESAMIENTO =====
    const metadata = db.prepare(`
      SELECT 
        codigo_procesamiento as codigo,
        fecha_procesamiento as fecha,
        usuario_procesamiento as usuario
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento = ?
      LIMIT 1
    `).get(codigoProcesamiento) as { codigo: string; fecha: string; usuario: string } | undefined;

    return json({
      datos,
      total: totalResult.total,
      filtros: {
        abcs: abcsQuery.map(r => r.abc),
        marcas: marcasQuery.map(r => r.marca),
        lineas: lineasQuery.map(r => r.linea),
        // ✅ NUEVO
        categorias: categoriasQuery.map(r => r.categoria)
      },
      metadata: metadata || { codigo: codigoProcesamiento, fecha: null, usuario: '' },
      procesamientosDisponibles
    });

  } catch (error) {
    console.error('Error obteniendo datos procesados:', error);
    return json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
};