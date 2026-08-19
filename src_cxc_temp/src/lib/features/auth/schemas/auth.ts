
// Esquemas de validación para formularios de autenticación usando Zod
import { z } from 'zod';
import { PASSWORD_VALIDATION } from '../config/auth';

// Validación de email con verificación de formato
const emailValidation = z.string({ required_error: 'El correo es obligatorio' })
	.trim()
	.superRefine((val, ctx) => {
		if (val.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'El correo es obligatorio'
			});
			return;
		}

		if (!val.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Ingrese una dirección de correo válida'
			});
		}
	});

const loginPasswordValidation = z.string().min(1, { message: 'La contraseña no puede estar vacía' });

// Validación completa de contraseña para registro/actualizaciones
const passwordValidation = z
	.string({ required_error: 'La contraseña es obligatoria' })
	.trim()
	.refine((val) => val.length > 0, { message: 'La contraseña es obligatoria' })
	.superRefine((val, ctx) => {
		if (val.length === 0) return;

		if (val.length < PASSWORD_VALIDATION.MIN_LENGTH) {
			ctx.addIssue({
				code: z.ZodIssueCode.too_small,
				minimum: PASSWORD_VALIDATION.MIN_LENGTH,
				type: 'string',
				inclusive: true,
				message: `La contraseña debe tener al menos ${PASSWORD_VALIDATION.MIN_LENGTH} caracteres`
			});
		}

		if (
			val.length >= PASSWORD_VALIDATION.MIN_LENGTH &&
			!/^(?=.*[A-Za-z])(?=.*[^A-Za-z0-9])/.test(val)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `La contraseña debe tener al menos ${PASSWORD_VALIDATION.MIN_LENGTH} caracteres e incluir un símbolo`
			});
		}
	});

export const loginSchema = z.object({
	email: emailValidation,
	password: loginPasswordValidation
});

// ============================================================
// REGISTER SCHEMA — Campos nuevos para Fase 2
// ============================================================
export const registerSchema = z.object({
	email: emailValidation,
	password: passwordValidation,
	// Campos nuevos del perfil
	nombre_completo: z.string({ required_error: 'El nombre es obligatorio' })
		.trim()
		.min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
	empresa: z.string().trim().optional().default(''),
	cargo: z.string().trim().optional().default(''),
	telefono: z.string().trim().optional().default(''),
	// Solicitud de acceso a cliente (opcional)
	solicitar_acceso: z.boolean().default(false),
	cliente_id: z.string().optional().default(''),
	mensaje_solicitud: z.string().trim().optional().default('')
}).superRefine((data, ctx) => {
	// Si solicita acceso, cliente_id y mensaje son obligatorios
	if (data.solicitar_acceso) {
		if (!data.cliente_id || data.cliente_id === '') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Debes seleccionar un cliente',
				path: ['cliente_id']
			});
		}
		if (!data.mensaje_solicitud || data.mensaje_solicitud.trim() === '') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Describe tu relación con el cliente',
				path: ['mensaje_solicitud']
			});
		}
	}
});

export const resetPasswordSchema = z.object({
	email: z.preprocess(
		(val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
		z.string().email({ message: 'Ingrese una dirección de correo válida' })
	)
});

export const updatePasswordSchema = z
	.object({
		password: passwordValidation,
		confirmPassword: z.string().trim()
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Las contraseñas no coinciden',
		path: ['confirmPassword']
	});

export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordSchema = z.infer<typeof updatePasswordSchema>;