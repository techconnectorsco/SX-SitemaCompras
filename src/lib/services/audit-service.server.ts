// src/lib/services/audit-service.server.ts
import { db } from '$lib/config/db-config';

export class AuditService {
  
   /**
   * Registra una acción en la base de datos.
   * Firma alineada con TODO el sistema: (userId, action, ipAddress, userAgent, details)
   * details puede ser string u objeto (se serializa a JSON si es objeto).
   */
  static log(
    userId: string | null,
    action: string,
    ipAddress: string = 'unknown',
    userAgent: string | null = null,
    details: Record<string, any> | string | null = null
  ) {
    try {
      const detailsStr =
        details == null
          ? null
          : typeof details === 'string'
            ? details
            : JSON.stringify(details);

      const stmt = db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, details, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      `);

      stmt.run(
        crypto.randomUUID(), // id TEXT (PK) — lo generamos nosotros
        userId,
        action,
        detailsStr,
        ipAddress,
        userAgent
      );
    } catch (error) {
      console.error('Error fatal escribiendo auditoría:', error);
      // No lanzamos error para no detener el flujo principal si falla el log
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