import db from '$lib/config/db-config';
import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';
import { registrarUsoGemini } from './gemini-usage-service';
import { readUploadFile } from '$lib/server/uploads-storage';
import {
    buildCopyGenerationPrompt,
    CopyGenerationError,
    normalizeCopyPrompt
} from '$lib/features/content-creator/copy-generation';

// Instantiate Gemini client
// Note: Requires GEMINI_API_KEY in .env
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY || '' });

const MODELO_COPY = 'gemini-2.5-flash';
const MODELO_IMAGEN = 'gemini-3.1-flash-image';

function getBrandManualParts(marcaId: number | null | undefined): {
    manualParts: any[];
    manualText: string;
    filenames: string[];
} {
    const manualParts: any[] = [];
    let manualText = '';
    const filenames: string[] = [];

    if (!marcaId) return { manualParts, manualText, filenames };

    try {
        const manuales = db
            .prepare(
                `
            SELECT * FROM marca_manuales WHERE marca_id = ? AND deleted_at IS NULL ORDER BY id DESC
        `
            )
            .all(marcaId) as any[];

        for (const m of manuales) {
            filenames.push(m.nombre || m.file_name || 'Manual');

            if (m.resumen_ia && m.resumen_ia.trim()) {
                manualText += `\n\n--- MANUAL DE MARCA OFICIAL (${m.nombre || m.file_name}) ---\n${m.resumen_ia.trim()}\n--- FIN MANUAL ---`;
            }
        }
    } catch (err) {
        console.warn('[IAContentService] Error leyendo manuales de marca:', err);
    }

    return { manualParts, manualText, filenames };
}

function verificarManualesAnalizados(marcaId: number | null | undefined): void {
    if (!marcaId) return;

    const pendientes = db
        .prepare(
            `
        SELECT nombre, file_name
        FROM marca_manuales
        WHERE marca_id = ?
          AND deleted_at IS NULL
          AND (resumen_ia IS NULL OR trim(resumen_ia) = '')
    `
        )
        .all(marcaId) as Array<{ nombre: string | null; file_name: string | null }>;

    if (pendientes.length > 0) {
        const nombres = pendientes.map((manual) => manual.nombre || manual.file_name || 'Manual sin nombre').join(', ');
        throw new Error(`Hay manuales de marca sin análisis válido: ${nombres}. Reanalízalos antes de generar contenido.`);
    }
}

