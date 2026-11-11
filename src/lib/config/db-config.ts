/**
 * @module DatabaseConfig
 * @description Configuración de base de datos SQLite (encriptado solo en producción)
 */
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { dev } from '$app/environment';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

// ===== CONFIGURACIÓN =====
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'app.db');

// 🔐 Clave de encriptación (solo producción)
const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || '';
const USE_ENCRYPTION = !dev && DB_ENCRYPTION_KEY.length > 0;
const configuredBillingMultiplier = Number(process.env.IA_FACTOR_COBRO ?? '1.10');
const IA_BILLING_MULTIPLIER = Number.isFinite(configuredBillingMultiplier) && configuredBillingMultiplier > 0
  ? configuredBillingMultiplier
  : 1.10;

// Crear directorio
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
  console.log('[db] 📁 Created data directory');
}

/**
 * Instancia de base de datos
 */
export const db = new Database(DB_PATH);

// 🔐 Encriptación (solo en producción)
if (USE_ENCRYPTION) {
  console.log('[db] 🔐 Enabling SQLCipher encryption (production mode)...');
  db.pragma(`key = '${DB_ENCRYPTION_KEY}'`);
  
  try {
    db.prepare('SELECT 1').get();
    console.log('[db] ✅ Database encryption validated');
  } catch (error) {
    console.error('[db] ❌ ERROR: Invalid encryption key');
    throw error;
  }
} else {
  console.log('[db] ℹ️  Running WITHOUT encryption (development mode)');
  console.log('[db] ⚠️  In production, set DB_ENCRYPTION_KEY to enable encryption');
}

// Optimización
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('temp_store = MEMORY');

// ===== CONCURRENCIA MULTIUSUARIO (10-20 usuarios, varias oficinas) =====
// 1) Si la base está ocupada por otra escritura, esperar hasta 20s por el lock
//    en vez de fallar con "database is locked".
db.pragma('busy_timeout = 20000');
// 2) WAL: permite que las lecturas NO se bloqueen mientras alguien escribe.
//    Un checkpoint más grande evita frenar en cada escritura chica.
db.pragma('wal_autocheckpoint = 1000');
// 3) Un solo escritor a la vez negocia el lock de forma más limpia.
db.pragma('wal_checkpoint(TRUNCATE)');

/**
 * Inicialización del esquema
 */
export function initializeDatabase() {
  console.log('[db] 📋 Initializing database schema...');

  // USUARIOS
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      email_verified INTEGER DEFAULT 0,
      password_hash TEXT,
      display_name TEXT,
      photo_url TEXT,
      phone_number TEXT,
      provider TEXT DEFAULT 'email',
      provider_id TEXT,
      is_anonymous INTEGER DEFAULT 0,
      role TEXT DEFAULT 'USER' CHECK(role IN ('ADMIN', 'USER')), 
      account_status TEXT DEFAULT 'PENDING' CHECK(account_status IN ('PENDING', 'ACTIVE', 'REJECTED')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_sign_in_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(account_status);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `);

  // SESIONES
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);

  // TOKENS
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_verify_tokens_token ON email_verification_tokens(token);
  `);

  // PERFILES
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      job_title TEXT,
      department TEXT,
      phone_extension TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // PERMISOS Y AUDITORÍA DE IA INTERNA
  db.exec(`
    CREATE TABLE IF NOT EXISTS ia_permisos_usuario (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      modulo TEXT NOT NULL,
      otorgado_por TEXT REFERENCES users(id) ON DELETE SET NULL,
      fecha INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      PRIMARY KEY (user_id, modulo)
    );
    CREATE INDEX IF NOT EXISTS idx_ia_permisos_modulo ON ia_permisos_usuario(modulo);

    CREATE TABLE IF NOT EXISTS ia_configuracion_usuarios (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      estado_ia TEXT NOT NULL DEFAULT 'ACTIVO',
      limite_tokens_mensual INTEGER,
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS ia_uso_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      usuario_nombre TEXT,
      conversacion_id TEXT,
      fecha INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      proveedor TEXT,
      modelo TEXT,
      modulos TEXT,
      mensaje_resumen TEXT,
      respuesta_texto TEXT,
      herramientas_usadas TEXT,
      iteraciones INTEGER DEFAULT 1,
      tokens_entrada INTEGER DEFAULT 0,
      tokens_salida INTEGER DEFAULT 0,
      tokens_total INTEGER DEFAULT 0,
      costo_base REAL DEFAULT 0,
      factor_cobro REAL DEFAULT 1,
      precio_final REAL DEFAULT 0,
      moneda TEXT DEFAULT 'USD'
    );
    CREATE INDEX IF NOT EXISTS idx_ia_uso_user_fecha ON ia_uso_tokens(user_id, fecha);
  `);

  // AUDITORÍA
 db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
`);
  // ===== VEDOVA & OBANDO =====

  // SKUs
  db.exec(`
    CREATE TABLE IF NOT EXISTS skus (
      codigo TEXT PRIMARY KEY,
      descripcion TEXT,
      marca TEXT,
      linea TEXT,
      categoria TEXT CHECK(categoria IN ('A', 'B', 'C')),
      existencia_actual INTEGER DEFAULT 0,
      existencia_transito INTEGER DEFAULT 0,
      activo INTEGER DEFAULT 1,
      fecha_actualizacion INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_skus_marca ON skus(marca);
    CREATE INDEX IF NOT EXISTS idx_skus_categoria ON skus(categoria);
    CREATE INDEX IF NOT EXISTS idx_skus_activo ON skus(activo);
  `);

  // VENTAS MENSUALES
  db.exec(`
    CREATE TABLE IF NOT EXISTS ventas_mensuales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku_codigo TEXT NOT NULL,
      fecha TEXT NOT NULL,
      cantidad INTEGER DEFAULT 0,
      monto REAL DEFAULT 0,
      stock_promedio INTEGER DEFAULT 0,
      FOREIGN KEY (sku_codigo) REFERENCES skus(codigo)
    );
    CREATE INDEX IF NOT EXISTS idx_ventas_sku ON ventas_mensuales(sku_codigo);
    CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas_mensuales(fecha);
  `);

  // FORECAST
  db.exec(`
    CREATE TABLE IF NOT EXISTS forecast_skus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku_codigo TEXT NOT NULL,
      fecha_calculo INTEGER NOT NULL,
      proyeccion_mes_siguiente INTEGER,
      promedio_12_meses REAL,
      desviacion_estandar REAL,
      stock_seguridad INTEGER,
      FOREIGN KEY (sku_codigo) REFERENCES skus(codigo)
    );
    CREATE INDEX IF NOT EXISTS idx_forecast_sku ON forecast_skus(sku_codigo);
  `);

  // ALERTAS
  db.exec(`
    CREATE TABLE IF NOT EXISTS alertas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku_codigo TEXT,
      tipo TEXT NOT NULL CHECK(tipo IN ('critico', 'advertencia', 'info')),
      mensaje TEXT NOT NULL,
      activo INTEGER DEFAULT 1,
      fecha_creacion INTEGER NOT NULL,
      fecha_resolucion INTEGER,
      FOREIGN KEY (sku_codigo) REFERENCES skus(codigo)
    );
    CREATE INDEX IF NOT EXISTS idx_alertas_activo ON alertas(activo);
    CREATE INDEX IF NOT EXISTS idx_alertas_tipo ON alertas(tipo);
  `);

  // PEDIDOS
  db.exec(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_pedido TEXT UNIQUE NOT NULL,
      proveedor TEXT NOT NULL,
      estado TEXT NOT NULL,
      monto_total REAL DEFAULT 0,
      fecha_creacion INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
    CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha_creacion);
  `);

  // LÍNEAS PEDIDOS
  db.exec(`
    CREATE TABLE IF NOT EXISTS pedidos_lineas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      sku_codigo TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL,
      monto_linea REAL,
      tipo_envio TEXT CHECK(tipo_envio IN ('courier', 'aereo', 'maritimo')),
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
      FOREIGN KEY (sku_codigo) REFERENCES skus(codigo)
    );
    CREATE INDEX IF NOT EXISTS idx_pedidos_lineas_pedido ON pedidos_lineas(pedido_id);
    CREATE INDEX IF NOT EXISTS idx_pedidos_lineas_sku ON pedidos_lineas(sku_codigo);
  `);

  // 12. TABLA DE PROCESAMIENTO DE FORECAST
