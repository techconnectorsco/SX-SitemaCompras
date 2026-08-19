import { env } from '$env/dynamic/private';
import { createReadStream } from 'node:fs';
import { lstat, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PUBLIC_PREFIX = '/uploads/';

export class InvalidUploadPathError extends Error {
	constructor(message = 'Ruta de upload inválida') {
		super(message);
		this.name = 'InvalidUploadPathError';
	}
}

export function getUploadsRoot(): string {
	return path.resolve(env.UPLOADS_DIR?.trim() || path.join(process.cwd(), 'uploads'));
}

function getRelativeUploadPath(input: string): string {
	let relativePath = input.startsWith(PUBLIC_PREFIX) ? input.slice(PUBLIC_PREFIX.length) : input;
	relativePath = relativePath.replace(/^\/+/, '');

	if (!relativePath || relativePath.includes('\0') || relativePath.includes('\\')) {
		throw new InvalidUploadPathError();
	}

	return relativePath;
}

function assertInsideRoot(root: string, candidate: string): void {
	const relative = path.relative(root, candidate);
	if (
		!relative ||
		relative.startsWith(`..${path.sep}`) ||
		relative === '..' ||
		path.isAbsolute(relative)
	) {
		throw new InvalidUploadPathError();
	}
}

export function resolveUploadPath(input: string): string {
	const root = getUploadsRoot();
	const candidate = path.resolve(root, getRelativeUploadPath(input));
	assertInsideRoot(root, candidate);
	return candidate;
}

async function ensureUploadsRoot(): Promise<string> {
	const root = getUploadsRoot();
	await mkdir(root, { recursive: true });
	return realpath(root);
}

async function assertRealParentInsideRoot(filePath: string): Promise<void> {
	const realRoot = await ensureUploadsRoot();
	const configuredRoot = getUploadsRoot();
	const relativeParent = path.relative(configuredRoot, path.dirname(filePath));
	let currentDirectory = configuredRoot;

	for (const segment of relativeParent.split(path.sep).filter(Boolean)) {
		currentDirectory = path.join(currentDirectory, segment);
		try {
			const entry = await lstat(currentDirectory);
			if (entry.isSymbolicLink() || !entry.isDirectory()) {
				throw new InvalidUploadPathError('La ruta de upload contiene un enlace o archivo inválido');
			}
		} catch (error: any) {
			if (error?.code !== 'ENOENT') throw error;
			await mkdir(currentDirectory);
		}
	}

	const realParent = await realpath(currentDirectory);
	assertInsideRoot(realRoot, path.join(realParent, path.basename(filePath)));
}

export async function writeUploadFile(
	subPath: string,
	fileName: string,
	data: Uint8Array
): Promise<string> {
	const relativePath = path.posix.join(subPath, fileName);
	const filePath = resolveUploadPath(relativePath);
	await assertRealParentInsideRoot(filePath);
	await writeFile(filePath, data);
	return toPublicUploadUrl(relativePath);
}

export async function resolveExistingUploadPath(input: string): Promise<string> {
	const root = await ensureUploadsRoot();
	const candidate = resolveUploadPath(input);
	const realCandidate = await realpath(candidate);
	assertInsideRoot(root, realCandidate);
	return realCandidate;
}

export async function readUploadFile(input: string): Promise<Buffer> {
	return readFile(await resolveExistingUploadPath(input));
}

export async function deleteUploadFile(input: string): Promise<void> {
	const filePath = resolveUploadPath(input);

	try {
		const existingPath = await resolveExistingUploadPath(input);
		await rm(existingPath, { force: true });
	} catch (error: any) {
		if (error?.code !== 'ENOENT') throw error;
		await rm(filePath, { force: true });
	}
}

export function toPublicUploadUrl(relativePath: string): string {
	const normalized = getRelativeUploadPath(relativePath).split(path.sep).join('/');
	return `${PUBLIC_PREFIX}${normalized}`;
}

export async function getUploadFile(input: string) {
	const filePath = await resolveExistingUploadPath(input);
	const fileStat = await stat(filePath);

	if (!fileStat.isFile()) {
		const error = new Error('El upload solicitado no es un archivo') as NodeJS.ErrnoException;
		error.code = 'ENOENT';
		throw error;
	}

	return {
		filePath,
		fileName: path.basename(filePath),
		stat: fileStat,
		stream: () => createReadStream(filePath)
	};
}

export function getUploadMimeType(fileName: string): string {
	const mimeTypes: Record<string, string> = {
		'.avif': 'image/avif',
		'.gif': 'image/gif',
		'.jpeg': 'image/jpeg',
		'.jpg': 'image/jpeg',
		'.md': 'text/markdown; charset=utf-8',
		'.pdf': 'application/pdf',
		'.png': 'image/png',
		'.svg': 'image/svg+xml',
		'.txt': 'text/plain; charset=utf-8',
		'.webp': 'image/webp'
	};

	return mimeTypes[path.extname(fileName).toLowerCase()] || 'application/octet-stream';
}
