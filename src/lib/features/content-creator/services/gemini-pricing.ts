/**
 * Tabla de precios oficiales de la API de Gemini (Google AI Studio).
 * Fuente: https://ai.google.dev/pricing
 * Precios en USD por 1 millón de tokens.
 *
 * IMPORTANTE: Actualizar esta tabla cuando Google cambie los precios.
 * Última actualización: Julio 2026.
 */

interface ModelPricing {
    /** USD por 1M tokens de entrada (prompt) */
    inputPricePerMillion: number;
    /** USD por 1M tokens de salida (completion/candidates). null si cobra por imagen. */
    outputPricePerMillion: number | null;
    /** USD por imagen generada (solo para modelos de imagen con pricing por imagen) */
    outputPricePerImage?: number;
    /** Descripción legible del modelo */
    description: string;
}

export const GEMINI_PRICING: Record<string, ModelPricing> = {
    // ── Gemini 2.5 Flash ──────────────────────────────────────────────────
    // Input:  $0.30 / 1M tokens (texto, imagen o video) | $1.00 (audio)
    // Output: $2.50 / 1M tokens (incluye tokens de pensamiento/thinking)
    'gemini-2.5-flash': {
        inputPricePerMillion: 0.30,
        outputPricePerMillion: 2.50,
        description: 'Gemini 2.5 Flash (razonamiento híbrido, 1M contexto)'
    },
    'gemini-2.5-flash-lite': {
        inputPricePerMillion: 0.10,
        outputPricePerMillion: 0.40,
        description: 'Gemini 2.5 Flash Lite (económico)'
    },

    // ── Gemini 2.5 Flash Image (Nano Banana 🍌) ───────────────────────────
    // Input:  $0.30 / 1M tokens (texto o imagen)
    // Output: $0.039 por imagen generada (tarifa plana, NO por token)
    'gemini-2.5-flash-image': {
        inputPricePerMillion: 0.30,
        outputPricePerMillion: null,       // No aplica — cobra por imagen
        outputPricePerImage: 0.039,        // $0.039 por cada imagen de salida
        description: 'Gemini 2.5 Flash Image - Nano Banana 🍌 (generación/edición de imágenes)'
    },

    // ── Gemini 2.5 Pro ────────────────────────────────────────────────────
    'gemini-2.5-pro': {
        inputPricePerMillion: 1.25,
        outputPricePerMillion: 10.00,
        description: 'Gemini 2.5 Pro (máxima capacidad)'
    },

    // ── Gemini 2.0 Flash ──────────────────────────────────────────────────
    'gemini-2.0-flash': {
        inputPricePerMillion: 0.10,
        outputPricePerMillion: 0.40,
        description: 'Gemini 2.0 Flash'
    },
    'gemini-2.0-flash-001': {
        inputPricePerMillion: 0.10,
        outputPricePerMillion: 0.40,
        description: 'Gemini 2.0 Flash 001 (estable)'
    },
    'gemini-2.0-flash-lite': {
        inputPricePerMillion: 0.075,
        outputPricePerMillion: 0.30,
        description: 'Gemini 2.0 Flash Lite (ultra económico)'
    },

    // ── Gemini 3.x ────────────────────────────────────────────────────────
    'gemini-3.1-flash-image': {
        inputPricePerMillion: 0.30,
        outputPricePerMillion: null,
        outputPricePerImage: 0.039,
        description: 'Gemini 3.1 Flash Image'
    },
    'gemini-3.1-flash-image-preview': {
        inputPricePerMillion: 0.30,
        outputPricePerMillion: null,
        outputPricePerImage: 0.039,
        description: 'Gemini 3.1 Flash Image Preview'
    },
    'gemini-3-pro-image': {
        inputPricePerMillion: 1.25,
        outputPricePerMillion: null,
        outputPricePerImage: 0.039,
        description: 'Gemini 3 Pro Image'
    },

    // ── Imagen 4 (generación pura, precio por imagen) ─────────────────────
    'imagen-4.0-generate-001': {
        inputPricePerMillion: 0,
        outputPricePerMillion: null,
        outputPricePerImage: 0.04,
        description: 'Imagen 4.0 (precio por imagen)'
    },
    'imagen-4.0-fast-generate-001': {
        inputPricePerMillion: 0,
        outputPricePerMillion: null,
        outputPricePerImage: 0.02,
        description: 'Imagen 4.0 Fast (precio por imagen)'
    },
};

/**
 * Calcula el costo estimado en USD dado un modelo y sus tokens/imágenes.
 *
 * Para modelos de TEXTO: separa costo de input y output por token.
 * Para modelos de IMAGEN: cobra $X por input token + tarifa plana por imagen generada.
 *
 * @param modelName    Nombre del modelo (ej: 'gemini-2.5-flash')
 * @param inputTokens  Tokens del prompt (response.usageMetadata.promptTokenCount)
 * @param outputTokens Tokens de respuesta (response.usageMetadata.candidatesTokenCount)
 * @param imagesGenerated Número de imágenes generadas (default: 1 para modelos de imagen)
 * @returns Costo total estimado en USD
 */
export function calcularCostoIA(
    modelName: string,
    inputTokens: number,
    outputTokens: number,
    imagesGenerated: number = 1
): number {
    // Limpiar el prefijo "models/" si viene de la API
    const cleanName = modelName.replace(/^models\//, '');
    const pricing = GEMINI_PRICING[cleanName];

    let baseCost = 0;
    
    if (!pricing) {
        console.warn(`[calcularCostoIA] ⚠️ Modelo "${cleanName}" no encontrado. Usando tarifa por defecto.`);
        baseCost = ((inputTokens + outputTokens) / 1_000_000) * 0.15;
    } else {
        const costoInput = (inputTokens / 1_000_000) * pricing.inputPricePerMillion;

        // Si el output se cobra por imagen (no por token)
        if (pricing.outputPricePerMillion === null && pricing.outputPricePerImage !== undefined) {
            const costoOutput = pricing.outputPricePerImage * imagesGenerated;
            baseCost = costoInput + costoOutput;
        } else {
            // Output por token (modelos de texto)
            const costoOutput = (outputTokens / 1_000_000) * (pricing.outputPricePerMillion ?? 0);
            baseCost = costoInput + costoOutput;
        }
    }

    // Agregar un 10% extra de margen operativo (overhead/markup) al costo base
    return baseCost * 1.10;
}

