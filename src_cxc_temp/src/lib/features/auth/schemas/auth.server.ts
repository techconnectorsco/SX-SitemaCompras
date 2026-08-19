// Server-side validation schemas for authentication forms using Zod
import { z } from 'zod';
import { registerSchema as baseRegisterSchema } from './auth';

/**
 * Server-side registration schema.
 * Note: Email existence validation is now done in the handleRegister function
 * instead of in the schema, because async validations in Zod don't work well
 * with SvelteKit SuperForms and can cause performance issues.
 */
export const serverRegisterSchema = baseRegisterSchema;

export type ServerRegisterSchema = z.infer<typeof serverRegisterSchema>;