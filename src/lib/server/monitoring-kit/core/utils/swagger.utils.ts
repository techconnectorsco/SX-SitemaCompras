import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MonitoringKitOptions } from '../interfaces/monitoring-options.interface';

/**
 * Paquetes comunes en el ecosistema Node.js que indican la presencia de Swagger/OpenAPI.
 */
const SWAGGER_PACKAGES = [
	'@nestjs/swagger',
	'swagger-ui-express',
	'swagger-ui',
	'swagger-ui-dist',
	'@fastify/swagger',
	'@scalar/nestjs-api-reference',
	'swagger-jsdoc',
	'tsoa'
];

/**
 * Detecta automáticamente si el proyecto actual incluye dependencias de Swagger / OpenAPI
 * inspeccionando el `package.json` en la raíz del entorno de ejecución (`process.cwd()`).
 */
export function detectSwaggerInProject(): boolean {
	try {
		const pkgPath = path.resolve(process.cwd(), 'package.json');
		if (fs.existsSync(pkgPath)) {
			const raw = fs.readFileSync(pkgPath, 'utf8');
			const pkg = JSON.parse(raw);
			const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
			return SWAGGER_PACKAGES.some((pkgName) => Boolean(deps[pkgName]));
		}
	} catch {
		// En entornos donde fs no tenga permisos o no esté disponible, retorna false
	}
	return false;
}

/**
 * Evalúa si Swagger está activo en el proyecto:
 * 1. Si `options.hasSwagger` o `options.enableSwagger` está explícitamente configurado (true / false), tiene máxima prioridad.
 * 2. Si `options.swaggerDocsPath` fue definido explícitamente por el usuario (distinto a vacío), se asume activo (true).
 * 3. En caso contrario, auto-detecta si el `package.json` del proyecto contiene dependencias de Swagger.
 */
export function resolveHasSwagger(options?: MonitoringKitOptions): boolean {
	if (typeof options?.hasSwagger === 'boolean') {
		return options.hasSwagger;
	}
	if (typeof options?.enableSwagger === 'boolean') {
		return options.enableSwagger;
	}
	if (
		options?.swaggerDocsPath !== undefined &&
		options?.swaggerDocsPath !== null &&
		options?.swaggerDocsPath.trim() !== ''
	) {
		return true;
	}
	return detectSwaggerInProject();
}
