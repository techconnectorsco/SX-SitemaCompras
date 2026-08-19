/**
 * @module DatabaseTypes
 * @description Tipos TypeScript para el esquema de base de datos de TechConnectors
 */

export type EstadoEjecucion = 'Exitoso' | 'Advertencia' | 'Error';

export interface Cliente {
	id: string;
	nombre: string;
	slug: string;
	created_at?: string;
	updated_at?: string;
}

export interface Automatizacion {
	id: string;
	cliente_id: string;
	nombre: string;
	descripcion: string | null;
	frecuencia: string | null;
	tipo: string | null;
	esta_activa: boolean;
	created_at?: string;
	updated_at?: string;
	// Relaciones
	cliente?: Cliente;
	ultima_ejecucion?: Ejecucion;
}

export interface Ejecucion {
	id: string;
	automatizacion_id: string;
	fecha_inicio: string;
	estado: EstadoEjecucion;
	metricas: Record<string, any> | null; // JSONB
	log_salida: string | null; // URL del PDF en Storage
	observaciones: string | null;
	created_at?: string;
	updated_at?: string;
	// Relaciones
	automatizacion?: Automatizacion;
}

export interface ProyectoSoftware {
	id: string;
	cliente_id: string;
	nombre: string;
	descripcion: string | null;
	url_acceso: string | null;
	tecnologias: string[] | null;
	tipo: string | null;
	estado: string | null;
	created_at?: string;
	updated_at?: string;
	// Relaciones
	cliente?: Cliente;
}

/**
 * Tipos para métricas comunes en ejecuciones
 */
export interface MetricasEjecucion {
	emails_enviados?: number;
	montos_procesados?: number;
	documentos_procesados?: number;
	registros_procesados?: number;
	tiempo_ejecucion_segundos?: number;
	errores_encontrados?: number;
	[key: string]: any; // Para métricas personalizadas