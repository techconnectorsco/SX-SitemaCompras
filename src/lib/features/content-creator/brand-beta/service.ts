import db from '$lib/config/db-config';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';
import { readUploadFile, writeUploadFile } from '$lib/server/uploads-storage';
import { splitBrandManualPdf } from '../services/brand-manual-pdf';
import { registrarUsoGemini } from '../services/gemini-usage-service';
import {
	contextSchema,
	contextJsonSchema,
	reportJsonSchema,
	reportSchema,
	contextMarkdown,
	mergeContexts,
	categories,
	type BrandManualContext
} from './schema';
export const BRAND_MODEL = 'gemini-3.8-flash';

/** El flujo validado ya forma parte del creador de contenido habitual. */
export function isBrandBeta(): boolean {
	return true;
}
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY || '', httpOptions: { timeout: 180_000 } });
export async function analyzeBetaManual(
	manual: any,
	bytes: Buffer,
	userId: string
): Promise<string> {
	const startedAt = Date.now();
	const partials: BrandManualContext[] = [];
	const analyze = async (parts: any[], first: number, last: number) => {
		const prompt = `Extrae reglas verificables del manual ${manual.file_name}. Páginas absolutas ${first}-${last}; la primera página adjunta es ${first}. Lee también documentos escaneados visualmente. Devuelve JSON: {version:1,rules:[{id,category,instruction,source,page,evidence,conditions,mandatory,origin,conflictsWith:[]}],unspecified:[],approvedPages:[{page,reason,unambiguous}]}. Categorías: ${categories.join(', ')}. Identificadores únicos prefijados m${manual.id}-p${first}-. source es el nombre del archivo. page debe ser absoluta o null para texto sin páginas. evidence cita evidencia visible. origin explicit o inferred; no conviertas inferencias en obligaciones. Conserva contradicciones con IDs en conflictsWith, sin resolverlas arbitrariamente; marca diferencias condicionadas. Ausencias en unspecified; no inventes valores. approvedPages solo ejemplos explícitamente aprobados y sin usos prohibidos en la misma página, hasta tres.`;
		const response = await ai.models.generateContent({
			model: BRAND_MODEL,
			contents: [...parts, { text: prompt }],
			config: { responseMimeType: 'application/json', responseJsonSchema: contextJsonSchema }
		});
		const text = response.text || '';
		registrarUsoGemini({
			userId,
			marcaId: manual.marca_id,
			model: BRAND_MODEL,
			task: 'Extracción de contexto de marca beta',
			prompt,
			usageMetadata: response.usageMetadata
		});
		const parsed = contextSchema.parse(JSON.parse(text));
		if (
			parsed.rules.some((r) => r.page !== null && (r.page < first || r.page > last)) ||
			parsed.approvedPages.some((p) => p.page < first || p.page > last)
		)
			throw new Error('Numeración de páginas inválida');
		partials.push(parsed);
	};
	if (manual.mime_type === 'application/pdf') {
		for await (const part of splitBrandManualPdf(bytes)) {
			let name: string | undefined;
			try {
				const uploaded = await ai.files.upload({
					file: new Blob([Uint8Array.from(part.bytes)], { type: 'application/pdf' }),
					config: { mimeType: 'application/pdf', displayName: manual.file_name }
				});
				name = uploaded.name;
				if (!name) throw new Error('PDF sin identificador del proveedor');
				let ready = uploaded;
				const deadline = Date.now() + 300_000;
				while (ready.state !== 'ACTIVE') {
					if (ready.state === 'FAILED' || Date.now() > deadline)
						throw new Error('No se pudo procesar el PDF');
					await new Promise((resolve) => setTimeout(resolve, 3000));
					ready = await ai.files.get({ name });
				}
				if (!ready.uri) throw new Error('PDF sin URI del proveedor');
				await analyze(
					[{ fileData: { mimeType: 'application/pdf', fileUri: ready.uri } }],
					part.firstPage,
					part.lastPage
				);
			} finally {
				if (name)
					await ai.files
						.delete({ name })
						.catch((error) => console.warn('No se pudo eliminar el PDF temporal', error));
			}
		}
	} else
		await analyze(
			manual.mime_type?.startsWith('image/')
				? [{ inlineData: { mimeType: manual.mime_type, data: bytes.toString('base64') } }]
				: [{ text: bytes.toString('utf8') }],
			1,
			1
		);
	const context = mergeContexts(partials);
	for (const rule of context.rules) {
		rule.source = manual.file_name;
		if (rule.origin === 'inferred') rule.mandatory = false;
		if (rule.conflictsWith.some((id) => !context.rules.some((r) => r.id === id)))
			throw new Error('Contradicción con regla desconocida');
	}
	for (const rule of context.rules) {
		for (const id of rule.conflictsWith) {
			const other = context.rules.find((r) => r.id === id)!;
			if (!other.conflictsWith.includes(rule.id)) other.conflictsWith.push(rule.id);
		}
	}
	// Cross-part contradictions remain explicit rather than being resolved by a merge summary.
	if (partials.length > 1) {
		const prompt = `Identifica contradicciones entre estas reglas sin eliminar ni modificar instrucciones, condiciones o evidencias. Devuelve JSON {conflicts:[{a:string,b:string}]}; solo conflictos reales bajo las mismas condiciones. ${JSON.stringify(context.rules)}`;
		const response = await ai.models.generateContent({
			model: BRAND_MODEL,
			contents: prompt,
			config: { responseMimeType: 'application/json' }
		});
		registrarUsoGemini({
			userId,
			marcaId: manual.marca_id,
			model: BRAND_MODEL,
			task: 'Unificación de contexto de marca beta',
			prompt,
			usageMetadata: response.usageMetadata
		});
		const { z } = await import('zod');
		const links = z
			.object({ conflicts: z.array(z.object({ a: z.string(), b: z.string() })) })
			.parse(JSON.parse(response.text || ''));
		for (const link of links.conflicts) {
			const a = context.rules.find((r) => r.id === link.a),
				b = context.rules.find((r) => r.id === link.b);
			if (!a || !b) throw new Error('Contradicción con regla desconocida');
			a.conflictsWith.push(b.id);
			b.conflictsWith.push(a.id);
		}
	}
	const references = await renderBetaManualReferences(manual, bytes, context);
	const markdown = contextMarkdown(context);
	db.transaction(() => {
		db.prepare(
			`INSERT INTO beta_brand_manual_contexts(manual_id,context_json,references_json,metadata_json) VALUES(?,?,?,?) ON CONFLICT(manual_id) DO UPDATE SET context_json=excluded.context_json,references_json=excluded.references_json,metadata_json=excluded.metadata_json,created_at=unixepoch()`
		).run(
			manual.id,
			JSON.stringify(context),
			JSON.stringify(references),
			JSON.stringify({
				model: BRAND_MODEL,
				version: 1,
				fileName: manual.file_name,
				mimeType: manual.mime_type,
				fileSize: bytes.length,
				rendererVersion: 1,
				durationMs: Date.now() - startedAt,
				sha256: createHash('sha256').update(bytes).digest('hex')
			})
		);
		db.prepare('UPDATE marca_manuales SET resumen_ia=?,analizado_at=unixepoch() WHERE id=?').run(
			markdown,
			manual.id
		);
	})();
	return markdown;
}
export async function betaImageContext(
	marcaId: number,
	pub: any,
	creative: string,
	assets: any[],
	base: any,
	creating: boolean
) {
	const rows = db
		.prepare(
			`SELECT m.id,m.resumen_ia,c.context_json,c.references_json FROM marca_manuales m LEFT JOIN beta_brand_manual_contexts c ON c.manual_id=m.id WHERE m.marca_id=? AND m.deleted_at IS NULL ORDER BY m.id`
		)
		.all(marcaId) as any[];
	const rules = rows.flatMap((r) =>
		r.context_json ? contextSchema.parse(JSON.parse(r.context_json)).rules : []
	);
	const mandatory = rules.filter(
		(r) => r.mandatory && r.origin === 'explicit' && !r.conflictsWith.length
	);
	const other = rules.filter((r) => !mandatory.includes(r));
	const prompt = `RESTRICCIONES OBLIGATORIAS\n${JSON.stringify(mandatory)}\nIDENTIDAD DE ASSETS\nIncorpora todos los assets seleccionados. Logos, isotipos y sellos: conserva símbolo, letras, colores y proporciones; usa fondos, márgenes y jerarquía del manual para colocación legible. Los assets son la fuente de identidad y los ejemplos del manual orientan el estilo.\nINSTRUCCIONES GENERALES DE MARCA\n${JSON.stringify(other)}\n${pub.prompt_sistema || ''}\n${rows
		.filter((r) => !r.context_json)
		.map(
			(r) =>
				`Manual ${r.id}: requiere reanálisis para contexto estructurado. Resumen anterior: ${r.resumen_ia || ''}`
		)
		.join(
			'\n'
		)}\nOBJETIVO\n${pub.titulo || ''}. ${pub.contexto || ''}. ${pub.objetivo || ''}\nPETICIÓN CREATIVA\n${creating ? 'Crea una composición nueva que incorpore los assets proporcionados.' : 'Edita la imagen base incorporando los assets proporcionados.'}\n${creative}\nFORMATO\n${pub.aspect_ratio || '1:1'}, resolución 1K. Genera una sola imagen. Reglas contradictorias: no elijas arbitrariamente; conserva condiciones y evidencias.`;
	const parts: any[] = [{ text: prompt }];
	const attach = (label: string, inlineData: any) => parts.push({ text: label }, { inlineData });
	if (base) attach('ID base | Nombre: imagen base | Tipo: composición | Función: editar', base);
	if (assets.length > 10 || assets.length + (base ? 1 : 0) > 14)
		throw new Error('Demasiados assets: máximo 10 assets y 14 imágenes incluyendo la base');
	for (const asset of assets)
		attach(
			`ID asset-${asset.id} | Nombre: ${asset.nombre} | Tipo: ${asset.tipo} | Función: incorporar y conservar identidad`,
			{ mimeType: asset.mimeType, data: asset.base64 }
		);
	const refs = rows.flatMap((r) =>
		JSON.parse(r.references_json || '[]').map((ref: any) => ({ ...ref, manualId: r.id }))
	);
	const relevant = refs
		.sort((a: any, b: any) => {
			const words = `${creative} ${pub.contexto || ''}`
				.toLowerCase()
				.split(/\W+/)
				.filter((w) => w.length > 3);
			const score = (r: any) => words.filter((w) => r.reason.toLowerCase().includes(w)).length;
			return score(b) - score(a);
		})
		.slice(0, Math.min(3, 14 - assets.length - (base ? 1 : 0)));
	for (const ref of relevant)
		attach(
			`ID manual-${ref.manualId}-p${ref.page} | Nombre: ejemplo aprobado | Tipo: manual | Función: referencia visual de estilo`,
			{ mimeType: 'image/png', data: (await readUploadFile(ref.url)).toString('base64') }
		);
	return {
		version: 1,
		parts,
		prompt,
		rules,
		references: relevant,
		manuals: rows.map((r) => ({
			id: r.id,
			context: r.context_json ? JSON.parse(r.context_json) : null
		})),
		assets: assets.map(({ base64, ...rest }) => ({
			...rest,
			sha256: createHash('sha256').update(Buffer.from(base64, 'base64')).digest('hex')
		})),
		baseImage: base
			? {
					mimeType: base.mimeType,
					sha256: createHash('sha256').update(Buffer.from(base.data, 'base64')).digest('hex')
				}
			: null
	};
}
export async function evaluateBetaImage(
	context: Awaited<ReturnType<typeof betaImageContext>>,
	image: any,
	assets: any[],
	userId: string,
	marcaId: number,
	publicationId: number | null
) {
	const prompt = `Evalúa orientativamente la imagen generada frente a cada regla y los assets originales. No corrijas la imagen. JSON {version:1,summary:string,rules:[{ruleId,status,evidence,recommendation}]}. status: compliant, noncompliant, unverifiable. Incluye todas las reglas y una regla asset-ID por asset para identidad, letras, colores y proporciones. Contradicciones, inferencias inciertas y condiciones no observables: unverifiable. Evidencia concreta, sin afirmar fidelidad exacta cuando no se puede comprobar. Reglas: ${JSON.stringify(context.rules)}`;
	const parts: any[] = [{ text: prompt }, { text: 'Imagen generada' }, { inlineData: image }];
	for (const asset of assets)
		parts.push(
			{ text: `Asset original asset-${asset.id}: ${asset.nombre}` },
			{ inlineData: { mimeType: asset.mimeType, data: asset.base64 } }
		);
	const response = await ai.models.generateContent({
		model: BRAND_MODEL,
		contents: parts,
		config: { responseMimeType: 'application/json', responseJsonSchema: reportJsonSchema }
	});
	registrarUsoGemini({
		userId,
		marcaId,
		publicacionId: publicationId,
		model: BRAND_MODEL,
		task: 'Evaluación de cumplimiento beta',
		prompt,
		usageMetadata: response.usageMetadata
	});
	const report = reportSchema.parse(JSON.parse(response.text || ''));
	const expected = [...context.rules.map((r) => r.id), ...assets.map((a) => `asset-${a.id}`)];
	if (
		report.rules.length !== expected.length ||
		new Set(report.rules.map((r) => r.ruleId)).size !== expected.length ||
		expected.some((id) => !report.rules.some((r) => r.ruleId === id))
	)
		throw new Error('Evaluación incompleta');
	return report;
}
export function betaGeneration(imageUrl: string, userId: string) {
	if (!isBrandBeta()) return null;
	const row = db
		.prepare(
			'SELECT id,report_json,evaluation_status FROM beta_brand_generations WHERE image_url=? AND user_id=? ORDER BY id DESC LIMIT 1'
		)
		.get(imageUrl, userId) as any;
	return row
		? {
				generationId: row.id,
				complianceReport: row.report_json ? JSON.parse(row.report_json) : null,
				evaluationStatus: row.evaluation_status
			}
		: null;
}

