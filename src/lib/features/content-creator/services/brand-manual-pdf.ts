import { PDFDocument } from 'pdf-lib';

// Dejar margen respecto al límite de 50 MB por PDF de Gemini.
const TARGET_BYTES = 45_000_000;
const MAX_BYTES = 50_000_000;
const MAX_PAGES = 1_000;

export interface BrandManualPdfPart {
	bytes: Uint8Array;
	firstPage: number;
	lastPage: number;
}

async function copyPageRange(
	source: PDFDocument,
	firstIndex: number,
	endIndex: number
): Promise<Uint8Array> {
	try {
		const document = await PDFDocument.create();
		const indices = Array.from({ length: endIndex - firstIndex }, (_, offset) => firstIndex + offset);
		const pages = await document.copyPages(source, indices);
		for (const page of pages) document.addPage(page);
		return await document.save({ useObjectStreams: true });
	} catch {
		throw new Error(
			`No se pudieron separar las páginas ${firstIndex + 1}-${endIndex} del PDF. Comprueba que el archivo no esté dañado ni protegido.`
		);
	}
}

/** Produce partes consecutivas cuyo PDF serializado cabe en una solicitud de Gemini. */
export async function* splitBrandManualPdf(bytes: Uint8Array): AsyncGenerator<BrandManualPdfPart> {
	let source: PDFDocument;
	try {
		source = await PDFDocument.load(bytes);
	} catch {
		throw new Error('El PDF está dañado o protegido y no se puede dividir para analizarlo.');
	}

	const pageCount = source.getPageCount();
	if (pageCount === 0) throw new Error('El PDF no contiene páginas para analizar.');

	if (bytes.length <= TARGET_BYTES && pageCount <= MAX_PAGES) {
		yield { bytes, firstPage: 1, lastPage: pageCount };
		return;
	}

	let firstIndex = 0;
	while (firstIndex < pageCount) {
		let low = firstIndex + 1;
		let high = Math.min(pageCount, firstIndex + MAX_PAGES);
		let bestEnd = firstIndex;
		let bestBytes: Uint8Array | undefined;

		while (low <= high) {
			const middle = Math.floor((low + high) / 2);
			const candidate = await copyPageRange(source, firstIndex, middle);
			if (candidate.length <= TARGET_BYTES) {
				bestEnd = middle;
				bestBytes = candidate;
				low = middle + 1;
			} else {
				high = middle - 1;
			}
		}

		if (!bestBytes) {
			const singlePage = await copyPageRange(source, firstIndex, firstIndex + 1);
			if (singlePage.length > MAX_BYTES) {
				throw new Error(
					`La página ${firstIndex + 1} supera por sí sola el límite de 50 MB de Gemini. Comprímela antes de subir el manual.`
				);
			}
			bestEnd = firstIndex + 1;
			bestBytes = singlePage;
		}

		yield { bytes: bestBytes, firstPage: firstIndex + 1, lastPage: bestEnd };
		firstIndex = bestEnd;
	}
}
