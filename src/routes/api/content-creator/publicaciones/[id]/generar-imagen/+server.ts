import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import {
	IAContentService,
	type ImageGenerationProgress
} from '$lib/features/content-creator/services/ia-content-service';
import path from 'path';
import sharp from 'sharp';
import { isBrandBeta, betaGeneration } from '$lib/features/content-creator/brand-beta/service';
import db from '$lib/config/db-config';
import { AssetService } from '$lib/features/content-creator/services/asset-service';
import { readUploadFile } from '$lib/server/uploads-storage';

type ProgressSender = (event: ImageGenerationProgress) => void;

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const wantsProgress = request.headers.get('accept')?.includes('text/event-stream') ?? false;
	if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });
	const body = await request.json();

	const generate = async (sendProgress?: ProgressSender) => {
		const userId = locals?.user?.id || 'admin_user_id';
		const publicacionId = parseInt(params.id);
		if (isNaN(publicacionId)) throw new Error('ID de publicación inválido');

		let {
			base64Image,
			imageUrl,
			brand,
			title,
			context,
			objective,
			format,
			index,
			customPrompt,
			selectedAssetIds,
			modo
		} = body;
		const isCrear = modo === 'crear';
		if (!isCrear && !base64Image && imageUrl) {
			try {
				const fileBuffer = await readUploadFile(imageUrl);
				const ext = path.extname(imageUrl).replace('.', '') || 'jpeg';
				base64Image = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${fileBuffer.toString('base64')}`;
			} catch (error: any) {
				if (error?.code === 'ENOENT') throw new Error(`Imagen no encontrada en disco: ${imageUrl}`);
				throw new Error('Error al leer la imagen del servidor');
			}
		}
		if (!isCrear && !base64Image) throw new Error('Se requiere base64Image, imageUrl o modo=crear');

		if (index !== undefined && (!Number.isInteger(index) || index < 0 || index > 99))
			throw new Error('Índice de slide inválido');
		let brandAssets: any[] = [];
		const publication = db
			.prepare('SELECT marca_id FROM publicaciones WHERE id=? AND user_id=? AND deleted_at IS NULL')
			.get(publicacionId, userId) as any;
		const brandId =
			publication?.marca_id ??
			(db.prepare('SELECT id FROM marcas WHERE nombre=?').get(brand || '') as any)?.id;
		if (Array.isArray(selectedAssetIds) && selectedAssetIds.length > 0) {
			if (
				isBrandBeta() &&
				(new Set(selectedAssetIds).size !== selectedAssetIds.length ||
					selectedAssetIds.some((id) => !Number.isInteger(id) || id <= 0))
			)
				throw new Error('Selección de assets inválida');
			const assets = selectedAssetIds.map((id) => ({
				id,
				asset: db
					.prepare('SELECT * FROM marca_assets WHERE id = ? AND deleted_at IS NULL')
					.get(id) as any
			}));
			if (isBrandBeta() && assets.some(({ asset }) => asset && asset.marca_id !== brandId))
				throw new Error('Los assets deben pertenecer a la marca de la publicación');
			const missing = assets.filter(({ asset }) => !asset).map(({ id }) => id);
			if (missing.length) throw new Error(`Assets no disponibles: ${missing.join(', ')}`);
			brandAssets = await Promise.all(
				assets.map(async ({ id, asset }) => {
					const base64 = await AssetService.readAsBase64(asset);
					if (!base64)
						throw new Error(
							`El asset seleccionado "${asset.nombre}" (ID ${id}) no está disponible en disco.`
						);
					if (isBrandBeta() && asset.mime_type === 'image/svg+xml') {
						const png = await sharp(Buffer.from(base64, 'base64')).png().toBuffer();
						return {
							id,
							marcaId: asset.marca_id,
							nombre: asset.nombre,
							tipo: asset.tipo,
							mimeType: 'image/png',
							base64: png.toString('base64')
						};
					}
					return {
						id,
						marcaId: asset.marca_id,
						nombre: asset.nombre,
						tipo: asset.tipo,
						mimeType: asset.mime_type,
						base64
					};
				})
			);
		}
		return IAContentService.generarImagenEditada(
			publicacionId,
			userId,
			isCrear ? null : base64Image,
			{ brand, title, context, objective, format },
			index,
			customPrompt,
			brandAssets,
			isCrear,
			sendProgress
		);
	};

	if (!wantsProgress) {
		try {
			const imageUrl = await generate();
			return json({ success: true, imageUrl, ...betaGeneration(imageUrl, locals.user!.id) });
		} catch (error: any) {
			console.error('[API generar-imagen] Error:', error);
			return json(
				{ success: false, error: error.message || 'Error interno al generar imagen' },
				{ status: 500 }
			);
		}
	}

	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (
				event:
					| ImageGenerationProgress
					| {
							phase: 'success';
							imageUrl: string;
							complianceReport?: unknown;
							evaluationStatus?: string;
							generationId?: number;
					  }
					| { phase: 'error'; error: string }
			) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
			try {
				send({ phase: 'generating', attempt: 1, maxAttempts: 3 });
				const imageUrl = await generate(send);
				send({ phase: 'success', imageUrl, ...betaGeneration(imageUrl, locals.user!.id) });
			} catch (error: any) {
				console.error('[API generar-imagen] Error:', error);
				send({ phase: 'error', error: error.message || 'Error interno al generar imagen' });
			} finally {
				controller.close();
			}
		}
	});
	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
