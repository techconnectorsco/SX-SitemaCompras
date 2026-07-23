import { sequence } from '@sveltejs/kit/hooks';
import { sqlite } from '$lib/features/auth/hooks/sqlite-hook.server';
import { authGuard } from '$lib/features/auth/hooks/auth-guard.server';
import { createInitialModeExpression } from 'mode-watcher';
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Initialize database on server start
import '$lib/config/db-config';

// =====================================================================
// 🔑 AUTENTICACIÓN POR API KEY (Power BI / Consumidores Externos M2M)
// =====================================================================
// Este hook se ejecuta ANTES de sqlite y authGuard.
// Si detecta una API Key válida en una ruta permitida, inyecta un
// usuario de servicio en locals y SALTA los hooks de sesión/cookie.
// Para TODAS las demás rutas, no hace nada y deja pasar al flujo normal.
// =====================================================================

// --- Rate Limiter simple en memoria (sin dependencias externas) ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;        // máximo 10 requests
const RATE_LIMIT_WINDOW_MS = 60000; // por minuto

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    // Primera solicitud o ventana expirada: reiniciar
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return true; // Excedió el límite
  }

  return false;
}

// Limpiar entradas viejas cada 5 minutos para no acumular memoria
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// --- Rutas que aceptan autenticación por API Key ---
const API_KEY_ROUTES = [
  '/api/admin/export-procesamiento'
];

// --- Carga segura de la API Key desde variables de entorno ---
function getApiKey(): string {
  return env.POWERBI_API_KEY || '';
}

const apiKeyAuth: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  // Solo interceptar rutas de API Key
  const isApiKeyRoute = API_KEY_ROUTES.some(route => pathname.startsWith(route));
  if (!isApiKeyRoute) {
    // No es ruta de API Key → continuar flujo normal (sqlite → authGuard)
    return resolve(event);
  }

  // Verificar si viene API Key (query param o header)
  const queryKey = event.url.searchParams.get('key');
  const headerKey = event.request.headers.get('x-api-key');
  const providedKey = queryKey || headerKey;

  // Si NO viene API Key, dejar pasar al flujo normal de cookies
  // (así un ADMIN logueado en el navegador sigue funcionando)
  if (!providedKey) {
    return resolve(event);
  }

  // --- A partir de aquí, SÍ viene una API Key → validar ---

  // 1. Rate Limiting
  const clientIp = event.getClientAddress();
  if (isRateLimited(clientIp)) {
    console.warn(`[API Key] ⛔ Rate limit excedido para IP: ${clientIp}`);
    return new Response(JSON.stringify({
      success: false,
      message: 'Rate limit exceeded. Try again later.'
    }), {
      status: 429,
      headers: { 'Retry-After': '60', 'Content-Type': 'application/json' }
    });
  }

  // 2. Validar que la API Key esté configurada en el servidor
  const PBI_SECRET_KEY = getApiKey();
  if (!PBI_SECRET_KEY || PBI_SECRET_KEY.length < 32) {
    console.error('[API Key] ❌ Intento de auth por API Key pero POWERBI_API_KEY no configurada');
    return new Response(JSON.stringify({
      success: false,
      message: 'API Key authentication is not configured on this server.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. Comparar la clave
  if (providedKey !== PBI_SECRET_KEY) {
    console.warn(`[API Key] ❌ Clave inválida desde IP: ${clientIp}`);
    return new Response(JSON.stringify({
      success: false,
      message: 'Unauthorized: Invalid API Key'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 4. ✅ API Key válida → Inyectar usuario de servicio
  console.log(`[API Key] ✅ Acceso autorizado desde IP: ${clientIp}`);
  (event.locals as any)._apiKeyAuthenticated = true;
  event.locals.session = { id: 'api-key-session' };
  event.locals.user = {
    id: 'service-powerbi',
    email: 'powerbi-service@vyo.local',
    email_verified: 1,
    display_name: 'Power BI Service',
    photo_url: null,
    phone_number: null,
    provider: 'api-key',
    provider_id: null,
    is_anonymous: 0,
    role: 'API_CONSUMER',
    account_status: 'ACTIVE',
    created_at: Date.now(),
    updated_at: Date.now(),
    last_sign_in_at: Date.now()
  };

  // Saltar directamente al endpoint (no necesita pasar por sqlite ni authGuard)
  return resolve(event);
};

// =====================================================================
// SECUENCIA DE HOOKS
// =====================================================================
// 1. apiKeyAuth  → Si hay API Key válida, inyecta usuario y resuelve.
//                   Si no hay API Key, pasa al siguiente hook.
// 2. sqlite      → Lee cookie de sesión (flujo normal de usuarios humanos)
// 3. authGuard   → Protege rutas de dashboard (flujo normal)
// 4. modeWatcher → Dark mode (flujo normal)
// =====================================================================

// Hook que restaura el usuario de servicio si sqlite lo borró
const restoreApiUser: Handle = async ({ event, resolve }) => {
  if ((event.locals as any)._apiKeyAuthenticated && !event.locals.user) {
    event.locals.session = { id: 'api-key-session' };
    event.locals.user = {
      id: 'service-powerbi',
      email: 'powerbi-service@vyo.local',
      email_verified: 1,
      display_name: 'Power BI Service',
      photo_url: null,
      phone_number: null,
      provider: 'api-key',
      provider_id: null,
      is_anonymous: 0,
      role: 'API_CONSUMER',
      account_status: 'ACTIVE',
      created_at: Date.now(),
      updated_at: Date.now(),
      last_sign_in_at: Date.now()
    };
  }
  return resolve(event);
};

export const handle = sequence(apiKeyAuth, sqlite, restoreApiUser, authGuard, async ({ event, resolve }) => {
  const modeWatcherScript = createInitialModeExpression();
  event.locals.modeWatcherScript = modeWatcherScript;

  const response = await resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('%mode-watcher-script%', event.locals.modeWatcherScript || ''),
  });

  return response;
});