import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user || locals.session?.user;
	if (!user) return json({ error: 'No autenticado' }, { status: 401 });

	try {
		const pref = db.prepare('SELECT columnas_ocultas FROM usuario_preferencias WHERE usuario_email = ?').get(user.email) as any;
		
		if (pref && pref.columnas_ocultas) {
			return json({ columnasOcultas: JSON.parse(pref.columnas_ocultas) });
		}
		// Valores por defecto si el usuario es nuevo
		return json({ columnasOcultas: ['proveedor', 'categoria', 'linea', 'marca', 'rotacion', 'activo'] });
	} catch (e) {
		return json({ error: 'Error al obtener preferencias' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user || locals.session?.user;
	if (!user) return json({ error: 'No autenticado' }, { status: 401 });

	try {
		const { columnasOcultas } = await request.json();

		db.prepare(`
			INSERT INTO usuario_preferencias (usuario_email, columnas_ocultas)
			VALUES (?, ?)
			ON CONFLICT(usuario_email) DO UPDATE SET columnas_ocultas = excluded.columnas_ocultas
		`).run(user.email, JSON.stringify(columnasOcultas));

		return json({ success: true });
	} catch (e) {
		return json({ error: 'Error al guardar preferencias' }, { status: 500 });
	}
};