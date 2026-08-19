/**
 * @module meta-token-refresh
 * @description Cron diario que refresca los User Access Tokens de Meta
 * que están próximos a expirar (≤ TOKEN_REFRESH_MARGIN_MS = 7 días).
 *
 * Ejecución:
 *   - Llamado desde `hooks.server.ts` al iniciar el server (setTimeout periódico).
 *   - O desde un cron externo (PM2 ecosystem) vía endpoint HTTP.
 *
 * Lógica: para cada cuenta en `cuentas` con `meta_refresh_token` no nulo
 * y `token_expires_at - now ≤ 7 días`, llama `ensureFreshToken(cuentaId)`.
 * Registra cada intento (éxito o revocación) en `audit_logs`.
 */
import db from '$lib/config/db-config';
import { ensureFreshToken } from '$lib/features/content-creator/services/meta/meta-account-repo';

const REFRESH_MARGIN_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

let started = false;

interface AuditLogRow {
	id: string;
	user_id: string | null;
	action: string;
	details: string | null;
	created_at: number;
}

function logAudit(action: string, details: string) {
	const id = `meta-refresh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	try {
		db.prepare(
			`INSERT INTO audit_logs (id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)`
		).run(id, null, action, details, Math.floor(Date.now() / 1000));
	} catch (e) {
		console.error('[meta-token-refresh] audit log error:', e);
	}
}

export async function refreshAllAccountTokens(): Promise<{
	checked: number;
	refreshed: number;
 revoked: number;
	errors: number;
}> {
	const nowMs = Date.now();
	const cutoff = Math.floor((nowMs + REFRESH_MARGIN_MS) / 1000);

	const candidates = db
		.prepare(
			`SELECT id, nombre, token_expires_at, meta_refresh_token
			 FROM cuentas
			 WHERE deleted_at IS NULL
			   AND meta_refresh_token IS NOT NULL
			   AND token_expires_at IS NOT NULL
			   AND token_expires_at <= ?`
		)
		.all(cutoff) as {
		id: number;
		nombre: string;
		token_expires_at: number;
		meta_refresh_token: string;
	}[];

	let refreshed = 0;
	let revoked = 0;
	let errors = 0;

	for (const c of candidates) {
		try {
			const result = await ensureFreshToken(c.id);
			if (result) {
				refreshed++;
				logAudit(
					'META_TOKEN_REFRESH',
					`Cuenta ${c.id} (${c.nombre}) token refrescado. Vence ${new Date(
						(result.token_expires_at ?? 0) * 1000
					).toISOString()}`
				);
			} else {
				revoked++;
				logAudit(
					'META_TOKEN_REVOKE',
					`Cuenta ${c.id} (${c.nombre}) token revocado/inválido, marcada soft-deleted.`
				);
			}
		} catch (err: any) {
			errors++;
			logAudit(
				'META_TOKEN_REFRESH',
				`Cuenta ${c.id} (${c.nombre}) ERROR: ${err?.message || String(err)}`
			);
		}
	}

	console.log(
		`[meta-token-refresh] Revisadas: ${candidates.length}, refrescadas: ${refreshed}, revocadas: ${revoked}, errores: ${errors}`
	);
	return { checked: candidates.length, refreshed, revoked, errors };
}

/** Inicia el cron interno (24h). Idempotente — solo arranca una vez por proceso. */
export function startMetaTokenRefreshCron() {
	if (started) return;
	started = true;

	// Primera pasada a los 60s de arranque (no bloquea el boot).
	setTimeout(() => {
		refreshAllAccountTokens().catch((err) =>
			console.error('[meta-token-refresh] ejecución inicial falló:', err)
		);
	}, 60 * 1000);

	// Luego cada 24h.
	setInterval(() => {
		refreshAllAccountTokens().catch((err) =>
			console.error('[meta-token-refresh] ejecución periódica falló:', err)
		);
	}, RUN_INTERVAL_MS);

	console.log('[meta-token-refresh] Cron de refresh de tokens Meta iniciado (24h).');
}