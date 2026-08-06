import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import { createDataSource } from '$lib/services/data-source-factory';

// POST /api/content-creator/bodegas/sync
// Sincroniza bodegas desde Exactus (necesita VPN).
// No toca el flag `excluida` (Compras) ni `cc_incluida` (Creador de Contenido).
export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}

	try {
		const dataSource = createDataSource();
		const pool = await (dataSource as any).getPool();

		const result = await pool.request().query(`
			SELECT
				BODEGA,
				NOMBRE,
				TIPO,
				TELEFONO,
				DIRECCION,
				U_ZONA,
				TIPO_ESTABLECIMIENTO
			FROM VEDOVA.BODEGA
			WHERE BODEGA IS NOT NULL
			ORDER BY BODEGA
		`);

		const bodegasExactus = (result.recordset || []).map((row: any) => ({
			bodega_codigo: (row.BODEGA || '').trim(),
			bodega_nombre: (row.NOMBRE || '').trim(),
			tipo: (row.TIPO || '').trim(),
			telefono: (row.TELEFONO || '').trim(),
			direccion: (row.DIRECCION || '').trim(),
			u_zona: (row.U_ZONA || '').trim(),
			tipo_establecimiento: (row.TIPO_ESTABLECIMIENTO || '').trim()
		}));

		if (bodegasExactus.length === 0) {
			return json({ success: false, error: 'No se encontraron bodegas en Exactus (¿VPN activa?)' }, { status: 502 });
		}

		const insertStmt = db.prepare(`
			INSERT INTO bodegas (bodega_codigo, bodega_nombre, tipo, telefono, direccion, u_zona, tipo_establecimiento, excluida, cc_incluida)
			VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
		`);
		const updateStmt = db.prepare(`
			UPDATE bodegas
			SET bodega_nombre = ?, tipo = ?, telefono = ?, direccion = ?, u_zona = ?, tipo_establecimiento = ?, fecha_sincronizacion = CURRENT_TIMESTAMP
			WHERE bodega_codigo = ?
		`);

		const tx = db.transaction(() => {
			let nuevas = 0;
			let actualizadas = 0;
			for (const b of bodegasExactus) {
				if (!b.bodega_codigo) continue;
				const existe = db.prepare('SELECT id FROM bodegas WHERE bodega_codigo = ?').get(b.bodega_codigo);
				if (!existe) {
					insertStmt.run(
						b.bodega_codigo,
						b.bodega_nombre,
						b.tipo,
						b.telefono,
						b.direccion,
						b.u_zona,
						b.tipo_establecimiento
					);
					nuevas++;
				} else {
					updateStmt.run(
						b.bodega_nombre,
						b.tipo,
						b.telefono,
						b.direccion,
						b.u_zona,
						b.tipo_establecimiento,
						b.bodega_codigo
					);
					actualizadas++;
				}
			}
			return { nuevas, actualizadas };
		});

		const resultado = tx();
		console.log(`[API CC bodegas sync] ✅ ${resultado.nuevas} nuevas, ${resultado.actualizadas} actualizadas`);

		return json({
			success: true,
			mensaje: `Sincronización completada: ${resultado.nuevas} nuevas, ${resultado.actualizadas} actualizadas`,
			...resultado
		});
	} catch (error: any) {
		console.error('[API CC bodegas sync]', error);
		const mensaje = error?.code === 'ECONNREFUSED' || /ECONNREFUSED/.test(String(error?.message || ''))
			? 'No se pudo conectar a Exactus. Verifica que estés conectado al VPN.'
			: String(error?.message || error);
		return json({ success: false, error: mensaje }, { status: 502 });
	}
};