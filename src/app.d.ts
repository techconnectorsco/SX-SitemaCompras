// Global type declarations for SvelteKit app with SQLite authentication and RBAC
import type { User } from '$lib/features/auth/services/user-service';

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      session: { id: string } | null;
      user: Omit<User, 'password_hash'> | null;
      safeGetSession: () => Promise<{ 
        session: { id: string } | null; 
        user: Omit<User, 'password_hash'> | null;
      }>;
      modeWatcherScript?: string;
    }
    interface PageData {
      session: { id: string } | null;
      user: Omit<User, 'password_hash'> | null;
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {};