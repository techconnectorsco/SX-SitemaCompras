import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import db from '$lib/config/db-config';
import { isBrandBeta } from '$lib/features/content-creator/brand-beta/service';
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });
	if (!isBrandBeta()) return json({ generations: [] });
	const publication = db
		.prepare(
			'SELECT sharepoint_item_id,carousel_images FROM publicaciones WHERE id=? AND user_id=? AND deleted_at IS NULL'
		)
		.get(Number(params.id), locals.user.id) as
		| { sharepoint_item_id: string | null; carousel_images: string | null }
		| undefined;
	const images: string[] = [];
	if (publication?.sharepoint_item_id) images.push(publication.sharepoint_item_id);
	if (publication?.carousel_images) {
		try {
			images.push(
				...JSON.parse(publication.carousel_images)
					.map((slide: { imagePreview: string | null }) => slide.imagePreview)
					.filter(Boolean)
			);
		} catch {
			/* Older malformed carousel data has no recoverable image URLs. */
		}
	}
	const rows = db
		.prepare(
			`SELECT id,slide_index,image_url,report_json,request_json,evaluation_status FROM beta_brand_generations WHERE user_id=? AND (publication_id=? ${images.length ? `OR image_url IN (${images.map(() => '?').join(',')})` : ''}) ORDER BY id DESC`
		)
		.all(locals.user.id, Number(params.id), ...images) as any[];
	return json({
		generations: rows.map((row) => {
			const context = JSON.parse(row.request_json || '{}');
			const ruleLabels = Object.fromEntries([
				...(context.rules || []).map((rule: { id: string; instruction: string }) => [
					rule.id,
					rule.instruction
				]),
				...(context.assets || []).map((asset: { id: number; nombre: string }) => [
					'asset-' + asset.id,
					'Conservar identidad de ' + asset.nombre
				])
			]);
			return {
				...row,
				ruleLabels,
				report: row.report_json ? JSON.parse(row.report_json) : null,
				request_json: undefined,
				report_json: undefined
			};
		})
	});
};
