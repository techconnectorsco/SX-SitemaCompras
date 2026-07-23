/**
 * @module CleanupScheduler
 * @description Scheduled tasks for database maintenance
 */
import { SessionService } from './session-service';
import { TokenService } from './token-service';

/**
 * Run cleanup tasks
 */
export function runCleanup() {
  console.log('[Cleanup] Starting scheduled cleanup...');
  
  const expiredSessions = SessionService.cleanupExpiredSessions();
  console.log(`[Cleanup] Removed ${expiredSessions} expired sessions`);
  
  const expiredTokens = TokenService.cleanupExpiredTokens();
  console.log(`[Cleanup] Removed ${expiredTokens.reset} password reset tokens`);
  console.log(`[Cleanup] Removed ${expiredTokens.verification} verification tokens`);
  
  console.log('[Cleanup] Cleanup completed');
}

/**
 * Schedule cleanup to run every 24 hours
 */
export function scheduleCleanup() {
  // Run immediately on startup
  runCleanup();
  
  // Schedule to run every 24 hours
  setInterval(runCleanup, 24 * 60 * 60 * 1000);
  
  console.log('[Cleanup] Cleanup scheduler initialized');
}

// Auto-start scheduler if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  scheduleCleanup();
}