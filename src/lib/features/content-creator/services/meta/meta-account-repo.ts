/**
 * @module MetaAccountRepo
 * @description Persistencia y lectura de cuentas Meta (Facebook Page + Instagram Business)
 * en la tabla `cuentas` de SQLite. Soporta UPSERT por `meta_facebook_page_id`,
 * refresh automático de tokens (ensureFreshToken) y validación de expiración.
 *
 * Tabla relevante (data/app.db):
 *   cuentas(
 *     id INTEGER PK AUTOINCREMENT,
 *     nombre TEXT UNIQUE NOT NULL,
 *     meta_facebook_page_id TEXT,
 *     meta_instagram_id TEXT,
 *     meta_access_token TEXT,
 *     meta_refresh_token TEXT,
 *     token_expires_at INTEGER,
 *     meta_business_id TEXT,
 *     meta_ad_account_id TEXT,
 *     pais TEXT,
 *     timezone TEXT DEFAULT 'America/Costa_Rica',
 *     created_at, updated_at, deleted_at
 *   )
 *   cuenta_redes(cuenta_id, red_social_id)  -- N:M con redes_sociales
 *   redes_sociales(id, nombre)              -- catálogo: 1=Facebook, 2=Instagram, 4=SharePoint
 */
import db from '$lib/config/db-config';
import { refreshToken } from './meta-oauth-service';

/** IDs fijos del catálogo redes_sociales (ver FASE 0/seed). */
export const RED_SOCIAL_ID = {
	FACEBOOK: 1,
	INSTAGRAM: 2,
	SHAREPOINT: 4
} as const;

/** Margen de seguridad para refrescar el token antes de que expire. */
export const TOKEN_REFRESH_MARGIN_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface MetaAccount {
	id: number;
	nombre: string;
	meta_facebook_page_id: string | null;
	meta_instagram_id: string | null;
	meta_access_token: string | null;
	meta_refresh_token: string | null;
	token_expires_at: number | null;
	meta_business_id: string | null;
	meta_ad_account_id: string | null;
	pais: string | null;
	timezone: string | null;
	created_at: number;
	updated_at: number | null;
	deleted_at: number | null;
}

export interface MetaAccountWithStatus extends MetaAccount {
	/** True si la cuenta tiene token y no ha expirado. */
	token_valid: boolean;
	/** Días hasta la expiración (negativos si ya expiró). */
	days_until_expiration: number | null;
	/** Redes sociales habilitadas para esta cuenta (IDs). */
	redes_activas: number[];
}

/** Obtiene una cuenta por id (no eliminada). */
export function getAccountById(cuentaId: number): MetaAccount | null {
	const row = db
		.prepare(
			`SELECT * FROM cuentas WHERE id = ? AND deleted_at IS NULL`
		)
		.get(cuentaId) as MetaAccount | undefined;
	return row ?? null;
}

/** Lista todas las cuentas activas con estado de token y redes asociadas. */
export function listAccounts(): MetaAccountWithStatus[] {
	const rows = db
		.prepare(
			`SELECT * FROM cuentas WHERE deleted_at IS NULL ORDER BY created_at ASC`
		)
		.all() as MetaAccount[];

	const redesStmt = db.prepare(
		`SELECT red_social_id FROM cuenta_redes WHERE cuenta_id = ?`
	);

	const nowMs = Date.now();
	return rows.map((row) => {
		const redes = (redesStmt.all(row.id) as { red_social_id: number }[]).map(
			(r) => r.red_social_id
		);
		// token_expires_at está en segundos (epoch), comparar en ms.
		const expiresAtMs = row.token_expires_at ? row.token_expires_at * 1000 : null;
		const token_valid =
			!!row.meta_access_token &&
			expiresAtMs != null &&
			expiresAtMs > nowMs;
		const days_until_expiration = expiresAtMs
			? Math.floor((expiresAtMs - nowMs) / (24 * 60 * 60 * 1000))
			: null;
		return { ...row, token_valid, days_until_expiration, redes_activas: redes };
	});
}

/** Busca una cuenta por `meta_facebook_page_id` (sin importar soft-delete). */
export function findByPageId(pageId: string): MetaAccount | null {
	const row = db
		.prepare(
			`SELECT * FROM cuentas WHERE meta_facebook_page_id = ? ORDER BY deleted_at IS NULL DESC, id ASC LIMIT 1`
		)
		.get(pageId) as MetaAccount | undefined;
	return row ?? null;
}

/**
 * UPSERT de una cuenta Meta por `meta_facebook_page_id`.
 * Si la cuenta ya existe (aunque esté soft-deleted), la reactiva y actualiza.
 * Vincula las redes indicadas en `redes` (TRUE=habilitar; FALSE=deshabilitar).
 *
 * @returns la cuenta persistida (con id asignado).
 */
export interface UpsertAccountInput {
	meta_facebook_page_id: string;
	nombre: string;
	meta_access_token: string;
	meta_refresh_token?: string | null;
	token_expires_at?: number | null;
	meta_instagram_id?: string | null;
	meta_business_id?: string | null;
	meta_ad_account_id?: string | null;
	pais?: string | null;
	timezone?: string | null;
	/** Redes a habilitar; redes no listadas se mantienen como están. */
	redes?: { facebook?: boolean; instagram?: boolean };
}

