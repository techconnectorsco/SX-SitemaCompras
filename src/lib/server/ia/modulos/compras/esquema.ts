/**
 * ============================================================================
 * MÓDULO COMPRAS — ESQUEMA PARA CONSULTAS LIBRES DE LA IA
 * ============================================================================
 * Descripción de las tablas y columnas que la IA puede consultar. Se inyecta
 * en la descripción de la herramienta consultar_datos para que arme SELECTs
 * correctos sin adivinar nombres de columnas.
 *
 * Solo se documentan las tablas de negocio de la lista blanca.
 */

export const ESQUEMA_NEGOCIO = `
TABLAS DISPONIBLES (solo lectura, solo SELECT):

forecast_procesamiento — una fila por SKU por cada corrida de forecast.
  codigo_procesamiento (TEXT, identifica la corrida, ej 'PROC-20260528-101500')
  fecha_procesamiento (INTEGER epoch), usuario_procesamiento (TEXT)
  codigo_sku (TEXT), codigo_proveedor (TEXT), descripcion (TEXT)
  linea (TEXT), marca (TEXT), abc (TEXT: 'A'/'B'/'C'), categoria (TEXT)
  abc_rotacion_frecuencia (TEXT), activo (INTEGER 0/1)
  existencia (REAL), transito (REAL), lead_time (INTEGER, días)
  frecuencia_ventas_12m (INTEGER), venta_ultimos_12m (REAL)
  promedio_12m (REAL), promedio_6m (REAL), promedio_ajustado (REAL)
  desviacion_estandar (REAL), coeficiente_variacion (REAL)
  factor_seguridad (REAL), stock_seguridad (REAL)
  cantidad_final_courier (REAL), cantidad_final_aereo (REAL), cantidad_final_maritimo (REAL)
  sugerido_analista_urgente (REAL), sugerido_analista_aereo (REAL), sugerido_analista_maritimo (REAL)
  costo_prom_dol (REAL), costo_ult_dol (REAL), costo_std_dol (REAL)
  costo_prom_loc (REAL), costo_ult_loc (REAL)
  ultima_salida (TEXT), ultimo_movimiento (TEXT), comentario_analista (TEXT)

skus — catálogo maestro de productos.
  codigo (TEXT, PK), descripcion (TEXT), marca (TEXT), linea (TEXT)
  categoria (TEXT: 'A'/'B'/'C'), existencia_actual (INTEGER), existencia_transito (INTEGER)
  activo (INTEGER 0/1), fecha_actualizacion (INTEGER epoch)

ventas_mensuales — ventas por SKU por mes.
  sku_codigo (TEXT), fecha (TEXT 'YYYY-MM' o 'YYYY-MM-DD')
  cantidad (INTEGER), monto (REAL), stock_promedio (INTEGER)

pedidos — órdenes de compra.
  id (INTEGER), numero_pedido (TEXT), proveedor (TEXT), estado (TEXT)
  monto_total (REAL), fecha_creacion (INTEGER epoch)

pedidos_lineas — líneas de cada pedido.
  pedido_id (INTEGER -> pedidos.id), sku_codigo (TEXT), cantidad (INTEGER)
  precio_unitario (REAL), monto_linea (REAL)
  tipo_envio (TEXT: 'courier'/'aereo'/'maritimo')

bodegas — catálogo de bodegas.
  id (INTEGER), bodega_codigo (TEXT), bodega_nombre (TEXT), tipo (TEXT)
  u_zona (TEXT), excluida (INTEGER 0/1)

alertas — alertas del sistema.
  sku_codigo (TEXT), tipo (TEXT: 'critico'/'advertencia'/'info')
  mensaje (TEXT), activo (INTEGER 0/1), fecha_creacion (INTEGER epoch)

forecast_existencia_bodega — existencias por SKU y bodega, por procesamiento (solo filas != 0).
  codigo_procesamiento (TEXT), codigo_sku (TEXT), bodega_codigo (TEXT)
  existencia (REAL, disponible en esa bodega), transito (REAL)

forecast_pedidos — líneas de pedido de los últimos 6 meses, por procesamiento.
  codigo_procesamiento (TEXT), pedido (TEXT), pedido_linea (INTEGER)
  codigo_sku (TEXT), descripcion (TEXT), proveedor (TEXT), bodega_codigo (TEXT)
  estado (TEXT: 'F' facturado, 'N' nuevo/pendiente)
  fecha_prometida (TEXT 'YYYY-MM-DD'), fecha_entrega (TEXT 'YYYY-MM-DD')
  cantidad_pedida (REAL), cantidad_facturada (REAL), cantidad_pendiente (REAL)
  cantidad_cancelada (REAL), precio_unitario (REAL)
  dias_diferencia (INTEGER, entrega - prometida; >0 = retraso, <=0 = a tiempo)

forecast_proveedor_desempeno — resumen de desempeño por proveedor, por procesamiento.
  codigo_procesamiento (TEXT), proveedor (TEXT), lineas_totales (INTEGER)
  cantidad_pedida (REAL), cantidad_facturada (REAL), cantidad_cancelada (REAL)
  fill_rate (REAL, % facturado/pedido), lead_time_promedio (REAL, días)
  entregas_a_tiempo (INTEGER), entregas_retrasadas (INTEGER)
  porcentaje_a_tiempo (REAL, % de líneas a tiempo)

forecast_corridas — una fila por procesamiento: tiempos y estado del snapshot.
  codigo_procesamiento (TEXT), fecha_procesamiento (TEXT), usuario_procesamiento (TEXT)
  total_skus (INTEGER), duracion_forecast_seg (REAL), duracion_snapshot_seg (REAL)
  duracion_total_seg (REAL), snapshot_estado (TEXT)

REGLAS PARA CONSULTAR:
- Solo SELECT. Nada de INSERT/UPDATE/DELETE/CREATE/etc.
- CLASIFICACIÓN ABC: usá SIEMPRE la columna "abc" de forecast_procesamiento (valores 'A'/'B'/'C', vienen de las ventas). La columna "categoria" de skus suele estar vacía y NO es la clasificación ABC. Para "cuántos SKUs por clasificación A/B/C", agrupá por forecast_procesamiento.abc en el procesamiento más reciente.
- Para "el procesamiento más reciente", filtrá por el codigo_procesamiento con
  mayor fecha_procesamiento, o usá la herramienta listar_procesamientos primero.
- Las fechas INTEGER son epoch en segundos. Para mostrarlas: date(campo,'unixepoch','localtime').
- Para conteos y totales usá COUNT, SUM, AVG, GROUP BY.
- Si no sabés un nombre de columna exacto, mirá esta lista; no inventes columnas.
`.trim();