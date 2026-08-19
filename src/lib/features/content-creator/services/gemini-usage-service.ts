import db from '$lib/config/db-config';
import { calcularCostoGemini } from './gemini-pricing';

type UsageMetadata = {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    toolUsePromptTokenCount?: number;
    totalTokenCount?: number;
    candidatesTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
};

export interface GeminiUsageLogInput {
    userId: string;
    marcaId?: number | null;
    publicacionId?: number | null;
    model: string;
    task: string;
    prompt: string;
    usageMetadata?: UsageMetadata;
    fallback?: { inputTokens: number; textOutputTokens: number };
}

export interface GeminiUsageLog {
    inputTokens: number;
    completionTokens: number;
    thinkingTokens: number;
    toolTokens: number;
    imageTokens: number;
    totalTokens: number;
    providerCost: number;
    billedCost: number;
    billingStatus: 'verified' | 'estimated';
}

/** Registra una respuesta Gemini conservando el desglose literal de usageMetadata. */
export function registrarUsoGemini(input: GeminiUsageLogInput): GeminiUsageLog {
    const metadata = input.usageMetadata;
    const inputTokens = metadata?.promptTokenCount ?? input.fallback?.inputTokens ?? 0;
    const completionTokens = metadata?.candidatesTokenCount ?? input.fallback?.textOutputTokens ?? 0;
    const thinkingTokens = metadata?.thoughtsTokenCount ?? 0;
    const toolTokens = metadata?.toolUsePromptTokenCount ?? 0;
    const imageTokens = metadata?.candidatesTokensDetails
        ?.filter((detail) => detail.modality === 'IMAGE')
        .reduce((total, detail) => total + (detail.tokenCount ?? 0), 0) ?? 0;
    const isImageModel = input.model.includes('-image');
    // Sin detalle por modalidad no se puede separar texto e imagen; se conserva como estimación.
    const billingStatus: 'verified' | 'estimated' = metadata && (!isImageModel || imageTokens > 0) ? 'verified' : 'estimated';
    const textOutputTokens = isImageModel ? Math.max(0, completionTokens - imageTokens) : completionTokens;
    const totalTokens = metadata?.totalTokenCount ?? (inputTokens + completionTokens + thinkingTokens + toolTokens);
    const costs = calcularCostoGemini(input.model, {
        inputTokens,
        toolInputTokens: toolTokens,
        textOutputTokens,
        thinkingTokens,
        // Para registros sin desglose de imagen, el total candidato es una aproximación de imagen.
        imageOutputTokens: isImageModel ? (imageTokens || completionTokens) : 0
    });

    db.prepare(`
        INSERT INTO ai_token_logs (
            user_id, marca_id, publicacion_id, modelo_ia, tarea, prompt_utilizado,
            tokens_prompt, tokens_completion, tokens_thinking, tokens_tool, tokens_image,
            tokens_totales, costo_proveedor, costo_estimado, billing_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        input.userId, input.marcaId ?? null, input.publicacionId ?? null, input.model, input.task, input.prompt,
        inputTokens, completionTokens, thinkingTokens, toolTokens, imageTokens,
        totalTokens, costs.providerCost, costs.billedCost, billingStatus
    );

    return { inputTokens, completionTokens, thinkingTokens, toolTokens, imageTokens, totalTokens, providerCost: costs.providerCost, billedCost: costs.billedCost, billingStatus };
}