db.exec(`
  CREATE TABLE IF NOT EXISTS forecast_procesamiento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_procesamiento INTEGER NOT NULL,        -- guarda ISO string (afinidad flexible)
  usuario_procesamiento TEXT NOT NULL,
  codigo_sku TEXT NOT NULL,
  codigo_proveedor TEXT,
  descripcion TEXT,
  linea TEXT,
  marca TEXT,
  abc TEXT,
  abc_rotacion_frecuencia TEXT,
  activo INTEGER,
  existencia REAL,
  transito REAL,
  lead_time INTEGER,
  meses_pedido TEXT,
  frecuencia_ventas_12m INTEGER,
  venta_ultimos_12m REAL,
  promedio_12m REAL,
  promedio_6m REAL,
  promedio_ajustado REAL,
  desviacion_estandar REAL,
  coeficiente_variacion REAL,
  factor_seguridad REAL,
  stock_seguridad REAL,
  referencia_pedido_courier REAL,
  referencia_pedido_aereo REAL,
  referencia_pedido_maritimo REAL,
  cantidad_courier REAL,
  mensaje_courier TEXT,
  cantidad_final_courier REAL,
  cantidad_aereo REAL,
  mensaje_aereo TEXT,
  cantidad_final_aereo REAL,
  sugerido_analista_urgente REAL DEFAULT 0,
  sugerido_analista_aereo REAL DEFAULT 0,
  usuario_modificacion TEXT,
  fecha_modificacion INTEGER,                  -- guarda ISO string (afinidad flexible)
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  codigo_procesamiento TEXT,
  costo_prom_loc REAL DEFAULT 0,
  costo_prom_dol REAL DEFAULT 0,
  costo_ult_loc REAL DEFAULT 0,
  costo_ult_dol REAL DEFAULT 0,
  costo_std_loc REAL DEFAULT 0,
  costo_std_dol REAL DEFAULT 0,
  costo_comparativo REAL DEFAULT 0,
  costo_fiscal REAL DEFAULT 0,
  costo_prom_comparativo_loc REAL DEFAULT 0,
  cantidad_maritimo REAL DEFAULT 0,
  mensaje_maritimo TEXT DEFAULT '',
  cantidad_final_maritimo REAL DEFAULT 0,
  categoria TEXT DEFAULT '',
  fecha_creacion TEXT,
  ultima_salida TEXT,
  ultimo_movimiento TEXT,
  sugerido_analista_maritimo REAL DEFAULT 0,
  comentario_analista TEXT DEFAULT '',
  meses_pedido_usado REAL DEFAULT 0,
  lt_maritimo_usado REAL DEFAULT 0,
  lt_courier_usado REAL DEFAULT 0,
  lt_aereo_usado REAL DEFAULT 0,
  fecha_actualizacion_snapshot INTEGER         
);


  
  -- Índices para optimizar búsquedas
  CREATE INDEX IF NOT EXISTS idx_forecast_fecha ON forecast_procesamiento(fecha_procesamiento);
  CREATE INDEX IF NOT EXISTS idx_forecast_sku ON forecast_procesamiento(codigo_sku);
  CREATE INDEX IF NOT EXISTS idx_forecast_fecha_sku ON forecast_procesamiento(fecha_procesamiento, codigo_sku);
  CREATE INDEX IF NOT EXISTS idx_forecast_usuario_proc ON forecast_procesamiento(usuario_procesamiento);
  CREATE INDEX IF NOT EXISTS idx_forecast_usuario_mod ON forecast_procesamiento(usuario_modificacion);
  CREATE INDEX IF NOT EXISTS idx_forecast_proc_sku ON forecast_procesamiento(codigo_procesamiento, codigo_sku);

`);

