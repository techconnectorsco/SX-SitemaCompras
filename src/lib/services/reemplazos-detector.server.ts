/**
 * Detector de reemplazos de SKU ("CAMBIO POR / CAMBIO X <codigo>").
 * Marca en forecast_procesamiento (columnas reemplazo_*) qué SKUs son
 * viejos (reemplazado), cuáles el vigente (reemplazo) y cuáles quedan
 * pendientes (revisar). NO altera ningún cálculo del forecast.
 */
import { db } from '$lib/config/db-config';

// Detecta el prefijo "CAMBIO POR" o "CAMBIO X"
// Detecta el prefijo "CAMBIO POR" o "CAMBIO X"
const RE_CAMBIO = /^\s*CAMBIO\s+(?:POR|X)\s+/i;

// Extractores del código destino, de MÁS específico a más general.
// EL ORDEN ES CRÍTICO: Los formatos largos y con prefijos van arriba.
const EXTRACTORES: RegExp[] = [
	// 1. Errores de tipeo detectables (con espacios extra)
	/^\d{3}\s\d{2}\s\d{2}-\d{2}/,  // 505 04 28-01
	/^\d{7,8}\s-\d{2}/,            // 5127207 -01
	/^[0-9A-Z]{1,3}-\d{3}\s\d{2}/, // 0G-310 00
	/^\d{7,8}-\d\s\d/,             // 5775351-0 1 (Caso especial Manguera)

	// 2. Formatos largos, compuestos y con prefijos de letras (DEBEN IR ARRIBA)
	/^[A-Z]{2,4}-\d{4,6}-[A-Z]{2,4}/, // MILL-41150-LOG
	/^[A-Z]{2}\d{2}-\d{3,6}/,         // ML24-00443 (Ahora sí lo agarrará completo)
	/^[A-Z0-9]{3,4}-\d{3,6}/,         // HD3X-41130
	/^[A-Z]{3,5}-\d{3,5}/,            // FRON-0120
	/^[A-Z]\d{6,9}/,                  // K00204005 (Protegido de cortes)
	/^[0-9A-Z]{4,5}-\d{2,3}/,         // 0G043-01
	/^\d{4}-\d{3,5}[A-Z]/,            // 1029-001E
	/^\d{2,4}[A-Z]{2,6}\d{3,4}/,      // 160PXLBA074

	// 3. Formatos estándar numéricos (Husqvarna, Oregon, etc.)
	/^\d{7,8}-\d{2}/,                 // 5877389-01
	/^\d{5,6}-\d{2,3}/,               // 05001-039
	/^\d{4}-\d{3,5}/,                 // 1011-9002
	/^[0-9A-Z]{1,3}-\d{3}-\d{2}/,     // 0G-210-01, OG-231-00

	// 4. Alfanuméricos CORTOS (DEBEN IR ABAJO para no truncar los largos)
	/^\d{2,8}[A-Z]{1,4}/,          // 90PX, 24549B
	/^[A-Z]{1,2}\d{2,4}[A-Z]?/,    // H37, S93G

	// 5. Puros números
	/^\d{5,9}/,

	// 6. Último recurso genérico hifenado
	/^[0-9A-Z]+(?:-[0-9A-Z]+)+/
];

/** Extrae el código destino de una descripción "CAMBIO POR/X ...". null si no es cambio o no se pudo extraer. */
function extraerDestino(descripcion: string): string | null {
	const desc = (descripcion || '').toUpperCase().replace(/\s+/g, ' ').trim();
	if (!RE_CAMBIO.test(desc)) return null;
	const payload = desc.replace(RE_CAMBIO, '').trim();
	
	for (const re of EXTRACTORES) {
		const m = payload.match(re);
		if (m) {
			let dest = m[0];
			
			// Auto-corrección de errores de tipeo detectados
			if (/^\d{3}\s\d{2}\s\d{2}-\d{2}/.test(dest)) dest = dest.replace(/\s/g, ''); // 505 04 28-01 -> 5050428-01
			if (/^\d{7,8}\s-\d{2}/.test(dest)) dest = dest.replace(/\s/g, ''); // 5127207 -01 -> 5127207-01
			if (/^[0-9A-Z]{1,3}-\d{3}\s\d{2}/.test(dest)) dest = dest.replace(/\s/g, '-'); // 0G-310 00 -> 0G-310-00
			if (/^\d{7,8}-\d\s\d/.test(dest)) dest = dest.replace(/\s/g, ''); // 5775351-0 1 -> 5775351-01
			
			return dest;
		}
	}
	return null; // es CAMBIO pero el código no se pudo aislar → revisar
}

