import { createHash } from 'node:crypto';
import { access, copyFile, mkdir, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = path.resolve(process.cwd(), 'static', 'uploads');
const destinationRoot = path.resolve(
	process.env.UPLOADS_DIR?.trim() || path.join(process.cwd(), 'uploads')
);

if (sourceRoot === destinationRoot) {
	throw new Error('El directorio de origen y UPLOADS_DIR no pueden ser el mismo');
}

async function exists(filePath) {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function hashFile(filePath) {
	const contents = await readFile(filePath);
	return createHash('sha256').update(contents).digest('hex');
}

async function listFiles(root, relative = '') {
	const directory = path.join(root, relative);
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const child = path.join(relative, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await listFiles(root, child)));
		} else if (entry.isFile()) {
			files.push(child);
		}
	}

	return files;
}

if (!(await exists(sourceRoot))) {
	console.log(`No existe ${sourceRoot}; no hay archivos que migrar.`);
	process.exit(0);
}

await mkdir(destinationRoot, { recursive: true });
const files = await listFiles(sourceRoot);
let copied = 0;
let identical = 0;

for (const relativePath of files) {
	const source = path.join(sourceRoot, relativePath);
	const destination = path.join(destinationRoot, relativePath);
	await mkdir(path.dirname(destination), { recursive: true });

	if (await exists(destination)) {
		const [sourceStat, destinationStat] = await Promise.all([stat(source), stat(destination)]);
		const same =
			sourceStat.size === destinationStat.size &&
			(await hashFile(source)) === (await hashFile(destination));

		if (!same) {
			throw new Error(`Conflicto: ${relativePath} ya existe en destino con contenido diferente`);
		}
		identical += 1;
		continue;
	}

	await copyFile(source, destination);
	copied += 1;
}

for (const relativePath of files) {
	const source = path.join(sourceRoot, relativePath);
	const destination = path.join(destinationRoot, relativePath);
	if (!(await exists(destination)) || (await hashFile(source)) !== (await hashFile(destination))) {
		throw new Error(`Falló la verificación posterior para ${relativePath}`);
	}
}

console.log(
	`Migración verificada: ${copied} archivo(s) copiados, ${identical} ya eran idénticos. Destino: ${destinationRoot}`
);
