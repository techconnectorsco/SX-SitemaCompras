// @ts-nocheck
import { INestApplication } from '@nestjs/common';
import {
	MONITORING_KIT_OPTIONS,
	MonitoringKitOptions,
	SetupMonitoringBootstrapOptions
} from '../../core/interfaces/monitoring-options.interface';
import { HardwareTelemetryService } from '../../core/services/hardware-telemetry.service';
import { TrafficMonitoringService } from '../../core/services/traffic-monitoring.service';
import { renderRealtimeStatusHtml } from '../../core/views/status.view';
import { resolveHasSwagger } from '../../core/utils/swagger.utils';

/**
 * Inicializa en 1 sola línea todos los middlewares de monitoreo en `main.ts` de NestJS:
 * 1. Monitor visual de procesador (CPU), RAM, Heap, Event Loop y RPS en tiempo real (`/status`).
 *    Usa por defecto el monitor nativo institucional SoporteXperto (0 dependencias externas),
 *    o `express-status-monitor` si se indica `useNativeStatusMonitor: false`.
 * 2. Logger HTTP en consola e interceptor de tráfico en memoria (`TrafficMonitoringService`).
 * 3. Redirección corta `/dashboard` -> `/health/dashboard`.
 */
export function setupMonitoring(
	app: INestApplication,
	options: SetupMonitoringBootstrapOptions = {}
): void {
	let moduleOptions: MonitoringKitOptions = {};
	try {
		moduleOptions = app.get<MonitoringKitOptions>(MONITORING_KIT_OPTIONS) || {};
	} catch {
		moduleOptions = {};
	}

	const statusPath = options.statusMonitorPath ?? moduleOptions.statusMonitorPath ?? '/status';
	const title = options.title ?? moduleOptions.appName ?? 'Monitor de Estado en Tiempo Real';
	const enableConsoleLog = options.enableMorgan ?? moduleOptions.enableConsoleLog ?? true;
	const enableDashboardRedirect =
		options.enableDashboardRedirect ?? moduleOptions.enableDashboardRedirect ?? true;
	const useNativeStatus = options.useNativeStatusMonitor ?? true;

	const ignorePrefixes = options.ignoreTrafficPrefixes ??
		moduleOptions.ignoreTrafficPrefixes ?? [
			statusPath,
			'/health/dashboard',
			'/dashboard',
			'/health/summary',
			'/health/telemetry',
			'/favicon.ico'
		];

	// 1. Monitor de estado visual en tiempo real (/status)
	if (useNativeStatus) {
		const html = renderRealtimeStatusHtml({
			...moduleOptions,
			appName: title,
			statusMonitorPath: statusPath
		});
		app.use(statusPath, (_req: any, res: any) => {
			res.setHeader('Content-Type', 'text/html; charset=utf-8');
			res.setHeader('Cache-Control', 'no-store');
			res.status(200).send(html);
		});
	} else {
		try {
			// Fallback opcional si el usuario desea usar express-status-monitor explícitamente
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const statusMonitor = require('express-status-monitor');
			app.use(
				statusMonitor({
					title,
					path: statusPath,
					spans: [
						{ interval: 1, retention: 60 },
						{ interval: 5, retention: 60 },
						{ interval: 15, retention: 60 }
					],
					chartVisibility: {
						cpu: true,
						mem: true,
						load: false,
						heap: true,
						responseTime: true,
						rps: true,
						statusCodes: true
					},
					ignoreStartsWith: statusPath
				})
			);
		} catch {
			const html = renderRealtimeStatusHtml({
				...moduleOptions,
				appName: title,
				statusMonitorPath: statusPath
			});
			app.use(statusPath, (_req: any, res: any) => {
				res.setHeader('Content-Type', 'text/html; charset=utf-8');
				res.status(200).send(html);
			});
		}
	}

	// 2. Capturador de tráfico en memoria + Telemetría RPS + Logger en consola
	const trafficService = app.get(TrafficMonitoringService);
	let telemetryService: HardwareTelemetryService | null = null;
	try {
		telemetryService = app.get(HardwareTelemetryService);
	} catch {
		telemetryService = null;
	}

	app.use((req: any, res: any, next: any) => {
		const rawUrl: string = req.originalUrl || req.url || '';
		if (ignorePrefixes.some((prefix) => rawUrl.startsWith(prefix))) {
			return next();
		}

		const start = Date.now();
		res.on('finish', () => {
			const durationMs = Date.now() - start;
			const forwarded = req.headers?.['x-forwarded-for'];
			let clientIp = req.socket?.remoteAddress || req.ip || '-';
			if (typeof forwarded === 'string') {
				clientIp = forwarded.split(',')[0].trim();
			}
			const userEmail = req.user?.email || req.user?.username || null;

			if (telemetryService) {
				telemetryService.recordRequest(res.statusCode, durationMs);
			}

			trafficService.record({
				timestamp: new Date().toISOString(),
				method: req.method,
				url: rawUrl,
				statusCode: res.statusCode,
				responseTimeMs: durationMs,
				ip: clientIp,
				userEmail
			});

			if (enableConsoleLog) {
				console.log(
					`[${new Date().toISOString()}] [IP: ${clientIp}] [User: ${userEmail || 'anon'}] ${req.method} ${rawUrl} ${res.statusCode} - ${durationMs} ms`
				);
			}
		});
		next();
	});

	// 3. Redirección amigable /dashboard -> /health/dashboard
	if (enableDashboardRedirect) {
		app.use('/dashboard', (_req: any, res: any) => res.redirect('/health/dashboard'));
	}

	// 4. Bloqueo de Swagger si el proyecto no lo tiene habilitado
	const hasSwagger = resolveHasSwagger(moduleOptions);
	const swaggerDocsPath = moduleOptions.swaggerDocsPath ?? '/api/docs';
	if (!hasSwagger) {
		app.use(swaggerDocsPath, (_req: any, res: any) => {
			res.status(404).json({
				statusCode: 404,
				error: 'Not Found',
				message:
					'La documentación Swagger/OpenAPI está deshabilitada o no está disponible en este proyecto.'
			});
		});
	}
}