// Migración idempotente: sello de última actualización del snapshot
try {
  const colsFP = db.prepare("PRAGMA table_info(forecast_procesamiento)").all() as any[];
  if (!colsFP.some((c) => c.name === 'fecha_actualizacion_snapshot')) {
    db.exec('ALTER TABLE forecast_procesamiento ADD COLUMN fecha_actualizacion_snapshot INTEGER');
    console.log('[db] ➕ Columna fecha_actualizacion_snapshot añadida a forecast_procesamiento');
  }
} catch (e) {
  console.error('[db] ⚠️ Migración fecha_actualizacion_snapshot:', e);
}

// Migración idempotente: mapeo de reemplazos de SKU ("CAMBIO POR/X")
try {
  const colsRe = db.prepare("PRAGMA table_info(forecast_procesamiento)").all() as any[];
  const existentesRe = new Set(colsRe.map((c) => c.name));
  const nuevasRe: [string, string][] = [
    // 'reemplazado' = SKU viejo | 'reemplazo' = SKU vigente/final | 'revisar' = detectado sin resolver | NULL = normal
    ['reemplazo_estado', 'TEXT'],
    // Código con el que se relaciona: en el viejo, a quién apunta (destino FINAL); en el nuevo, de quién hereda
    ['reemplazo_codigo', 'TEXT'],
    // Id de grupo (= código final de la cadena) para mostrarlos juntos
    ['reemplazo_grupo', 'TEXT'],
    // Posición en la cadena: 0 = vigente, 1 = lo reemplazó, 2 = anterior... (para ordenar la vista)
    ['reemplazo_orden', 'INTEGER']
  ];


  for (const [nombre, tipo] of nuevasRe) {
    if (!existentesRe.has(nombre)) {
      db.exec(`ALTER TABLE forecast_procesamiento ADD COLUMN ${nombre} ${tipo}`);
      console.log(`[db] ➕ Columna ${nombre} añadida a forecast_procesamiento`);
    }
  }
} catch (e) {
  console.error('[db] ⚠️ Migración columnas de reemplazo:', e);
}

