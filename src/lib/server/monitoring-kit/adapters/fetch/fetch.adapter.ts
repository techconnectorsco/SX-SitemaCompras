import { MonitoringEngine } from '../../core/monitoring-engine';
import {
	GenericAuthenticatedUser,
	MonitoringKitOptions
} from '../../core/interfaces/monitoring-options.interface';

/**
 * Adaptador Universal basado en Web Standard Fetch API (`Request` -> `Response`).
 * Compatible con Next.js (App Router), Hono, Astro, Remix, Bun.serve y Deno.serve.
 */
export function createFetchMonitoring(options: MonitoringKitOptions = {}) {
	const engine = new MonitoringEngine(options);

	const handleFetch = async (
		request: Request,
		next: () => Promise<Response>,
		context?: { ip?: string; user?: GenericAuthenticatedUser | null }
	): Promise<Response> => {
		const url = new URL(request.url);
		const matched = await engine.handleRoute(url.pathname, url.searchParams);

		if (matched.matched) {
			return new Response(matched.body, {
				status: matched.status,
				headers: matched.headers
			});
		}

		const start = Date.now();
		const response = await next();
		const durationMs = Date.now() - start;

		const forwarded = request.headers.get('x-forwarded-for');
		const ip = forwarded ? forwarded.split(',')[0].trim() : context?.ip || '-';
		const userAgent = request.headers.get('user-agent') || 'desconocido';

		engine.recordRequest({
			method: request.method,
			url: url.pathname + url.search,
			statusCode: response.status,
			responseTimeMs: durationMs,
			ip,
			userAgent,
			user: context?.user ?? null
		});

		return response;
	};

	return {
		engine,
		handleFetch
	};
}