export class IAContentService {
    /**
     * Analiza un archivo de manual de marca (PDF, TXT, MD, PNG, JPG) con Gemini 2.5 Flash
     * para extraer un resumen ejecutivo estructurado con las reglas visuales y de estilo de la marca.
     * Registra el uso de tokens y costo en ai_token_logs y guarda el resumen en marca_manuales.
     */
    static async analizarManualMarca(manualId: number, userId: string): Promise<string> {
        const manual = db
            .prepare(
                `
            SELECT m.*, ma.nombre as marca_nombre
            FROM marca_manuales m
            JOIN marcas ma ON m.marca_id = ma.id
            WHERE m.id = ? AND m.deleted_at IS NULL
        `
            )
            .get(manualId) as any;

        if (!manual) throw new Error('Manual de marca no encontrado');
        if (!manual.file_path) throw new Error('Ruta de archivo inválida');

        let fileBuffer: Buffer;
        try {
            fileBuffer = await readUploadFile(manual.file_path);
        } catch (error: any) {
            if (error?.code !== 'ENOENT') throw error;
            throw new Error(`El archivo físico del manual no existe en el servidor (${manual.file_name})`);
        }

        const mimeType = manual.mime_type || 'application/pdf';

        const promptInstruccion = `Eres un diseñador senior y director de arte de marca. Analiza exhaustivamente este documento/manual de identidad visual para la marca "${manual.marca_nombre || manual.nombre}". 

Extrae un resumen ejecutivo estructurado con las directrices esenciales que cualquier IA generadora de copy o imagen deba seguir obligatoriamente para esta marca.

Estructura tu respuesta estrictamente en Markdown con las siguientes secciones:

### 🎨 Paleta de Colores
- Colores primarios, secundarios, fondos y acentos (incluye códigos HEX si están en el documento).

### ✒️ Tipografía y Estilo Visual
- Fuentes principales/secundarias, jerarquía visual, estilo fotográfico/ilustraciones y composición.

### 🗣️ Tono de Voz y Redacción
- Personalidad de marca, tono (formal, amigable, técnico, jovial), uso de emojis, lenguaje y estilo.

### ⚠️ Reglas y Restricciones
- Usos prohibidos, restricciones de colores, tipografías no permitidas, palabras a evitar y límites de diseño.`;

        let contents: any[] = [];

        if (['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
            contents = [
                {
                    inlineData: {
                        mimeType,
                        data: fileBuffer.toString('base64')
                    }
                },
                { text: promptInstruccion }
            ];
        } else {
            const textContent = fileBuffer.toString('utf-8');
            contents = [
                {
                    text: `CONTENIDO DEL MANUAL DE MARCA:\n${textContent}\n\n---\n${promptInstruccion}`
                }
            ];
        }

        console.log(`[IAContentService] 🤖 Iniciando análisis de manual de marca con IA (ID: ${manualId}, Archivo: ${manual.file_name})...`);

        const response = await ai.models.generateContent({
            model: MODELO_COPY,
            contents
        });

        const resumenTexto = response.text?.trim() || '';
        if (!resumenTexto) {
            throw new Error('Gemini no generó un resumen válido para este manual');
        }

        const usage = registrarUsoGemini({
            userId,
            marcaId: manual.marca_id,
            model: MODELO_COPY,
            task: 'Análisis de Manual de Marca',
            prompt: `Análisis de manual "${manual.nombre || manual.file_name}"`,
            usageMetadata: response.usageMetadata,
            fallback: {
                inputTokens: Math.ceil(fileBuffer.length / 100),
                textOutputTokens: Math.ceil(resumenTexto.length / 4)
            }
        });

        // Guardar resumen_ia y analizado_at en marca_manuales
        const ahora = Math.floor(Date.now() / 1000);
        db.prepare(
            `
            UPDATE marca_manuales
            SET resumen_ia = ?, analizado_at = ?
            WHERE id = ?
        `
        ).run(resumenTexto, ahora, manualId);

        console.log(`[IAContentService] ✅ Análisis de manual ${manualId} completado. Tokens: ${usage.totalTokens}, Costo: $${usage.billedCost.toFixed(4)} USD.`);

        return resumenTexto;
    }
    static async generarCopy(publicacionId: number, userId: string, customPrompt?: string | null): Promise<string> {
        // 1. Obtener la publicación y la marca
        const pub = db
            .prepare(
                `
            SELECT p.*, m.nombre as marca_nombre, m.prompt_sistema
            FROM publicaciones p
            JOIN marcas m ON p.marca_id = m.id
            WHERE p.id = ? AND p.user_id = ?
        `
            )
            .get(publicacionId, userId) as any;

        if (!pub) throw new CopyGenerationError('Publicación no encontrada', 404, 'publication_not_found');

        if (!pub.titulo?.trim()) {
            throw new CopyGenerationError(
                'La publicación debe tener un título antes de generar el copy.',
                422,
                'missing_title'
            );
        }

        try {
            verificarManualesAnalizados(pub.marca_id);
        } catch (error) {
            throw new CopyGenerationError(
                error instanceof Error ? error.message : 'Hay manuales de marca pendientes de análisis.',
                409,
                'brand_manual_pending'
            );
        }

        // 2. Verificar límite de IA
        const userConfig = db.prepare('SELECT estado_ia FROM ia_configuracion_usuarios WHERE user_id = ?').get(userId) as any;
        if (userConfig && userConfig.estado_ia === 'BLOQUEADO') {
            throw new CopyGenerationError('Cuenta de IA bloqueada o límite excedido', 403, 'ai_account_blocked');
        }

        // Ausente: reutiliza el override guardado. null/vacío: usa sólo la configuración de marca.
        const normalizedCustomPrompt = normalizeCopyPrompt(customPrompt);
        const savedOverride = normalizeCopyPrompt(pub.prompt_copy);
        const override = normalizedCustomPrompt === undefined ? savedOverride ?? null : normalizedCustomPrompt;

        // 3. Incluir exclusivamente los resúmenes persistidos de los manuales.
        const { manualParts, manualText, filenames } = getBrandManualParts(pub.marca_id);
        const prompt = buildCopyGenerationPrompt({
            brandName: pub.marca_nombre,
            systemPrompt: pub.prompt_sistema,
            title: pub.titulo,
            context: pub.contexto,
            objective: pub.objetivo,
            cta: pub.cta,
            override,
            manualText,
            manualFilenames: filenames
        });

        // 4. Llamar a Gemini API
        let response: Awaited<ReturnType<typeof ai.models.generateContent>>;
        try {
            const contents: any[] = [...manualParts, { text: prompt }];

            response = await ai.models.generateContent({
                model: MODELO_COPY,
                contents
            });
        } catch (error) {
            console.error('[IAContentService] Error llamando a Gemini:', error);
            throw new CopyGenerationError('Error al generar el copy con IA', 502, 'ai_provider_error');
        }

        const copyText = response.text?.trim() || '';

        // El consumo se registra aunque el proveedor haya respondido sin texto utilizable.
        registrarUsoGemini({
            userId,
            marcaId: pub.marca_id,
            publicacionId,
            model: MODELO_COPY,
            task: 'Generación Copy Publicación',
            prompt,
            usageMetadata: response.usageMetadata,
            fallback: {
                inputTokens: Math.ceil(prompt.length / 4),
                textOutputTokens: Math.ceil(copyText.length / 4)
            }
        });

        if (!copyText) {
            throw new CopyGenerationError(
                'Gemini no devolvió un copy válido. El copy anterior no fue modificado.',
                502,
                'empty_ai_response'
            );
        }

        // 5. Guardar sólo después de validar la respuesta y siempre limitado al propietario.
        if (normalizedCustomPrompt !== undefined) {
            db.prepare(
                `
                UPDATE publicaciones
                SET copy_ia_original = ?, copy_final = ?, prompt_copy = ?
                WHERE id = ? AND user_id = ? AND deleted_at IS NULL
            `
            ).run(copyText, copyText, normalizedCustomPrompt, publicacionId, userId);
        } else {
            db.prepare(
                `
                UPDATE publicaciones
                SET copy_ia_original = ?, copy_final = ?
                WHERE id = ? AND user_id = ? AND deleted_at IS NULL
            `
            ).run(copyText, copyText, publicacionId, userId);
        }

        return copyText;
    }

    /**
     * Analiza las métricas orgánicas reales del feed de Meta (likes, comentarios,
     * compartidos por post) con Gemini 2.5 Flash para generar un diagnóstico de
     * rendimiento, sugerencias de optimización de pauta y próximas recomendaciones
     * de contenido. Registra el consumo en ai_token_logs.
     *
     * @param userId   ID del usuario autenticado (para log de uso)
     * @param pageInfo Información de la Fan Page conectada (name, followers_count, ...)
     * @param posts    Posts reales del feed de Meta Graph API (ya normalizados)
     * @param periodLabel Etiqueta legible del período analizado (ej: "Últimos 30 días")
     * @returns Estructura { diagnostico, sugerencias_pauta, topicos } lista para el front
     */
    static async analizarMetricasFeed(
        userId: string,
        pageInfo: { name?: string; followers_count?: number } | null,
        posts: Array<{
            message: string;
            created_time: string;
            likes: number;
            comments: number;
            shares: number;
            engagement: number;
        }>,
        periodLabel: string
    ): Promise<{
        diagnostico: string;
        sugerencias_pauta: Array<{ post: string; action: string; budget: string }>;
        topicos: Array<{ topic: string; why: string; target: string }>;
    }> {
        if (!posts || posts.length === 0) {
            throw new Error('No hay publicaciones en el período seleccionado para analizar.');
        }

        // Verificar límite de IA del usuario
        const userConfig = db.prepare('SELECT estado_ia FROM ia_configuracion_usuarios WHERE user_id = ?').get(userId) as any;
        if (userConfig && userConfig.estado_ia === 'BLOQUEADO') {
            throw new Error('Cuenta de IA bloqueada o límite mensual excedido. Contactá al administrador.');
        }

        // Agregar métricas reales
        const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
        const totalComments = posts.reduce((s, p) => s + p.comments, 0);
        const totalShares = posts.reduce((s, p) => s + p.shares, 0);
        const totalEng = totalLikes + totalComments + totalShares;
        const avgEng = Math.round(totalEng / posts.length);
        const ratioLikes = Math.round((totalLikes / Math.max(1, totalEng)) * 100);
        const ratioComments = Math.round((totalComments / Math.max(1, totalEng)) * 100);
        const ratioShares = Math.round((totalShares / Math.max(1, totalEng)) * 100);

        // Top 5 posts reales para enviar a Gemini
        const top = [...posts]
            .sort((a, b) => b.engagement - a.engagement)
            .slice(0, 5)
            .map((p, i) => {
                const preview = (p.message || '(sin texto)').slice(0, 200);
                return `#${i + 1} | ${p.created_time} | likes=${p.likes} | comments=${p.comments} | shares=${p.shares} | eng=${p.engagement} | ${preview}`;
            })
            .join('\n');

        const prompt = `Eres un analista senior de marketing digital experto en Meta (Facebook/Instagram) para empresas B2B/B2C de Costa Rica.

Analizá las siguientes métricas REALES del feed orgánico de la Fan Page "${pageInfo?.name || 'N/D'}" ${pageInfo?.followers_count ? `(${pageInfo.followers_count} seguidores)` : ''} correspondientes al período "${periodLabel}".

Datos consolidados:
- Total publicaciones: ${posts.length}
- Likes totales: ${totalLikes}
- Comentarios totales: ${totalComments}
- Compartidos totales: ${totalShares}
- Engagement total: ${totalEng} (promedio ${avgEng} por post)
- Distribución: ${ratioLikes}% likes, ${ratioComments}% comentarios, ${ratioShares}% compartidos

Top 5 posts con mayor engagement (texto truncado a 200 chars):
${top}

Generá un análisis experto y accionable. Respondé ESTRICTAMENTE en formato JSON con esta estructura exacta (sin markdown adicional, sin explicaciones fuera del JSON):

{
  "diagnostico": "Texto libre de 4-7 bullets separados por \\n sobre el rendimiento observado: engagement, distribución likes/compartidos, comparación con benchmark del sector, fortalezas y debilidades observadas en los top posts.",
  "sugerencias_pauta": [
    { "post": "Título corto de la sugerencia", "action": "Descripción accionable específica en 1-2 oraciones", "budget": "Ajuste sugerido en colones (ej: '+¢5,000', '¢0 (Optimización)', '-¢2,500')" }
  ],
  "topicos": [
    { "topic": "Tema/keyword sugerido para próximos contenidos", "why": "Justificación basada en los datos del feed (ej:alto share de X, comentarios preguntando por Y)", "target": "Público objetivo recomendado" }
  ]
}

Reglas:
- Basate en los datos reales provistos, no inventes métricas que no están.
- Si el engagement es bajo (< 2% del alcance estimado), hacelo notar como debilidad.
- Las sugerencias_pauta deben ser específicas y usar los ${ratioComments}% de comentarios para decidir si corresponde moderación activa o ajustar CTAs.
- Devolvé entre 2 y 4 sugerencias_pauta y entre 2 y 3 topicos.
- "diagnostico" debe ser texto plano (sin markdown, sin asteriscos), con bullets en líneas nuevas separadas por \\n.`.trim();

        console.log(`[IAContentService] 📊 Iniciando análisis de métricas con Gemini (${posts.length} posts, período: ${periodLabel})...`);

        try {
            const response = await ai.models.generateContent({
                model: MODELO_COPY,
                contents: [{ text: prompt }]
            });

            const rawText = response.text || '';
            // Gemini puede devolver el JSON entre ```json ... ``` o directo
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('La IA no devolvió un JSON válido');
            }
            const parsed = JSON.parse(jsonMatch[0]);

            // Validar que tenga los keys esperados (con defaults si faltan)
            const diagnostico = String(parsed.diagnostico || 'Sin diagnóstico disponible.');
            const sugerencias_pauta = Array.isArray(parsed.sugerencias_pauta)
                ? parsed.sugerencias_pauta.map((s: any) => ({
                      post: String(s?.post || 'Sugerencia'),
                      action: String(s?.action || ''),
                      budget: String(s?.budget || '¢0 (Optimización)')
                  }))
                : [];
            const topicos = Array.isArray(parsed.topicos)
                ? parsed.topicos.map((t: any) => ({
                      topic: String(t?.topic || 'Tópico'),
                      why: String(t?.why || ''),
                      target: String(t?.target || 'Público general')
                  }))
                : [];

            const usage = registrarUsoGemini({
                userId,
                model: MODELO_COPY,
                task: 'Análisis de Métricas Meta Feed',
                prompt,
                usageMetadata: response.usageMetadata,
                fallback: {
                    inputTokens: Math.ceil(prompt.length / 4),
                    textOutputTokens: Math.ceil(rawText.length / 4)
                }
            });

            console.log(`[IAContentService] ✅ Análisis de métricas completado. Tokens: ${usage.totalTokens}, Costo: $${usage.billedCost.toFixed(4)} USD.`);

            return { diagnostico, sugerencias_pauta, topicos };
        } catch (error: any) {
            console.error('[IAContentService] Error en análisis de métricas con Gemini:', error);
            if (error instanceof SyntaxError) {
                throw new Error('La IA devolvió una respuesta no parseable. Intentá nuevamente.');
            }
            throw new Error('Error al generar el análisis con IA: ' + (error?.message || error));
        }
    }

