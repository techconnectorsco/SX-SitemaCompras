import { MonitoringEngine } from '../../core/monitoring-engine';
import {
	GenericAuthenticatedUser,
	MonitoringKitOptions
} from '../../core/interfaces/monitoring-options.interface';

export interface SvelteKitMonitoringOptions extends MonitoringKitOptions {
	/**
	 * Si es true (default: true), cuando un guard de SvelteKit redirige (HTTP 302/303)
	 * hacia `/auth/pending` o `/auth?mode=login` por falta de sesión o cuenta inactiva,
	 * lo registra automáticamente como evento 401/403 en Auditoría de Seguridad.
	 */
	auditAuthRedirects?: boolean;
}

/**
 * Adaptador Plug & Play para SvelteKit (`src/hooks.server.ts`).
 *
 * Con 1 sola línea en `sequence(...)`:
 * 1. Sirve automáticamente `/dashboard`, `/status`, `/health/dashboard`, `/health/summary`,
 *    `/health/live`, `/health/ready`, `/health/security-audit` y `/health/telemetry`
 *    sin necesidad de crear carpetas en `src/routes/`.
 * 2. Intercepta todo el tráfico HTTP midiendo latencia, IP y usuario de `event.locals.user`.
 * 3. Audita automáticamente cualquier respuesta `HTTP 401` o `HTTP 403` (tanto respuestas JSON
 *    de endpoints `+server.ts` como excepciones `error(401/403)` o redirecciones de `authGuard`).
 */
