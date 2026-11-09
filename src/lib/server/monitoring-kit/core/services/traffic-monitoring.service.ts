import { MonitoringKitOptions } from '../interfaces/monitoring-options.interface';

export interface TrafficRequestEvent {
	id: string;
	timestamp: string;
	method: string;
	url: string;
	statusCode: number;
	responseTimeMs: number;
	ip: string;
	userEmail?: string | null;
}

export interface TrafficMetricsSummary {
	totalRequests: number;
	avgResponseTimeMs: number;
	status2xx: number;
	status4xx: number;
	status5xx: number;
}

/**
 * Servicio agnóstico en memoria para capturar y consultar el historial reciente de tráfico API.
 * Mantiene un buffer circular (por defecto últimos 100 requests) y calcula métricas agregadas
 * (latencia promedio, conteo por código de respuesta) sin requerir bases de datos ni frameworks externos.
 */
export class TrafficMonitoringService {
	private readonly maxEvents: number;
	private events: TrafficRequestEvent[] = [];
	private totalRequestsSeen = 0;

	constructor(options?: MonitoringKitOptions) {
		this.maxEvents = options?.maxTrafficEvents ?? 100;
	}

	record(event: Omit<TrafficRequestEvent, 'id'>): TrafficRequestEvent {
		this.totalRequestsSeen++;
		const fullEvent: TrafficRequestEvent = {
			id: Math.random().toString(36).substring(2, 10),
			...event
		};

		this.events.unshift(fullEvent);

		if (this.events.length > this.maxEvents) {
			this.events.pop();
		}

		return fullEvent;
	}

	getRecent(limit = 50): TrafficRequestEvent[] {
		return this.events.slice(0, Math.min(limit, this.events.length));
	}

	getCount(): number {
		return this.events.length;
	}

	getTotalRequestsSeen(): number {
		return this.totalRequestsSeen;
	}

	getMetrics(): TrafficMetricsSummary {
		if (this.events.length === 0) {
			return {
				totalRequests: this.totalRequestsSeen,
				avgResponseTimeMs: 0,
				status2xx: 0,
				status4xx: 0,
				status5xx: 0
			};
		}

		let totalDuration = 0;
		let s2xx = 0;
		let s4xx = 0;
		let s5xx = 0;

		for (const req of this.events) {
			totalDuration += req.responseTimeMs;
			if (req.statusCode >= 200 && req.statusCode < 300) s2xx++;
			else if (req.statusCode >= 400 && req.statusCode < 500) s4xx++;
			else if (req.statusCode >= 500) s5xx++;
		}

		return {
			totalRequests: this.totalRequestsSeen,
			avgResponseTimeMs: Math.round((totalDuration / this.events.length) * 10) / 10,
			status2xx: s2xx,
			status4xx: s4xx,
			status5xx: s5xx
		};
	}

	clear(): void {
		this.events = [];
		this.totalRequestsSeen = 0;
	}
}