    static async generarImagenEditada(publicacionId: number, userId: string, base64Image: string | null, fallbackData?: any, index?: number, customPrompt?: string, brandAssets?: Array<{ nombre: string; tipo: string; mimeType: string; base64: string }>, isCrear?: boolean): Promise<string> {
        // Importación perezosa (lazy) para evitar problemas de dependencia circular
        const { SharePointService } = await import('./sharepoint-service');

        // 1. Intentar obtener la publicación (para el system prompt)
        let pub = db
            .prepare(
                `
            SELECT p.*, m.nombre as marca_nombre, m.prompt_sistema, f.nombre as formato_nombre, f.aspect_ratio
            FROM publicaciones p
            JOIN marcas m ON p.marca_id = m.id
            LEFT JOIN formatos f ON p.formato_id = f.id
            WHERE p.id = ? AND p.user_id = ?
        `
            )
            .get(publicacionId, userId) as any;

        // Si no existe (estamos usando el mockup visual del front sin guardar en DB aún), usamos el fallback
        if (!pub) {
            if (fallbackData && fallbackData.brand) {
                const marca = db.prepare('SELECT id as marca_id, nombre as marca_nombre, prompt_sistema FROM marcas WHERE nombre = ?').get(fallbackData.brand) as any;
                const formato = fallbackData.format ? (db.prepare('SELECT nombre as formato_nombre, aspect_ratio FROM formatos WHERE nombre = ? OR aspect_ratio = ?').get(fallbackData.format, fallbackData.format) as any) : null;
                pub = {
                    titulo: fallbackData.title || '',
                    contexto: fallbackData.context || '',
                    objetivo: fallbackData.objective || '',
                    marca_id: marca?.marca_id || null,
                    marca_nombre: marca?.marca_nombre || fallbackData.brand,
                    prompt_sistema: marca?.prompt_sistema || '',
                    formato_nombre: formato?.formato_nombre || fallbackData.format || '',
                    aspect_ratio: formato?.aspect_ratio || ''
                };
            } else {
                throw new Error('Publicación no encontrada y sin datos de respaldo (fallback)');
            }
        }

        verificarManualesAnalizados(pub.marca_id);

        // Preparar la instrucción de Relación de Aspecto
        const aspectText = pub.aspect_ratio ? `Relación de Aspecto requerida: ${pub.aspect_ratio}${pub.formato_nombre ? ` (${pub.formato_nombre})` : ''}. Adapta la composición visual y el encuadre estrictamente a esta proporción.` : pub.formato_nombre ? `Relación de Aspecto/Formato requerido: ${pub.formato_nombre}. Adapta la composición.` : '';

        // 2. Construir Prompt Visual basado en la marca (inyectando SIEMPRE la relación de aspecto)
        // Cada llamada genera un seed único para garantizar variedad en las regeneraciones
        const variationSeed = Math.floor(Math.random() * 99999);
        const promptPersonalizado = customPrompt?.trim();
        const basePrompt = promptPersonalizado
            ? promptPersonalizado.replace('[variation:0]', `[variation:${variationSeed}]`)
            : `
            ${pub.prompt_sistema || 'Aplica los estilos de marca por defecto.'}
            Contexto del producto: ${pub.titulo}. ${pub.contexto || ''}.
            Objetivo: ${pub.objetivo || 'Interacción'}.
            [variation:${variationSeed}]
        `.trim();

        const promptVisual = aspectText ? `${basePrompt}\n\n${aspectText}` : basePrompt;

        console.log('[IAContentService] Enviando imagen a Gemini | seed:', variationSeed, '| marca:', pub.prompt_sistema?.substring(0, 60) + '...');

        let finalBase64: string | null = base64Image;

        const modoCrear = !!isCrear;

        if (modoCrear && !promptPersonalizado) {
            throw new Error('En modo "crear" se requiere un customPrompt. No hay imagen de referencia y el prompt del post no puede estar vacío.');
        }

        if (modoCrear) {
            console.log('[IAContentService] 🪄 Modo text-to-image (sin imagen de referencia) | índice:', index);
        }

        try {
            // Limpieza del base64 solo aplica en modo edición (con imagen de referencia)
            let cleanBase64: string | null = null;
            let mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg';
            if (!modoCrear && base64Image) {
                // Log diagnóstico para ver exactamente qué llega
                const headerSample = base64Image.substring(0, 80);
                console.log('[IAContentService] base64 header sample:', headerSample);

                // Limpiar el encabezado data:image/...;base64, si viene incluido
                cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
                // Detectar mime type desde el encabezado original (default jpeg)
                const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
                mimeType = (mimeMatch ? mimeMatch[1] : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp';
                console.log('[IAContentService] mimeType detectado:', mimeType, '| cleanBase64 len:', cleanBase64.length);
            }

            // Usar exclusivamente los resúmenes persistidos de los manuales de marca.
            const { manualParts, manualText, filenames } = getBrandManualParts(pub.marca_id);
            if (filenames.length > 0) {
                console.log('[IAContentService] 📄 Manuales de marca adjuntados a la generación de imagen:', filenames);
            }

            // Mapear los assets de marca adicionales a partes de datos inline para Gemini
            const assetParts = (brandAssets || []).map((asset) => ({
                inlineData: {
                    mimeType: asset.mimeType || 'image/png',
                    data: asset.base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
                }
            }));

            // En modo crear reforzamos la instrucción de generación desde cero
            const promptVisualFinal = modoCrear ? `Crea una imagen original desde cero siguiendo estrictamente las instrucciones a continuación (no edites ni transformes ninguna imagen existente).\n\n${promptVisual}` : promptVisual;

            const textPromptPart = {
                text: `${promptVisualFinal}${modoCrear ? `\n\nGenera UNA sola imagen nueva y nítida.` : ''}${manualText ? '\n' + manualText : ''}${filenames.length ? `\n\nManual de marca adjunto (${filenames.join(', ')}): Sigue rigurosamente la paleta de colores, tipografías, guía de estilo y composición definidas en el manual.` : ''}${brandAssets?.length ? `\n\nAssets de marca incluidos: ${brandAssets.map((a) => `${a.tipo} "${a.nombre}"`).join(', ')}. Intégralos en la composición.` : ''}`
            };

            // Construcción de parts: la imagen de referencia solo va en modo edición
            const inputParts: any[] = [];
            if (!modoCrear && cleanBase64) {
                inputParts.push({ inlineData: { mimeType, data: cleanBase64 } });
            }
            inputParts.push(...assetParts, ...manualParts, textPromptPart);

            // Llamada real a Gemini con soporte de imagen como input Y output
            const response = await ai.models.generateContent({
                model: MODELO_IMAGEN,
                contents: [
                    {
                        role: 'user',
                        parts: inputParts
                    }
                ],
                config: {
                    responseModalities: ['IMAGE', 'TEXT']
                }
            });

            // Extraer la imagen generada de la respuesta
            const parts = response.candidates?.[0]?.content?.parts ?? [];

            const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

            if (imagePart?.inlineData?.data) {
                finalBase64 = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                console.log(`[IAContentService] ✅ ${modoCrear ? 'Imagen creada' : 'Imagen editada'} por Gemini correctamente.`);
            } else {
                console.warn('[IAContentService] ⚠️ Gemini no devolvió imagen. Se usará la imagen original.');
            }

            const usage = registrarUsoGemini({
                userId,
                marcaId: pub.marca_id,
                publicacionId,
                model: MODELO_IMAGEN,
                task: 'Edición de Imagen con Prompt de Marca',
                prompt: promptVisual,
                usageMetadata: response.usageMetadata
            });
            console.log(`[IAContentService] 🪙 Tokens registrados — prompt: ${usage.inputTokens}, completion: ${usage.completionTokens}, costo: $${usage.billedCost.toFixed(6)}`);
        } catch (error) {
            console.error('[IAContentService] Error en edición de imagen con Gemini:', error);
            if (modoCrear) {
                // En modo crear no hay imagen original de respaldo: no tiene sentido seguir
                throw new Error('No se pudo generar la imagen en modo crear: ' + (error as Error).message);
            }
            console.warn('[IAContentService] Usando imagen original como fallback.');
            // No lanzamos error — guardamos la imagen original para no bloquear el flujo
        }

        if (!finalBase64) {
            throw new Error('No se obtuvo imagen para guardar.');
        }

        // 3. Guardar la imagen en el almacenamiento persistente local (mock de SharePoint)
        const imageName = index !== undefined ? `ia_gen_pub_${publicacionId}_${index}.jpg` : `ia_gen_pub_${publicacionId}.jpg`;
        const sharepointUrl = await SharePointService.uploadImage(imageName, finalBase64);

        // 4. Guardar la URL en la tabla publicaciones usando el campo correcto
        try {
            if (index !== undefined) {
                // Es parte de un carrusel
                const existingPub = db.prepare('SELECT carousel_images FROM publicaciones WHERE id = ?').get(publicacionId) as any;
                let carouselData: any[] = [];
                if (existingPub && existingPub.carousel_images) {
                    try {
                        carouselData = JSON.parse(existingPub.carousel_images);
                    } catch (e) {
                        carouselData = [];
                    }
                }

                // Asegurar que el array tenga el tamaño necesario
                while (carouselData.length <= index) {
                    carouselData.push({
                        imagePreview: null,
                        imageName: '',
                        imageBase64: '',
                        prompt: '',
                        modo: 'editar'
                    });
                }

                // Actualizar la imagen en su índice correspondiente preservando prompt y modo
                const prev = carouselData[index] || {};
                carouselData[index] = {
                    imagePreview: sharepointUrl,
                    imageName: imageName,
                    imageBase64: '', // No guardamos la base64 en la BD por eficiencia
                    prompt: prev.prompt || '',
                    modo: prev.modo || 'editar'
                };

                db.prepare(`UPDATE publicaciones SET carousel_images = ? WHERE id = ?`).run(JSON.stringify(carouselData), publicacionId);
                console.log(`[IAContentService] ✅ URL de imagen guardada en publicaciones.carousel_images (índice ${index})`);
            } else {
                // Es una imagen única
                db.prepare(`UPDATE publicaciones SET sharepoint_item_id = ?, image_name = ? WHERE id = ?`).run(sharepointUrl, imageName, publicacionId);
                console.log(`[IAContentService] ✅ URL de imagen guardada en publicaciones.sharepoint_item_id`);
            }
        } catch (e) {
            console.warn('[IAContentService] No se pudo guardar la URL en publicaciones:', e);
        }

        return sharepointUrl;
    }
}
