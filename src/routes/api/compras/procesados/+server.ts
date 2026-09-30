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
        filtros: { abcs: [], marcas: [], lineas: [], categorias: [], etiquetas:[] },
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
    const etiqueta = url.searchParams.get('etiqueta') || '';
    // filtro de categoría
    const categoria = url.searchParams.get('categoria') || '';
     // Filtro Activo: '' = solo activos (default), 'no' = solo inactivos, 'todos' = ambos
    const activo = url.searchParams.get('activo') || '';
    // Solo Editados: trae únicamente SKUs con algún sugerido del analista > 0 o con comentario
    const soloEditados = url.searchParams.get('solo_editados') === 'true';
    // Solo Reemplazos: trae únicamente SKUs marcados como reemplazo/reemplazado/revisar
    const soloReemplazos = url.searchParams.get('solo_reemplazos') === 'true';
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

    // Reconstruye la clave de LT igual que resolverClaveLt(marca, linea) del forecast-core
const CLAVE_LT_SQL = `
  CASE
    WHEN UPPER(TRIM(marca)) = 'HUSQVARNA'
      THEN CASE WHEN UPPER(TRIM(COALESCE(linea,''))) LIKE 'RP%'
                THEN 'HUSQVARNA-A' ELSE 'HUSQVARNA-B' END
    ELSE UPPER(TRIM(COALESCE(marca,'')))
  END`;

