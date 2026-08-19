// Server-side login page handling with form validation
import type { PageServerLoad } from './$types.js';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { type Actions, redirect } from '@sveltejs/kit'; // Importar redirect
import { loginSchema } from '$lib/features/auth/schemas/auth.js';
import { handleLogin } from '$lib/features/auth/services/auth.server';

// Initialize login form with validation schema
export const load: PageServerLoad = async ({ parent }) => {
    const parentData = await parent();
    return {
        ...parentData,
        form: await superValidate(zod(loginSchema))
    };
};

// Handle login form submission and authentication
export const actions: Actions = {
    login: async (event) => {
        const form = await superValidate(event, zod(loginSchema));
        
        // 1. Ejecutamos tu lógica de login existente
        const result = await handleLogin(event, form);

        // 2. Verificamos si hubo éxito en el login
        // (handleLogin usualmente devuelve un objeto form. Si form.valid es true, el login pasó)
        if (form.valid) {
            // 3. Chequeamos si hay redirección pendiente en la URL
            const redirectTo = event.url.searchParams.get('redirect');
            
            if (redirectTo) {
                // Forzamos la redirección al lugar deseado (ej: /publicar)
                throw redirect(303, redirectTo);
            }
        }

        // Si no hay redirect, devolvemos el resultado normal (mensajes de éxito/error en el mismo lugar)
        return result;
    }
};