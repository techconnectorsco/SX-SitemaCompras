/**
 * @module AuthSchemas
 * @description Zod validation schemas for authentication forms
 */
import { z } from 'zod';

/**
 * Login form schema
 */
export const loginSchema = z.object({
	email: z
		.string()
		.email('Please enter a valid email address')
		.min(1, 'Email is required'),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.min(1, 'Password is required')
});

/**
 * Registration form schema
 */
export const registerSchema = z.object({
	email: z
		.string()
		.email('Please enter a valid email address')
		.min(1, 'Email is required'),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.min(1, 'Password is required'),
	confirmPassword: z
		.string()
		.min(1, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
	message: "Passwords don't match",
	path: ['confirmPassword']
});

/**
 * Password reset request schema
 */
export const resetPasswordSchema = z.object({
	email: z
		.string()
		.email('Please enter a valid email address')
		.min(1, 'Email is required')
});

/**
 * Update password schema
 */
export const updatePasswordSchema = z.object({
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.min(1, 'Password is required'),
	confirmPassword: z
		.string()
		.min(1, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
	message: "Passwords don't match",
	path: ['confirmPassword']
});

export type LoginSchema = typeof loginSchema;
export type RegisterSchema = typeof registerSchema;
export type ResetPasswordSchema = typeof resetPasswordSchema;
export type UpdatePasswordSchema = typeof updatePasswordSchema;