import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { createDataSource } from '$lib/services/data-source-factory';

interface DistribucionBodega {
	bodega_codigo: string;
	bodega_nombre: string;
	tipo: string;
	u_zona: string;
	cant_disponible: number;
	seleccionada: boolean; // si está dentro de las cc_incluida
}

// GET /api/content-creator/productos/[codigo]/bodegas
// Devuelve el desglose de inventario de un SKU por bodega (todas las que tienen stock != 0),
// marcando cuáles de ellas están seleccionadas para el Creador de Contenido.
export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}

	const codigo = (params.codigo || '').trim();
	if (!codigo) {
		return json({ error: 'Código de producto requerido' }, { status: 400 });
	}

	try {
		const dataSource = createDataSource();
		const pool = await (dataSource as any).getPool();

		const result = await pool
			.request()
			.input('articulo', codigo.toUpperCase())
			.query(`
				SELECT
					ARTICULO,
					BODEGA,
					CAST(ISNULL(CANT_DISPONIBLE, 0) AS FLOAT) AS disponible
				FROM VEDOVA.EXISTENCIA_BODEGA
				WHERE UPPER(ARTICULO) = UPPER(@articulo)
					AND CAST(ISNULL(CANT_DISPONIBLE, 0) AS FLOAT) <> 0
				ORDER BY BODEGA;
			`);

		if (!result.recordset || result.recordset.length === 0) {
			return json({ success: true, encontrado: false, codigo });
		}

		const setSeleccionadas = new Set(
			((db
				.prepare('SELECT bodega_codigo FROM bodegas WHERE cc_incluida = 1')
				.all() as any[]) || [])
				.map((b) => (b.bodega_codigo || '').trim())
		);

		// Mapa de info local (nombre, tipo, u_zona) por código
		const infoPorCodigo = new Map<string, any>();
		const codigosUnicos = Array.from(new Set(result.recordset.map((r: any) => (r.BODEGA || '').trim())));
		if (codigosUnicos.length > 0) {
			const placeholders = codigosUnicos.map((_) => '?').join(',');
			const filas = db
				.prepare(`SELECT bodega_codigo, bodega_nombre, tipo, u_zona FROM bodegas WHERE bodega_codigo IN (${placeholders})`)
				.all(...codigosUnicos) as any[];
			for (const f of filas) {
				infoPorCodigo.set((f.bodega_codigo || '').trim(), f);
			}
		}

		const distribucion: DistribucionBodega[] = result.recordset.map((row: any) => {
			const codigoBod = (row.BODEGA || '').trim();
			const info = infoPorCodigo.get(codigoBod);
			return {
				bodega_codigo: codigoBod,
				bodega_nombre: info?.bodega_nombre || codigoBod,
				tipo: info?.tipo || '',
				u_zona: info?.u_zona || '',
				cant_disponible: parseFloat(row.disponible) || 0,
				seleccionada: setSeleccionadas.has(codigoBod)
			};
		});

		const totalSeleccionadas = distribucion
			.filter((d) => d.seleccionada)
			.reduce((s, d) => s + d.cant_disponible, 0);
		const totalTodas = distribucion.reduce((s, d) => s + d.cant_disponible, 0);

		return json({
			success: true,
			encontrado: true,
			codigo,
			distribucion,
			resumen: {
				total_seleccionadas: totalSeleccionadas,
				total_todas: totalTodas,
				bodegas_seleccionadas_con_stock: distribucion.filter((d) => d.seleccionada).map((d) => d.bodega_codigo)
			}
		});
	} catch (error: any) {
		console.error('[API CC productos/bodegas GET]', error);
		const msg = error?.message || String(error);
		const amigable = /ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(msg)
			? 'No se pudo conectar a Exactus. Verifica que estés conectado al VPN.'
			: msg;
		return json({ success: false, error: amigable }, { status: 502 });
	}
};