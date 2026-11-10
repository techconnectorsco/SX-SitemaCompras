import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAdminContentAudit,
	getAdminContentReport,
	type AdminFilters
} from '$lib/features/content-creator/services/admin-report-service';
import type { PublicationAction } from '$lib/features/content-creator/services/publication-audit-service';

const actions: PublicationAction[] = [
	'CREATED',
	'EDITED',
	'APPROVED',
	'REJECTED',
	'PUBLISHED',
	'PUBLISH_ERROR',
	'DELETED'
];

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'No autenticado' }, { status: 401 });
	if (String(locals.user.role).toUpperCase() !== 'ADMIN')
		return json({ error: 'Acceso denegado' }, { status: 403 });

	const now = Math.floor(Date.now() / 1000);
	const start = new Date();
	start.setDate(1);
	start.setHours(0, 0, 0, 0);
	const from = url.searchParams.has('from')
		? Number(url.searchParams.get('from'))
		: Math.floor(start.getTime() / 1000);
	const to = url.searchParams.has('to') ? Number(url.searchParams.get('to')) : now;
	const brandValue = url.searchParams.get('brandId');
	const brandId = brandValue ? Number(brandValue) : undefined;
	const pageValue = Number(url.searchParams.get('page') || 1);
	const actionValue = url.searchParams.get('action');
	if (
		!Number.isSafeInteger(from) ||
		!Number.isSafeInteger(to) ||
		from < 0 ||
		to < from ||
		(brandId !== undefined && (!Number.isSafeInteger(brandId) || brandId <= 0)) ||
		!Number.isSafeInteger(pageValue) ||
		pageValue < 1 ||
		(actionValue && !actions.includes(actionValue as PublicationAction))
	) {
		return json({ error: 'Filtros inválidos' }, { status: 400 });
	}
	const filters: AdminFilters = {
		from,
		to,
		page: pageValue,
		userId: url.searchParams.get('userId') || undefined,
		brandId,
		action: actionValue ? (actionValue as PublicationAction) : undefined
	};
	try {
		return json({ report: getAdminContentReport(filters), audit: getAdminContentAudit(filters) });
	} catch (error) {
		console.error('[admin/content-creator]', error);
		return json({ error: 'No se pudo cargar el panel' }, { status: 500 });
	}
};
