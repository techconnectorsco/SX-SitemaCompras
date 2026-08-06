import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { createDataSource } from '$lib/services/data-source-factory';

// CC incluye EQUIPOS (a diferencia del resto del sistema) para permitir publicaciones de equipos
const CATEGORIAS_EXCLUIR = ['CI', 'PUBLICIDAD', 'OTROS'];

function escapeSQLSingleQuotes(value: string): string {
	return value.replace(/'/g, "''");
}

interface Producto {
	codigo: string;
	descripcion: string;
	marca: string;
	categoria: string;
	stock_total: number;
	bodegas_con_stock: number;
}

// GET /api/content-creator/productos?search=&marca=&categoria=&sort=highest|lowest|none&limit=100&offset=0
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}

	try {
		// Bodegas seleccionadas para Creador de Contenido (cc_incluida = 1)
		const bodegasSel = db
			.prepare('SELECT bodega_codigo FROM bodegas WHERE cc_incluida = 1 ORDER BY bodega_codigo')
			.all() as any[];

		const codigosBodegas = bodegasSel
			.map((b) => (b.bodega_codigo || '').trim())
			.filter((c: string) => c.length > 0);

		if (codigosBodegas.length === 0) {
			return json({
				success: true,
				productos: [],
				marcas: [],
				categorias: [],
				seleccion_incompleta: true,
				mensaje: 'No hay bodegas seleccionadas. Ve a la pestaña "Bodegas" para elegir al menos una.'
			});
		}

		const search = (url.searchParams.get('search') || '').trim();
		const marca = (url.searchParams.get('marca') || '').trim();
		const categoria = (url.searchParams.get('categoria') || '').trim();
		const sort = url.searchParams.get('sort') === 'highest' || url.searchParams.get('sort') === 'lowest'
			? (url.searchParams.get('sort') as 'highest' | 'lowest')
			: 'none';
		const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 1), 500);
		const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

		// Construir cláusula IN (códigos escapados)
		const bodegasIn = codigosBodegas.map((c) => `'${escapeSQLSingleQuotes(c)}'`).join(', ');

		const whereClauses = [
			'A.ARTICULO IS NOT NULL',
			"A.ARTICULO <> 'ND'",
			`(A.CLASIFICACION_1 IS NULL OR A.CLASIFICACION_1 NOT IN (${CATEGORIAS_EXCLUIR.map((c) => `'${c}'`).join(', ')}))`
		];

		if (search) {
			const s = escapeSQLSingleQuotes(search);
			whereClauses.push(`(
				UPPER(A.ARTICULO) LIKE UPPER('%${s}%') OR
				UPPER(A.DESCRIPCION) LIKE UPPER('%${s}%') OR
				UPPER(A.CLASIFICACION_4) LIKE UPPER('%${s}%') OR
				UPPER(A.CLASIFICACION_1) LIKE UPPER('%${s}%')
			)`);
		}

		if (marca && marca !== 'Todas') {
			whereClauses.push(`UPPER(A.CLASIFICACION_4) = UPPER('${escapeSQLSingleQuotes(marca)}')`);
		}

		if (categoria && categoria !== 'Todas') {
			whereClauses.push(`UPPER(A.CLASIFICACION_1) = UPPER('${escapeSQLSingleQuotes(categoria)}')`);
		}

		const whereSQL = whereClauses.join('\n      AND ');

		const orderBy =
			sort === 'highest'
				? 'stock_total DESC, A.ARTICULO ASC'
				: sort === 'lowest'
					? 'stock_total ASC, A.ARTICULO ASC'
					: 'A.ARTICULO ASC';

		// LEFT JOIN + HAVING para conservar sólo productos con stock > 0 en las bodegas seleccionadas
		const query = `
			SELECT
				A.ARTICULO as codigo,
				A.DESCRIPCION as descripcion,
				ISNULL(A.CLASIFICACION_4, '') as marca,
				ISNULL(A.CLASIFICACION_1, '') as categoria,
				CAST(ISNULL(SUM(EB.CANT_DISPONIBLE), 0) AS FLOAT) as stock_total,
				COUNT(DISTINCT EB.BODEGA) as bodegas_con_stock
			FROM VEDOVA.ARTICULO A
			LEFT JOIN VEDOVA.EXISTENCIA_BODEGA EB
				ON EB.ARTICULO = A.ARTICULO
				AND EB.BODEGA IN (${bodegasIn})
				AND CAST(ISNULL(EB.CANT_DISPONIBLE, 0) AS FLOAT) <> 0
			WHERE ${whereSQL}
			GROUP BY A.ARTICULO, A.DESCRIPCION, A.CLASIFICACION_4, A.CLASIFICACION_1
			HAVING CAST(ISNULL(SUM(EB.CANT_DISPONIBLE), 0) AS FLOAT) <> 0
			ORDER BY ${orderBy}
			OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
		`;

		const dataSource = createDataSource();
		const pool = await (dataSource as any).getPool();

		const result = await pool.request().query(query);
		const productos: Producto[] = (result.recordset || []).map((r: any) => ({
			codigo: (r.codigo || '').trim(),
			descripcion: (r.descripcion || '').trim(),
			marca: (r.marca || '').trim(),
			categoria: (r.categoria || '').trim(),
			stock_total: parseFloat(r.stock_total) || 0,
			bodegas_con_stock: parseInt(r.bodegas_con_stock, 10) || 0
		}));

		// Marcas distintas disponibles
		const marcasQuery = `
			SELECT DISTINCT ISNULL(A.CLASIFICACION_4, '') AS marca
			FROM VEDOVA.ARTICULO A
			WHERE A.ARTICULO IS NOT NULL AND A.ARTICULO <> 'ND'
				AND (A.CLASIFICACION_1 IS NULL OR A.CLASIFICACION_1 NOT IN (${CATEGORIAS_EXCLUIR.map((c) => `'${c}'`).join(', ')}))
				AND ISNULL(A.CLASIFICACION_4, '') <> ''
			ORDER BY marca;
		`;
		const marcasResult = await pool.request().query(marcasQuery);
		const marcas = (marcasResult.recordset || []).map((r: any) => (r.marca || '').trim());

		// Categorías distintas disponibles (CLASIFICACION_1)
		const categoriasQuery = `
			SELECT DISTINCT ISNULL(A.CLASIFICACION_1, '') AS categoria
			FROM VEDOVA.ARTICULO A
			WHERE A.ARTICULO IS NOT NULL AND A.ARTICULO <> 'ND'
				AND (A.CLASIFICACION_1 IS NULL OR A.CLASIFICACION_1 NOT IN (${CATEGORIAS_EXCLUIR.map((c) => `'${c}'`).join(', ')}))
				AND ISNULL(A.CLASIFICACION_1, '') <> ''
			ORDER BY categoria;
		`;
		const categoriasResult = await pool.request().query(categoriasQuery);
		const categorias = (categoriasResult.recordset || []).map((r: any) => (r.categoria || '').trim());

		return json({
			success: true,
			productos,
			marcas,
			categorias,
			bodegas_seleccionadas: codigosBodegas,
			total: productos.length,
			filtros: { search, marca, categoria, sort, limit, offset }
		});
	} catch (error: any) {
		console.error('[API CC productos GET]', error);
		const msg = error?.message || String(error);
		const amigable = /ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(msg)
			? 'No se pudo conectar a Exactus. Verifica que estés conectado al VPN.'
			: msg;
		return json({ success: false, error: amigable, productos: [], marcas: [], categorias: [] }, { status: 502 });
	}
};