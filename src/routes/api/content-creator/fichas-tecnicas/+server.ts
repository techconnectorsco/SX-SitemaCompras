import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FichasTecnicasService } from '$lib/features/content-creator/services/fichas-tecnicas-service';
import path from 'path';
import { writeUploadFile } from '$lib/server/uploads-storage';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

		const marcaIdParam = url.searchParams.get('marcaId');
		const marcaId = marcaIdParam ? parseInt(marcaIdParam, 10) : undefined;

		const fichas = FichasTecnicasService.getFichas(locals.user.id, marcaId);
		return json({ success: true, fichas });
	} catch (err: any) {
		console.error('[API GET fichas-tecnicas] Error:', err);
		return json({ error: err.message || 'Error al obtener fichas técnicas' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

		const formData = await request.formData();
		const file = formData.get('file');
		const marcaIdStr = formData.get('marcaId') as string | null;
		const nombreProducto = (formData.get('nombreProducto') as string | null) || '';
		const descripcion = (formData.get('descripcion') as string | null) || '';

		if (!(file instanceof File)) {
			return json(
				{ error: 'Debes proporcionar un archivo válido en el campo "file"' },
				{ status: 400 }
			);
		}

		if (!marcaIdStr || isNaN(parseInt(marcaIdStr, 10))) {
			return json({ error: 'Marca ID es requerido y debe ser un número' }, { status: 400 });
		}

		if (!nombreProducto.trim()) {
			return json({ error: 'El nombre del producto es obligatorio' }, { status: 400 });
		}

		const marcaId = parseInt(marcaIdStr, 10);

		// Validar mime types permitidos
		const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
		const mimeType = file.type || 'application/octet-stream';
		if (!allowedMimes.includes(mimeType)) {
			return json(
				{ error: `Tipo de archivo no soportado: ${mimeType}. Soportados: PDF, PNG, JPG, WEBP` },
				{ status: 400 }
			);
		}

		// Nombre de archivo sanitizado
		const ext = path.extname(file.name) || (mimeType === 'application/pdf' ? '.pdf' : '.jpg');
		const safeBase =
			path
				.basename(file.name, ext)
				.replace(/[^a-zA-Z0-9-_]/g, '_')
				.slice(0, 40) || 'ficha';
		const fileName = `${Date.now()}_${safeBase}${ext}`;
		const buffer = Buffer.from(await file.arrayBuffer());
		const relativeFilePath = await writeUploadFile('content-creator/fichas', fileName, buffer);

		// Guardar y procesar con Gemini a través del servicio
		const nuevaFicha = await FichasTecnicasService.crearFicha({
			userId: locals.user.id,
			marcaId,
			nombreProducto: nombreProducto.trim(),
			descripcion: descripcion.trim(),
			filePath: relativeFilePath,
			fileName: file.name,
			mimeType,
			sizeBytes: file.size
		});

		return json({ success: true, ficha: nuevaFicha });
	} catch (err: any) {
		console.error('[API POST fichas-tecnicas] Error:', err);
		return json(
			{ error: err.message || 'Error al procesar y guardar la ficha técnica' },
			{ status: 500 }
		);
	}
};
