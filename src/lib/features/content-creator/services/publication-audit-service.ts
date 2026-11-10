import db from '$lib/config/db-config';

export type PublicationAction =
	| 'CREATED'
	| 'EDITED'
	| 'APPROVED'
	| 'REJECTED'
	| 'PUBLISHED'
	| 'PUBLISH_ERROR'
	| 'DELETED';

/** Keep a snapshot so a later edit or soft deletion cannot rewrite the event. */
export function recordPublicationEvent(
	publicationId: number,
	action: PublicationAction,
	actorId: string | null,
	detail: string | null = null
): void {
	db.prepare(
		`
        INSERT INTO content_publication_events
            (publication_id, publication_owner_id, actor_id, action, title, brand_id, account_id, detail)
        SELECT id, user_id, ?, ?, titulo, marca_id, cuenta_id, ?
        FROM publicaciones WHERE id = ?
    `
	).run(actorId, action, detail, publicationId);
}
