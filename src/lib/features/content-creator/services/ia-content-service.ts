import db from '$lib/config/db-config';
import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';
import { calcularCostoIA } from './gemini-pricing';
import fs from 'fs';
import path from 'path';

// Instantiate Gemini client
// Note: Requires GEMINI_API_KEY in .env
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY || '' });

const MODELO_COPY  = 'gemini-2.5-flash';
const MODELO_IMAGEN = 'gemini-3.1-flash-image';

function getBrandManualParts(marcaId: number | null | undefined, options?: { maxFileSizeBytes?: number; skipPdf?: boolean }): { manualParts: any[]; manualText: string; filenames: string[] } {
    const manualParts: any[] = [];
    let manualText = '';
    const filenames: string[] = [];

    if (!marcaId) return { manualParts, manualText, filenames };

    try {
        const manuales = db.prepare(`
            SELECT * FROM marca_manuales WHERE marca_id = ? AND deleted_at IS NULL ORDER BY id DESC
        `).all(marcaId) as any[];

        let totalBytes = 0;
        const maxTotalBytes = options?.maxFileSizeBytes ?? (options?.skipPdf ? 2 * 1024 * 1024 : 25 * 1024 * 1024);

        for (const m of manuales) {
            if (!m.file_path) continue;
            const cleanRelPath = m.file_path.replace(/^\//, '');
            const fullPath = path.join(process.cwd(), 'static', cleanRelPath);
            if (fs.existsSync(fullPath)) {
                const stat = fs.statSync(fullPath);
                const mimeType = m.mime_type || 'application/pdf';
                filenames.push(m.nombre || m.file_name || 'Manual');

                if (options?.skipPdf && mimeType === 'application/pdf') {
                    console.log(`[IAContentService] ℹ️ Manual PDF "${m.nombre || m.file_name}" omitido como binario inline en modelo de imagen para prevenir desborde de tokens.`);
                    continue;
                }

                if (['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
                    if (totalBytes + stat.size <= maxTotalBytes) {
                        const buffer = fs.readFileSync(fullPath);
                        manualParts.push({
                            inlineData: {
                                mimeType,
                                data: buffer.toString('base64')
                            }
                        });
                        totalBytes += stat.size;
                    } else {
                        console.warn(`[IAContentService] ⚠️ Manual "${m.nombre || m.file_name}" omitido por límite de tamaño de adjuntos.`);
                    }
                } else if (mimeType.startsWith('text/') || mimeType.includes('markdown')) {
                    const textContent = fs.readFileSync(fullPath, 'utf-8');
                    manualText += `\n\n--- MANUAL DE MARCA OFICIAL (${m.nombre || m.file_name}) ---\n${textContent}\n--- FIN MANUAL ---`;
                }
            }
        }
    } catch (err) {
        console.warn('[IAContentService] Error leyendo manuales de marca:', err);
    }

    return { manualParts, manualText, filenames };
}

export class IAContentService {
    static async generarCopy(publicacionId: number, userId: string, customPrompt?: string): Promise<string> {
        // 1. Obtener la publicación y la marca
        const pub = db.prepare(`
            SELECT p.*, m.nombre as marca_nombre, m.prompt_sistema
            FROM publicaciones p
            JOIN marcas m ON p.marca_id = m.id
            WHERE p.id = ? AND p.user_id = ?
        `).get(publicacionId, userId) as any;

        if (!pub) throw new Error('Publicación no encontrada');

        // 2. Verificar límite de IA
        const userConfig = db.prepare('SELECT estado_ia FROM ia_configuracion_usuarios WHERE user_id = ?').get(userId) as any;
        if (userConfig && userConfig.estado_ia === 'BLOQUEADO') {
            throw new Error('Cuenta de IA bloqueada o límite excedido');
        }

        // 3. Construir Prompt
        // Si el usuario envía un customPrompt puntual (modal de revisión), ese manda.
        // Si no, caemos al prompt_copy guardado en la publicación (override persistente del calendario).
        // Si tampoco existe, usamos el template por defecto (manual de marca + datos).
        const override = (customPrompt && customPrompt.trim()) ? customPrompt.trim() : (pub.prompt_copy && pub.prompt_copy.trim() ? pub.prompt_copy.trim() : null);

        const datosPublicacion = `
Datos de la publicación:
- Título: ${pub.titulo}
- Contexto/Idea principal: ${pub.contexto || 'N/A'}
- Objetivo: ${pub.objetivo || 'Interacción y alcance'}
- Llamado a la acción (CTA): ${pub.cta || 'Comentar o enviar mensaje'}`.trim();

        let prompt: string;
        if (override) {
            prompt = `
${pub.prompt_sistema || 'Eres un experto en redacción publicitaria para redes sociales.'}

${override}

${datosPublicacion}

Instrucciones finales:
- Devuelve SOLO el texto (copy) listo para publicar.
- Incluye emojis y hashtags relevantes (al menos 3).
- No incluyas notas adicionales ni texto fuera del copy.
            `.trim();
        } else {
            prompt = `
${pub.prompt_sistema || 'Eres un experto en redacción publicitaria para redes sociales.'}

Por favor genera el texto (copy) para la siguiente publicación de la marca ${pub.marca_nombre}:
- Título: ${pub.titulo}
- Contexto/Idea principal: ${pub.contexto || 'N/A'}
- Objetivo: ${pub.objetivo || 'Interacción y alcance'}
- Llamado a la acción (CTA): ${pub.cta || 'Comentar o enviar mensaje'}

Instrucciones:
- Devuelve SOLO el texto (copy) listo para publicar.
- Incluye emojis y hashtags relevantes (al menos 3).
- No incluyas notas adicionales ni texto fuera del copy.
            `.trim();
        }

        // 4. Obtener manuales de marca adjuntos (hasta 25MB para Gemini 2.5 Flash de texto)
        const { manualParts, manualText, filenames } = getBrandManualParts(pub.marca_id, { maxFileSizeBytes: 25 * 1024 * 1024, skipPdf: false });
        if (manualText) {
            prompt += manualText;
        }
        if (filenames.length > 0) {
            prompt += `\n\nInstrucción de Marca: Se adjuntaron ${filenames.length} archivo(s) de Manual de Marca (${filenames.join(', ')}). Sigue la voz de marca, tono y guías del manual.`;
        }

        // 5. Llamar a Gemini API
        try {
            const contents: any[] = [...manualParts, { text: prompt }];

            const response = await ai.models.generateContent({
                model: MODELO_COPY,
                contents,
            });

            const copyText = response.text || '';
            
            // Usar metadata real de Gemini si está disponible
            let inputTokens = 0;
            let outputTokens = 0;
            let totalTokens = 0;

            if (response.usageMetadata) {
                inputTokens = response.usageMetadata.promptTokenCount || 0;
                outputTokens = response.usageMetadata.candidatesTokenCount || 0;
                totalTokens = response.usageMetadata.totalTokenCount || (inputTokens + outputTokens);
            } else {
                // Fallback a estimación por si la API cambia
                inputTokens = Math.ceil(prompt.length / 4);
                outputTokens = Math.ceil(copyText.length / 4);
                totalTokens = inputTokens + outputTokens;
            }

            // Costo real separado por input/output según tabla de precios del modelo
            const costoEstimado = calcularCostoIA(MODELO_COPY, inputTokens, outputTokens);

            // 5. Guardar resultado (y persistir el override si llegó customPrompt para re-generación futura)
            if (override && (customPrompt && customPrompt.trim())) {
                db.prepare(`
                    UPDATE publicaciones 
                    SET copy_ia_original = ?, copy_final = ?, prompt_copy = ?
                    WHERE id = ?
                `).run(copyText, copyText, override, publicacionId);
            } else {
                db.prepare(`
                    UPDATE publicaciones 
                    SET copy_ia_original = ?, copy_final = ?
                    WHERE id = ?
                `).run(copyText, copyText, publicacionId);
            }

            // 6. Registrar en logs
            db.prepare(`
                INSERT INTO ai_token_logs (user_id, marca_id, publicacion_id, modelo_ia, tarea, prompt_utilizado, tokens_prompt, tokens_completion, tokens_totales, costo_estimado)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId, pub.marca_id, publicacionId, MODELO_COPY, 
                'Generación Copy Publicación', prompt, inputTokens, outputTokens, totalTokens, costoEstimado
            );

            return copyText;
        } catch (error) {
            console.error('[IAContentService] Error llamando a Gemini:', error);
            throw new Error('Error al generar el copy con IA');
        }
    }

    static async generarImagenEditada(publicacionId: number, userId: string, base64Image: string | null, fallbackData?: any, index?: number, customPrompt?: string, brandAssets?: Array<{ nombre: string; tipo: string; mimeType: string; base64: string }>, isCrear?: boolean): Promise<string> {
        // Importación perezosa (lazy) para evitar problemas de dependencia circular
        const { SharePointService } = await import('./sharepoint-service');

        // 1. Intentar obtener la publicación (para el system prompt)
        let pub = db.prepare(`
            SELECT p.*, m.nombre as marca_nombre, m.prompt_sistema, f.nombre as formato_nombre, f.aspect_ratio
            FROM publicaciones p
            JOIN marcas m ON p.marca_id = m.id
            LEFT JOIN formatos f ON p.formato_id = f.id
            WHERE p.id = ? AND p.user_id = ?
        `).get(publicacionId, userId) as any;

        // Si no existe (estamos usando el mockup visual del front sin guardar en DB aún), usamos el fallback
        if (!pub) {
            if (fallbackData && fallbackData.brand) {
                const marca = db.prepare('SELECT nombre as marca_nombre, prompt_sistema FROM marcas WHERE nombre = ?').get(fallbackData.brand) as any;
                const formato = fallbackData.format ? db.prepare('SELECT nombre as formato_nombre, aspect_ratio FROM formatos WHERE nombre = ? OR aspect_ratio = ?').get(fallbackData.format, fallbackData.format) as any : null;
                pub = {
                    titulo: fallbackData.title || '',
                    contexto: fallbackData.context || '',
                    objetivo: fallbackData.objective || '',
                    marca_nombre: marca?.marca_nombre || fallbackData.brand,
                    prompt_sistema: marca?.prompt_sistema || '',
                    formato_nombre: formato?.formato_nombre || fallbackData.format || '',
                    aspect_ratio: formato?.aspect_ratio || ''
                };
            } else {
                throw new Error('Publicación no encontrada y sin datos de respaldo (fallback)');
            }
        }

        // Preparar la instrucción de Relación de Aspecto
        const aspectText = pub.aspect_ratio 
            ? `Relación de Aspecto requerida: ${pub.aspect_ratio}${pub.formato_nombre ? ` (${pub.formato_nombre})` : ''}. Adapta la composición visual y el encuadre estrictamente a esta proporción.`
            : (pub.formato_nombre ? `Relación de Aspecto/Formato requerido: ${pub.formato_nombre}. Adapta la composición.` : '');

        // 2. Construir Prompt Visual basado en la marca (inyectando SIEMPRE la relación de aspecto)
        // Cada llamada genera un seed único para garantizar variedad en las regeneraciones
        const variationSeed = Math.floor(Math.random() * 99999);
        const basePrompt = customPrompt ? customPrompt.replace('[variation:0]', `[variation:${variationSeed}]`) : `
            ${pub.prompt_sistema || 'Aplica los estilos de marca por defecto.'}
            Contexto del producto: ${pub.titulo}. ${pub.contexto || ''}.
            Objetivo: ${pub.objetivo || 'Interacción'}.
            [variation:${variationSeed}]
        `.trim();

        const promptVisual = aspectText ? `${basePrompt}\n\n${aspectText}` : basePrompt;

        console.log('[IAContentService] Enviando imagen a Gemini | seed:', variationSeed, '| marca:', pub.prompt_sistema?.substring(0, 60) + '...');

        let finalBase64: string | null = base64Image;

        const modoCrear = !!isCrear;

        if (modoCrear && !customPrompt?.trim()) {
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

            // Obtener manuales de marca para condicionar el diseño (omitiendo PDFs pesados para no exceder el límite de 131,072 tokens de Gemini Flash Image)
            const { manualParts, manualText, filenames } = getBrandManualParts(pub.marca_id, { skipPdf: true, maxFileSizeBytes: 2 * 1024 * 1024 });
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
            const promptVisualFinal = modoCrear
                ? `Crea una imagen original desde cero siguiendo estrictamente las instrucciones a continuación (no edites ni transformes ninguna imagen existente).\n\n${promptVisual}`
                : promptVisual;

            const textPromptPart = {
                text: `${promptVisualFinal}${modoCrear ? `\n\nGenera UNA sola imagen nueva y nítida.` : ''}${manualText ? '\n' + manualText : ''}${filenames.length ? `\n\nManual de marca adjunto (${filenames.join(', ')}): Sigue rigurosamente la paleta de colores, tipografías, guía de estilo y composición definidas en el manual.` : ''}${brandAssets?.length ? `\n\nAssets de marca incluidos: ${brandAssets.map(a => `${a.tipo} "${a.nombre}"`).join(', ')}. Intégralos en la composición.` : ''}`
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
                    responseModalities: ['IMAGE', 'TEXT'],
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

            // Registrar consumo de tokens directamente desde la respuesta de Gemini
            const inputTokens  = response.usageMetadata?.promptTokenCount     ?? 0;
            const outputTokens = response.usageMetadata?.candidatesTokenCount  ?? 0;
            const totalTokens  = response.usageMetadata?.totalTokenCount       ?? (inputTokens + outputTokens);
            // Costo real separado por input/output según tabla de precios del modelo
            const costoEstimado = calcularCostoIA(MODELO_IMAGEN, inputTokens, outputTokens);

            db.prepare(`
                INSERT INTO ai_token_logs 
                (user_id, marca_id, publicacion_id, modelo_ia, tarea, prompt_utilizado, tokens_prompt, tokens_completion, tokens_totales, costo_estimado)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId,
                pub.marca_id ?? null,
                publicacionId ?? null,
                MODELO_IMAGEN,
                'Edición de Imagen con Prompt de Marca',
                promptVisual,
                inputTokens, outputTokens, totalTokens, costoEstimado
            );
            console.log(`[IAContentService] 🪙 Tokens registrados — prompt: ${inputTokens}, completion: ${outputTokens}, costo: $${costoEstimado.toFixed(6)}`);

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

        // 3. Subir la imagen al SharePoint (Mock por ahora — guarda en static/uploads/)
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
                    carouselData.push({ imagePreview: null, imageName: '', imageBase64: '', prompt: '', modo: 'editar' });
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

                db.prepare(`UPDATE publicaciones SET carousel_images = ? WHERE id = ?`)
                  .run(JSON.stringify(carouselData), publicacionId);
                console.log(`[IAContentService] ✅ URL de imagen guardada en publicaciones.carousel_images (índice ${index})`);
            } else {
                // Es una imagen única
                db.prepare(`UPDATE publicaciones SET sharepoint_item_id = ?, image_name = ? WHERE id = ?`)
                  .run(sharepointUrl, imageName, publicacionId);
                console.log(`[IAContentService] ✅ URL de imagen guardada en publicaciones.sharepoint_item_id`);
            }
        } catch (e) {
            console.warn('[IAContentService] No se pudo guardar la URL en publicaciones:', e);
        }

        return sharepointUrl;
    }
}
