/**
 * @module SupabaseBrowserClient
 * @description Cliente de Supabase seguro para usar en el navegador
 * Solo usa variables públicas
 * 
 * ⚠️ Para operaciones administrativas, usar supabase-admin.ts (solo en servidor)
 */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

let supabaseInstance: SupabaseClient<Database> | undefined;

/**
 * Cliente público de Supabase
 * Este cliente es seguro para usar en el navegador
 */
export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }
  return supabaseInstance;
})();

// Tipos de la base de datos (opcional pero recomendado)
export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          finca_regi: string;
          oid?: string;
          address?: string;
          geometry?: any;
          centroid?: any;
          status?: string;
          created_at: string;
          updated_at: string;
          geometry_geojson?: any;
          district?: string;
          area?: number;
          zoning?: string;
          metadata?: any;
        };
      };
      // Añade más tablas según necesites
    };
  };
};