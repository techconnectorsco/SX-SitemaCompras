// @ts-nocheck
import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	ForbiddenException,
	HttpException,
	Injectable,
	Logger,
	UnauthorizedException
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GenericAuthenticatedUser } from '../../../core/interfaces/monitoring-options.interface';
import { SecurityAuditService } from '../../../core/services/security-audit.service';

/**
 * Filtro global de excepciones que intercepta rechazos de seguridad (HTTP 401 y 403).
 *
 * Captura información forense de la solicitud:
 * - Dirección IP cliente (incluyendo soporte de proxy x-forwarded-for).
 * - Identidad del usuario (ID, email/username, roles si venía con token JWT, o Anónimo).
 * - Endpoint y método HTTP al que intentó acceder.
 * - Motivo exacto del rechazo.
 */
@Injectable()
@Catch(UnauthorizedException, ForbiddenException)
export class SecurityAuditFilter implements ExceptionFilter {
	private readonly logger = new Logger('SecurityAudit');

	constructor(private readonly auditService: SecurityAuditService) {}

	catch(exception: HttpException, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const request = ctx.getRequest<Request & { user?: GenericAuthenticatedUser }>();
		const response = ctx.getResponse<Response>();

		const status = exception.getStatus();
		const exceptionResponse = exception.getResponse();

		const reason =
			typeof exceptionResponse === 'object' &&
			exceptionResponse !== null &&
			'message' in exceptionResponse
				? Array.isArray((exceptionResponse as any).message)
					? (exceptionResponse as any).message.join(', ')
					: String((exceptionResponse as any).message)
				: exception.message;

		const clientIp = this.extractClientIp(request);
		const user = request.user;
		const userId = user?.id ?? user?.sub ?? null;
		const userEmail = user?.email || user?.username || (userId !== null ? `ID:${userId}` : null);
		const roles = Array.isArray(user?.roles) ? user.roles : user?.role ? [user.role] : [];
		const userStr = userEmail
			? `${userEmail} [Roles: ${roles.join(', ') || 'sin roles'}]`
			: 'Anónimo / Sin Token';
		const userAgent = (request.headers?.['user-agent'] as string) || 'desconocido';

		// 1. Emitir log estructurado de seguridad
		this.logger.warn(
			`🚨 [ACCESO DENEGADO ${status}] IP: ${clientIp} | Usuario: ${userStr} | Intentó: ${request.method} ${request.originalUrl || request.url} | Motivo: ${reason}`
		);

		// 2. Registrar en el buffer en memoria
		this.auditService.record({
			ip: clientIp,
			method: request.method,
			url: request.originalUrl || request.url,
			statusCode: status,
			reason,
			userId: userId !== null ? String(userId) : null,
			email: userEmail,
			roles,
			userAgent
		});

		// 3. Responder al cliente conservando el contrato HTTP estándar
		response.status(status).json(
			typeof exceptionResponse === 'object' && exceptionResponse !== null
				? exceptionResponse
				: {
						statusCode: status,
						message: reason,
						error: status === 401 ? 'Unauthorized' : 'Forbidden'
					}
		);
	}

	private extractClientIp(req: Request): string {
		const forwarded = req.headers?.['x-forwarded-for'];
		if (typeof forwarded === 'string') {
			return forwarded.split(',')[0].trim();
		}
		if (Array.isArray(forwarded) && forwarded[0]) {
			return forwarded[0].trim();
		}
		return req.socket?.remoteAddress || req.ip || '-';
	}
}
