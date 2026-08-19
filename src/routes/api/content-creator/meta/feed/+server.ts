import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FacebookService } from '$lib/features/content-creator/services/facebook-service';
import { InstagramService } from '$lib/features/content-creator/services/meta/instagram-service';

/**
 * GET /api/content-creator/meta/feed?cuentaId=N&red=fb|ig&limit=50
 *
 * Devuelve el feed de la cuenta/red indicada. Si no se especifica `cuentaId`,
 * cae al fallback .env (modo transitorio). `red` default = 'fb'.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}

	const cuentaIdParam = url.searchParams.get('cuentaId');
	const cuentaId = cuentaIdParam ? Number(cuentaIdParam) : undefined;
	const red = (url.searchParams.get('red') || 'fb').toLowerCase();
	const limitParam = url.searchParams.get('limit');

	let limit = 50;
	if (limitParam) {
		const parsed = parseInt(limitParam, 10);
		if (!isNaN(parsed) && parsed > 0) {
			limit = Math.min(parsed, 100);
		}
	}

	if (!cuentaId) {
		// Sin cuentaId → no hay fallback (FASE 4). Mensaje claro.
		return json(
			{
				success: false,
				error:
					'Selecciona una cuenta Meta conectada para ver el feed.'
			},
			{ status: 400 }
		);
	}

	// Ruta normal con cuentaId
	if (red === 'ig') {
		const result = await InstagramService.obtenerFeed(cuentaId, limit);
		return result.success
			? json({ success: true, posts: result.posts })
			: json(
					{ success: false, error: result.error || 'Error feed IG' },
					{ status: 502 }
				);
	}

	const result = await FacebookService.obtenerFeed(limit, cuentaId);
	if (!result.success || !result.posts) {
		return json(
			{ success: false, error: result.error || 'No se pudo obtener el feed' },
			{ status: 502 }
		);
	}

	const posts = result.posts.map((p: any) => {
		const likesCount =
			(p.likes?.summary?.total_count as number | undefined) ??
			(Array.isArray(p.likes?.data) ? p.likes.data.length : 0) ??
			0;
		const commentsCount =
			(p.comments?.summary?.total_count as number | undefined) ??
			(Array.isArray(p.comments?.data) ? p.comments.data.length : 0) ??
			0;
		const sharesCount = (p.shares?.count as number | undefined) ?? 0;

		return {
			id: p.id as string,
			message: (p.message as string | undefined) ?? '',
			created_time: p.created_time as string,
			permalink_url: p.permalink_url as string | undefined,
			full_picture: p.full_picture as string | undefined,
			likes: likesCount,
			comments: commentsCount,
			shares: sharesCount,
			engagement: likesCount + commentsCount + sharesCount
		};
	});

	return json({ success: true, posts });
};