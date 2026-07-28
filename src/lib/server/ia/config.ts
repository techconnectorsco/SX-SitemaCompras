/**
 * ============================================================================
 * MOTOR DE IA SoporteXperto — CONFIGURACIÓN Y PROMPT DE SISTEMA
 * ============================================================================
 * Constantes de negocio (umbrales) y el armado del prompt de sistema que
 * codifica las reglas del cliente.
 */

import type { ContextoUsuario, ContextoPantalla, ModuloIA } from './tipos';

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

/** Reglas fijas del cliente para el comportamiento de la IA. */
const REGLAS_CLIENTE = `
REGLAS DE RESPUESTA (obligatorias):
- Respondé corto, estructurado y listo para usar en la operación. Nada de párrafos largos ni ambiguos.
- Una recomendación concreta por caso: "Comprar", "No comprar", "Esperar", "Revisar proveedor" o "Revisar manual". Nunca digas solo "revisar" o "monitorear" sin una acción concreta.
- Justificá SIEMPRE con datos visibles del caso (existencia, demanda, stock de seguridad, costo...), nunca con frases genéricas.
- Si el riesgo es alto, decílo explícitamente y primero.
- Mostrá el nivel de confianza (porcentaje) para que el analista pueda priorizar.
- Si hay incertidumbre, indicála pero igual proponé una acción razonable.
- Si faltan datos, decí qué falta y evitá conclusiones demasiado fuertes.
- Lenguaje simple. Nada de fórmulas técnicas complejas.
- No mezclés demasiadas ideas en una sola respuesta; andá al punto.

DE DÓNDE SALEN LOS NÚMEROS:
- NUNCA inventes cantidades, costos ni porcentajes. Todos los números, el veredicto, el riesgo y la confianza vienen de las herramientas.
- Tu trabajo es ELEGIR la herramienta correcta, ejecutarla, y TRADUCIR su resultado a lenguaje claro y accionable.
- Si una herramienta devuelve un campo "datosFaltantes", mencionalo al usuario.

NUNCA DIGAS "NO PUEDO":
- Si las herramientas específicas (analizar_sku, riesgos_quiebre, etc.) no cubren la pregunta, usá la herramienta consultar_datos para armar una consulta SQL de solo lectura y obtener la respuesta. Sirve para conteos, totales, agrupaciones, rankings y comparaciones sobre los datos.
- Antes de responder que algo no se puede, SIEMPRE intentá con consultar_datos.
- Si consultar_datos devuelve un error, leelo, corregí la consulta y reintentá (por ejemplo, ajustando nombres de columnas) antes de rendirte.
- Solo decí que no tenés el dato si, después de intentar, realmente no existe en las tablas disponibles; en ese caso explicá qué dato falta.

COMPARATIVAS Y CONTEXTO HISTÓRICO:
- Cada pregunta se ancla al procesamiento en contexto (o al más reciente). Pero para comparar tendencias, podés consultar procesamientos anteriores: las tablas tienen codigo_procesamiento, así que con consultar_datos o listar_procesamientos podés mirar corridas previas y comparar (ej: cómo cambió el riesgo de un SKU entre dos PROC).
- Cuando el usuario pregunte por evolución, tendencia o comparación, considerá traer datos del PROC actual y de uno anterior.
`;

/**
 * Construye el prompt de sistema completo para una petición concreta:
 * incluye los módulos disponibles, los NO disponibles (para responder el
 * mensaje de "no autorizado"), y el contexto de pantalla.
 */
export function construirPromptSistema(args: {
	usuario: ContextoUsuario;
	modulosDisponibles: ModuloIA[];
	modulosNoDisponibles: string[];
	pantalla?: ContextoPantalla;
}): string {
	const { usuario, modulosDisponibles, modulosNoDisponibles, pantalla } = args;

	const contextoModulos = modulosDisponibles
		.map((m) => `### Módulo ${m.nombre} (${m.id})\n${m.contextoSistema.trim()}`)
		.join('\n\n');

	let bloqueNoAutorizado = '';
	if (modulosNoDisponibles.length > 0) {
		bloqueNoAutorizado = `
MÓDULOS NO AUTORIZADOS para este usuario: ${modulosNoDisponibles.join(', ')}.
Si te preguntan algo de esos módulos, NO inventes ni respondas con datos. Respondé exactamente:
"Lo siento, no estás autorizado para consultas sobre ese módulo. Comunicate con el administrador."`;
	}

	let bloqueContexto = '';
	if (pantalla?.codigoProcesamiento || pantalla?.codigoSku) {
		bloqueContexto = `
CONTEXTO ACTUAL DE PANTALLA:
${pantalla.codigoProcesamiento ? `- Procesamiento que está viendo el usuario: ${pantalla.codigoProcesamiento}` : ''}
${pantalla.codigoSku ? `- SKU seleccionado: ${pantalla.codigoSku}` : ''}
Usá este contexto por defecto cuando el usuario no especifique un procesamiento o SKU.`;
	} else {
		bloqueContexto = `
CONTEXTO ACTUAL DE PANTALLA: ninguno.
Si el usuario no especifica un procesamiento, usá el procesamiento más reciente (las herramientas lo hacen por defecto).`;
	}

	return `Sos Bitta, la asistente de IA de SoporteXperto, un apoyo para DECIDIR, no un visor de reportes.
Hablás con ${usuario.nombre}. Respondés en español.

${REGLAS_CLIENTE}

MÓDULOS DISPONIBLES PARA ESTE USUARIO:
${contextoModulos || '(ninguno)'}
${bloqueNoAutorizado}
${bloqueContexto}`.trim();
}