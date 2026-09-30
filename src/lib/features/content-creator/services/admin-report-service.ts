import db from '$lib/config/db-config';
import type { PublicationAction } from './publication-audit-service';

export interface AdminFilters {
	from: number;
	to: number;
	userId?: string;
	brandId?: number;
	action?: PublicationAction;
	page: number;
}

function dimensions(
	alias: string,
	filters: AdminFilters,
	userColumn = 'user_id',
	brandColumn = 'marca_id'
) {
	const clauses: string[] = [];
	const params: Array<string | number> = [];
	if (filters.userId) {
		clauses.push(`${alias}.${userColumn} = ?`);
		params.push(filters.userId);
	}
	if (filters.brandId) {
		clauses.push(`${alias}.${brandColumn} = ?`);
		params.push(filters.brandId);
	}
	return { clauses, params };
}

export function getAdminContentReport(filters: AdminFilters) {
	const ai = dimensions('l', filters, 'user_id', 'marca_id');
	const aiWhere = ['l.created_at >= ?', 'l.created_at <= ?', ...ai.clauses].join(' AND ');
	const aiParams = [filters.from, filters.to, ...ai.params];
	const usage = db
		.prepare(
			`
        SELECT COALESCE(SUM(tokens_totales), 0) tokens,
            COUNT(*) calls,
            COALESCE(SUM(CASE WHEN billing_status != 'legacy_approximate' THEN costo_estimado ELSE 0 END), 0) billedCost,
            COALESCE(SUM(CASE WHEN billing_status != 'legacy_approximate' THEN costo_proveedor ELSE 0 END), 0) providerCost,
            COALESCE(SUM(CASE WHEN billing_status = 'legacy_approximate' THEN costo_estimado ELSE 0 END), 0) legacyCost
        FROM ai_token_logs l WHERE ${aiWhere}
    `
		)
		.get(...aiParams);
	const trend = db
		.prepare(
			`
        SELECT date(l.created_at, 'unixepoch') day, SUM(l.tokens_totales) tokens,
            COUNT(*) calls, SUM(CASE WHEN l.billing_status != 'legacy_approximate' THEN l.costo_estimado ELSE 0 END) cost
        FROM ai_token_logs l WHERE ${aiWhere}
        GROUP BY day ORDER BY day
    `
		)
		.all(...aiParams);
	const breakdown = db
		.prepare(
			`
        SELECT l.user_id userId, COALESCE(u.display_name, u.email, l.user_id) userName,
            l.marca_id brandId, COALESCE(m.nombre, 'Sin marca') brandName,
            l.tarea task, l.modelo_ia model, COUNT(*) calls, SUM(l.tokens_totales) tokens,
            SUM(CASE WHEN l.billing_status != 'legacy_approximate' THEN l.costo_estimado ELSE 0 END) cost,
            SUM(CASE WHEN l.billing_status = 'legacy_approximate' THEN l.costo_estimado ELSE 0 END) legacyCost
        FROM ai_token_logs l
        LEFT JOIN users u ON u.id = l.user_id
        LEFT JOIN marcas m ON m.id = l.marca_id
        WHERE ${aiWhere}
        GROUP BY l.user_id, l.marca_id, l.tarea, l.modelo_ia
        ORDER BY tokens DESC LIMIT 100
    `
		)
		.all(...aiParams);

	const post = dimensions('p', filters);
	const postWhere = ['p.deleted_at IS NULL', ...post.clauses].join(' AND ');
	const states = db
		.prepare(
			`
        SELECT p.estado status, COUNT(*) count FROM publicaciones p
        WHERE ${postWhere} GROUP BY p.estado
    `
		)
		.all(...post.params);
	const published = db
		.prepare(
			`
        SELECT COUNT(*) count FROM publicaciones p
        WHERE ${postWhere} AND p.published_at >= ? AND p.published_at <= ?
    `
		)
		.get(...post.params, filters.from, filters.to) as { count: number };
	const publicationAlerts = db
		.prepare(
			`
        SELECT p.id, p.titulo title, p.user_id userId,
            COALESCE(u.display_name, u.email, p.user_id) userName,
            p.marca_id brandId, m.nombre brandName, p.api_error_log error,
            p.updated_at occurredAt, c.nombre accountName
        FROM publicaciones p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN marcas m ON m.id = p.marca_id
        LEFT JOIN cuentas c ON c.id = p.cuenta_id
        WHERE ${postWhere} AND p.estado = 'Error API'
        ORDER BY p.updated_at DESC LIMIT 50
    `
		)
		.all(...post.params);
	const publicationAlertCount = (
		db
			.prepare(
				`
		SELECT COUNT(*) count FROM publicaciones p WHERE ${postWhere} AND p.estado = 'Error API'
	`
			)
			.get(...post.params) as { count: number }
	).count;

	const now = Math.floor(Date.now() / 1000);
	const accountAlerts = db
		.prepare(
			`
        SELECT id, nombre name, token_expires_at expiresAt,
            CASE WHEN meta_access_token IS NULL OR meta_access_token = '' OR token_expires_at IS NULL OR token_expires_at <= ?
                THEN 'invalid' ELSE 'expiring' END status
        FROM cuentas WHERE deleted_at IS NULL
          AND (meta_access_token IS NULL OR meta_access_token = '' OR token_expires_at IS NULL OR token_expires_at <= ?)
        ORDER BY token_expires_at ASC LIMIT 50
    `
		)
		.all(now, now + 7 * 86400) as Array<{
		id: number;
		name: string;
		expiresAt: number | null;
		status: string;
	}>;
	const accountAlertCount = (
		db
			.prepare(
				`
		SELECT COUNT(*) count FROM cuentas
		WHERE deleted_at IS NULL AND
		(meta_access_token IS NULL OR meta_access_token = '' OR token_expires_at IS NULL OR token_expires_at <= ?)
	`
			)
			.get(now + 7 * 86400) as { count: number }
	).count;

	const users = db
		.prepare(
			`
        SELECT DISTINCT u.id, COALESCE(u.display_name, u.email, u.id) name FROM users u
        WHERE EXISTS (SELECT 1 FROM publicaciones p WHERE p.user_id = u.id)
           OR EXISTS (SELECT 1 FROM ai_token_logs l WHERE l.user_id = u.id)
        ORDER BY name
    `
		)
		.all();
	const brands = db.prepare('SELECT id, nombre name FROM marcas ORDER BY nombre').all();
	return {
		usage,
		trend,
		breakdown,
		states,
		published: published.count,
		publicationAlerts,
		publicationAlertCount,
		accountAlerts,
		accountAlertCount,
		users,
		brands
	};
}

