import { MonitoringEngine } from '../../core/monitoring-engine';
import {
	GenericAuthenticatedUser,
	MonitoringKitOptions
} from '../../core/interfaces/monitoring-options.interface';

/**
 * Adaptador Plug & Play para servidores Express, Connect o Polka puros (sin NestJS).
 *
 * Uso en 1 línea:
 * ```ts
 * const { middleware } = createExpressMonitoring({ appName: 'Mi API Express', probes: [...] });
 * app.use(middleware);
 * ```
 */
export function createExpressMonitoring(options: MonitoringKitOptions = {}) {
	const engine = new MonitoringEngine(options);
	const statusPath = options.statusMonitorPath ?? '/status';

	const middleware = async (req: any, res: any, next: any) => {
		const rawUrl: string = req.originalUrl || req.url || '/';
		const [pathname, queryString] = rawUrl.split('?');

		const isSwaggerBlocked =
			!engine.hasSwagger &&
			(pathname === engine.swaggerDocsPath || pathname.startsWith(`${engine.swaggerDocsPath}/`));

		if (
			pathname === '/dashboard' ||
			pathname === statusPath ||
			pathname.startsWith('/health/') ||
			isSwaggerBlocked
		) {
			const searchParams = new URLSearchParams(queryString || '');
			const matched = await engine.handleRoute(pathname, searchParams);
			if (matched.matched) {
				if (matched.status === 302 && matched.headers.Location) {
					return res.redirect(matched.headers.Location);
				}
				for (const [k, v] of Object.entries(matched.headers)) {
					res.setHeader(k, v);
				}
				return res.status(matched.status).send(matched.body);
			}
		}

		const start = Date.now();
		res.on('finish', () => {
			const forwarded = req.headers?.['x-forwarded-for'];
			let ip = req.socket?.remoteAddress || req.ip || '-';
			if (typeof forwarded === 'string') {
				ip = forwarded.split(',')[0].trim();
			} else if (Array.isArray(forwarded) && forwarded[0]) {
				ip = forwarded[0].trim();
			}

			const user: GenericAuthenticatedUser | null = req.user || res.locals?.user || null;
			const userAgent = (req.headers?.['user-agent'] as string) || 'desconocido';

			engine.recordRequest({
				method: req.method || 'GET',
				url: rawUrl,
				statusCode: res.statusCode || 200,
				responseTimeMs: Date.now() - start,
				ip,
				userAgent,
				user,
				skipSecurityAudit: Boolean((req as any).__securityAuditRecorded)
			});
		});

		next();
	};

	return {
		engine,
		middleware
	};
}
