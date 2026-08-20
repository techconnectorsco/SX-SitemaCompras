/**
 * ============================================================================
 * MOTOR DE IA VYOWEB — CONFIGURACIÓN Y PROMPT DE SISTEMA
 * ============================================================================
 * Constantes de negocio (umbrales) y el armado del prompt de sistema que
 * codifica las reglas del cliente Vedova.
 */

import type { ContextoUsuario } from './tipos';

// ----------------------------------------------------------------------------
// Modelo / proveedor
// ----------------------------------------------------------------------------

export const IA_CONFIG = {
	/** Proveedor por defecto: 'gemini' | 'claude'. Se puede sobreescribir con la env IA_PROVEEDOR. */
	proveedorPorDefecto: 'gemini' as 'gemini' | 'claude',
	/** Modelo de Gemini. */
	modelo: 'gemini-2.5-flash',
	/** Modelo de respaldo si el principal está saturado (503). Más liviano, suele tener más disponibilidad. */
	modeloRespaldo: 'gemini-2.5-flash-lite',
	/** Modelo de Claude (la mejor versión disponible hoy). */
	modeloClaude: 'claude-opus-4-6',
	/**
	 * Temperatura baja = respuestas más consistentes. NOTA: en modelos Gemini 3
	 * Google recomienda dejar 1.0; si cambiás a un modelo 3.x, subí esto a 1.0.
	 */
	temperatura: 0.2,
	maxIteraciones: 8
};

// ----------------------------------------------------------------------------
// Umbrales de negocio (capa de cálculo)
// ----------------------------------------------------------------------------
// IMPORTANTE: lead_time se asume en DÍAS. Si en tu ERP está en meses,
// cambiá LEAD_TIME_EN_DIAS a false. (Pendiente de confirmar con negocio.)

export const NEGOCIO = {
	LEAD_TIME_EN_DIAS: true,
	DIAS_POR_MES: 30,
	/** Cobertura (en meses) por encima de la cual se considera sobrestock. */
	COBERTURA_SOBRESTOCK_MESES: 6,
	/** Diferencia relativa 6m vs 12m que marca cambio de demanda. */
	DIVERGENCIA_DEMANDA: 0.3,
	/** Alza de costo (último vs promedio) que se reporta como riesgo. */
	ALZA_PRECIO: 0.1
};

// ----------------------------------------------------------------------------
// Prompt de sistema
// ----------------------------------------------------------------------------

const REGLAS_CHAT_GENERAL = `
Sos el asistente virtual de SoporteXperto. Respondés en español, de forma clara, útil y cordial.

- Ayudás con consultas generales, redacción, explicaciones, ideas y soporte técnico conceptual.
- No tenés acceso a datos internos de la empresa, sistemas del usuario, archivos, compras ni bases de datos.
- No navegás Internet ni podés confirmar información en tiempo real; indicá esa limitación cuando sea relevante.
- No inventes hechos, fuentes, precios, disponibilidad ni resultados de acciones externas.
- Si una solicitud requiere acceso a una cuenta, sistema o información actual, explicá qué tendría que verificar la persona.
`;

/**
 * Construye el prompt de sistema completo para una petición concreta:
 * incluye los módulos disponibles, los NO disponibles (para responder el
 * mensaje de "no autorizado"), y el contexto de pantalla.
 */
export function construirPromptSistema(args: { usuario: ContextoUsuario }): string {
	return `${REGLAS_CHAT_GENERAL}\nEstás hablando con ${args.usuario.nombre}.`.trim();
}
