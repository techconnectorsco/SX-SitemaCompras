import {
	InvalidUploadPathError,
	getUploadFile,
	getUploadMimeType
} from '$lib/server/uploads-storage';
import type { RequestHandler } from './$types';
import { Readable } from 'node:stream';

async function serveUpload(
	request: Request,
	uploadPath: string,
	includeBody: boolean
): Promise<Response> {
	try {
		const file = await getUploadFile(uploadPath);
		const etag = `W/\"${file.stat.size}-${Math.trunc(file.stat.mtimeMs)}\"`;
		const headers = new Headers({
			'Cache-Control': 'public, max-age=3600',
			'Content-Length': String(file.stat.size),
			'Content-Type': getUploadMimeType(file.fileName),
			ETag: etag,
			'Last-Modified': file.stat.mtime.toUTCString(),
			'X-Content-Type-Options': 'nosniff'
		});

		if (request.headers.get('if-none-match') === etag) {
			return new Response(null, { status: 304, headers });
		}

		const body = includeBody ? (Readable.toWeb(file.stream()) as ReadableStream<Uint8Array>) : null;
		return new Response(body, { status: 200, headers });
	} catch (error: any) {
		if (error instanceof InvalidUploadPathError) {
			return new Response('Ruta inválida', { status: 400 });
		}
		if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
			return new Response('Archivo no encontrado', { status: 404 });
		}

		console.error('[GET /uploads] Error sirviendo archivo:', error);
		return new Response('Error interno al servir el archivo', { status: 500 });
	}
}

export const GET: RequestHandler = ({ request, params }) => serveUpload(request, params.path, true);
export const HEAD: RequestHandler = ({ request, params }) =>
	serveUpload(request, params.path, false);