export function createSvelteKitMonitoring(options: SvelteKitMonitoringOptions = {}) {
	const engine = new MonitoringEngine(options);
	const auditAuthRedirects = options.auditAuthRedirects ?? true;

	const extractUser = (
		locals: Record<string, any> | undefined
	): GenericAuthenticatedUser | null => {
		const rawUser = locals?.user || locals?.session?.user || null;
		if (!rawUser) return null;
		return {
			id: rawUser.id,
			email: rawUser.email || rawUser.display_name,
			username: rawUser.username || rawUser.display_name,
			role: rawUser.role,
			roles: Array.isArray(rawUser.roles)
				? rawUser.roles
				: rawUser.role
					? [String(rawUser.role)]
					: []
		};
	};

	const handle = async ({
		event,
		resolve
	}: {
		event: {
			url: URL;
			request: Request;
			locals: Record<string, any>;
			getClientAddress?: () => string;
		};
		resolve: (event: any) => Promise<Response>;
	}): Promise<Response> => {
		const { pathname, searchParams } = event.url;

		// 1. Interceptar rutas del Centro de Monitoreo (/dashboard, /status, /health/*, o Swagger si está deshabilitado)
		const isSwaggerBlocked =
			!engine.hasSwagger &&
			(pathname === engine.swaggerDocsPath || pathname.startsWith(`${engine.swaggerDocsPath}/`));

		if (
			pathname === '/dashboard' ||
			pathname === (options.statusMonitorPath ?? '/status') ||
			pathname.startsWith('/health/') ||
			isSwaggerBlocked
		) {
			const matched = await engine.handleRoute(pathname, searchParams);
			if (matched.matched) {
				return new Response(matched.body, {
					status: matched.status,
					headers: matched.headers
				});
			}
		}

		const start = Date.now();
		const ip = extractSvelteKitIp(event);
		const userAgent = event.request.headers.get('user-agent') || 'desconocido';
		const fullUrl = pathname + (event.url.search || '');

		let response: Response;
		try {
			response = await resolve(event);
		} catch (err: any) {
			const durationMs = Date.now() - start;
			const user = extractUser(event.locals);
			const rawUser = event.locals?.user || event.locals?.session?.user || null;

			// Caso A: SvelteKit `throw redirect(303, location)` lanzado por un hook (ej. authGuard)
			if (
				err &&
				typeof err === 'object' &&
				typeof err.status === 'number' &&
				typeof err.location === 'string'
			) {
				const loc = err.location;
				if (auditAuthRedirects && loc.startsWith('/auth/pending')) {
					engine.auditService.record({
						ip,
						method: event.request.method,
						url: fullUrl,
						statusCode: 403,
						reason: `Cuenta no activa (${rawUser?.account_status || 'PENDING'}) bloqueada hacia ${loc}`,
						userId: user?.id ? String(user.id) : null,
						email: user?.email || null,
						roles: user?.roles || [],
						userAgent
					});
				} else if (
					auditAuthRedirects &&
					(loc.startsWith('/auth?mode=login') || loc.startsWith('/auth/login'))
				) {
					engine.auditService.record({
						ip,
						method: event.request.method,
						url: fullUrl,
						statusCode: 401,
						reason: 'Acceso sin sesión activa a ruta protegida (redirigido a login)',
						userId: null,
						email: null,
						roles: [],
						userAgent
					});
				}

				engine.recordRequest({
					method: event.request.method,
					url: fullUrl,
					statusCode: err.status,
					responseTimeMs: durationMs,
					ip,
					userAgent,
					user,
					skipSecurityAudit: true
				});
				throw err;
			}

			// Caso B: SvelteKit `throw error(401 | 403 | 500, body)`
			const statusCode =
				err && typeof err === 'object' && typeof err.status === 'number' ? err.status : 500;
			const reason =
				err?.body?.message || err?.message || 'Excepción durante el procesamiento de la ruta';

			engine.recordRequest({
				method: event.request.method,
				url: fullUrl,
				statusCode,
				responseTimeMs: durationMs,
				ip,
				userAgent,
				user,
				reason
			});
			throw err;
		}

		const durationMs = Date.now() - start;
		const user = extractUser(event.locals);
		const rawUser = event.locals?.user || event.locals?.session?.user || null;
		const statusCode = response.status;
		let reason: string | undefined;

		// Si un endpoint +server.ts devolvió Response con status 401 o 403
		if (statusCode === 401 || statusCode === 403) {
			try {
				const cloned = response.clone();
				const contentType = cloned.headers.get('content-type') || '';
				if (contentType.includes('application/json')) {
					const bodyJson = await cloned.json();
					reason =
						bodyJson?.message ||
						bodyJson?.error ||
						(Array.isArray(bodyJson?.errors) ? bodyJson.errors.join(', ') : undefined);
				} else {
					const text = (await cloned.text()).trim();
					if (text && text.length < 200) reason = text;
				}
			} catch {
				// Ignorar si el body no es JSON
			}
		} else if (auditAuthRedirects && (statusCode === 302 || statusCode === 303)) {
			const location = response.headers.get('location') || '';
			if (location.startsWith('/auth/pending')) {
				engine.auditService.record({
					ip,
					method: event.request.method,
					url: fullUrl,
					statusCode: 403,
					reason: `Cuenta no activa (${rawUser?.account_status || 'PENDING'}) redirigida a /auth/pending`,
					userId: user?.id ? String(user.id) : null,
					email: user?.email || null,
					roles: user?.roles || [],
					userAgent
				});
			} else if (location.startsWith('/auth?mode=login') || location.startsWith('/auth/login')) {
				engine.auditService.record({
					ip,
					method: event.request.method,
					url: fullUrl,
					statusCode: 401,
					reason: 'Acceso sin sesión activa a ruta protegida (redirigido a login)',
					userId: null,
					email: null,
					roles: [],
					userAgent
				});
			}
		}

		engine.recordRequest({
			method: event.request.method,
			url: fullUrl,
			statusCode,
			responseTimeMs: durationMs,
			ip,
			userAgent,
			user,
			reason
		});

		return response;
	};

	return {
		engine,
		handle
	};
}

function extractSvelteKitIp(event: { request: Request; getClientAddress?: () => string }): string {
	const forwarded = event.request.headers.get('x-forwarded-for');
	if (forwarded) {
		return forwarded.split(',')[0].trim();
	}
	try {
		if (typeof event.getClientAddress === 'function') {
			return event.getClientAddress() || '-';
		}
	} catch {
		// En prerender o contextos internos getClientAddress puede lanzar excepción
	}
	return '-';
}
