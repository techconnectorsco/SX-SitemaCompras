import { z } from 'zod';

/**
 * Zod schema for validating agent information.
 * @constant
 * @type {import('zod').ZodObject<{ agency_name: import('zod').ZodString, license_number: import('zod').ZodString, phone: import('zod').ZodString, province: import('zod').ZodString, website: import('zod').ZodOptional<import('zod').ZodString> }>}
 * @property {string} agency_name - The name of the agency. Minimum 2 characters.
 * @property {string} license_number - The agent's license number. Minimum 3 characters.
 * @property {string} phone - The agent's phone number. Minimum 8 characters.
 * @property {string} province - The province where the agent operates. Minimum 2 characters.
 * @property {string} [website] - The agent's website URL (optional). Must be a valid URL.
 */
export const agentSchema = z.object({
	agency_name: z.string().min(2, 'El nombre de la agencia es obligatorio'),
	license_number: z.string().min(3, 'Número de licencia requerido'),
	phone: z.string().min(8, 'Teléfono inválido'),
	province: z.string().min(2, 'Provincia requerida'),
	website: z.string().url('URL inválida').optional()
});