export function detectarYMarcarReemplazos(codigoProcesamiento: string) {
	const inicio = Date.now();

	const filas = db
		.prepare(
			`SELECT codigo_sku, descripcion FROM forecast_procesamiento WHERE codigo_procesamiento = ?`
		)
		.all(codigoProcesamiento) as { codigo_sku: string; descripcion: string }[];

	const existe = new Set(filas.map((f) => f.codigo_sku));

	// codigo_sku -> destino directo (o null = CAMBIO no parseable)
	const puntero = new Map<string, string | null>();
	const esCambio = new Set<string>();
	for (const f of filas) {
		if (RE_CAMBIO.test((f.descripcion || '').toUpperCase())) {
			esCambio.add(f.codigo_sku);
			puntero.set(f.codigo_sku, extraerDestino(f.descripcion));
		}
	}

	// Sigue la cadena hasta el vigente final. Devuelve también cuántos saltos hay hasta él (profundidad).
	// ok=false si hay ciclo, destino inexistente o eslabón no parseable.
	function resolver(codigo: string): { final: string | null; ok: boolean; saltos: number } {
		const visitados = new Set<string>([codigo]);
		let actual = codigo;
		for (let i = 0; i < 12; i++) {
			const dest = puntero.get(actual);
			if (dest === undefined) return { final: actual, ok: existe.has(actual), saltos: i }; // final
			if (dest === null) return { final: null, ok: false, saltos: i }; // eslabón no parseable
			if (!existe.has(dest)) return { final: dest, ok: false, saltos: i }; // destino inexistente
			if (visitados.has(dest)) return { final: null, ok: false, saltos: i }; // ciclo
			visitados.add(dest);
			actual = dest;
		}
		return { final: null, ok: false, saltos: 12 }; // cadena demasiado larga
	}

	const limpiar = db.prepare(
		`UPDATE forecast_procesamiento SET reemplazo_estado=NULL, reemplazo_codigo=NULL, reemplazo_grupo=NULL WHERE codigo_procesamiento=?`
	);
	const updReemplazado = db.prepare(
		`UPDATE forecast_procesamiento SET reemplazo_estado='reemplazado', reemplazo_codigo=?, reemplazo_grupo=?, reemplazo_orden=? WHERE codigo_procesamiento=? AND codigo_sku=?`
	);
	const updRevisar = db.prepare(
		`UPDATE forecast_procesamiento SET reemplazo_estado='revisar', reemplazo_codigo=?, reemplazo_grupo=NULL, reemplazo_orden=NULL WHERE codigo_procesamiento=? AND codigo_sku=?`
	);
	const updReemplazo = db.prepare(
		`UPDATE forecast_procesamiento SET reemplazo_estado='reemplazo', reemplazo_codigo=NULL, reemplazo_grupo=?, reemplazo_orden=0 WHERE codigo_procesamiento=? AND codigo_sku=?`
	);

	let reemplazados = 0;
	let revisar = 0;
	const vigentes = new Set<string>();

	db.transaction(() => {
		limpiar.run(codigoProcesamiento); // idempotente: recalcula desde cero cada corrida

		for (const sku of esCambio) {
			const destino = puntero.get(sku) ?? null;
			if (destino === null) {
				updRevisar.run(null, codigoProcesamiento, sku);
				revisar++;
				continue;
			}
			const r = resolver(sku);
			if (r.ok && r.final) {
				updReemplazado.run(r.final, r.final, r.saltos, codigoProcesamiento, sku);
				vigentes.add(r.final);
				reemplazados++;
			} else {
				updRevisar.run(destino, codigoProcesamiento, sku);
				revisar++;
			}
		}

		for (const v of vigentes) {
			if (existe.has(v)) updReemplazo.run(v, codigoProcesamiento, v);
		}
	})();

	const dur = ((Date.now() - inicio) / 1000).toFixed(1);
	console.log(
		`[reemplazos] 🔗 ${codigoProcesamiento}: ${reemplazados} reemplazados, ${vigentes.size} vigentes, ${revisar} a revisar (${dur}s)`
	);
	return { reemplazados, vigentes: vigentes.size, revisar };
}