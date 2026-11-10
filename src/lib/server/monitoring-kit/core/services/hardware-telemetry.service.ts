import * as os from 'node:os';
import { monitorEventLoopDelay } from 'node:perf_hooks';

export interface TelemetryPoint {
	timestamp: number;
	cpuPercent: number;
	memoryRssMb: number;
	memoryHeapMb: number;
	eventLoopLagMs: number;
	rps: number;
	avgResponseTimeMs: number;
	statusCodes: {
		s2xx: number;
		s3xx: number;
		s4xx: number;
		s5xx: number;
	};
}

export interface TelemetrySpan {
	key: '1m' | '5m' | '15m';
	label: string;
	intervalSec: number;
	retention: number;
	points: TelemetryPoint[];
}

export interface TelemetrySnapshot {
	timestamp: string;
	hostname: string;
	platform: string;
	cpuCores: number;
	totalMemoryMb: number;
	uptimeSeconds: number;
	current: TelemetryPoint;
	spans: Record<'1m' | '5m' | '15m', TelemetryPoint[]>;
}

interface BucketAccumulator {
	requests: number;
	totalDurationMs: number;
	s2xx: number;
	s3xx: number;
	s4xx: number;
	s5xx: number;
}

/**
 * Colector nativo de telemetría de hardware y runtime (CPU, RAM, Heap, Event Loop, RPS).
 * Reemplaza a `express-status-monitor` usando únicamente APIs nativas de Node.js (`node:os`, `node:process`, `node:perf_hooks`),
 * permitiendo que `/status` funcione en cualquier framework (SvelteKit, NestJS, Express, Fastify, Next.js, Hono).
 */
export class HardwareTelemetryService {
	private lastCpuUsage = process.cpuUsage();
	private lastSampleTime = process.hrtime.bigint();
	private readonly cpuCores = Math.max(1, os.cpus()?.length || 1);
	private readonly totalMemoryMb = Math.round((os.totalmem() / (1024 * 1024)) * 10) / 10;
	private eventLoopHistogram: ReturnType<typeof monitorEventLoopDelay> | null = null;
	private timer: ReturnType<typeof setInterval> | null = null;
	private tickCount = 0;

	private acc1s: BucketAccumulator = this.emptyAcc();
	private acc5s: BucketAccumulator = this.emptyAcc();
	private acc15s: BucketAccumulator = this.emptyAcc();

	private span1m: TelemetryPoint[] = [];
	private span5m: TelemetryPoint[] = [];
	private span15m: TelemetryPoint[] = [];

	private latestPoint: TelemetryPoint;

	constructor(autoStart = true) {
		try {
			this.eventLoopHistogram = monitorEventLoopDelay({ resolution: 20 });
			this.eventLoopHistogram.enable();
		} catch {
			this.eventLoopHistogram = null;
		}

		this.latestPoint = this.sampleNow(this.acc1s, 1);
		this.span1m.push(this.latestPoint);
		this.span5m.push(this.latestPoint);
		this.span15m.push(this.latestPoint);

		if (autoStart) {
			this.start();
		}
	}

	private emptyAcc(): BucketAccumulator {
		return { requests: 0, totalDurationMs: 0, s2xx: 0, s3xx: 0, s4xx: 0, s5xx: 0 };
	}

	start(): void {
		if (this.timer) return;
		this.timer = setInterval(() => {
			this.tick();
		}, 1000);
		if (typeof this.timer.unref === 'function') {
			this.timer.unref();
		}
	}

	stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		if (this.eventLoopHistogram) {
			try {
				this.eventLoopHistogram.disable();
			} catch {
				// ignore
			}
		}
	}

	/**
	 * Registra una solicitud completada para las gráficas de RPS, latencia y códigos HTTP.
	 */
	recordRequest(statusCode: number, durationMs: number): void {
		for (const acc of [this.acc1s, this.acc5s, this.acc15s]) {
			acc.requests++;
			acc.totalDurationMs += durationMs;
			if (statusCode >= 200 && statusCode < 300) acc.s2xx++;
			else if (statusCode >= 300 && statusCode < 400) acc.s3xx++;
			else if (statusCode >= 400 && statusCode < 500) acc.s4xx++;
			else if (statusCode >= 500) acc.s5xx++;
		}
	}

	private tick(): void {
		this.tickCount++;
		const p1 = this.sampleNow(this.acc1s, 1);
		this.latestPoint = p1;
		this.pushPoint(this.span1m, p1, 60);
		this.acc1s = this.emptyAcc();

		if (this.tickCount % 5 === 0) {
			const p5 = this.buildSpanPoint(p1, this.acc5s, 5);
			this.pushPoint(this.span5m, p5, 60);
			this.acc5s = this.emptyAcc();
		}

		if (this.tickCount % 15 === 0) {
			const p15 = this.buildSpanPoint(p1, this.acc15s, 15);
			this.pushPoint(this.span15m, p15, 60);
			this.acc15s = this.emptyAcc();
		}
	}

	private pushPoint(arr: TelemetryPoint[], point: TelemetryPoint, maxLen: number): void {
		arr.push(point);
		if (arr.length > maxLen) {
			arr.shift();
		}
	}

	private sampleNow(acc: BucketAccumulator, intervalSec: number): TelemetryPoint {
		const nowHr = process.hrtime.bigint();
		const elapsedUs = Number(nowHr - this.lastSampleTime) / 1000;
		const cpuDiff = process.cpuUsage(this.lastCpuUsage);
		this.lastSampleTime = nowHr;
		this.lastCpuUsage = process.cpuUsage();

		let cpuPercent = 0;
		if (elapsedUs > 0) {
			const totalCpuUs = cpuDiff.user + cpuDiff.system;
			cpuPercent = Math.min(
				100,
				Math.round((totalCpuUs / elapsedUs / this.cpuCores) * 100 * 10) / 10
			);
		}

		const mem = process.memoryUsage();
		const memoryRssMb = Math.round((mem.rss / (1024 * 1024)) * 10) / 10;
		const memoryHeapMb = Math.round((mem.heapUsed / (1024 * 1024)) * 10) / 10;

		let eventLoopLagMs = 0;
		if (this.eventLoopHistogram) {
			const meanNs = this.eventLoopHistogram.mean;
			if (Number.isFinite(meanNs) && meanNs > 0) {
				eventLoopLagMs = Math.max(0, Math.round((meanNs / 1e6 - 20) * 100) / 100);
			}
			this.eventLoopHistogram.reset();
		}

		const rps = Math.round((acc.requests / intervalSec) * 10) / 10;
		const avgResponseTimeMs =
			acc.requests > 0 ? Math.round((acc.totalDurationMs / acc.requests) * 10) / 10 : 0;

		return {
			timestamp: Date.now(),
			cpuPercent,
			memoryRssMb,
			memoryHeapMb,
			eventLoopLagMs,
			rps,
			avgResponseTimeMs,
			statusCodes: {
				s2xx: acc.s2xx,
				s3xx: acc.s3xx,
				s4xx: acc.s4xx,
				s5xx: acc.s5xx
			}
		};
	}

	private buildSpanPoint(
		basePoint: TelemetryPoint,
		acc: BucketAccumulator,
		intervalSec: number
	): TelemetryPoint {
		return {
			...basePoint,
			rps: Math.round((acc.requests / intervalSec) * 10) / 10,
			avgResponseTimeMs:
				acc.requests > 0 ? Math.round((acc.totalDurationMs / acc.requests) * 10) / 10 : 0,
			statusCodes: {
				s2xx: acc.s2xx,
				s3xx: acc.s3xx,
				s4xx: acc.s4xx,
				s5xx: acc.s5xx
			}
		};
	}

	getSnapshot(): TelemetrySnapshot {
		return {
			timestamp: new Date().toISOString(),
			hostname: os.hostname(),
			platform: `${os.type()} ${os.release()} (${os.arch()})`,
			cpuCores: this.cpuCores,
			totalMemoryMb: this.totalMemoryMb,
			uptimeSeconds: Math.floor(process.uptime()),
			current: this.latestPoint,
			spans: {
				'1m': this.span1m,
				'5m': this.span5m,
				'15m': this.span15m
			}
		};
	}
}
