// @ts-nocheck
import {
	Controller,
	Get,
	Header,
	HttpException,
	HttpStatus,
	Inject,
	Optional,
	Query
} from '@nestjs/common';
import {
	ApiOkResponse,
	ApiOperation,
	ApiQuery,
	ApiServiceUnavailableResponse,
	ApiTags
} from '@nestjs/swagger';
import { MonitoringEngine } from '../../../core/monitoring-engine';
import {
	MONITORING_KIT_OPTIONS,
	MonitoringKitOptions,
	ProbeStatusEntry
} from '../../../core/interfaces/monitoring-options.interface';
import { HardwareTelemetryService } from '../../../core/services/hardware-telemetry.service';
import { SecurityAuditService } from '../../../core/services/security-audit.service';
import { TrafficMonitoringService } from '../../../core/services/traffic-monitoring.service';

export { ProbeStatusEntry };

@ApiTags('Health & Monitoring')
@Controller('health')
export class HealthController {
	private readonly engine: MonitoringEngine;

	constructor(
		private readonly auditService: SecurityAuditService,
		private readonly trafficService: TrafficMonitoringService,
		@Optional()
		private readonly telemetryService?: HardwareTelemetryService,
		@Optional()
		@Inject(MONITORING_KIT_OPTIONS)
		private readonly options?: MonitoringKitOptions
	) {
		this.engine = new MonitoringEngine(this.options || {}, {
			trafficService: this.trafficService,
			auditService: this.auditService,
			telemetryService: this.telemetryService
		});
	}

	@Get('dashboard')
	@Header('Content-Type', 'text/html; charset=utf-8')
	@ApiOperation({
		summary: 'Centro visual consolidado de operaciones y salud',
		description:
			'Página HTML interactiva que unifica en una sola vista métricas de bases de datos, gráficas de CPU/RAM en tiempo real, tráfico y auditoría de seguridad e IPs.'
	})
	getDashboard(): string {
		return this.engine.getDashboardHtml();
	}

	@Get('summary')
	@ApiOperation({
		summary: 'Resumen consolidado de salud, bases de datos y seguridad',
		description:
			'Retorna en un solo payload JSON el estado general del sistema, memoria, probes de bases de datos configurados, auditoría de seguridad y tráfico reciente.'
	})
	@ApiOkResponse({ description: 'Resumen consolidado del sistema' })
	async getSummary() {
		return this.engine.getSummary();
	}

	@Get('telemetry')
	@ApiOperation({
		summary: 'Series de tiempo en vivo de procesador (CPU), RAM, Heap, Event Loop y RPS',
		description:
			'Retorna las ventanas de 1m, 5m y 15m de métricas de hardware y rendimiento para el monitor en tiempo real (/status).'
	})
	@ApiOkResponse({ description: 'Snapshot de telemetría en tiempo real' })
	getTelemetry() {
		return this.engine.getTelemetry();
	}

	@Get('live')
	@ApiOperation({
		summary: 'Liveness probe (Vida del proceso)',
		description:
			'Comprueba que el proceso Node.js responde y el event loop está activo. No evalúa bases de datos externas.'
	})
	@ApiOkResponse({ description: 'Proceso activo y respondiendo' })
	live() {
		return this.engine.getLive();
	}

	@Get('ready')
	@ApiOperation({
		summary: 'Readiness probe (Disponibilidad de dependencias críticas)',
		description:
			'Ejecuta todos los probes configurados con timeout. Retorna 200 si todos están operativos, o 503 si alguno falla.'
	})
	@ApiOkResponse({ description: 'Todas las dependencias críticas están disponibles' })
	@ApiServiceUnavailableResponse({ description: 'Una o más dependencias críticas fallaron' })
	async ready() {
		const result = await this.engine.getReady();
		if (result.statusCode !== 200) {
			throw new HttpException(result.payload, HttpStatus.SERVICE_UNAVAILABLE);
		}
		return result.payload;
	}

	@Get('security-audit')
	@ApiOperation({
		summary: 'Auditoría de seguridad (Accesos denegados recientes)',
		description:
			'Retorna el historial en memoria de solicitudes bloqueadas con HTTP 401 o 403, incluyendo IP, usuario, ruta y motivo.'
	})
	@ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
	@ApiOkResponse({ description: 'Historial de intentos no autorizados' })
	getSecurityAudit(@Query('limit') limit?: number) {
		const parsedLimit = limit ? Number(limit) : 50;
		return this.engine.getSecurityAudit(parsedLimit);
	}
}
