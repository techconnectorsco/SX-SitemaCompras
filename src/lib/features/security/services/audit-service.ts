/**
 * @module AuditService
 * @description Servicio para registrar eventos de seguridad y actividad
 */
import db from '$lib/config/db-config';
import { generateId } from '$lib/features/auth/services/auth-utils';

export type AuditAction =
  // Autenticación
  | 'LOGIN'
  | 'REGISTER'
  | 'LOGOUT'
  | 'PASSWORD_RESET'
  | 'LOGIN_FAILED'
  // Gestión de Usuarios (Nuevos)
  | 'PROFILE_UPDATE'
  | 'PASSWORD_CHANGE'
  | 'USER_BANNED'        // Baneo de usuarios
  | 'USER_PROMOTED'      // Hacer admin a un usuario
  | 'ADMIN_PASSWORD_RESET' // Admin resetea pass de usuario
  // Procesos Sistema
  | 'FORECAST_PROCESS_START'
  | 'FORECAST_PROCESS_COMPLETE'
  | 'FORECAST_PROCESS_ERROR'
  // Gestión Compras
  | 'COMPRAS_UPDATE'
  | 'COMPRAS_SAVE_CHANGES'
  | 'COMPRAS_UPDATE_ERROR'
  // Exportación de Pedidos
  | 'COMPRAS_EXPORT_HUSQVARNA'
  | 'COMPRAS_EXPORT_OTROS'
  | 'COMPRAS_EXPORT_ERROR'
  | 'FORECAST_EXPORT_JSON'
  | 'FORECAST_EXPORT_ERROR'
   // Reportes Excel
  | 'REPORT_DOWNLOAD'
  | 'REPORT_DOWNLOAD_ERROR'
  //Bodegas
  | 'BODEGAS_CARGAR'           // Primera carga
  | 'BODEGAS_ACTUALIZAR'       // Sincronizar
  | 'BODEGA_EXCLUIDA'          // Marcar como excluida
  | 'BODEGA_INCLUIDA'          // Marcar como incluida
  | 'BODEGA_ELIMINAR'
  //leadTime
  | 'MARCA_LT_CREAR'
  | 'MARCA_LT_ACTUALIZAR'
  | 'MARCA_LT_ELIMINAR'
  //          // Eliminar;

export class AuditService {
  /**
   * Registrar un evento de auditoría
   */
  static log(
    userId: string | null, // Puede ser null si el login falla
    action: AuditAction,
    ipAddress: string,
    userAgent: string | null,
    details: string | null = null
  ) {
    try {
      const id = generateId();
      const now = Date.now();

      const stmt = db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, ip_address, user_agent, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(id, userId, action, ipAddress, userAgent, details, now);
      
      console.log(`[Audit] ${action} logged for ${userId || 'Anonymous'} from ${ipAddress}`);
    } catch (error) {
      // Nunca detener la app si falla el log, solo reportarlo
      console.error('[Audit] Failed to log event:', error);
    }
  }
}