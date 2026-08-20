/**
 * ============================================================================
 * ENDPOINT: /api/ia/admin   (gestión de permisos de IA)
 * ============================================================================
 * GET  -> capacidades del usuario actual + (si gestiona) usuarios con permisos.
 * POST -> acciones: otorgar | revocar | bootstrap.
 *
 * Acceso al GET: puedeVerConsumo (para que un admin del cliente con ia_consumo
 * pueda abrir la pantalla y ver solo la sección de consumo).
 * Los datos de permisos (usuarios) solo se devuelven si puede gestionar.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/config/db-config';
import {
	listaModulos,
	otorgarModulo,
	revocarModulo,
	esIaAdmin,
	hayAlgunIaAdmin,
	puedeGestionarIA,
	puedeVerConsumo,
	IA_ADMIN_CAP,
	IA_CONSUMO_CAP
} from '$lib/server/ia';

interface UsuarioFila {
	id: string;
	email: string;
	display_name: string | null;
	role: string;
	account_status: string;
}

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) throw error(401, 'No autenticado.');

	const gestiona = puedeGestionarIA(db, user.id, user.role);
	const verConsumo = puedeVerConsumo(db, user.id, user.role);
	if (!gestiona && !verConsumo) throw error(403, 'No autorizado.');

	const base = {
		puedeGestionar: gestiona,
		puedeVerConsumo: verConsumo,
		soyIaAdmin: esIaAdmin(db, user.id),
		hayAlgunIaAdmin: hayAlgunIaAdmin(db),
		modulos: listaModulos(),
		capacidadAdmin: IA_ADMIN_CAP,
		capacidadConsumo: IA_CONSUMO_CAP
	};

	// Los datos de permisos por usuario solo para quien gestiona.
	if (!gestiona) {
		return json({ ...base, usuarios: [] });
	}

	const usuarios = db
		.prepare(
			`SELECT id, email, display_name, role, account_status
			 FROM users ORDER BY display_name, email`
		)
		.all() as UsuarioFila[];

	const permisos = db
		.prepare('SELECT user_id, modulo FROM ia_permisos_usuario')
		.all() as Array<{ user_id: string; modulo: string }>;

	const porUsuario = new Map<string, string[]>();
	for (const p of permisos) {
		const arr = porUsuario.get(p.user_id) ?? [];
		arr.push(p.modulo);
		porUsuario.set(p.user_id, arr);
	}

	const datosUsuarios = usuarios.map((u) => {
		const mods = porUsuario.get(u.id) ?? [];
		return {
			id: u.id,
			email: u.email,
			nombre: u.display_name ?? u.email,
			role: u.role,
			estado: u.account_status,
			modulos: mods.filter((m) => m !== IA_ADMIN_CAP && m !== IA_CONSUMO_CAP),
			esIaAdmin: mods.includes(IA_ADMIN_CAP),
			esIaConsumo: mods.includes(IA_CONSUMO_CAP)
		};
	});

	return json({ ...base, usuarios: datosUsuarios });
};

interface CuerpoAccion {
	accion: 'otorgar' | 'revocar' | 'bootstrap';
	userId?: string;
	modulo?: string;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) throw error(401, 'No autenticado.');

	const cuerpo = (await request.json()) as CuerpoAccion;

	// Bootstrap: el primer ADMIN se auto-otorga ia_admin, solo si no hay ninguno.
	if (cuerpo.accion === 'bootstrap') {
		if (user.role !== 'ADMIN') throw error(403, 'Solo un ADMIN puede inicializar.');
		if (hayAlgunIaAdmin(db)) throw error(409, 'Ya existe un administrador de IA.');
		otorgarModulo(db, user.id, IA_ADMIN_CAP, user.id);
		return json({ ok: true, mensaje: 'Ahora sos administrador de IA.' });
	}

	// Otorgar / revocar: solo quien gestiona.
	if (!puedeGestionarIA(db, user.id, user.role)) throw error(403, 'No autorizado.');
	if (!cuerpo.userId || !cuerpo.modulo) throw error(400, 'Faltan userId o modulo.');

	if (cuerpo.accion === 'otorgar') {
		otorgarModulo(db, cuerpo.userId, cuerpo.modulo, user.id);
		return json({ ok: true });
	}
	if (cuerpo.accion === 'revocar') {
		revocarModulo(db, cuerpo.userId, cuerpo.modulo);
		return json({ ok: true });
	}

	throw error(400, 'Acción inválida.');
};