// Migración idempotente: Preferencias de interfaz de usuario para colapsar columnas en la tabla de compras
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuario_preferencias (
      usuario_email TEXT PRIMARY KEY,
      columnas_ocultas TEXT -- Guardado como JSON array
    )
  `);
  console.log('[db] ➕ Tabla usuario_preferencias verificada/creada');
} catch (e) {
  console.error('[db] ⚠️ Error en migración usuario_preferencias:', e);
}

  // ===== LEAD TIME POR MARCA (config del motor de forecast) =====
  // Vivía solo en la base; se agrega al código para que sea reproducible.
  db.exec(`
    CREATE TABLE IF NOT EXISTS marcas_lt_config (
      clave               TEXT PRIMARY KEY,        -- llave de match que arma el motor
      marca_exactus       TEXT,                    -- CLASIFICACION_4 real que matchea (informativo)
      etiqueta            TEXT NOT NULL,           -- nombre amigable para el cliente
      lt_courier          REAL NOT NULL,           -- horizonte courier (sin meses_pedido, sin S.S.)
      lt_aereo            REAL NOT NULL,           -- L.T. aéreo    (se le suma meses_pedido + S.S.)
      lt_maritimo         REAL NOT NULL,           -- L.T. marítimo (se le suma meses_pedido + S.S.)
      meses_pedido        REAL NOT NULL DEFAULT 0, -- se suma SOLO a aéreo y marítimo
      activo              INTEGER NOT NULL DEFAULT 1,
      nota                TEXT,
      actualizado_por     TEXT,
      fecha_actualizacion TEXT
    );
  `);

  // ===== ASIGNACIÓN DE MARCAS (etiquetas LT) POR USUARIO =====
  // Muchos-a-muchos: un usuario puede tener varias etiquetas y una etiqueta varios usuarios.
  // La usa el gestor de compras para mostrarle a cada analista solo sus marcas.
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuario_marcas_lt (
      usuario_id        TEXT NOT NULL,
      etiqueta          TEXT NOT NULL,
      asignado_por      TEXT,
      fecha_asignacion  TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (usuario_id, etiqueta),
      FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);


  // ===== MIGRACIÓN: columnas agregadas a forecast_procesamiento con el tiempo =====
  // Costos, lane marítimo, categoría/fechas y auditoría de lead time. En prod ya
  // existen (no-op); en una máquina nueva se agregan para reproducir el esquema.
  try {
    const colsFp = db.prepare('PRAGMA table_info(forecast_procesamiento)').all() as any[];
    const existentes = new Set(colsFp.map((c) => c.name));
    const nuevas: [string, string][] = [
      ['codigo_procesamiento', 'TEXT'],
      ['costo_prom_loc', 'REAL'],
      ['costo_prom_dol', 'REAL'],
      ['costo_ult_loc', 'REAL'],
      ['costo_ult_dol', 'REAL'],
      ['costo_std_loc', 'REAL'],
      ['costo_std_dol', 'REAL'],
      ['costo_comparativo', 'REAL'],
      ['costo_fiscal', 'REAL'],
      ['costo_prom_comparativo_loc', 'REAL'],
      ['cantidad_maritimo', 'REAL'],
      ['mensaje_maritimo', 'TEXT'],
      ['cantidad_final_maritimo', 'REAL'],
      ['categoria', 'TEXT'],
      ['fecha_creacion', 'TEXT'],
      ['ultima_salida', 'TEXT'],
      ['ultimo_movimiento', 'TEXT'],
      ['sugerido_analista_maritimo', 'REAL'],
      ['comentario_analista', "TEXT DEFAULT ''"],
      ['meses_pedido_usado', 'REAL DEFAULT 0'],
      ['lt_maritimo_usado', 'REAL DEFAULT 0'],
      ['lt_courier_usado', 'REAL DEFAULT 0'],
      ['lt_aereo_usado', 'REAL DEFAULT 0']
    ];
    for (const [nombre, tipo] of nuevas) {
      if (!existentes.has(nombre)) {
        db.exec(`ALTER TABLE forecast_procesamiento ADD COLUMN ${nombre} ${tipo}`);
        console.log(`[db] ➕ Columna ${nombre} añadida a forecast_procesamiento`);
      }
    }
  } catch (e) {
    console.error('[db] ⚠️ Migración columnas forecast_procesamiento:', e);
  }

  // ===== SNAPSHOTS DE FORECAST (EXISTENCIA BODEGA, PEDIDOS, PROVEEDOR, CORRIDAS) =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS forecast_existencia_bodega (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_procesamiento TEXT NOT NULL,
      codigo_sku TEXT NOT NULL,
      bodega_codigo TEXT NOT NULL,
      existencia REAL DEFAULT 0,
      transito REAL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_feb_proc_sku ON forecast_existencia_bodega(codigo_procesamiento, codigo_sku);

    CREATE TABLE IF NOT EXISTS forecast_pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_procesamiento TEXT NOT NULL,
      pedido TEXT,
      pedido_linea INTEGER,
      codigo_sku TEXT,
      descripcion TEXT,
      proveedor TEXT,
      bodega_codigo TEXT,
      estado TEXT,
      fecha_prometida TEXT,
      fecha_entrega TEXT,
      cantidad_pedida REAL DEFAULT 0,
      cantidad_facturada REAL DEFAULT 0,
      cantidad_pendiente REAL DEFAULT 0,
      cantidad_cancelada REAL DEFAULT 0,
      precio_unitario REAL DEFAULT 0,
      dias_diferencia INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_fp_proc_sku ON forecast_pedidos(codigo_procesamiento, codigo_sku);

    CREATE TABLE IF NOT EXISTS forecast_proveedor_desempeno (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_procesamiento TEXT NOT NULL,
      proveedor TEXT NOT NULL,
      lineas_totales INTEGER DEFAULT 0,
      cantidad_pedida REAL DEFAULT 0,
      cantidad_facturada REAL DEFAULT 0,
      cantidad_cancelada REAL DEFAULT 0,
      fill_rate REAL DEFAULT 0,
      lead_time_promedio REAL DEFAULT 0,
      entregas_a_tiempo INTEGER DEFAULT 0,
      entregas_retrasadas INTEGER DEFAULT 0,
      porcentaje_a_tiempo REAL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_fpd_proc_prov ON forecast_proveedor_desempeno(codigo_procesamiento, proveedor);

    CREATE TABLE IF NOT EXISTS forecast_corridas (
      codigo_procesamiento TEXT PRIMARY KEY,
      fecha_procesamiento TEXT,
      usuario_procesamiento TEXT,
      total_skus INTEGER DEFAULT 0,
      duracion_forecast_seg REAL DEFAULT 0,
      duracion_snapshot_seg REAL DEFAULT 0,
      duracion_total_seg REAL DEFAULT 0,
      snapshot_estado TEXT,
      snapshot_detalle TEXT,
      filas_bodega INTEGER DEFAULT 0,
      filas_pedidos INTEGER DEFAULT 0,
      filas_proveedor INTEGER DEFAULT 0
    );
  `);

  // ===== CONTENT CREATOR: CATÁLOGOS Y PUBLICACIONES =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS marcas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      prompt_sistema TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS formatos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      aspect_ratio TEXT,
      max_size_mb REAL,
      max_duracion_sec INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS audiencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS redes_sociales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS cuentas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      meta_facebook_page_id TEXT,
      meta_instagram_id TEXT,
      meta_access_token TEXT,
      meta_refresh_token TEXT,
      token_expires_at INTEGER,
      meta_business_id TEXT,
      meta_ad_account_id TEXT,
      pais TEXT,
      timezone TEXT DEFAULT 'America/Costa_Rica',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS cuenta_redes (
      cuenta_id INTEGER NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
      red_social_id INTEGER NOT NULL REFERENCES redes_sociales(id) ON DELETE CASCADE,
      PRIMARY KEY (cuenta_id, red_social_id)
    );

    CREATE TABLE IF NOT EXISTS publicaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      cuenta_id INTEGER NOT NULL,
      marca_id INTEGER NOT NULL,
      formato_id INTEGER,
      audiencia_id INTEGER,
      titulo TEXT NOT NULL,
      contexto TEXT,
      objetivo TEXT,
      cta TEXT,
      presupuesto_usd REAL,
      copy_ia_original TEXT,
      copy_final TEXT,
      estado TEXT DEFAULT 'Borrador' CHECK(estado IN ('Borrador', 'En revisión', 'Guardado', 'Aprobado', 'Publicado', 'Error API')),
      api_error_log TEXT,
      retry_count INTEGER DEFAULT 0,
      notas_revision TEXT,
      aprobado_por TEXT,
      aprobado_at INTEGER,
      campana TEXT,
      designed INTEGER DEFAULT 0,
      published INTEGER DEFAULT 0,
      published_at INTEGER,
      meta_post_id TEXT,
      fecha_programada INTEGER,
      sharepoint_item_id TEXT,
      sharepoint_thumbnail_id TEXT,
      image_name TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER,
      deleted_at INTEGER,
      modificado_por TEXT REFERENCES users(id),
      meta_pauta_inicio INTEGER,
      meta_pauta_fin INTEGER,
      sharepoint_drive_id TEXT,
      ultimo_reintento_at INTEGER,
      promoted INTEGER DEFAULT 0,
      carousel_images TEXT,
      prompt_personalizado TEXT,
      prompt_copy TEXT,
      es_carrusel INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(cuenta_id) REFERENCES cuentas(id),
      FOREIGN KEY(marca_id) REFERENCES marcas(id),
      FOREIGN KEY(formato_id) REFERENCES formatos(id),
      FOREIGN KEY(audiencia_id) REFERENCES audiencias(id),
      FOREIGN KEY(aprobado_por) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_pub_user_id ON publicaciones(user_id);
    CREATE INDEX IF NOT EXISTS idx_pub_cuenta_id ON publicaciones(cuenta_id);
    CREATE INDEX IF NOT EXISTS idx_pub_marca_id ON publicaciones(marca_id);
    CREATE INDEX IF NOT EXISTS idx_pub_estado ON publicaciones(estado);
    CREATE INDEX IF NOT EXISTS idx_pub_fecha ON publicaciones(fecha_programada);
    CREATE INDEX IF NOT EXISTS idx_pub_deleted ON publicaciones(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_pub_campana ON publicaciones(campana);

    CREATE TABLE IF NOT EXISTS publicacion_redes (
      publicacion_id INTEGER NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
      red_social_id INTEGER NOT NULL REFERENCES redes_sociales(id) ON DELETE CASCADE,
      PRIMARY KEY (publicacion_id, red_social_id)
    );
  `);

  // Seeding idempotente de catálogos base de Content Creator
  try {
    const seedMarca = db.prepare('INSERT OR IGNORE INTO marcas (nombre, prompt_sistema) VALUES (?, ?)');
    for (const [nombre, prompt] of [
      ['HP', 'Actúa como experto en la marca HP. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.'],
      ['DELL', 'Actúa como experto en la marca DELL. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.'],
      ['ASUS', 'Actúa como experto en la marca ASUS. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.'],
      ['ACER', 'Actúa como experto en la marca ACER. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.'],
      ['EPSON', 'Actúa como experto en la marca EPSON. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.'],
      ['CANON', 'Actúa como experto en la marca CANON. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.'],
      ['BROTHER', 'Actúa como experto en la marca BROTHER. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.'],
      ['LENOVO', 'Actúa como experto en la marca LENOVO. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.']
    ]) {
      seedMarca.run(nombre, prompt);
    }

    const seedFormato = db.prepare('INSERT OR IGNORE INTO formatos (nombre, aspect_ratio, max_size_mb, max_duracion_sec) VALUES (?, ?, ?, ?)');
    for (const [nombre, ratio, size, dur] of [
      ['Vertical (4:5)', '4:5', 30, null],
      ['Cuadrado (1:1)', '1:1', 30, null],
      ['Historia / Reel (9:16)', '9:16', 250, 90],
      ['Horizontal (16:9)', '16:9', 30, null]
    ] as const) {
      seedFormato.run(nombre, ratio, size, dur);
    }

    const seedAudiencia = db.prepare('INSERT OR IGNORE INTO audiencias (nombre) VALUES (?)');
    for (const nombre of ['Amplio', 'Empresas y Corporativo', 'Hogar y Oficina', 'Profesionales de TI', 'Educación y Gobierno']) {
      seedAudiencia.run(nombre);
    }

    const seedRed = db.prepare('INSERT OR IGNORE INTO redes_sociales (id, nombre) VALUES (?, ?)');
    for (const [id, nombre] of [[1, 'Facebook'], [2, 'Instagram'], [3, 'Sitio Web (Blog)'], [4, 'SharePoint']] as const) {
      seedRed.run(id, nombre);
    }

    const seedCuenta = db.prepare('INSERT OR IGNORE INTO cuentas (nombre) VALUES (?)');
    for (const nombre of ['SX', 'Outlet', 'Retail Pro']) {
      seedCuenta.run(nombre);
    }
  } catch (e) {
    console.error('[db] ⚠️ Error seeding catálogos iniciales:', e);
  }

  // ASSETS POR MARCA (logos, isotipos, sellos, fondos)
  db.exec(`
    CREATE TABLE IF NOT EXISTS marca_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marca_id INTEGER NOT NULL REFERENCES marcas(id),
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('logo', 'isotipo', 'sello', 'fondo', 'other')),
      file_path TEXT NOT NULL,
      file_name TEXT,
      mime_type TEXT,
      file_size INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      deleted_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_marca_assets_marca ON marca_assets(marca_id);
    CREATE INDEX IF NOT EXISTS idx_marca_assets_tipo ON marca_assets(tipo);
  `);

  // MANUALES DE MARCA (PDFs, docs, imágenes de manual de marca)
  db.exec(`
    CREATE TABLE IF NOT EXISTS marca_manuales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marca_id INTEGER NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT,
      mime_type TEXT,
      file_size INTEGER,
      resumen_ia TEXT,
      analizado_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      deleted_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_marca_manuales_marca ON marca_manuales(marca_id);
  `);

  try {
    db.exec('ALTER TABLE marca_manuales ADD COLUMN resumen_ia TEXT');
  } catch (e) {
    // Columna ya existe
  }
  try {
    db.exec('ALTER TABLE marca_manuales ADD COLUMN analizado_at INTEGER');
  } catch (e) {
    // Columna ya existe
  }

  // Contexto estructurado y evaluaciones de cumplimiento para el creador de contenido.
  // IF NOT EXISTS permite aplicarlo tanto a instalaciones nuevas como existentes.
  db.exec(`
    CREATE TABLE IF NOT EXISTS beta_brand_manual_contexts (
      manual_id INTEGER PRIMARY KEY REFERENCES marca_manuales(id) ON DELETE CASCADE,
      context_json TEXT NOT NULL,
      references_json TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS beta_brand_generations (
      id INTEGER PRIMARY KEY,
      publication_id INTEGER NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      slide_index INTEGER,
      image_url TEXT NOT NULL,
      creative_prompt TEXT NOT NULL,
      request_json TEXT NOT NULL,
      report_json TEXT,
      evaluation_status TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_beta_brand_generations_publication
      ON beta_brand_generations(publication_id, user_id, id DESC);
  `);

  // BODEGAS (gestión de inventario Exactus)
  // 1) Crear tabla (no-op si ya existe). Para DBs nuevas, cc_incluida nace incluida.
  db.exec(`
    CREATE TABLE IF NOT EXISTS bodegas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bodega_codigo TEXT NOT NULL UNIQUE,
      bodega_nombre TEXT,
      tipo TEXT,
      telefono TEXT,
      direccion TEXT,
      u_zona TEXT,
      tipo_establecimiento TEXT,
      excluida INTEGER DEFAULT 0,
      cc_incluida INTEGER DEFAULT 0,
      fecha_sincronizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      usuario_actualizacion TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_bodegas_codigo ON bodegas(bodega_codigo);
    CREATE INDEX IF NOT EXISTS idx_bodegas_excluida ON bodegas(excluida);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bodegas_exclusion_historial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bodega_codigo TEXT NOT NULL,
      bodega_nombre TEXT,
      accion TEXT,
      usuario TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      razon TEXT,
      FOREIGN KEY (bodega_codigo) REFERENCES bodegas(bodega_codigo)
    );
  `);

  // FICHAS TÉCNICAS DE PRODUCTOS
  db.exec(`
    CREATE TABLE IF NOT EXISTS fichas_tecnicas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marca_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      nombre_producto TEXT NOT NULL,
      descripcion TEXT,
      especificaciones_texto TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER DEFAULT NULL,
      FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_fichas_marca ON fichas_tecnicas(marca_id);
    CREATE INDEX IF NOT EXISTS idx_fichas_user ON fichas_tecnicas(user_id);
    CREATE INDEX IF NOT EXISTS idx_fichas_deleted ON fichas_tecnicas(deleted_at);
  `);

  // 2) Migración: añadir columna cc_incluida si la tabla existía sin ella
  try {
    const columnas = db.prepare("PRAGMA table_info(bodegas)").all() as any[];
    if (!columnas.some((c) => c.name === 'cc_incluida')) {
      db.exec('ALTER TABLE bodegas ADD COLUMN cc_incluida INTEGER DEFAULT 0');
      console.log('[db] ➕ Columna cc_incluida añadida a bodegas');
    }
  } catch (e) {
    console.error('[db] ⚠️ Migración cc_incluida:', e);
  }

  // 2b) Migración: añadir columna prompt_personalizado a publicaciones si no existe
  try {
    const colsPub = db.prepare("PRAGMA table_info(publicaciones)").all() as any[];
    if (colsPub.length > 0 && !colsPub.some((c) => c.name === 'prompt_personalizado')) {
      db.exec('ALTER TABLE publicaciones ADD COLUMN prompt_personalizado TEXT');
      console.log('[db] ➕ Columna prompt_personalizado añadida a publicaciones');
    }
  } catch (e) {
    console.error('[db] ⚠️ Migración prompt_personalizado:', e);
  }

  // 2c) Migración: añadir columna prompt_copy a publicaciones si no existe
  try {
    const colsPub = db.prepare("PRAGMA table_info(publicaciones)").all() as any[];
    if (colsPub.length > 0 && !colsPub.some((c) => c.name === 'prompt_copy')) {
      db.exec('ALTER TABLE publicaciones ADD COLUMN prompt_copy TEXT');
      console.log('[db] ➕ Columna prompt_copy añadida a publicaciones');
    }
    if (colsPub.length > 0 && !colsPub.some((c) => c.name === 'meta_pauta_inicio')) {
      db.exec('ALTER TABLE publicaciones ADD COLUMN meta_pauta_inicio INTEGER');
      console.log('[db] ➕ Columna meta_pauta_inicio añadida a publicaciones');
    }
    if (colsPub.length > 0 && !colsPub.some((c) => c.name === 'meta_pauta_fin')) {
      db.exec('ALTER TABLE publicaciones ADD COLUMN meta_pauta_fin INTEGER');
      console.log('[db] ➕ Columna meta_pauta_fin añadida a publicaciones');
    }
    // Es_carrusel: modo multi-imagen, independiente del nombre del formato
    if (colsPub.length > 0 && !colsPub.some((c) => c.name === 'es_carrusel')) {
      db.exec('ALTER TABLE publicaciones ADD COLUMN es_carrusel INTEGER DEFAULT 0');
      console.log('[db] ➕ Columna es_carrusel añadida a publicaciones');
    }
  } catch (e) {
    console.error('[db] ⚠️ Migración publicaciones:', e);
  }

  // 2d) Migración: actualizar CHECK constraint de estado en publicaciones para incluir 'Guardado'
  try {
    const tableDef = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='publicaciones'").get() as { sql: string } | undefined;
    if (tableDef && tableDef.sql && tableDef.sql.includes('CHECK(estado IN') && !tableDef.sql.includes("'Guardado'")) {
      console.log('[db] 🔄 Migrando CHECK constraint de estado en publicaciones para incluir "Guardado"...');
      db.transaction(() => {
        db.exec('PRAGMA foreign_keys = OFF;');
        db.exec(`
          CREATE TABLE publicaciones_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id TEXT NOT NULL,
              cuenta_id INTEGER NOT NULL,
              marca_id INTEGER NOT NULL,
              formato_id INTEGER,
              audiencia_id INTEGER,
              titulo TEXT NOT NULL,
              contexto TEXT,
              objetivo TEXT,
              cta TEXT,
              presupuesto_usd REAL,
              copy_ia_original TEXT,
              copy_final TEXT,
              estado TEXT DEFAULT 'Borrador' CHECK(estado IN ('Borrador', 'En revisión', 'Guardado', 'Aprobado', 'Publicado', 'Error API')),
              api_error_log TEXT,
              retry_count INTEGER DEFAULT 0,
              notas_revision TEXT,
              aprobado_por TEXT,
              aprobado_at INTEGER,
              campana TEXT,
              designed INTEGER DEFAULT 0,
              published INTEGER DEFAULT 0,
              published_at INTEGER,
              meta_post_id TEXT,
              fecha_programada INTEGER,
              sharepoint_item_id TEXT,
              sharepoint_thumbnail_id TEXT,
              image_name TEXT,
              created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
              updated_at INTEGER,
              deleted_at INTEGER,
              modificado_por TEXT REFERENCES users(id),
              meta_pauta_inicio INTEGER,
              meta_pauta_fin INTEGER,
              sharepoint_drive_id TEXT,
              ultimo_reintento_at INTEGER,
              promoted INTEGER DEFAULT 0,
              carousel_images TEXT,
              prompt_personalizado TEXT,
              prompt_copy TEXT,
              es_carrusel INTEGER DEFAULT 0,
              FOREIGN KEY(user_id) REFERENCES users(id),
              FOREIGN KEY(cuenta_id) REFERENCES cuentas(id),
              FOREIGN KEY(marca_id) REFERENCES marcas(id),
              FOREIGN KEY(formato_id) REFERENCES formatos(id),
              FOREIGN KEY(audiencia_id) REFERENCES audiencias(id),
              FOREIGN KEY(aprobado_por) REFERENCES users(id)
          );
        `);
        db.exec('INSERT INTO publicaciones_new SELECT * FROM publicaciones;');
        db.exec('DROP TABLE publicaciones;');
        db.exec('ALTER TABLE publicaciones_new RENAME TO publicaciones;');
        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_pub_user_id ON publicaciones(user_id);
          CREATE INDEX IF NOT EXISTS idx_pub_cuenta_id ON publicaciones(cuenta_id);
          CREATE INDEX IF NOT EXISTS idx_pub_marca_id ON publicaciones(marca_id);
          CREATE INDEX IF NOT EXISTS idx_pub_estado ON publicaciones(estado);
          CREATE INDEX IF NOT EXISTS idx_pub_fecha ON publicaciones(fecha_programada);
          CREATE INDEX IF NOT EXISTS idx_pub_deleted ON publicaciones(deleted_at);
          CREATE INDEX IF NOT EXISTS idx_pub_campana ON publicaciones(campana);
        `);
        db.exec('PRAGMA foreign_keys = ON;');
      })();
      console.log('[db] ✅ CHECK constraint de estado en publicaciones actualizado a Guardado');
    }
  } catch (e) {
    console.error('[db] ⚠️ Error al migrar CHECK constraint en publicaciones:', e);
  }

  // 3) Crear índice sobre cc_incluida (solo cuando la columna ya existe seguro)
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_bodegas_cc_incluida ON bodegas(cc_incluida)');
  } catch (e) {
    console.error('[db] ⚠️ Índice idx_bodegas_cc_incluida:', e);
  }

  // Registro de consumo de IA y desglose contable de Gemini.
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_token_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      marca_id INTEGER REFERENCES marcas(id),
      publicacion_id INTEGER REFERENCES publicaciones(id) ON DELETE SET NULL,
      modelo_ia TEXT NOT NULL,
      tarea TEXT NOT NULL,
      prompt_utilizado TEXT,
      tokens_prompt INTEGER NOT NULL DEFAULT 0,
      tokens_completion INTEGER NOT NULL DEFAULT 0,
      tokens_thinking INTEGER NOT NULL DEFAULT 0,
      tokens_tool INTEGER NOT NULL DEFAULT 0,
      tokens_image INTEGER NOT NULL DEFAULT 0,
      tokens_totales INTEGER NOT NULL DEFAULT 0,
      costo_proveedor REAL DEFAULT 0,
      costo_estimado REAL DEFAULT 0,
      billing_status TEXT NOT NULL DEFAULT 'legacy_approximate',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON ai_token_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_logs_pub ON ai_token_logs(publicacion_id);
    CREATE INDEX IF NOT EXISTS idx_ai_logs_marca ON ai_token_logs(marca_id);
    CREATE INDEX IF NOT EXISTS idx_ai_logs_fecha ON ai_token_logs(created_at);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS content_publication_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      publication_id INTEGER NOT NULL,
      publication_owner_id TEXT NOT NULL,
      actor_id TEXT REFERENCES users(id),
      action TEXT NOT NULL CHECK(action IN ('CREATED', 'EDITED', 'APPROVED', 'REJECTED', 'PUBLISHED', 'PUBLISH_ERROR', 'DELETED')),
      title TEXT NOT NULL,
      brand_id INTEGER,
      account_id INTEGER,
      detail TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_content_events_date ON content_publication_events(created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_content_events_owner ON content_publication_events(publication_owner_id);
    CREATE INDEX IF NOT EXISTS idx_content_events_brand ON content_publication_events(brand_id);
  `);

  // Las migraciones son idempotentes para bases existentes.
  for (const column of [
    'tokens_thinking INTEGER NOT NULL DEFAULT 0',
    'tokens_tool INTEGER NOT NULL DEFAULT 0',
    'tokens_image INTEGER NOT NULL DEFAULT 0',
    'costo_proveedor REAL DEFAULT 0',
    "billing_status TEXT NOT NULL DEFAULT 'legacy_approximate'"
  ]) {
    try {
      db.exec(`ALTER TABLE ai_token_logs ADD COLUMN ${column}`);
    } catch {
      // La columna ya existe.
    }
  }

  // Gemini 2.5 Flash permite reconstruir exactamente el razonamiento histórico:
  // total = prompt + candidates + thoughts + tool use. Estos flujos no usaron herramientas.
  db.prepare(`
    UPDATE ai_token_logs
    SET tokens_thinking = MAX(0, tokens_totales - tokens_prompt - tokens_completion),
        tokens_tool = 0,
        tokens_image = 0,
        costo_proveedor = (
          (tokens_prompt * 0.30) +
          ((tokens_completion + MAX(0, tokens_totales - tokens_prompt - tokens_completion)) * 2.50)
        ) / 1000000.0,
        costo_estimado = (
          (tokens_prompt * 0.30) +
          ((tokens_completion + MAX(0, tokens_totales - tokens_prompt - tokens_completion)) * 2.50)
        ) / 1000000.0 * ?,
        billing_status = 'verified'
    WHERE modelo_ia = 'gemini-2.5-flash'
  `).run(IA_BILLING_MULTIPLIER);

  // ===== USUARIO DE SISTEMA (para auditoría de tareas automáticas / RPA) =====
  // Existe para satisfacer la FK de audit_logs cuando el proceso lo dispara el
  // cron (no un humano). Idempotente: se crea una sola vez dentro de initializeDatabase().
  db.prepare(`
    INSERT INTO users (
      id, email, email_verified, display_name,
      provider, is_anonymous, role, account_status,
      created_at, updated_at
    ) VALUES (
      'SISTEMA_AUTOMATICO', 'sistema@SXweb.local', 1, 'Sistema Automático',
      'system', 0, 'ADMIN', 'ACTIVE',
      strftime('%s','now'), strftime('%s','now')
    )
    ON CONFLICT(id) DO NOTHING
  `).run();
  console.log('[db] ✅ Usuario SISTEMA_AUTOMATICO verificado/creado');

  // Usuario Administrador inicial por defecto (idempotente)
  try {
    const existingAdmin = db.prepare("SELECT id FROM users WHERE id = 'ADMIN_SEED' OR email = 'admin@soportexperto.com'").get();
    if (!existingAdmin) {
      const adminHash = bcrypt.hashSync('Admin1234!', 10);
      const nowMs = Date.now();
      db.prepare(`
        INSERT INTO users (
          id, email, email_verified, password_hash, display_name,
          provider, is_anonymous, role, account_status,
          created_at, updated_at
        ) VALUES (
          'ADMIN_SEED', 'admin@soportexperto.com', 1, ?, 'Administrador SX',
          'email', 0, 'ADMIN', 'ACTIVE',
          ?, ?
        )
        ON CONFLICT(id) DO NOTHING
      `).run(adminHash, nowMs, nowMs);
      console.log('[db] ✅ Usuario administrador inicial (admin@soportexperto.com) creado');
    }
  } catch (e) {
    console.error('[db] ⚠️ Error verificando admin inicial:', e);
  }

  console.log('[db] ✅ Database schema initialized');
  ensureFirstUserLogic();
}

function ensureFirstUserLogic() {
  try {
    const stmt = db.prepare("SELECT count(*) as count FROM users WHERE id != 'SISTEMA_AUTOMATICO'");
    const result = stmt.get() as { count: number };
    if (result && result.count === 0) {
      console.log('[db] ℹ️  No human users yet. Next registered user will be ADMIN');
    } else {
      console.log(`[db] ℹ️  Database has ${result.count} human user(s)`);
    }
  } catch (err) {
    console.error('[db] Error:', err);
  }
}

// Limpiar sesiones
setInterval(() => {
  try {
    const stmt = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
    const result = stmt.run(Date.now());
    if (result.changes > 0) {
      console.log(`[db] 🧹 Cleaned ${result.changes} sessions`);
    }
  } catch (error) {
    console.error('[db] Cleanup error:', error);
  }
}, 3600000);

initializeDatabase();

export default db;
