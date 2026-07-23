/**
 * @module SessionService
 * @description Service for managing user sessions with cookies
 */
import db from '$lib/config/db-config';
import { generateId, generateToken, getSessionExpiration, isExpired } from './auth-utils';
import type { User } from './user-service';

export interface Session {
  id: string;
  user_id: string;
  expires_at: number;
  created_at: number;
}

export class SessionService {
  /**
   * Create a new session for a user
   */
  static createSession(userId: string): Session {
    const sessionId = generateToken();
    const now = Date.now();
    const expiresAt = getSessionExpiration();

    const stmt = db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(sessionId, userId, expiresAt, now);

    return {
      id: sessionId,
      user_id: userId,
      expires_at: expiresAt,
      created_at: now
    };
  }

  /**
   * Get session by ID
   */
  static getSession(sessionId: string): Session | null {
    const stmt = db.prepare(`
      SELECT * FROM sessions 
      WHERE id = ?
    `);

    const row = stmt.get(sessionId) as any;

    if (!row) return null;

    // Check if expired
    if (isExpired(row.expires_at)) {
      this.deleteSession(sessionId);
      return null;
    }

    return {
      id: row.id,
      user_id: row.user_id,
      expires_at: row.expires_at,
      created_at: row.created_at
    };
  }

  /**
   * Get all sessions for a user
   */
  static getUserSessions(userId: string): Session[] {
    const stmt = db.prepare(`
      SELECT * FROM sessions 
      WHERE user_id = ? AND expires_at > ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(userId, Date.now()) as any[];

    return rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      expires_at: row.expires_at,
      created_at: row.created_at
    }));
  }

  /**
   * Validate session and return user ID
   */
  static validateSession(sessionId: string): string | null {
    const session = this.getSession(sessionId);
    
    if (!session) return null;

    return session.user_id;
  }

  /**
   * Delete a session
   */
  static deleteSession(sessionId: string): boolean {
    const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
    const result = stmt.run(sessionId);
    return result.changes > 0;
  }

  /**
   * Delete all sessions for a user
   */
  static deleteUserSessions(userId: string): number {
    const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
    const result = stmt.run(userId);
    return result.changes;
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions(): number {
    const stmt = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
    const result = stmt.run(Date.now());
    return result.changes;
  }

  /**
   * Extend session expiration
   */
  static extendSession(sessionId: string): boolean {
    const newExpiration = getSessionExpiration();
    
    const stmt = db.prepare(`
      UPDATE sessions 
      SET expires_at = ?
      WHERE id = ? AND expires_at > ?
    `);

    const result = stmt.run(newExpiration, sessionId, Date.now());
    return result.changes > 0;
  }
}