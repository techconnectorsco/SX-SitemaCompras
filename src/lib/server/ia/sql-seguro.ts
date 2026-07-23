/**
 * ============================================================================
 * MOTOR DE IA VYOWEB — CONSULTA SQL SEGURA (SOLO LECTURA)
 * ============================================================================
 * Permite que la IA arme sus propias consultas para responder preguntas que
 * las herramientas fijas no cubren (conteos, agrupaciones, totales, rankings).
 *
 * Usa la conexión principal del proyecto (la base está encriptada con
 * SQLCipher, así que no se puede abrir una segunda conexión readonly). Por eso
 * la seguridad recae en una VALIDACIÓN ESTRICTA del texto SQL antes de ejecutar:
 *
 *  1. Solo UNA sentencia, que empiece con SELECT (o WITH ... SELECT).
 *  2. Se bloquea TODA palabra de escritura/DDL como token completo
 *     (INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, REPLACE, PRAGMA, ATTACH...).
 *  3. Solo tablas de negocio de una lista blanca (nunca users, sessions, tokens).
 *  4. Se quitan comentarios SQL (que podrían esconder código).
 *  5. Límite de filas de seguridad para proteger rendimiento y costo de tokens.
 *
 * Si la consulta es rechazada, se devuelve un error claro para que la IA la
 * corrija y reintente.
 */

import type { DB } from './tipos';

/** Tablas de negocio que la IA puede leer. NO incluye users, sessions, tokens. */
export const TABLAS_PERMITIDAS = [
	'forecast_procesamiento',
	'forecast_skus',
	'skus',
	'ventas_mensuales',
	'pedidos',
	'pedidos_lineas',
	'bodegas',
	'alertas',
	'forecast_existencia_bodega',
	'forecast_pedidos',
	'forecast_proveedor_desempeno',
	'forecast_corridas'
];

/** Límite de seguridad: ninguna consulta de análisis legítima lo alcanza. */
export const LIMITE_SEGURIDAD = 5000;

/** Palabras prohibidas (escritura, DDL, comandos peligrosos). */
const PROHIBIDAS = [
	'insert', 'update', 'delete', 'drop', 'create', 'alter', 'replace',
	'truncate', 'pragma', 'attach', 'detach', 'vacuum', 'reindex',
	'grant', 'revoke', 'commit', 'rollback', 'savepoint', 'begin', 'into'
];

export interface ResultadoConsulta {
	ok: boolean;
	filas?: unknown[];
	totalFilas?: number;
	error?: string;
	consultaEjecutada?: string;
}

/** Normaliza: quita comentarios SQL y espacios extra. */
function limpiar(sql: string): string {
	return sql
		.replace(/--[^\n]*/g, ' ')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Valida la consulta. Devuelve null si es válida, o un mensaje de error. */
export function validarConsulta(sqlOriginal: string): string | null {
	const sql = limpiar(sqlOriginal);
	if (!sql) return 'La consulta está vacía.';

	const sinFinal = sql.replace(/;\s*$/, '');
	if (sinFinal.includes(';')) {
		return 'Solo se permite una consulta. No uses varias sentencias separadas por ";".';
	}

	const lower = sinFinal.toLowerCase();

	if (!/^(select|with)\b/.test(lower)) {
		return 'Solo se permiten consultas de lectura que empiecen con SELECT (o WITH ... SELECT).';
	}

	for (const palabra of PROHIBIDAS) {
		const re = new RegExp(`\\b${palabra}\\b`, 'i');
		if (re.test(lower)) {
			return `No se permite "${palabra.toUpperCase()}". Solo consultas de lectura (SELECT), sin modificar datos.`;
		}
	}

	const reftablas = [...lower.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/g)].map((m) => m[1]);
	// Alias definidos en un CTE (WITH alias AS (...)): son temporales, no tablas reales.
	const aliasCTE = [...lower.matchAll(/\b([a-z_][a-z0-9_]*)\s+as\s*\(/g)].map((m) => m[1]);
	for (const tabla of reftablas) {
		if (TABLAS_PERMITIDAS.includes(tabla)) continue;
		if (aliasCTE.includes(tabla)) continue; // alias de CTE, permitido
		return `No tenés acceso a la tabla "${tabla}". Tablas disponibles: ${TABLAS_PERMITIDAS.join(', ')}.`;
	}
	if (reftablas.length === 0) {
		return 'La consulta debe leer de al menos una tabla permitida.';
	}

	return null;
}

/** Agrega un LIMIT de seguridad si la consulta no tiene uno propio. */
function asegurarLimite(sql: string): string {
	const sinFinal = sql.replace(/;\s*$/, '').trim();
	if (/\blimit\b/i.test(sinFinal)) return sinFinal;
	return `${sinFinal} LIMIT ${LIMITE_SEGURIDAD}`;
}

/**
 * Ejecuta una consulta de solo lectura de forma segura sobre la conexión dada.
 * La seguridad está garantizada por la validación previa (no se permite nada
 * que no sea un SELECT sobre tablas de negocio).
 */
export function ejecutarConsultaSegura(db: DB, sql: string): ResultadoConsulta {
	const errorValidacion = validarConsulta(sql);
	if (errorValidacion) {
		return { ok: false, error: errorValidacion };
	}

	const consulta = asegurarLimite(limpiar(sql));

	try {
		const stmt = db.prepare(consulta);
		// reader = true confirma que es una sentencia de solo lectura; si no lo
		// es, better-sqlite3/sqlcipher marca la propiedad como false.
		if (stmt.reader === false) {
			return { ok: false, error: 'La consulta no es de solo lectura. Usá únicamente SELECT.' };
		}
		const filas = stmt.all();
		return { ok: true, filas, totalFilas: filas.length, consultaEjecutada: consulta };
	} catch (e) {
		return {
			ok: false,
			error: `La consulta falló: ${e instanceof Error ? e.message : String(e)}. Revisá nombres de columnas y sintaxis, e intentá de nuevo.`,
			consultaEjecutada: consulta
		};
	}
}