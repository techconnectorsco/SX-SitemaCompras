// @ts-nocheck
import { DynamicModule, Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HealthController } from './controllers/health.controller';
import { SecurityAuditFilter } from './filters/security-audit.filter';
import {
	MONITORING_KIT_OPTIONS,
	MonitoringKitAsyncOptions,
	MonitoringKitOptions
} from '../../core/interfaces/monitoring-options.interface';
import { HardwareTelemetryService } from '../../core/services/hardware-telemetry.service';
import { SecurityAuditService } from '../../core/services/security-audit.service';
import { TrafficMonitoringService } from '../../core/services/traffic-monitoring.service';

/**
 * Módulo Plug & Play de Monitoreo, Salud y Auditoría de Seguridad para NestJS.
 *
 * Puede importarse directamente como `MonitoringKitModule.forRoot({...})` o
 * con inyección de servicios de base de datos mediante `MonitoringKitModule.forRootAsync({...})`.
 * Registra automáticamente el filtro global `SecurityAuditFilter` (401/403).
 */
@Global()
@Module({
	controllers: [HealthController],
	providers: [
		{
			provide: MONITORING_KIT_OPTIONS,
			useValue: {}
		},
		{
			provide: TrafficMonitoringService,
			useFactory: (opts: MonitoringKitOptions) => new TrafficMonitoringService(opts),
			inject: [MONITORING_KIT_OPTIONS]
		},
		{
			provide: SecurityAuditService,
			useFactory: (opts: MonitoringKitOptions) => new SecurityAuditService(opts),
			inject: [MONITORING_KIT_OPTIONS]
		},
		{
			provide: HardwareTelemetryService,
			useFactory: () => new HardwareTelemetryService(true)
		},
		SecurityAuditFilter,
		{
			provide: APP_FILTER,
			useClass: SecurityAuditFilter
		}
	],
	exports: [
		MONITORING_KIT_OPTIONS,
		TrafficMonitoringService,
		SecurityAuditService,
		HardwareTelemetryService,
		SecurityAuditFilter
	]
})
export class MonitoringKitModule {
	/**
	 * Configuración síncrona (ideal cuando no se inyectan servicios externos o se pasan instancias directas).
	 */
	static forRoot(options: MonitoringKitOptions = {}): DynamicModule {
		return {
			module: MonitoringKitModule,
			global: true,
			controllers: [HealthController],
			providers: [
				{
					provide: MONITORING_KIT_OPTIONS,
					useValue: options
				},
				{
					provide: TrafficMonitoringService,
					useFactory: (opts: MonitoringKitOptions) => new TrafficMonitoringService(opts),
					inject: [MONITORING_KIT_OPTIONS]
				},
				{
					provide: SecurityAuditService,
					useFactory: (opts: MonitoringKitOptions) => new SecurityAuditService(opts),
					inject: [MONITORING_KIT_OPTIONS]
				},
				{
					provide: HardwareTelemetryService,
					useFactory: () => new HardwareTelemetryService(true)
				},
				SecurityAuditFilter,
				{
					provide: APP_FILTER,
					useClass: SecurityAuditFilter
				}
			],
			exports: [
				MONITORING_KIT_OPTIONS,
				TrafficMonitoringService,
				SecurityAuditService,
				HardwareTelemetryService,
				SecurityAuditFilter
			]
		};
	}

	/**
	 * Configuración asíncrona (ideal para inyectar PrismaService, DataSource de TypeORM, Redis, etc. en `probes`).
	 */
	static forRootAsync(asyncOptions: MonitoringKitAsyncOptions): DynamicModule {
		return {
			module: MonitoringKitModule,
			global: true,
			imports: asyncOptions.imports || [],
			controllers: [HealthController],
			providers: [
				{
					provide: MONITORING_KIT_OPTIONS,
					useFactory: asyncOptions.useFactory,
					inject: asyncOptions.inject || []
				},
				{
					provide: TrafficMonitoringService,
					useFactory: (opts: MonitoringKitOptions) => new TrafficMonitoringService(opts),
					inject: [MONITORING_KIT_OPTIONS]
				},
				{
					provide: SecurityAuditService,
					useFactory: (opts: MonitoringKitOptions) => new SecurityAuditService(opts),
					inject: [MONITORING_KIT_OPTIONS]
				},
				{
					provide: HardwareTelemetryService,
					useFactory: () => new HardwareTelemetryService(true)
				},
				SecurityAuditFilter,
				{
					provide: APP_FILTER,
					useClass: SecurityAuditFilter
				}
			],
			exports: [
				MONITORING_KIT_OPTIONS,
				TrafficMonitoringService,
				SecurityAuditService,
				HardwareTelemetryService,
				SecurityAuditFilter
			]
		};
	}
}
