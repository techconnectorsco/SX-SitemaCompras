/**
 * @module AuthConfig
 * @description This module defines configuration constants and utility functions related to authentication paths, redirects, and settings.
 */

/**
 * Configuration constants for authentication flows.
 * @constant
 * @type {object}
 * @property {object} AUTH_PATHS - Main authentication routes with mode parameters.
 * @property {string} AUTH_PATHS.LOGIN - Path for the login page.
 * @property {string} AUTH_PATHS.REGISTER - Path for the registration page.
 */
export const AUTH_PATHS = {
	/** Main auth routes with mode parameters */
	LOGIN: '/auth?mode=login',
	REGISTER: '/auth?mode=register'
} as const;

/**
 * Defines redirect paths for various authentication actions and error states.
 * @constant
 * @type {object}
 * @property {object} SUCCESS - Redirect paths after successful authentication actions.
 * @property {string} SUCCESS.LOGIN - Redirect after successful login.
 * @property {string} SUCCESS.REGISTER - Redirect after successful registration.
 * @property {string} SUCCESS.PASSWORD_UPDATE - Redirect after successful password update.
 * @property {string} SUCCESS.OAUTH - Redirect after successful OAuth callback.
 * @property {string} SUCCESS.LOGOUT - Redirect after successful logout.
 * @property {object} ERROR - Redirect paths for authentication error states.
 * @property {string} ERROR.DEFAULT - Generic authentication error page.
 * @property {string} ERROR.VERIFICATION - Page for failed verification.
 * @property {object} FLOW - Routes for handling specific authentication processes and user actions.
 * @property {string} FLOW.RESET - Route to request a password reset.
 * @property {string} FLOW.VERIFY - Route to handle email verification.
 * @property {string} FLOW.UPDATE_PASSWORD - Route to set a new password.
 */
export const AUTH_REDIRECT_PATHS = {
	/** Redirect paths after successful actions */
	SUCCESS: {
	/** After successful login */
	LOGIN: '/',
		/** After successful registration */
		REGISTER: '/auth?mode=login', //'/auth/login',
		/** After successful password update */
		PASSWORD_UPDATE: '/auth?message=Contraseña actualizada correctamente',
	/** After successful OAuth callback */
	OAUTH: '/',
		/** After successful logout */
		LOGOUT: '/'
	},

	/** Redirect paths for error states */
	ERROR: {
		/** Generic auth error page */
		DEFAULT: '/auth/error',
		/** Failed verification */
		VERIFICATION: '/auth'
	},

	/** Routes for handling specific authentication processes and user actions */
	FLOW: {
		/** Route to request a password reset - displays form to enter email for reset link */
		RESET: '/auth/reset',
		/** Route to handle email verification - where users land after clicking verify link */
		VERIFY: '/auth/verify',
		/** Route to set a new password - used after reset link or requiring password update */
		UPDATE_PASSWORD: '/auth/update-password'
	}
} as const;

/**
 * Helper function to construct a full redirect URL.
 * @param {Request} request - The incoming request object.
 * @param {string} path - The relative path to redirect to.
 * @returns {string} The absolute URL for the redirect.
 */
export function getRedirectURL(request: Request, path: string): string {
	const url = new URL(request.url);
	return `${url.protocol}//${url.host}${path}`;
}

/**
 * Password validation configuration.
 * @constant
 * @type {object}
 * @property {number} MIN_LENGTH - Minimum length requirement for passwords.
 */
export const PASSWORD_VALIDATION = {
	/** Minimum length requirement for passwords */
	MIN_LENGTH: 8
} as const;

/**
 * OAuth configuration settings.
 * @constant
 * @type {object}
 * @property {string} REDIRECT_PATH - The redirect path for OAuth callbacks.
 * @property {object} PROVIDER_OPTIONS - Specific options for different OAuth providers.
 * @property {object} PROVIDER_OPTIONS.GOOGLE - Configuration for Google OAuth.
 * @property {object} PROVIDER_OPTIONS.GOOGLE.queryParams - Query parameters for Google OAuth.
 * @property {string} PROVIDER_OPTIONS.GOOGLE.queryParams.access_type - Access type for Google OAuth (e.g., 'online').
 * @property {string} PROVIDER_OPTIONS.GOOGLE.queryParams.prompt - Prompt type for Google OAuth (e.g., 'select_account').
 * @property {object} PROVIDER_OPTIONS.AZURE - Configuration for Azure OAuth.
 * @property {object} PROVIDER_OPTIONS.AZURE.queryParams - Query parameters for Azure OAuth.
 * @property {string} PROVIDER_OPTIONS.AZURE.queryParams.prompt - Prompt type for Azure OAuth (e.g., 'select_account').
 */
export const OAUTH_CONFIG = {
	REDIRECT_PATH: '/auth/callback',
	PROVIDER_OPTIONS: {
		GOOGLE: {
			queryParams: {
				access_type: 'online',
				prompt: 'select_account'
			}
		},
		AZURE: {
			queryParams: {
				// Puedes ajustar scopes si lo necesitas, pero estos funcionan por defecto
				prompt: 'select_account'
			}
		}
	}
} as const;

