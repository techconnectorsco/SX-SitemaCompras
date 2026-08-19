/** Tarifas estándar vigentes de Gemini Developer API (USD por 1M tokens). */
export interface ModelPricing {
    inputPricePerMillion: number;
    textOutputPricePerMillion: number;
    imageOutputPricePerMillion?: number;
    description: string;
}

export const GEMINI_PRICING: Record<string, ModelPricing> = {
    'gemini-2.5-flash': { inputPricePerMillion: 0.30, textOutputPricePerMillion: 2.50, description: 'Gemini 2.5 Flash' },
    'gemini-2.5-flash-lite': { inputPricePerMillion: 0.10, textOutputPricePerMillion: 0.40, description: 'Gemini 2.5 Flash Lite' },
    'gemini-2.5-pro': { inputPricePerMillion: 1.25, textOutputPricePerMillion: 10.00, description: 'Gemini 2.5 Pro' },
    'gemini-2.5-flash-image': { inputPricePerMillion: 0.30, textOutputPricePerMillion: 2.50, imageOutputPricePerMillion: 30, description: 'Gemini 2.5 Flash Image' },
    'gemini-3.1-flash-image': { inputPricePerMillion: 0.50, textOutputPricePerMillion: 3, imageOutputPricePerMillion: 60, description: 'Gemini 3.1 Flash Image' },
    'gemini-3.1-flash-image-preview': { inputPricePerMillion: 0.50, textOutputPricePerMillion: 3, imageOutputPricePerMillion: 60, description: 'Gemini 3.1 Flash Image Preview' }
};

export interface GeminiUsageCostInput {
    inputTokens: number;
    /** Resultados de herramientas devueltos al modelo como entrada. */
    toolInputTokens?: number;
    textOutputTokens: number;
    thinkingTokens?: number;
    imageOutputTokens?: number;
}

export interface GeminiUsageCost {
    providerCost: number;
    billedCost: number;
}

export function getBillingMultiplier(): number {
    const configured = Number(process.env.IA_FACTOR_COBRO ?? '1.10');
    return Number.isFinite(configured) && configured > 0 ? configured : 1.10;
}

/** Calcula costo estándar del proveedor y el precio con el margen configurado. */
export function calcularCostoGemini(modelName: string, usage: GeminiUsageCostInput): GeminiUsageCost {
    const model = modelName.replace(/^models\//, '');
    const pricing = GEMINI_PRICING[model];
    if (!pricing) throw new Error(`No hay tarifa configurada para el modelo Gemini "${model}"`);

    const textOutput = usage.textOutputTokens + (usage.thinkingTokens ?? 0);
    const providerCost =
        ((usage.inputTokens + (usage.toolInputTokens ?? 0)) / 1_000_000) * pricing.inputPricePerMillion +
        (textOutput / 1_000_000) * pricing.textOutputPricePerMillion +
        ((usage.imageOutputTokens ?? 0) / 1_000_000) * (pricing.imageOutputPricePerMillion ?? 0);

    return { providerCost, billedCost: providerCost * getBillingMultiplier() };
}

/** Compatibilidad temporal para llamadas de texto existentes. */
export function calcularCostoIA(modelName: string, inputTokens: number, outputTokens: number): number {
    return calcularCostoGemini(modelName, { inputTokens, textOutputTokens: outputTokens }).billedCost;
}
