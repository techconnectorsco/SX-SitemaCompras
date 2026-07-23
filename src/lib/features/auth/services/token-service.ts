/**
 * @module TokenService
 * @description Service for managing password reset and email verification tokens
 */
import db from '$lib/config/db-config';
import { generateId, generateToken, getTokenExpiration, isExpired } from '$lib/features/auth/services/auth-utils';

export interface Token {
  id: string;
  user_id: string;
  token: string;
  expires_at: number;
  created_at: number;
}

export class TokenService {
  /**
   * Create password reset token
   */
  static createPasswordResetToken(userId: string): string {
    // Delete existing tokens for this user
    this.deleteUserPasswordResetTokens(userId);

    const token = generateToken();
    const id = generateId();
    const now = Date.now();
    const expiresAt = getTokenExpiration();

    const stmt = db.prepare(`
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, userId, token, expiresAt, now);

    return token;
  }

  /**
   * Verify password reset token
   */
  static verifyPasswordResetToken(token: string): string | null {
    const stmt = db.prepare(`
      SELECT * FROM password_reset_tokens 
      WHERE token = ?
    `);

    const row = stmt.get(token) as any;

    if (!row) return null;

    // Check if expired
    if (isExpired(row.expires_at)) {
      this.deletePasswordResetToken(token);
      return null;
    }

    return row.user_id;
  }

  /**
   * Delete password reset token
   */
  static deletePasswordResetToken(token: string): boolean {
    const stmt = db.prepare('DELETE FROM password_reset_tokens WHERE token = ?');
    const result = stmt.run(token);
    return result.changes > 0;
  }

  /**
   * Delete all password reset tokens for a user
   */
  static deleteUserPasswordResetTokens(userId: string): number {
    const stmt = db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?');
    const result = stmt.run(userId);
    return result.changes;
  }

  /**
   * Create email verification token
   */
  static createEmailVerificationToken(userId: string): string {
    // Delete existing tokens for this user
    this.deleteUserEmailVerificationTokens(userId);

    const token = generateToken();
    const id = generateId();
    const now = Date.now();
    const expiresAt = getTokenExpiration();

    const stmt = db.prepare(`
      INSERT INTO email_verification_tokens (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, userId, token, expiresAt, now);

    return token;
  }

  /**
   * Verify email verification token
   */
  static verifyEmailVerificationToken(token: string): string | null {
    const stmt = db.prepare(`
      SELECT * FROM email_verification_tokens 
      WHERE token = ?
    `);

    const row = stmt.get(token) as any;

    if (!row) return null;

    // Check if expired
    if (isExpired(row.expires_at)) {
      this.deleteEmailVerificationToken(token);
      return null;
    }

    return row.user_id;
  }

  /**
   * Delete email verification token
   */
  static deleteEmailVerificationToken(token: string): boolean {
    const stmt = db.prepare('DELETE FROM email_verification_tokens WHERE token = ?');
    const result = stmt.run(token);
    return result.changes > 0;
  }

  /**
   * Delete all email verification tokens for a user
   */
  static deleteUserEmailVerificationTokens(userId: string): number {
    const stmt = db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?');
    const result = stmt.run(userId);
    return result.changes;
  }

  /**
   * Clean up expired tokens
   */
  static cleanupExpiredTokens(): { reset: number; verification: number } {
    const now = Date.now();

    const resetStmt = db.prepare('DELETE FROM password_reset_tokens WHERE expires_at <= ?');
    const resetResult = resetStmt.run(now);

    const verifyStmt = db.prepare('DELETE FROM email_verification_tokens WHERE expires_at <= ?');
    const verifyResult = verifyStmt.run(now);

    return {
      reset: resetResult.changes,
      verification: verifyResult.changes
    };
  }
}