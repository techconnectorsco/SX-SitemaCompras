/**
 * ============================================================================
 * PROVEEDORES DE IA — CONTRATO
 * ============================================================================
 * Cada proveedor (Gemini, OpenAI, Claude...) implementa `ProveedorIA`.
 * El motor solo conoce esta interfaz; no sabe qué SDK hay detrás.
 *
 * Para agregar un proveedor nuevo:
 *   1. Crear un archivo en esta carpeta (ej: openai.ts).
 *   2. Implementar `ProveedorIA`.
 *   3. Seleccionarlo donde se crea el motor.
 */

export type {
	ProveedorIA,
	SolicitudIA,
	RespuestaIA,
	DeclaracionHerramienta,
	MensajeChat
} from '../tipos';