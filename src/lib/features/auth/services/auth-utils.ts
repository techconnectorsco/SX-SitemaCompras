/**
 * @module AuthUtils
 * @description Authentication utilities for password hashing, token generation, and validation
 */
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const SALT_ROUNDS = 10;
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const TOKEN_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Get session expiration timestamp
 */
export function getSessionExpiration(): number {
  return Date.now() + SESSION_DURATION;
}

/**
 * Get token expiration timestamp
 */
export function getTokenExpiration(): number {
  return Date.now() + TOKEN_DURATION;
}

/**
 * Check if timestamp is expired
 */
export function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Generate a temporary password
 * Format: Temp@YYYY!Hex (e.g., Temp@2025!a1b2)
 */
export function generateTemporaryPassword(): string {
  const year = new Date().getFullYear();
  const randomPart = randomBytes(3).toString('hex');
  return `Temp@${year}!${randomPart}`;
}