export function upsertAccount(input: UpsertAccountInput): MetaAccount {
	const now = Math.floor(Date.now() / 1000);
	const existing = findByPageId(input.meta_facebook_page_id);

	if (existing) {
		// UPDATE (y reactivar si estaba soft-deleted)
		db.prepare(
			`UPDATE cuentas SET
				nombre = ?,
				meta_access_token = ?,
				meta_refresh_token = COALESCE(?, meta_refresh_token),
				token_expires_at = COALESCE(?, token_expires_at),
				meta_instagram_id = COALESCE(?, meta_instagram_id),
				meta_business_id = COALESCE(?, meta_business_id),
				meta_ad_account_id = COALESCE(?, meta_ad_account_id),
				pais = COALESCE(?, pais),
				timezone = COALESCE(?, timezone),
				updated_at = ?,
				deleted_at = NULL
			WHERE id = ?`
		).run(
			input.nombre,
			input.meta_access_token,
			input.meta_refresh_token ?? null,
			input.token_expires_at ?? null,
			input.meta_instagram_id ?? null,
			input.meta_business_id ?? null,
			input.meta_ad_account_id ?? null,
			input.pais ?? null,
			input.timezone ?? null,
			now,
			existing.id
		);
		applyRedes(existing.id, input.redes);
		return getAccountById(existing.id)!;
	}

	// INSERT nuevo
	const stmt = db.prepare(
		`INSERT INTO cuentas (
			nombre, meta_facebook_page_id, meta_instagram_id,
			meta_access_token, meta_refresh_token, token_expires_at,
			meta_business_id, meta_ad_account_id, pais, timezone,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	);
	const info = stmt.run(
		input.nombre,
		input.meta_facebook_page_id,
		input.meta_instagram_id ?? null,
		input.meta_access_token,
		input.meta_refresh_token ?? null,
		input.token_expires_at ?? null,
		input.meta_business_id ?? null,
		input.meta_ad_account_id ?? null,
		input.pais ?? null,
		input.timezone ?? 'America/Costa_Rica',
		now,
		now
	);
	const newId = Number(info.lastInsertRowid);
	applyRedes(newId, input.redes);
	return getAccountById(newId)!;
}

/** Vincula/desvincula redes_sociales a una cuenta (N:M `cuenta_redes`). */
function applyRedes(
	cuentaId: number,
	redes?: UpsertAccountInput['redes']
): void {
	if (!redes) return;
	const link = (redId: number) =>
		db
			.prepare(
				`INSERT OR IGNORE INTO cuenta_redes (cuenta_id, red_social_id) VALUES (?, ?)`
			)
			.run(cuentaId, redId);
	if (redes.facebook) link(RED_SOCIAL_ID.FACEBOOK);
	if (redes.instagram) link(RED_SOCIAL_ID.INSTAGRAM);
}

/**
 * Indica si el token de la cuenta está próximo a expirar o ya expiró.
 * True si faltan <= TOKEN_REFRESH_MARGIN_MS para expires_at.
 */
export function tokenNeedsRefresh(cuenta: MetaAccount): boolean {
	if (!cuenta.token_expires_at || !cuenta.meta_refresh_token) return false;
	return cuenta.token_expires_at * 1000 - Date.now() <= TOKEN_REFRESH_MARGIN_MS;
}

/**
 * Asegura que la cuenta tenga un token fresco.
 * Si está dentro del margen de expiración y hay refresh_token, lo refresca y persiste.
 * Si el refresh falla por revocación, marca la cuenta como soft-deleted.
 *
 * @returns la cuenta con token actualizado, o null si el refresh falló y se revocó.
 */
export async function ensureFreshToken(
	cuentaId: number
): Promise<MetaAccount | null> {
	const cuenta = getAccountById(cuentaId);
	if (!cuenta) return null;
	if (!tokenNeedsRefresh(cuenta)) return cuenta;

	try {
		const refreshed = await refreshToken(
			cuenta.meta_refresh_token!
		);
		const expiresAt = Math.floor(
			(Date.now() + refreshed.expires_in * 1000) / 1000
		);
		const now = Math.floor(Date.now() / 1000);
		db.prepare(
			`UPDATE cuentas SET
				meta_access_token = ?,
				meta_refresh_token = COALESCE(?, meta_refresh_token),
				token_expires_at = ?,
				updated_at = ?
			WHERE id = ?`
		).run(
			refreshed.access_token,
			refreshed.refresh_token ?? null,
			expiresAt,
			now,
			cuentaId
		);
		return getAccountById(cuentaId)!;
	} catch (err) {
		console.error(
			`[MetaAccountRepo] Error refrescando token de cuenta ${cuentaId}:`,
			err
		);
		// Si el error indica revocación, marcar como soft-deleted
		const msg = err instanceof Error ? err.message : String(err);
		if (/revoked|invalid|expired/i.test(msg)) {
			const now = Math.floor(Date.now() / 1000);
			db.prepare(
				`UPDATE cuentas SET updated_at = ?, deleted_at = ? WHERE id = ?`
			).run(now, now, cuentaId);
			console.warn(
				`[MetaAccountRepo] Cuenta ${cuentaId} marcada como revocada (soft-deleted).`
			);
		}
		return null;
	}
}

/** Desconecta (revoca) una cuenta: limpia tokens, mantiene la fila con soft-delete. */
export function disconnectAccount(cuentaId: number): void {
	const now = Math.floor(Date.now() / 1000);
	db.prepare(
		`UPDATE cuentas SET
			meta_access_token = NULL,
			meta_refresh_token = NULL,
			token_expires_at = NULL,
			meta_instagram_id = NULL,
			updated_at = ?,
			deleted_at = ?
		WHERE id = ?`
	).run(now, now, cuentaId);
	// Limpiar vínculos de redes (cuenta_redes) — el catálogo redes_sociales se conserva
	db.prepare(`DELETE FROM cuenta_redes WHERE cuenta_id = ?`).run(cuentaId);
}