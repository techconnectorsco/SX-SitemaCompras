import { z } from 'zod';
export const categories = [
	'palette',
	'typography',
	'logo',
	'clearSpace',
	'minimumSize',
	'background',
	'composition',
	'photography',
	'graphics',
	'tone',
	'prohibitions'
] as const;
export const ruleSchema = z.object({
	id: z.string().min(1),
	category: z.enum(categories),
	instruction: z.string().min(1),
	source: z.string().min(1),
	page: z.number().int().positive().nullable(),
	evidence: z.string().min(1),
	conditions: z.string(),
	mandatory: z.boolean(),
	origin: z.enum(['explicit', 'inferred']),
	conflictsWith: z.array(z.string())
});
export const contextSchema = z.object({
	version: z.literal(1),
	rules: z.array(ruleSchema),
	unspecified: z.array(z.enum(categories)),
	approvedPages: z.array(
		z.object({ page: z.number().int().positive(), reason: z.string(), unambiguous: z.boolean() })
	)
});
export type BrandManualContext = z.infer<typeof contextSchema>;
export const reportSchema = z.object({
	version: z.literal(1),
	summary: z.string(),
	rules: z.array(
		z.object({
			ruleId: z.string(),
			status: z.enum(['compliant', 'noncompliant', 'unverifiable']),
			evidence: z.string(),
			recommendation: z.string()
		})
	)
});
export type BrandComplianceReport = z.infer<typeof reportSchema>;
export function contextMarkdown(context: BrandManualContext): string {
	return categories
		.map(
			(category) =>
				`### ${category}\n${
					context.rules
						.filter((r) => r.category === category)
						.map(
							(r) =>
								`- [${r.id}] ${r.mandatory ? 'Obligatorio' : 'Recomendado'} (${r.origin}): ${r.instruction} | Condiciones: ${r.conditions || 'ninguna'} | ${r.source}, página ${r.page ?? 'no especificada'} | Evidencia: ${r.evidence}${r.conflictsWith.length ? ` | Contradicción: ${r.conflictsWith.join(', ')}` : ''}`
						)
						.join('\n') || 'No especificado'
				}`
		)
		.join('\n\n');
}
export function mergeContexts(parts: BrandManualContext[]): BrandManualContext {
	const rules = parts.flatMap((p) => p.rules);
	if (new Set(rules.map((r) => r.id)).size !== rules.length)
		throw new Error('Identificadores de reglas duplicados');
	return contextSchema.parse({
		version: 1,
		rules,
		unspecified: categories.filter((c) => !rules.some((r) => r.category === c)),
		approvedPages: parts
			.flatMap((p) => p.approvedPages)
			.filter(
				(p, index, pages) =>
					p.unambiguous &&
					pages.findIndex((other) => other.page === p.page && other.unambiguous) === index
			)
			.slice(0, 3)
	});
}

// Provider schemas accompany local validation; all fields are required.
const string = { type: 'string' };
const strings = { type: 'array', items: string };
const object = (properties: Record<string, unknown>) => ({
	type: 'object',
	properties,
	required: Object.keys(properties)
});
export const contextJsonSchema = object({
	version: { type: 'integer', enum: [1] },
	rules: {
		type: 'array',
		items: object({
			id: string,
			category: { type: 'string', enum: [...categories] },
			instruction: string,
			source: string,
			page: { type: ['integer', 'null'] },
			evidence: string,
			conditions: string,
			mandatory: { type: 'boolean' },
			origin: { type: 'string', enum: ['explicit', 'inferred'] },
			conflictsWith: strings
		})
	},
	unspecified: { type: 'array', items: { type: 'string', enum: [...categories] } },
	approvedPages: {
		type: 'array',
		items: object({ page: { type: 'integer' }, reason: string, unambiguous: { type: 'boolean' } })
	}
});
export const reportJsonSchema = object({
	version: { type: 'integer', enum: [1] },
	summary: string,
	rules: {
		type: 'array',
		items: object({
			ruleId: string,
			status: { type: 'string', enum: ['compliant', 'noncompliant', 'unverifiable'] },
			evidence: string,
			recommendation: string
		})
	}
});
