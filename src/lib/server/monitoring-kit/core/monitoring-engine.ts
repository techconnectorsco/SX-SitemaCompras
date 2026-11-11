import {
	HealthProbeDefinition,
	MonitoringHttpResponse,
	MonitoringKitOptions,
	ProbeStatusEntry,
	RecordedRequestInput
} from './interfaces/monitoring-options.interface';
import { HardwareTelemetryService, TelemetrySnapshot } from './services/hardware-telemetry.service';
import { SecurityAuditService } from './services/security-audit.service';
import { TrafficMonitoringService } from './services/traffic-monitoring.service';
import { renderConsolidatedDashboardHtml } from './views/dashboard.view';
import { renderRealtimeStatusHtml } from './views/status.view';
import { resolveHasSwagger } from './utils/swagger.utils';

/**
 * Motor central agnóstico de observabilidad, salud de bases de datos, telemetría y auditoría 401/403.
 *
 * Funciona en cualquier entorno TypeScript/JavaScript (NestJS, SvelteKit, Express, Fastify, Next.js, Hono)
 * sin depender de decoradores ni librerías externas.
 */
export class MonitoringEngine {
	public readonly options: MonitoringKitOptions;
	public readonly trafficService: TrafficMonitoringService;
	public readonly auditService: SecurityAuditService;
	public readonly telemetryService: HardwareTelemetryService;
	public readonly hasSwagger: boolean;
	public readonly swaggerDocsPath: string;

	private lastDbCheckTime = 0;
	private cachedDbResult: Record<string, ProbeStatusEntry> | null = null;
	private readonly ignorePrefixes: string[];
	private readonly statusMonitorPath: string;

	constructor(
		options: MonitoringKitOptions = {},
		services?: {
			trafficService?: TrafficMonitoringService;
			auditService?: SecurityAuditService;
			telemetryService?: HardwareTelemetryService;
		}
	) {
		this.options = options;
		this.hasSwagger = resolveHasSwagger(options);
		this.swaggerDocsPath = options.swaggerDocsPath ?? '/api/docs';
		this.statusMonitorPath = options.statusMonitorPath ?? '/status';
		this.ignorePrefixes = options.ignoreTrafficPrefixes ?? [
			this.statusMonitorPath,
			'/health/dashboard',
			'/dashboard',
			'/monitoreo',
			'/health/summary',
			'/health/telemetry',
			'/favicon.ico'
		];

		this.trafficService = services?.trafficService ?? new TrafficMonitoringService(options);
		this.auditService = services?.auditService ?? new SecurityAuditService(options);
		this.telemetryService = services?.telemetryService ?? new HardwareTelemetryService(true);
	}

	/**
	 * Renderiza el Centro Consolidado de Operaciones (`/health/dashboard`).
	 */
	getDashboardHtml(embed = false): string {
		return renderConsolidatedDashboardHtml(this.options, embed);
	}

	/**
	 * Renderiza el Monitor Nativo en Tiempo Real de CPU, RAM, Heap, Event Loop y RPS (`/status`).
	 */
	getStatusHtml(): string {
		return renderRealtimeStatusHtml(this.options);
	}

	/**
	 * Retorna el snapshot de series de tiempo de hardware y RPS (`/health/telemetry`).
	 */
	getTelemetry(): TelemetrySnapshot {
		return this.telemetryService.getSnapshot();
	}

