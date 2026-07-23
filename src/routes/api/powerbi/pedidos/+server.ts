/**
 * API: Exportar datos de PEDIDO_LINEA para Power BI
 * 
 * GET /api/powerbi/pedidos
 * 
 * Parámetros:
 * - ?meses=24         → Cantidad de meses a consultar (default: 24)
 * - ?estado=F         → Filtrar por estado: F=Facturado, N=Nuevo, todos=sin filtro (default: todos)
 * - ?articulo=SKU123  → Filtrar por artículo específico (opcional)
 * - ?resumen=true     → Solo devolver resumen sin detalle de líneas
 * - ?formato=download → Descargar como archivo JSON
 * 
 * Autenticación: API Key (x-api-key header) o cookie de sesión
 * 
 * Fuente de datos: SQL Server (Exactus) - VEDOVA.PEDIDO_LINEA
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuditService } from '$lib/features/security/services/audit-service';
import sql from 'mssql';

// Importa las variables desde el sistema de SvelteKit
import { 
    EXACTUS_SERVER, 
    EXACTUS_PORT, 
    EXACTUS_DATABASE, 
    EXACTUS_USER, 
    EXACTUS_PASSWORD,
    POWERBI_API_KEY 
} from '$env/static/private';

// ===== CONFIGURACIÓN SQL SERVER =====
const SQL_CONFIG: sql.config = {
  server: EXACTUS_SERVER,
  port: parseInt(EXACTUS_PORT || '1433'),
  database: EXACTUS_DATABASE,
  user: EXACTUS_USER,
  password: EXACTUS_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 120000, // 2 minutos
    connectTimeout: 30000
  },
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// ===== POOL DE CONEXIONES =====
let pool: sql.ConnectionPool | null = null;

async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool || !pool.connected) {
    console.log('[PowerBI Pedidos] Conectando a SQL Server...');
    pool = await sql.connect(SQL_CONFIG);
    console.log('[PowerBI Pedidos] ✅ Conectado a SQL Server');
  }
  return pool;
}

// ===== INTERFACES =====
interface PedidoLinea {
  pedido: string;
  linea: number;
  articulo: string;
  descripcion: string | null;
  bodega: string;
  estado: string;
  fecha_prometida: string | null;
  fecha_entrega: string | null;
  cantidad_pedida: number;
  cantidad_facturada: number;
  cantidad_pendiente: number;
  cantidad_cancelada: number;
  precio_unitario: number;
  dias_diferencia: number | null;
  fill_rate_linea: number;
  cumplimiento_fecha: 'A_TIEMPO' | 'RETRASADO' | 'ADELANTADO' | 'SIN_FECHA';
}

interface ResumenKPIs {
  periodo: {
    desde: string;
    hasta: string;
    meses: number;
  };
  totales: {
    pedidos_unicos: number;
    lineas_totales: number;
    articulos_unicos: number;
  };
  cantidades: {
    total_pedida: number;
    total_facturada: number;
    total_pendiente: number;
    total_cancelada: number;
  };
  fill_rate: {
    global: number;
    por_estado: {
      facturado: number;
      pendiente: number;
    };
  };
  lead_time: {
    promedio_dias: number;
    minimo_dias: number;
    maximo_dias: number;
    desviacion: number;
  };
  cumplimiento_fecha: {
    a_tiempo: number;
    retrasados: number;
    adelantados: number;
    sin_fecha: number;
    porcentaje_a_tiempo: number;
  };
  valor_economico: {
    total_pedido: number;
    total_facturado: number;
    total_pendiente: number;
    perdida_por_cancelacion: number;
  };
  por_estado: {
    F: number; // Facturado
    N: number; // Nuevo/Pendiente
    otros: number;
  };
  por_bodega: Record<string, number>;
}

// ===== HANDLER PRINCIPAL =====
export const GET: RequestHandler = async ({ url, locals, request }) => {
  const user = locals.user || locals.session?.user;
  
  // ===== VALIDAR CONFIGURACIÓN =====
  if (!EXACTUS_SERVER || !EXACTUS_DATABASE || !EXACTUS_USER || !EXACTUS_PASSWORD) {
    console.error('[PowerBI Pedidos] ❌ Faltan variables de entorno en el archivo .env');
    return json({ 
        error: 'Configuración incompleta',
        details: 'El servidor no pudo leer las credenciales del archivo .env'
    }, { status: 500 });
}
  
  // ===== VERIFICAR AUTENTICACIÓN =====
  // Primero intentar API Key
  const apiKey = request.headers.get('x-api-key');
  let isApiKeyAuth = false;
  
  if (apiKey) {
    // Validar API Key (usar la misma lógica que export-procesamiento)
    const validApiKey = POWERBI_API_KEY ;
    if (apiKey !== validApiKey) {
      return json({ error: 'API Key inválida' }, { status: 401 });
    }
    isApiKeyAuth = true;
  } else if (!user) {
    return json({ error: 'No autenticado. Proporcione x-api-key header o inicie sesión.' }, { status: 401 });
  } else {
    // Verificar rol si es autenticación por sesión
    const userRole = String(user.role).toUpperCase();
    if (userRole !== 'ADMIN' && userRole !== 'API_CONSUMER') {
      return json({ error: 'Solo administradores pueden acceder a esta API' }, { status: 403 });
    }
  }

  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'PowerBI-Client';

  try {
    // ===== PARÁMETROS =====
    const meses = parseInt(url.searchParams.get('meses') || '6');
    const estado = url.searchParams.get('estado'); // F, N, o null para todos
    const articulo = url.searchParams.get('articulo');
    const soloResumen = url.searchParams.get('resumen') === 'true';
    const formato = url.searchParams.get('formato') || 'json';

    // Validar meses
    if (meses < 1 || meses > 60) {
      return json({ error: 'El parámetro meses debe estar entre 1 y 60' }, { status: 400 });
    }

    // ===== CONECTAR A SQL SERVER =====
    const pool = await getPool();
    
    // Calcular fecha de inicio
    const fechaHasta = new Date();
    const fechaDesde = new Date();
    fechaDesde.setMonth(fechaDesde.getMonth() - meses);
    
    const fechaDesdeStr = fechaDesde.toISOString().split('T')[0];
    const fechaHastaStr = fechaHasta.toISOString().split('T')[0];

    console.log(`[PowerBI Pedidos] Consultando desde ${fechaDesdeStr} hasta ${fechaHastaStr}`);

    // ===== CONSTRUIR QUERY =====
    // IMPORTANTE: Filtrar fechas inválidas (años fuera de rango 2000-2030)
    // El ERP tiene datos basura como año 3619
    let whereClause = `WHERE PL.FECHA_ENTREGA >= '${fechaDesdeStr}'
      AND YEAR(PL.FECHA_ENTREGA) BETWEEN 2000 AND 2035
      AND (PL.FECHA_PROMETIDA IS NULL OR YEAR(PL.FECHA_PROMETIDA) BETWEEN 2000 AND 2035)`;
    
    if (estado) {
      whereClause += ` AND PL.ESTADO = '${estado}'`;
    }
    
    if (articulo) {
      whereClause += ` AND PL.ARTICULO = '${articulo}'`;
    }

    // ===== QUERY PRINCIPAL =====
    const queryDetalle = `
      SELECT 
        PL.PEDIDO,
        PL.PEDIDO_LINEA,
        PL.ARTICULO,
        A.DESCRIPCION,
        PL.BODEGA,
        PL.ESTADO,
        PL.FECHA_PROMETIDA,
        PL.FECHA_ENTREGA,
        CAST(ISNULL(PL.CANTIDAD_PEDIDA, 0) AS FLOAT) as CANTIDAD_PEDIDA,
        CAST(ISNULL(PL.CANTIDAD_FACTURADA, 0) AS FLOAT) as CANTIDAD_FACTURADA,
        CAST(ISNULL(PL.CANTIDAD_A_FACTURA, 0) AS FLOAT) as CANTIDAD_A_FACTURA,
        CAST(ISNULL(PL.CANTIDAD_CANCELADA, 0) AS FLOAT) as CANTIDAD_CANCELADA,
        CAST(ISNULL(PL.PRECIO_UNITARIO, 0) AS FLOAT) as PRECIO_UNITARIO,
        DATEDIFF(day, PL.FECHA_PROMETIDA, PL.FECHA_ENTREGA) as DIAS_DIFERENCIA
      FROM VEDOVA.PEDIDO_LINEA PL
      LEFT JOIN VEDOVA.ARTICULO A ON PL.ARTICULO = A.ARTICULO
      ${whereClause}
      ORDER BY PL.FECHA_ENTREGA DESC
    `;
    //, PL.PEDIDO, PL.PEDIDO_LINEA quite esto para mejorar performance, no es necesario para el detalle y ralentiza mucho la consulta
    // ===== QUERY DE RESUMEN =====
    const queryResumen = `
      SELECT 
        COUNT(DISTINCT PL.PEDIDO) as pedidos_unicos,
        COUNT(*) as lineas_totales,
        COUNT(DISTINCT PL.ARTICULO) as articulos_unicos,
        SUM(CAST(ISNULL(PL.CANTIDAD_PEDIDA, 0) AS FLOAT)) as total_pedida,
        SUM(CAST(ISNULL(PL.CANTIDAD_FACTURADA, 0) AS FLOAT)) as total_facturada,
        SUM(CAST(ISNULL(PL.CANTIDAD_A_FACTURA, 0) AS FLOAT)) as total_pendiente,
        SUM(CAST(ISNULL(PL.CANTIDAD_CANCELADA, 0) AS FLOAT)) as total_cancelada,
        AVG(CAST(ISNULL(PL.PRECIO_UNITARIO, 0) AS FLOAT)) as precio_promedio,
        SUM(CAST(ISNULL(PL.CANTIDAD_PEDIDA, 0) AS FLOAT) * CAST(ISNULL(PL.PRECIO_UNITARIO, 0) AS FLOAT)) as valor_total_pedido,
        SUM(CAST(ISNULL(PL.CANTIDAD_FACTURADA, 0) AS FLOAT) * CAST(ISNULL(PL.PRECIO_UNITARIO, 0) AS FLOAT)) as valor_total_facturado,
        AVG(DATEDIFF(day, PL.FECHA_PROMETIDA, PL.FECHA_ENTREGA)) as lead_time_promedio,
        MIN(DATEDIFF(day, PL.FECHA_PROMETIDA, PL.FECHA_ENTREGA)) as lead_time_min,
        MAX(DATEDIFF(day, PL.FECHA_PROMETIDA, PL.FECHA_ENTREGA)) as lead_time_max,
        STDEV(DATEDIFF(day, PL.FECHA_PROMETIDA, PL.FECHA_ENTREGA)) as lead_time_desviacion
      FROM VEDOVA.PEDIDO_LINEA PL
      ${whereClause}
        AND PL.CANTIDAD_PEDIDA > 0
    `;

    // ===== QUERY POR ESTADO =====
    const queryPorEstado = `
      SELECT 
        ESTADO,
        COUNT(*) as cantidad
      FROM VEDOVA.PEDIDO_LINEA PL
      ${whereClause}
      GROUP BY ESTADO
    `;

    // ===== QUERY POR BODEGA =====
    const queryPorBodega = `
      SELECT 
        BODEGA,
        COUNT(*) as cantidad
      FROM VEDOVA.PEDIDO_LINEA PL
      ${whereClause}
      GROUP BY BODEGA
      ORDER BY cantidad DESC
    `;

    // ===== QUERY CUMPLIMIENTO DE FECHAS =====
    const queryCumplimiento = `
      SELECT 
        SUM(CASE WHEN DATEDIFF(day, FECHA_PROMETIDA, FECHA_ENTREGA) = 0 THEN 1 ELSE 0 END) as a_tiempo,
        SUM(CASE WHEN DATEDIFF(day, FECHA_PROMETIDA, FECHA_ENTREGA) > 0 THEN 1 ELSE 0 END) as retrasados,
        SUM(CASE WHEN DATEDIFF(day, FECHA_PROMETIDA, FECHA_ENTREGA) < 0 THEN 1 ELSE 0 END) as adelantados,
        SUM(CASE WHEN FECHA_PROMETIDA IS NULL OR FECHA_ENTREGA IS NULL THEN 1 ELSE 0 END) as sin_fecha
      FROM VEDOVA.PEDIDO_LINEA PL
      ${whereClause}
    `;

    // ===== EJECUTAR QUERIES =====
    console.log('[PowerBI Pedidos] Ejecutando consultas...');
    
    const [resumenResult, estadoResult, bodegaResult, cumplimientoResult] = await Promise.all([
      pool.request().query(queryResumen),
      pool.request().query(queryPorEstado),
      pool.request().query(queryPorBodega),
      pool.request().query(queryCumplimiento)
    ]);

    const resumenData = resumenResult.recordset[0];
    const porEstado = estadoResult.recordset;
    const porBodega = bodegaResult.recordset;
    const cumplimiento = cumplimientoResult.recordset[0];

    // ===== CALCULAR KPIS =====
    const fillRateGlobal = resumenData.total_pedida > 0 
      ? (resumenData.total_facturada / resumenData.total_pedida) * 100 
      : 0;

    const totalConFecha = (cumplimiento.a_tiempo || 0) + (cumplimiento.retrasados || 0) + (cumplimiento.adelantados || 0);
    const porcentajeATiempo = totalConFecha > 0 
      ? ((cumplimiento.a_tiempo || 0) / totalConFecha) * 100 
      : 0;

    // Construir objeto por estado
    const porEstadoObj: Record<string, number> = { F: 0, N: 0, otros: 0 };
    for (const est of porEstado) {
      if (est.ESTADO === 'F') porEstadoObj.F = est.cantidad;
      else if (est.ESTADO === 'N') porEstadoObj.N = est.cantidad;
      else porEstadoObj.otros += est.cantidad;
    }

    // Construir objeto por bodega
    const porBodegaObj: Record<string, number> = {};
    for (const bod of porBodega) {
      porBodegaObj[bod.BODEGA || 'SIN_BODEGA'] = bod.cantidad;
    }

    // ===== CONSTRUIR RESUMEN =====
    const resumen: ResumenKPIs = {
      periodo: {
        desde: fechaDesdeStr,
        hasta: fechaHastaStr,
        meses
      },
      totales: {
        pedidos_unicos: resumenData.pedidos_unicos || 0,
        lineas_totales: resumenData.lineas_totales || 0,
        articulos_unicos: resumenData.articulos_unicos || 0
      },
      cantidades: {
        total_pedida: Math.round(resumenData.total_pedida || 0),
        total_facturada: Math.round(resumenData.total_facturada || 0),
        total_pendiente: Math.round(resumenData.total_pendiente || 0),
        total_cancelada: Math.round(resumenData.total_cancelada || 0)
      },
      fill_rate: {
        global: Math.round(fillRateGlobal * 100) / 100,
        por_estado: {
          facturado: porEstadoObj.F,
          pendiente: porEstadoObj.N
        }
      },
      lead_time: {
        promedio_dias: Math.round((resumenData.lead_time_promedio || 0) * 10) / 10,
        minimo_dias: resumenData.lead_time_min || 0,
        maximo_dias: resumenData.lead_time_max || 0,
        desviacion: Math.round((resumenData.lead_time_desviacion || 0) * 100) / 100
      },
      cumplimiento_fecha: {
        a_tiempo: cumplimiento.a_tiempo || 0,
        retrasados: cumplimiento.retrasados || 0,
        adelantados: cumplimiento.adelantados || 0,
        sin_fecha: cumplimiento.sin_fecha || 0,
        porcentaje_a_tiempo: Math.round(porcentajeATiempo * 100) / 100
      },
      valor_economico: {
        total_pedido: Math.round((resumenData.valor_total_pedido || 0) * 100) / 100,
        total_facturado: Math.round((resumenData.valor_total_facturado || 0) * 100) / 100,
        total_pendiente: Math.round(((resumenData.valor_total_pedido || 0) - (resumenData.valor_total_facturado || 0)) * 100) / 100,
        perdida_por_cancelacion: Math.round((resumenData.total_cancelada || 0) * (resumenData.precio_promedio || 0) * 100) / 100
      },
      por_estado: porEstadoObj,
      por_bodega: porBodegaObj
    };

    console.log(`[PowerBI Pedidos] ✅ Resumen calculado: ${resumen.totales.lineas_totales} líneas, Fill Rate: ${resumen.fill_rate.global}%`);

    // ===== SI SOLO SE PIDE RESUMEN =====
    if (soloResumen) {
      // Log de auditoría
      if (user) {
        AuditService.log(
          user.id,
          'FORECAST_EXPORT_JSON',
          ip,
          userAgent,
          `Exportación PowerBI Pedidos (solo resumen). Periodo: ${meses} meses. Líneas: ${resumen.totales.lineas_totales}`
        );
      }

      return json({
        success: true,
        exportado_en: new Date().toISOString(),
        tipo: 'resumen',
        resumen
      });
    }

    // ===== OBTENER DETALLE =====
    console.log('[PowerBI Pedidos] Obteniendo detalle de líneas...');
    const detalleResult = await pool.request().query(queryDetalle);
    
    // Transformar datos
    const pedidos: PedidoLinea[] = detalleResult.recordset.map((row: any) => {
      const cantidadPedida = row.CANTIDAD_PEDIDA || 0;
      const cantidadFacturada = row.CANTIDAD_FACTURADA || 0;
      const fillRate = cantidadPedida > 0 ? (cantidadFacturada / cantidadPedida) * 100 : 0;
      
      let cumplimientoFecha: 'A_TIEMPO' | 'RETRASADO' | 'ADELANTADO' | 'SIN_FECHA' = 'SIN_FECHA';
      if (row.DIAS_DIFERENCIA !== null) {
        if (row.DIAS_DIFERENCIA === 0) cumplimientoFecha = 'A_TIEMPO';
        else if (row.DIAS_DIFERENCIA > 0) cumplimientoFecha = 'RETRASADO';
        else cumplimientoFecha = 'ADELANTADO';
      }

      return {
        pedido: row.PEDIDO,
        linea: row.PEDIDO_LINEA,
        articulo: row.ARTICULO,
        descripcion: row.DESCRIPCION,
        bodega: row.BODEGA,
        estado: row.ESTADO,
        fecha_prometida: row.FECHA_PROMETIDA ? new Date(row.FECHA_PROMETIDA).toISOString().split('T')[0] : null,
        fecha_entrega: row.FECHA_ENTREGA ? new Date(row.FECHA_ENTREGA).toISOString().split('T')[0] : null,
        cantidad_pedida: Math.round(cantidadPedida),
        cantidad_facturada: Math.round(cantidadFacturada),
        cantidad_pendiente: Math.round(row.CANTIDAD_A_FACTURA || 0),
        cantidad_cancelada: Math.round(row.CANTIDAD_CANCELADA || 0),
        precio_unitario: Math.round((row.PRECIO_UNITARIO || 0) * 100) / 100,
        dias_diferencia: row.DIAS_DIFERENCIA,
        fill_rate_linea: Math.round(fillRate * 100) / 100,
        cumplimiento_fecha: cumplimientoFecha
      };
    });

    console.log(`[PowerBI Pedidos] ✅ ${pedidos.length} líneas procesadas`);

    // ===== LOG DE AUDITORÍA =====
    if (user) {
      AuditService.log(
        user.id,
        'FORECAST_EXPORT_JSON',
        ip,
        userAgent,
        `Exportación PowerBI Pedidos completa. Periodo: ${meses} meses. Líneas: ${pedidos.length}. Fill Rate: ${resumen.fill_rate.global}%`
      );
    }

    // ===== CONSTRUIR RESPUESTA =====
    const response = {
      success: true,
      exportado_en: new Date().toISOString(),
      exportado_por: user?.email || 'API_KEY',
      tipo: 'completo',
      resumen,
      pedidos
    };

    // ===== MODO DESCARGA =====
    if (formato === 'download') {
      const jsonString = JSON.stringify(response, null, 2);
      const fechaArchivo = new Date().toISOString().split('T')[0].replace(/-/g, '');
      
      return new Response(jsonString, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="pedidos_kpis_${meses}m_${fechaArchivo}.json"`,
          'Content-Length': Buffer.byteLength(jsonString, 'utf8').toString()
        }
      });
    }

    // ===== RESPUESTA JSON =====
    return json(response);

  } catch (error) {
    console.error('[PowerBI Pedidos] ❌ Error:', error);
    
    if (user) {
      AuditService.log(
        user.id,
        'FORECAST_EXPORT_ERROR',
        ip,
        userAgent,
        `Error en exportación PowerBI Pedidos: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }

    return json({ 
      error: 'Error al consultar datos de pedidos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
};