export function getAdminContentAudit(filters: AdminFilters) {
	const clauses = ['e.created_at >= ?', 'e.created_at <= ?'];
	const params: Array<string | number> = [filters.from, filters.to];
	if (filters.userId) {
		clauses.push('e.publication_owner_id = ?');
		params.push(filters.userId);
	}
	if (filters.brandId) {
		clauses.push('e.brand_id = ?');
		params.push(filters.brandId);
	}
	if (filters.action) {
		clauses.push('e.action = ?');
		params.push(filters.action);
	}
	const source = `
        WITH e AS (
            SELECT id, publication_id, publication_owner_id, actor_id, action, title, brand_id, account_id,
                detail, created_at, 0 historical FROM content_publication_events
            UNION ALL
            SELECT -p.id id, p.id publication_id, p.user_id publication_owner_id, p.user_id actor_id,
                'CREATED' action, p.titulo title, p.marca_id brand_id, p.cuenta_id account_id,
                NULL detail, p.created_at created_at, 1 historical
            FROM publicaciones p
            WHERE NOT EXISTS (
                SELECT 1 FROM content_publication_events ev
                WHERE ev.publication_id = p.id AND ev.action = 'CREATED'
            )
        )
    `;
	const where = clauses.join(' AND ');
	const total = db
		.prepare(`${source} SELECT COUNT(*) count FROM e WHERE ${where}`)
		.get(...params) as { count: number };
	const rows = db
		.prepare(
			`${source}
        SELECT e.*, COALESCE(u.display_name, u.email, CASE WHEN e.actor_id IS NULL THEN 'Sistema' ELSE e.actor_id END) actorName,
            COALESCE(owner.display_name, owner.email, e.publication_owner_id) ownerName,
            COALESCE(m.nombre, 'Sin marca') brandName, c.nombre accountName
        FROM e
        LEFT JOIN users u ON u.id = e.actor_id
        LEFT JOIN users owner ON owner.id = e.publication_owner_id
        LEFT JOIN marcas m ON m.id = e.brand_id
        LEFT JOIN cuentas c ON c.id = e.account_id
        WHERE ${where} ORDER BY e.created_at DESC, e.id DESC LIMIT 25 OFFSET ?
    `
		)
		.all(...params, (filters.page - 1) * 25);
	return { total: total.count, rows, page: filters.page, pageSize: 25 };
}
