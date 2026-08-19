/**
 * @module SupabaseAdminClient
 * @description Cliente administrativo de Supabase - SOLO PARA USO EN SERVIDOR
 * ⚠️ Este archivo solo debe importarse en archivos +page.server.ts, +server.ts o +layout.server.ts
 * 
 * NO importar en:
 * - Componentes .svelte
 * - Archivos +page.ts (sin el .server)
 * - Código que se ejecuta en el navegador
 */
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definida en las variables de entorno');
}

/**
 * Cliente admin de Supabase con privilegios elevados
 * ⚠️ ADVERTENCIA: Este cliente bypasea Row Level Security (RLS)
 * Solo usar para operaciones administrativas desde el servidor
 */
export const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL, 
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);