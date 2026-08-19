import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { LayoutLoad } from './$types';

//NUEVO: Importar Analytics
import { dev } from '$app/environment';
import { injectAnalytics } from '@vercel/analytics/sveltekit';
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

//Inyectar Analytics
injectAnalytics({ mode: dev ? 'development' : 'production' });
injectSpeedInsights();

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
    depends('supabase:auth');

    const supabase = isBrowser()
        ? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
              global: {
                  fetch,
              },
              cookies: {
                  get(key) {
                      const cookie = document.cookie
                          .split('; ')
                          .find((row) => row.startsWith(`${key}=`));
                      return cookie ? cookie.split('=')[1] : undefined;
                  },
                  set(key, value, options) {
                      document.cookie = `${key}=${value}; path=/; SameSite=Lax; Secure`;
                  },
                  remove(key, options) {
                      document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
                  },
              },
          })
        : createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
              global: {
                  fetch,
              },
              cookies: {
                  getAll() {
                      return data.cookies;
                  },
              },
          });

    const {
        data: { session },
    } = await supabase.auth.getSession();

    return {
        supabase,
        session,
        user: session?.user,
    };
};