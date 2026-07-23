/**
 * @module UserService
 * @description Service for managing users in SQLite database with RBAC support
 */
import db from '$lib/config/db-config';
import { generateId, hashPassword, verifyPassword, isValidEmail, isValidPassword } from './auth-utils';

export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  password_hash?: string;
  display_name: string | null;
  photo_url: string | null;
  phone_number: string | null;
  provider: string;
  provider_id: string | null;
  is_anonymous: boolean;
  role: 'ADMIN' | 'USER';
  account_status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  created_at: number;
  updated_at: number;
  last_sign_in_at: number | null;
}

export interface CreateUserParams {
  email: string;
  password: string;
  display_name?: string;
  provider?: string;
  provider_id?: string;
}

export class UserService {
  /**
   * Check if this is the first user in the system
   */
  private static isFirstUser(): boolean {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
    const result = stmt.get() as { count: number };
    return result.count === 0;
  }

  /**
   * Create a new user
   */
  static async createUser(params: CreateUserParams): Promise<User> {
    const { email, password, display_name, provider = 'email', provider_id } = params;

    // Validate email
    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    if (provider === 'email' && !isValidPassword(password)) {
      throw new Error('Password must be at least 8 characters');
    }

    // Check if user exists
    const existingUser = this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const password_hash = provider === 'email' ? await hashPassword(password) : null;

    // 🔑 LÓGICA DE ROLES: Primer usuario = ADMIN/ACTIVE, resto = USER/PENDING
    const isFirst = this.isFirstUser();
    const role = isFirst ? 'ADMIN' : 'USER';
    const account_status = isFirst ? 'ACTIVE' : 'PENDING';
    const email_verified = isFirst ? 1 : 0; // Primer usuario auto-verificado

    console.log(`[UserService] Creating ${isFirst ? 'FIRST' : 'NEW'} user:`, {
      email,
      role,
      account_status,
      email_verified
    });

    // Create user
    const userId = generateId();
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO users (
        id, email, email_verified, password_hash, display_name,
        photo_url, phone_number, provider, provider_id, is_anonymous,
        role, account_status,
        created_at, updated_at, last_sign_in_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      email.toLowerCase(),
      email_verified,
      password_hash,
      display_name || null,
      null,
      null,
      provider,
      provider_id || null,
      0,
      role,
      account_status,
      now,
      now,
      null
    );

    return this.getUserById(userId)!;
  }

  /**
   * Get user by ID
   */
  static getUserById(id: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return this.mapUser(row);
  }

  /**
   * Get user by email
   */
  static getUserByEmail(email: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email.toLowerCase()) as any;
    
    if (!row) return null;
    
    return this.mapUser(row);
  }

  /**
   * Verify user credentials
   */
  static async verifyCredentials(email: string, password: string): Promise<User | null> {
    const user = this.getUserByEmail(email);
    
    if (!user || !user.password_hash) {
      return null;
    }

    const isValid = await verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      return null;
    }

    // Update last sign in
    this.updateLastSignIn(user.id);

    return user;
  }

  /**
   * Update user
   */
  static updateUser(id: string, updates: Partial<User>): User | null {
    const allowedFields = [
      'display_name',
      'photo_url',
      'phone_number',
      'email_verified',
      'role',
      'account_status'
    ];

    const setClause = allowedFields
      .filter(field => field in updates)
      .map(field => `${field} = ?`)
      .join(', ');

    if (!setClause) {
      return this.getUserById(id);
    }

    const values = allowedFields
      .filter(field => field in updates)
      .map(field => (updates as any)[field]);

    const stmt = db.prepare(`
      UPDATE users 
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(...values, Date.now(), id);

    return this.getUserById(id);
  }

  /**
   * Update account status (for admin approval/rejection)
   */
  static updateAccountStatus(id: string, status: 'PENDING' | 'ACTIVE' | 'REJECTED'): boolean {
    const stmt = db.prepare(`
      UPDATE users 
      SET account_status = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(status, Date.now(), id);
    return result.changes > 0;
  }

  /**
   * Update user password
   */
  static async updatePassword(id: string, newPassword: string): Promise<boolean> {
    if (!isValidPassword(newPassword)) {
      throw new Error('Password must be at least 8 characters');
    }

    const password_hash = await hashPassword(newPassword);

    const stmt = db.prepare(`
      UPDATE users 
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(password_hash, Date.now(), id);

    return result.changes > 0;
  }

  /**
   * Verify user email
   */
  static verifyEmail(id: string): boolean {
    const stmt = db.prepare(`
      UPDATE users 
      SET email_verified = 1, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(Date.now(), id);

    return result.changes > 0;
  }

  /**
   * Update last sign in timestamp
   */
  static updateLastSignIn(id: string): void {
    const stmt = db.prepare(`
      UPDATE users 
      SET last_sign_in_at = ?
      WHERE id = ?
    `);

    stmt.run(Date.now(), id);
  }

  /**
   * Delete user
   */
  static deleteUser(id: string): boolean {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get all pending users (for admin approval)
   */
  static getPendingUsers(): User[] {
    const stmt = db.prepare(`
      SELECT * FROM users 
      WHERE account_status = 'PENDING'
      ORDER BY created_at DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => this.mapUser(row));
  }

  /**
   * Get all users with filters
   */
  static getAllUsers(filters?: {
    role?: 'ADMIN' | 'USER';
    status?: 'PENDING' | 'ACTIVE' | 'REJECTED';
  }): User[] {
    let query = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];

    if (filters?.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters?.status) {
      query += ' AND account_status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => this.mapUser(row));
  }

  /**
   * Map database row to User object
   */
  private static mapUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      email_verified: Boolean(row.email_verified),
      password_hash: row.password_hash,
      display_name: row.display_name,
      photo_url: row.photo_url,
      phone_number: row.phone_number,
      provider: row.provider,
      provider_id: row.provider_id,
      is_anonymous: Boolean(row.is_anonymous),
      role: row.role,
      account_status: row.account_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_sign_in_at: row.last_sign_in_at
    };
  }
}