if (etiqueta) {
  // ¿La etiqueta seleccionada es la del default ("Otras marcas")?
  const esDefault = db.prepare(
    `SELECT 1 FROM marcas_lt_config WHERE clave = '__DEFAULT__' AND etiqueta = ?`
  ).get(etiqueta);

  if (esDefault) {
    // Otras marcas = SKUs que NO calzan con ninguna clave configurada y activa
    conditions.push(
      `(${CLAVE_LT_SQL}) NOT IN (SELECT clave FROM marcas_lt_config WHERE activo = 1 AND clave != '__DEFAULT__')`
    );
  } else {
    // Proveedor normal (Deyu, Husqvarna A/B, Cifarelli...): sus claves configuradas
    conditions.push(
      `(${CLAVE_LT_SQL}) IN (SELECT clave FROM marcas_lt_config WHERE etiqueta = ? AND activo = 1)`
    );
    params.push(etiqueta);
  }
}

    // ✅ NUEVO: condición de categoría
     // ✅ NUEVO: condición de categoría
    if (categoria) {
      conditions.push(`categoria = ?`);
      params.push(categoria);
    }

    // Filtro Activo. Por defecto ('') solo muestra activos.
    // 'no' = solo inactivos. 'todos' = no filtra por activo.
    // Filtro Activo. Por defecto ('') solo muestra activos.
    // 'no' = solo inactivos. 'todos' = no filtra por activo.
    if (activo === 'no') {
      conditions.push(`activo = 0`);
    } else if (activo === 'todos') {
      // sin condición: trae activos e inactivos
    } else {
      conditions.push(`activo = 1`);
    }

    // Solo Editados: filas con algún sugerido del analista > 0 o con comentario no vacío
    if (soloEditados) {
      conditions.push(`(
        COALESCE(sugerido_analista_urgente, 0) > 0
        OR COALESCE(sugerido_analista_aereo, 0) > 0
        OR COALESCE(sugerido_analista_maritimo, 0) > 0
        OR COALESCE(TRIM(comentario_analista), '') != ''
      )`);
    }

    // Solo Reemplazos: filas marcadas por el detector
    if (soloReemplazos) {
      conditions.push(`reemplazo_estado IS NOT NULL`);
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

    // ===== RESTRICCIÓN POR USUARIO (marcas asignadas) =====
// ADMIN ve todo. USER con etiquetas asignadas ve SOLO esas. USER sin asignaciones ve todo.
if (String(user.role).toUpperCase() !== 'ADMIN') {
  const etiquetasUsuario = (db.prepare(
    `SELECT etiqueta FROM usuario_marcas_lt WHERE usuario_id = ?`
  ).all(user.id) as Array<{ etiqueta: string }>).map(r => r.etiqueta);

  if (etiquetasUsuario.length > 0) {
    // "Otras marcas" (__DEFAULT__) se maneja aparte: es la lógica inversa.
    const defRow = db.prepare(
      `SELECT etiqueta FROM marcas_lt_config WHERE clave = '__DEFAULT__' LIMIT 1`
    ).get() as { etiqueta: string } | undefined;
    const etiquetaDefault = defRow?.etiqueta ?? null;

    const incluyeDefault = etiquetaDefault !== null && etiquetasUsuario.includes(etiquetaDefault);
    const etiquetasNormales = etiquetasUsuario.filter(e => e !== etiquetaDefault);

    const ors: string[] = [];
    if (etiquetasNormales.length > 0) {
      const ph = etiquetasNormales.map(() => '?').join(', ');
      ors.push(`(${CLAVE_LT_SQL}) IN (SELECT clave FROM marcas_lt_config WHERE activo = 1 AND etiqueta IN (${ph}))`);
      params.push(...etiquetasNormales);
    }
    if (incluyeDefault) {
      ors.push(`(${CLAVE_LT_SQL}) NOT IN (SELECT clave FROM marcas_lt_config WHERE activo = 1 AND clave != '__DEFAULT__')`);
    }
    if (ors.length > 0) conditions.push(`(${ors.join(' OR ')})`);
  }
}

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // ===== ORDENAMIENTO =====
    let orderClause = 'ORDER BY codigo_sku ASC';

    if (soloReemplazos) {
      // PRIORIDAD: agrupar vigente(0) → viejos(1,2,3). 
      // 'reemplazo_grupo IS NULL ASC' manda los "revisar" al fondo de la tabla.
      orderClause = 'ORDER BY reemplazo_grupo ASC, reemplazo_orden ASC';//orderClause = 'ORDER BY reemplazo_grupo IS NULL ASC, reemplazo_grupo ASC, reemplazo_orden ASC';
    }else if (solo8020) {
      orderClause = 'ORDER BY promedio_6m DESC, venta_ultimos_12m DESC';
    } else {
      switch (sort) {
        case 'codigo_asc': orderClause = 'ORDER BY codigo_sku ASC'; break;
        case 'codigo_desc': orderClause = 'ORDER BY codigo_sku DESC'; break;
        case 'existencia_asc': orderClause = 'ORDER BY existencia ASC'; break;
        case 'existencia_desc': orderClause = 'ORDER BY existencia DESC'; break;
        case 'ventas_asc': orderClause = 'ORDER BY venta_ultimos_12m ASC'; break;
        case 'ventas_desc': orderClause = 'ORDER BY venta_ultimos_12m DESC'; break;
      }
    }

    // ===== OBTENER TOTAL =====
    const totalQuery = `SELECT COUNT(*) as total FROM forecast_procesamiento ${whereClause}`;
    const totalResult = db.prepare(totalQuery).get(...params) as { total: number };

    const etiquetasQuery = db.prepare(`
  SELECT etiqueta, MAX(CASE WHEN clave = '__DEFAULT__' THEN 1 ELSE 0 END) AS es_def
  FROM marcas_lt_config
  WHERE activo = 1 AND etiqueta IS NOT NULL AND etiqueta != ''
  GROUP BY etiqueta
  ORDER BY es_def, etiqueta
`).all() as Array<{ etiqueta: string }>;

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
        comentario_analista,
        reemplazo_estado,
        reemplazo_codigo,
        reemplazo_grupo,
        reemplazo_orden
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
        usuario_procesamiento as usuario,
        MAX(fecha_actualizacion_snapshot) as fechaActualizacion
      FROM forecast_procesamiento 
      WHERE codigo_procesamiento = ?
      LIMIT 1
    `).get(codigoProcesamiento) as { codigo: string; fecha: string; usuario: string; fechaActualizacion: string | null } | undefined;

    return json({
      datos,
      total: totalResult.total,
      filtros: {
        abcs: abcsQuery.map(r => r.abc),
        marcas: marcasQuery.map(r => r.marca),
        lineas: lineasQuery.map(r => r.linea),
        // ✅ NUEVO
        categorias: categoriasQuery.map(r => r.categoria),
        etiquetas: etiquetasQuery.map(r => r.etiqueta)
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