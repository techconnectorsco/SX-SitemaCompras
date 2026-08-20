import { z } from 'zod';

export const MAX_COPY_PROMPT_LENGTH = 10_000;

export const copyGenerationRequestSchema = z
	.object({
		prompt: z
			.string()
			.max(
				MAX_COPY_PROMPT_LENGTH,
				`Las instrucciones adicionales no pueden superar ${MAX_COPY_PROMPT_LENGTH.toLocaleString('es')} caracteres.`
			)
			.nullable()
			.optional()
	})
	.strict();

export type CopyGenerationRequest = z.infer<typeof copyGenerationRequestSchema>;

export type CopyQualityWarningCode = 'missing_emoji' | 'few_hashtags' | 'missing_cta';

export interface CopyQualityWarning {
	code: CopyQualityWarningCode;
	message: string;
}

export interface CopyPromptData {
	brandName: string;
	systemPrompt?: string | null;
	title: string;
	context?: string | null;
	objective?: string | null;
	cta?: string | null;
	override?: string | null;
	manualText?: string;
	manualFilenames?: string[];
}

export class CopyGenerationError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code: string
	) {
		super(message);
		this.name = 'CopyGenerationError';
	}
}

export function normalizeCopyPrompt(prompt: string | null | undefined): string | null | undefined {
	if (prompt === undefined || prompt === null) return prompt;
	const trimmed = prompt.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function buildCopyGenerationPrompt(data: CopyPromptData): string {
	const sections = [
		data.systemPrompt?.trim() || 'Eres un experto en redacción publicitaria para redes sociales.'
	];

	if (data.override?.trim()) {
		sections.push(`Instrucciones adicionales para esta publicación:\n${data.override.trim()}`);
	}

	sections.push(
		[
			'Datos de la publicación:',
			`- Marca: ${data.brandName}`,
			`- Título: ${data.title.trim()}`,
			`- Contexto/Idea principal: ${data.context?.trim() || 'N/A'}`,
			`- Objetivo: ${data.objective?.trim() || 'Interacción y alcance'}`,
			`- Llamado a la acción (CTA): ${data.cta?.trim() || 'Comentar o enviar mensaje'}`
		].join('\n')
	);

	if (data.manualText?.trim()) sections.push(data.manualText.trim());

	if (data.manualFilenames?.length) {
		sections.push(
			`Instrucción de Marca: Se analizaron ${data.manualFilenames.length} archivo(s) de Manual de Marca (${data.manualFilenames.join(', ')}). Sigue su voz, tono y reglas.`
		);
	}

	sections.push(
		[
			'Instrucciones finales:',
			'- Devuelve SOLO el texto (copy) listo para publicar.',
			'- Incluye emojis y hashtags relevantes (al menos 3).',
			'- No incluyas notas adicionales ni texto fuera del copy.'
		].join('\n')
	);

	return sections.join('\n\n');
}

export function evaluateCopyQuality(copy: string, cta?: string | null): CopyQualityWarning[] {
	const warnings: CopyQualityWarning[] = [];
	const hashtags = copy.match(/(^|\s)#[\p{L}\p{N}_]+/gu) ?? [];

	if (!/[\p{Extended_Pictographic}]/u.test(copy)) {
		warnings.push({ code: 'missing_emoji', message: 'El copy no contiene emojis.' });
	}

	if (hashtags.length < 3) {
		warnings.push({
			code: 'few_hashtags',
			message: `El copy contiene ${hashtags.length} hashtag(s); se recomiendan al menos 3.`
		});
	}

	const normalizedCta = cta?.trim().toLocaleLowerCase('es');
	if (normalizedCta && !copy.toLocaleLowerCase('es').includes(normalizedCta)) {
		warnings.push({
			code: 'missing_cta',
			message: `No se encontró el CTA configurado: “${cta?.trim()}”.`
		});
	}

	return warnings;
}