export async function renderBetaManualReferences(
	manual: any,
	bytes: Buffer,
	context: BrandManualContext
) {
	const references: Array<{ page: number; reason: string; url: string }> = [];
	if (manual.mime_type === 'application/pdf' && context.approvedPages.length) {
		const { createCanvas, DOMMatrix, Path2D, ImageData } = await import('@napi-rs/canvas');
		Object.assign(globalThis, { DOMMatrix, Path2D, ImageData });
		const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
		// PDF.js requires a literal trailing slash, including on Windows where path.sep is `\\`.
		const pdfjsResourcePath = (directory: string) => `${path.join(process.cwd(), directory)}/`;
		const loadingTask = getDocument({
			data: Uint8Array.from(bytes),
			useSystemFonts: true,
			wasmUrl: pdfjsResourcePath('node_modules/pdfjs-dist/wasm'),
			standardFontDataUrl: pdfjsResourcePath('node_modules/pdfjs-dist/standard_fonts'),
			stopAtErrors: true
		});
		const document = await loadingTask.promise;
		try {
			for (const ref of context.approvedPages) {
				const page = await document.getPage(ref.page);
				const viewport = page.getViewport({ scale: 1.5 });
				const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
				await page.render({
					canvas: canvas as any,
					canvasContext: canvas.getContext('2d') as any,
					viewport
				}).promise;
				const url = await writeUploadFile(
					'brand-beta',
					`${manual.id}-${randomUUID()}-p${ref.page}.png`,
					canvas.toBuffer('image/png')
				);
				references.push({ ...ref, url });
			}
		} finally {
			await loadingTask.destroy();
		}
	}
	return references;
}