	/**
	 * Liveness probe (`/health/live`).
	 */
	getLive() {
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			uptime: Math.floor(process.uptime()),
			memoryUsage: process.memoryUsage().rss
		};
	}

	/**
	 * Readiness probe (`/health/ready`). Evalúa todos los probes configurados con timeout.
	 */
	async getReady(): Promise<{ statusCode: number; payload: any }> {
		const results = await this.checkProbes(true);
		const details: Record<
			string,
			{ status: 'up' | 'down'; responseTimeMs: number; message?: string }
		> = {};
		const info: Record<string, { status: 'up' }> = {};
		const error: Record<string, { status: 'down'; message?: string }> = {};

		let allHealthy = true;
		for (const [key, val] of Object.entries(results)) {
			details[key] = {
				status: val.status,
				responseTimeMs: val.responseTimeMs,
				...(val.error ? { message: val.error } : {})
			};
			if (val.status === 'up') {
				info[key] = { status: 'up' };
			} else {
				allHealthy = false;
				error[key] = { status: 'down', message: val.error };
			}
		}

		const payload = {
			status: allHealthy ? 'ok' : 'error',
			info,
			error,
			details
		};

		return {
			statusCode: allHealthy ? 200 : 503,
			payload
		};
	}

	/**
	 * Resumen consolidado (`/health/summary`).
	 */
	async getSummary() {
		const dbResults = await this.checkProbes(false);
		const entries = Object.values(dbResults);
		const allDbsUp = entries.length === 0 || entries.every((d) => d.status === 'up');
		const anyDbUp = entries.length === 0 || entries.some((d) => d.status === 'up');
		const generalStatus = allDbsUp ? 'ok' : anyDbUp ? 'degraded' : 'down';

		const uptimeSeconds = Math.floor(process.uptime());
		const uptimeHuman = this.formatUptime(uptimeSeconds);
		const mem = process.memoryUsage();

		return {
			timestamp: new Date().toISOString(),
			system: {
				status: generalStatus,
				uptime: uptimeSeconds,
				uptimeHuman,
				nodeVersion: process.version,
				memoryRssMb: Math.round((mem.rss / (1024 * 1024)) * 10) / 10,
				memoryHeapMb: Math.round((mem.heapUsed / (1024 * 1024)) * 10) / 10
			},
			databases: dbResults,
			security: {
				totalBlocked: this.auditService.getCount(),
				events: this.auditService.getRecent(50)
			},
			traffic: {
				metrics: this.trafficService.getMetrics(),
				requests: this.trafficService.getRecent(50)
			}
		};
	}

	/**
	 * Historial de auditoría de seguridad 401/403 (`/health/security-audit`).
	 */
	getSecurityAudit(limit = 50) {
		const parsedLimit = Number.isFinite(limit) && limit > 0 ? Number(limit) : 50;
		return {
			total: this.auditService.getCount(),
			events: this.auditService.getRecent(parsedLimit)
		};
	}

	/**
	 * Registra de forma unificada una solicitud HTTP finalizada en cualquier framework:
	 * 1. Alimenta las métricas en tiempo real (RPS y latencia).
	 * 2. Guarda la solicitud en el buffer de tráfico (si no es ruta de polling ignorada).
	 * 3. Si el código es 401 o 403, registra automáticamente el evento forense en SecurityAuditService.
	 */
	recordRequest(input: RecordedRequestInput): void {
		const rawUrl = input.url || '/';
		const isIgnored = this.ignorePrefixes.some((prefix) => rawUrl.startsWith(prefix));
		const clientIp = input.ip || '-';
		const user = input.user;
		const userId = user?.id ?? user?.sub ?? null;
		const userEmail =
			user?.email || user?.username || user?.name || (userId !== null ? `ID:${userId}` : null);
		const roles = Array.isArray(user?.roles) ? user.roles : user?.role ? [user.role] : [];

		if (!isIgnored) {
			this.telemetryService.recordRequest(input.statusCode, input.responseTimeMs);

			this.trafficService.record({
				timestamp: new Date().toISOString(),
				method: input.method,
				url: rawUrl,
				statusCode: input.statusCode,
				responseTimeMs: input.responseTimeMs,
				ip: clientIp,
				userEmail
			});

			if (this.options.enableConsoleLog !== false) {
				console.log(
					`[${new Date().toISOString()}] [IP: ${clientIp}] [User: ${userEmail || 'anon'}] ${input.method} ${rawUrl} ${input.statusCode} - ${input.responseTimeMs} ms`
				);
			}
		}

		if ((input.statusCode === 401 || input.statusCode === 403) && !input.skipSecurityAudit) {
			const defaultReason =
				input.statusCode === 401
					? 'Acceso no autenticado (HTTP 401)'
					: 'Permisos insuficientes (HTTP 403)';
			const reason = input.reason || defaultReason;
			const userStr = userEmail
				? `${userEmail} [Roles: ${roles.join(', ') || 'sin roles'}]`
				: 'Anónimo / Sin Sesión';

			console.warn(
				`🚨 [ACCESO DENEGADO ${input.statusCode}] IP: ${clientIp} | Usuario: ${userStr} | Intentó: ${input.method} ${rawUrl} | Motivo: ${reason}`
			);

			this.auditService.record({
				ip: clientIp,
				method: input.method,
				url: rawUrl,
				statusCode: input.statusCode,
				reason,
				userId: userId !== null ? String(userId) : null,
				email: userEmail,
				roles,
				userAgent: input.userAgent || 'desconocido'
			});
		}
	}

	/**
	 * Despachador HTTP universal para servir todas las rutas del kit (`/dashboard`, `/status`, `/health/*`)
	 * desde cualquier framework (SvelteKit, Express, Fastify, Next.js, Hono).
	 */
	async handleRoute(
		pathname: string,
		searchParams?: URLSearchParams
	): Promise<MonitoringHttpResponse> {
		const cleanPath =
			pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

		// Si Swagger no está presente ni habilitado, bloquear cualquier intento de llamarlo
		if (
			!this.hasSwagger &&
			(cleanPath === this.swaggerDocsPath || cleanPath.startsWith(`${this.swaggerDocsPath}/`))
		) {
			return {
				matched: true,
				status: 404,
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
					'Cache-Control': 'no-store'
				},
				body: JSON.stringify({
					statusCode: 404,
					error: 'Not Found',
					message:
						'La documentación Swagger/OpenAPI está deshabilitada o no está disponible en este proyecto.'
				})
			};
		}

		if (this.options.enableDashboardRedirect !== false && cleanPath === '/dashboard') {
			return {
				matched: true,
				status: 302,
				// `/monitoreo` es la ruta SvelteKit que envuelve este panel con la
				// navbar compartida del sistema. El HTML crudo sigue disponible en
				// `/health/dashboard` para acceso directo.
				headers: { Location: '/monitoreo' },
				body: ''
			};
		}

		if (cleanPath === '/health/dashboard') {
			return {
				matched: true,
				status: 200,
				headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
				body: this.getDashboardHtml(searchParams?.get('embed') === '1')
			};
		}

		if (cleanPath === this.statusMonitorPath) {
			return {
				matched: true,
				status: 200,
				headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
				body: this.getStatusHtml()
			};
		}

		if (cleanPath === '/health/telemetry') {
			return {
				matched: true,
				status: 200,
				headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
				body: JSON.stringify(this.getTelemetry())
			};
		}

		if (cleanPath === '/health/summary') {
			const summary = await this.getSummary();
			return {
				matched: true,
				status: 200,
				headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
				body: JSON.stringify(summary)
			};
		}

		if (cleanPath === '/health/live') {
			return {
				matched: true,
				status: 200,
				headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
				body: JSON.stringify(this.getLive())
			};
		}

		if (cleanPath === '/health/ready') {
			const ready = await this.getReady();
			return {
				matched: true,
				status: ready.statusCode,
				headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
				body: JSON.stringify(ready.payload)
			};
		}

		if (cleanPath === '/health/security-audit') {
			const limitParam = searchParams?.get('limit');
			const limit = limitParam ? Number(limitParam) : 50;
			return {
				matched: true,
				status: 200,
				headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
				body: JSON.stringify(this.getSecurityAudit(limit))
			};
		}

		return {
			matched: false,
			status: 404,
			headers: {},
			body: ''
		};
	}

	async checkProbes(bypassCache = false): Promise<Record<string, ProbeStatusEntry>> {
		const now = Date.now();
		const cacheTtl = this.options?.dbCacheTtlMs ?? 2500;

		if (!bypassCache && this.cachedDbResult && now - this.lastDbCheckTime < cacheTtl) {
			return this.cachedDbResult;
		}

		const probes: HealthProbeDefinition[] = this.options?.probes ?? [];
		const results: Record<string, ProbeStatusEntry> = {};

		await Promise.all(
			probes.map(async (probe) => {
				const start = Date.now();
				const timeoutMs = probe.timeoutMs ?? 3000;
				try {
					await this.runWithTimeout(probe.check, timeoutMs);
					results[probe.key] = {
						label: probe.label,
						badge: probe.badge,
						icon: probe.icon,
						status: 'up',
						responseTimeMs: Date.now() - start
					};
				} catch (err: any) {
					results[probe.key] = {
						label: probe.label,
						badge: probe.badge,
						icon: probe.icon,
						status: 'down',
						responseTimeMs: Date.now() - start,
						error: err?.message || 'Error de conexión'
					};
				}
			})
		);

		this.lastDbCheckTime = now;
		this.cachedDbResult = results;
		return results;
	}

	private runWithTimeout<T>(fn: () => Promise<T> | T, timeoutMs: number): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error(`Timeout tras ${timeoutMs}ms`));
			}, timeoutMs);

			Promise.resolve()
				.then(() => fn())
				.then((val) => {
					clearTimeout(timer);
					resolve(val);
				})
				.catch((err) => {
					clearTimeout(timer);
					reject(err);
				});
		});
	}

	private formatUptime(seconds: number): string {
		const d = Math.floor(seconds / (3600 * 24));
		const h = Math.floor((seconds % (3600 * 24)) / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);

		const parts: string[] = [];
		if (d > 0) parts.push(`${d}d`);
		if (h > 0) parts.push(`${h}h`);
		if (m > 0) parts.push(`${m}m`);
		parts.push(`${s}s`);
		return parts.join(' ');
	}
}

/**
 * Helper funcional para instanciar el motor agnóstico de monitoreo.
 */
export function createMonitoringEngine(options: MonitoringKitOptions = {}): MonitoringEngine {
	return new MonitoringEngine(options);
}
