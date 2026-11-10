/**
 * Definición de un probe (comprobación de salud) dinámico para bases de datos,
 * cachés o servicios externos (Prisma, TypeORM, SQL Server, SQLite, Redis, APIs, etc.).
 */
export interface HealthProbeDefinition {
	/** Identificador único (ej: 'postgres', 'sap', 'sqlite', 'redis') */
	key: string;
	/** Nombre legible que se mostrará en la tarjeta del Dashboard (ej: 'Base de Datos Principal') */
	label: string;
	/** Etiqueta corta de tecnología en la tarjeta (ej: 'Prisma SQL', 'mssql Pool', 'SQLite WAL') */
	badge?: string;
	/** Ícono o sigla de 2 letras para la tarjeta del Dashboard (ej: 'DB', 'ERP', 'SQ') */
	icon?: string;
	/** Tiempo máximo de espera en milisegundos antes de dar por caído el servicio (default: 3000 ms) */
	timeoutMs?: number;
	/**
	 * Función síncrona o asíncrona que verifica la salud del servicio.
	 * Si resuelve sin lanzar error, se considera 'up'. Si lanza excepción o excede el timeout, se marca 'down'.
	 */
	check: () => Promise<unknown> | unknown;
}

/**
 * Estado evaluado de un probe individual.
 */
export interface ProbeStatusEntry {
	label: string;
	badge?: string;
	icon?: string;
	status: 'up' | 'down';
	responseTimeMs: number;
	error?: string;
}

/**
 * Opciones de configuración universales del Monitoring Kit (agnóstico de framework).
 */
export interface MonitoringKitOptions {
	/** Nombre de la aplicación o sistema para mostrar en el Dashboard (default: 'API Backend') */
	appName?: string;
	/** Siglas o texto del badge principal en la esquina superior izquierda (default: 'API') */
	appBadge?: string;
	/** Subtítulo descriptivo en el encabezado del Dashboard */
	appSubtitle?: string;
	/** Lista de probes de bases de datos o servicios externos a monitorear (puede ser vacío []) */
	probes?: HealthProbeDefinition[];
	/** Tiempo de caché en milisegundos entre chequeos de bases de datos para evitar saturación (default: 2500 ms) */
	dbCacheTtlMs?: number;
	/** Cantidad máxima de peticiones HTTP a retener en el buffer circular en memoria (default: 100) */
	maxTrafficEvents?: number;
	/** Cantidad máxima de bloqueos de seguridad (401/403) a retener en memoria (default: 100) */
	maxSecurityEvents?: number;
	/** Ruta donde estará montado el monitor en tiempo real de CPU/RAM/RPS (default: '/status') */
	statusMonitorPath?: string;
	/**
	 * Habilitar o deshabilitar la presencia del botón y el acceso a Swagger/OpenAPI.
	 * - `true`: Muestra el botón de Swagger Docs en el Dashboard y permite el acceso a la documentación.
	 * - `false`: Oculta el botón del Dashboard y bloquea cualquier llamada a la ruta de documentación (retornando 404).
	 * - `undefined`: Auto-detecta si el proyecto incluye paquetes de Swagger (@nestjs/swagger, etc.) en `package.json`.
	 */
	hasSwagger?: boolean;
	/** Alias de `hasSwagger` para compatibilidad */
	enableSwagger?: boolean;
	/** Ruta de la documentación Swagger/OpenAPI para el botón de acceso rápido (default: '/api/docs') */
	swaggerDocsPath?: string;
	/** Habilitar logs HTTP estructurados en consola (default: true) */
	enableConsoleLog?: boolean;
	/** Habilitar redirección automática de /dashboard -> /health/dashboard (default: true) */
	enableDashboardRedirect?: boolean;
	/** Prefijos de rutas que no deben registrarse en el historial de tráfico para evitar ruido */
	ignoreTrafficPrefixes?: string[];
}

/**
 * Opciones para configuración asíncrona con inyección de dependencias en NestJS (useFactory).
 */
export interface MonitoringKitAsyncOptions {
	imports?: any[];
	inject?: any[];
	useFactory: (...args: any[]) => Promise<MonitoringKitOptions> | MonitoringKitOptions;
}

/**
 * Opciones para el helper de inicialización en main.ts (`setupMonitoring`).
 */
export interface SetupMonitoringBootstrapOptions {
	/** Título para la vista del monitor de estado en tiempo real (default: 'Monitor de Estado en Tiempo Real') */
	title?: string;
	/** Ruta para el monitor de estado en tiempo real (default: '/status') */
	statusMonitorPath?: string;
	/** Habilitar logs HTTP en consola (default: true) */
	enableMorgan?: boolean;
	/** Habilitar redirección automática de /dashboard -> /health/dashboard (default: true) */
	enableDashboardRedirect?: boolean;
	/** Prefijos de rutas que no deben registrarse en el historial de tráfico para evitar ruido */
	ignoreTrafficPrefixes?: string[];
	/**
	 * Si es true (por defecto en proyectos sin express-status-monitor), sirve el monitor nativo
	 * de CPU/RAM/Heap/RPS sin depender de librerías externas ni Socket.io.
	 */
	useNativeStatusMonitor?: boolean;
}

/**
 * Interfaz flexible y desacoplada para extraer identidad del usuario
 * en cualquier sistema de autenticación (JWT, Cookies/Sessions, Locals, Guards).
 */
export interface GenericAuthenticatedUser {
	id?: string | number;
	sub?: string | number;
	email?: string;
	username?: string;
	name?: string;
	roles?: string[];
	role?: string;
}

/**
 * Datos de entrada universales al finalizar una solicitud HTTP en cualquier framework.
 */
export interface RecordedRequestInput {
	method: string;
	url: string;
	statusCode: number;
	responseTimeMs: number;
	ip?: string;
	userAgent?: string;
	user?: GenericAuthenticatedUser | null;
	/** Motivo explícito del rechazo si es 401/403 (opcional, se infiere si no se envía) */
	reason?: string;
	/** Evita duplicar registro en auditoría si un filtro de excepciones ya lo capturó */
	skipSecurityAudit?: boolean;
}

/**
 * Respuesta HTTP agnóstica generada por el motor de monitoreo.
 */
export interface MonitoringHttpResponse {
	matched: boolean;
	status: number;
	headers: Record<string, string>;
	body: string;
}

export const MONITORING_KIT_OPTIONS = 'MONITORING_KIT_OPTIONS';
