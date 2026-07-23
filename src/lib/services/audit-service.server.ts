// src/lib/services/audit-service.server.ts
import { db } from '$lib/config/db-config';

export class AuditService {
  
  /**
   * Registra una acción en la base de datos
   */
  static log(
    userId: string, 
    action: string, 
    details: Record<string, any> | null, 
    ipAddress: string = 'unknown'
  ) {
    try {
      const stmt = db.prepare(`
        INSERT INTO audit_logs (user_id, action, details, ip_address, created_at)
        VALUES (?, ?, ?, ?, strftime('%s', 'now'))
      `);

      stmt.run(
        userId, 
        action, 
        details ? JSON.stringify(details) : null, 
        ipAddress
      );
    } catch (error) {
      console.error('Error fatal escribiendo auditoría:', error);
      // No lanzamos error para no detener el flujo principal de la app si falla el log
    }
  }

  /**
   * Obtiene logs recientes para el admin
   */
  static getLogs(limit = 100) {
    const stmt = db.prepare(`
      SELECT a.*, u.email, u.display_name 
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit).map(row => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : null
    }));
  }
}