import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';

interface Bodega {
	id: number;
	bodega_codigo: string;
	bodega_nombre: string;
	tipo: string;
	telefono: string;
	direccion: string;
	u_zona: string;
	tipo_establecimiento: string;
	cc_incluida: boolean;
}

function obtenerBodegas(): Bodega[] {
	const filas = db
		.prepare(
			`SELECT id, bodega_codigo, bodega_nombre, tipo, telefono, direccion, u_zona, tipo_establecimiento, cc_incluida
			 FROM bodegas
			 ORDER BY bodega_codigo`
		)
		.all() as any[];

	return filas.map((b) => ({
		id: b.id,
		bodega_codigo: b.bodega_codigo,
		bodega_nombre: b.bodega_nombre || '',
		tipo: b.tipo || '',
		telefono: b.telefono || '',
		direccion: b.direccion || '',
		u_zona: b.u_zona || '',
		tipo_establecimiento: b.tipo_establecimiento || '',
		cc_incluida: Number(b.cc_incluida) === 1
	}));
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}
	try {
		const bodegas = obtenerBodegas();
		const incluidas = bodegas.filter((b) => b.cc_incluida).length;
		return json({
			success: true,
			bodegas,
			resumen: {
				total_bodegas: bodegas.length,
				incluidas,
				no_incluidas: bodegas.length - incluidas
			}
		});
	} catch (error: any) {
		console.error('[API CC bodegas GET]', error);
		return json({ error: 'Error interno del servidor' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}
	try {
		const body = await request.json();

		// Actualización por lote (batch update)
		if (Array.isArray(body.items)) {
			const stmt = db.prepare('UPDATE bodegas SET cc_incluida = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?');
			const updateMany = db.transaction((items: { id: number; cc_incluida: boolean }[]) => {
				for (const item of items) {
					stmt.run(item.cc_incluida ? 1 : 0, item.id);
				}
			});
			updateMany(body.items);
			return json({
				success: true,
				actualizadas: body.items.length
			});
		}

		// Actualización individual
		const { id, cc_incluida } = body as { id: number; cc_incluida: boolean };

		const bodegaId = parseInt(String(id || '0'), 10);
		if (!bodegaId || bodegaId <= 0) {
			return json({ error: 'ID de bodega inválido' }, { status: 400 });
		}
		if (cc_incluida === undefined) {
			return json({ error: 'Campo "cc_incluida" requerido' }, { status: 400 });
		}

		const bodega = db
			.prepare('SELECT id, bodega_codigo, bodega_nombre FROM bodegas WHERE id = ?')
			.get(bodegaId) as any;
		if (!bodega) {
			return json({ error: `Bodega no encontrada: id=${bodegaId}` }, { status: 404 });
		}

		db.prepare(
			'UPDATE bodegas SET cc_incluida = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?'
		).run(cc_incluida ? 1 : 0, bodega.id);

		return json({
			success: true,
			id: bodega.id,
			bodega_codigo: bodega.bodega_codigo,
			cc_incluida,
			accion: cc_incluida ? 'INCLUIDA_CC' : 'NO_INCLUIDA_CC'
		});
	} catch (error: any) {
		console.error('[API CC bodegas PATCH]', error);
		return json({ error: 'Error interno del servidor' }, { status: 500 });
	}
};