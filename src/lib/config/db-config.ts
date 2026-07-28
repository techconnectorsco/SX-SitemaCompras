/**
 * @module DatabaseConfig
 * @description Configuración de base de datos SQLite (encriptado solo en producción)
 */
import Database from 'better-sqlite3';
import { dev } from '$app/environment';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

// ===== CONFIGURACIÓN =====
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'app.db');

// 🔐 Clave de encriptación (solo producción)
const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || '';
const USE_ENCRYPTION = !dev && DB_ENCRYPTION_KEY.length > 0;

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
  // ===== TABLAS DE NEGOCIO =====

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
    
    -- ===== AUDITORÍA DEL PROCESAMIENTO =====
    fecha_procesamiento INTEGER NOT NULL,
    usuario_procesamiento TEXT NOT NULL,  -- Admin que ejecutó el procesamiento
    
    -- ===== DATOS DEL SKU =====
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
    
    -- ===== ESTADÍSTICAS CALCULADAS =====
    frecuencia_ventas_12m INTEGER,
    venta_ultimos_12m REAL,
    promedio_12m REAL,
    promedio_6m REAL,
    promedio_ajustado REAL,
    desviacion_estandar REAL,
    coeficiente_variacion REAL,
    
    -- ===== FORECAST CALCULADO =====
    factor_seguridad REAL,
    stock_seguridad REAL,
    referencia_pedido_courier REAL,
    referencia_pedido_aereo REAL,
    referencia_pedido_maritimo REAL,
    
    -- ===== CANTIDADES CALCULADAS =====
    cantidad_courier REAL,
    mensaje_courier TEXT,
    cantidad_final_courier REAL,
    cantidad_aereo REAL,
    mensaje_aereo TEXT,
    cantidad_final_aereo REAL,
    
    -- ===== CAMPOS EDITABLES POR ANALISTA =====
    sugerido_analista_urgente REAL DEFAULT 0,
    sugerido_analista_aereo REAL DEFAULT 0,
    
    -- ===== AUDITORÍA DE MODIFICACIÓN =====
    usuario_modificacion TEXT,           -- Analista que modificó los campos
    fecha_modificacion INTEGER,          -- Timestamp de la modificación
    
    -- ===== METADATOS =====
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );
  
  -- Índices para optimizar búsquedas
  CREATE INDEX IF NOT EXISTS idx_forecast_fecha ON forecast_procesamiento(fecha_procesamiento);
  CREATE INDEX IF NOT EXISTS idx_forecast_sku ON forecast_procesamiento(codigo_sku);
  CREATE INDEX IF NOT EXISTS idx_forecast_fecha_sku ON forecast_procesamiento(fecha_procesamiento, codigo_sku);
  CREATE INDEX IF NOT EXISTS idx_forecast_usuario_proc ON forecast_procesamiento(usuario_procesamiento);
  CREATE INDEX IF NOT EXISTS idx_forecast_usuario_mod ON forecast_procesamiento(usuario_modificacion);
`);

  console.log('[db] ✅ Database schema initialized');
  ensureFirstUserLogic();
}

function ensureFirstUserLogic() {
  try {
    const stmt = db.prepare('SELECT count(*) as count FROM users');
    const result = stmt.get() as { count: number };
    if (result && result.count === 0) {
      console.log('[db] ℹ️  No users. Next user will be ADMIN');
    } else {
      console.log(`[db] ℹ️  Database has ${result.count} user(s)`);
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