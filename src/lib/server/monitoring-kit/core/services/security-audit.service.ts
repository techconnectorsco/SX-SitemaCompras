import { MonitoringKitOptions } from '../interfaces/monitoring-options.interface';

export interface SecurityAuditEvent {
	id: string;
	timestamp: string;
	ip: string;
	method: string;
	url: string;
	statusCode: number;
	reason: string;
	userId?: string | null;
	email?: string | null;
	roles?: string[];
	userAgent?: string;
}

/**
 * Servicio agnóstico en memoria para almacenar y consultar los eventos de auditoría
 * de seguridad (intentos de acceso bloqueados con HTTP 401 o 403).
 *
 * Mantiene un buffer circular de los últimos N eventos para auditoría forense
 * sin sobrecargar el servidor ni requerir bases de datos ni frameworks externos.
 */
export class SecurityAuditService {
	private readonly maxEvents: number;
	private events: SecurityAuditEvent[] = [];

	constructor(options?: MonitoringKitOptions) {
		this.maxEvents = options?.maxSecurityEvents ?? 100;
	}

	record(event: Omit<SecurityAuditEvent, 'id' | 'timestamp'>): SecurityAuditEvent {
		const fullEvent: SecurityAuditEvent = {
			id: Math.random().toString(36).substring(2, 10),
			timestamp: new Date().toISOString(),
			...event
		};

		this.events.unshift(fullEvent);

		if (this.events.length > this.maxEvents) {
			this.events.pop();
		}

		return fullEvent;
	}

	getRecent(limit = 50): SecurityAuditEvent[] {
		return this.events.slice(0, Math.min(limit, this.events.length));
	}

	getCount(): number {
		return this.events.length;
	}

	clear(): void {
		this.events = [];
	}
}
