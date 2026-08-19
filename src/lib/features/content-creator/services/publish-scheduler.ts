import db from '$lib/config/db-config';
import { FacebookService } from './facebook-service';
import { InstagramService } from './meta/instagram-service';
import { ensureFreshToken } from './meta/meta-account-repo';

function extraerUrlsCarrusel(rawCarousel: unknown): string[] {
    if (typeof rawCarousel !== 'string') return [];

    try {
        const carousel = JSON.parse(rawCarousel);
        if (!Array.isArray(carousel)) return [];

        return carousel
            .map((item: unknown) => {
                if (typeof item === 'string') return item.trim();
                if (!item || typeof item !== 'object') return '';
                const slide = item as Record<string, unknown>;
                const value = slide.imagePreview || slide.url || slide.src || slide.path;
                return typeof value === 'string' ? value.trim() : '';
            })
            .filter((url): url is string => url.length > 0);
    } catch {
        return [];
    }
}

export interface ProcessedPostResult {
    id: number;
    titulo: string;
    success: boolean;
    metaPostId?: string;
    error?: string;
}

export class PublishScheduler {
    private static isRunning = false;
    private static timerId: NodeJS.Timeout | null = null;

    /**
     * Verifica y publica todas las publicaciones programadas cuya fecha_programada haya llegado.
     */
    static async processScheduledPosts(): Promise<ProcessedPostResult[]> {
        if (this.isRunning) {
            console.log('[PublishScheduler] ⏳ Ejecución previa en curso, omitiendo ciclo actual...');
            return [];
        }

        this.isRunning = true;
        const results: ProcessedPostResult[] = [];

        try {
            const now = Math.floor(Date.now() / 1000);
            
            // Buscar publicaciones que:
            // 1. No estén eliminadas (deleted_at IS NULL)
            // 2. Tengan estado exclusivamente 'Aprobado' o 'Programado' (NUNCA 'Borrador')
            // 3. Tengan fecha_programada <= tiempo actual (en segundos unix)
            // 4. No hayan excedido el límite de reintentos por error (< 3 reintentos)
            const query = `
                SELECT p.id, p.user_id, p.titulo, p.copy_final, p.fecha_programada,
                       p.sharepoint_item_id, p.carousel_images, p.es_carrusel,
                       p.retry_count, p.estado, p.cuenta_id
                FROM publicaciones p
                WHERE p.deleted_at IS NULL
                  AND (p.published = 0 OR p.published IS NULL)
                  AND p.estado IN ('Aprobado', 'Programado')
                  AND p.fecha_programada IS NOT NULL
                  AND p.fecha_programada <= ?
                  AND (p.retry_count IS NULL OR p.retry_count < 3)
                ORDER BY p.fecha_programada ASC
            `;

            const pendingPosts = db.prepare(query).all(now) as any[];

            if (pendingPosts.length > 0) {
                console.log(`\n==================================================`);
                console.log(`[PublishScheduler] 🔍 Se encontraron ${pendingPosts.length} publicación(es) programada(s) lista(s) para enviar.`);
                console.log(`==================================================`);

                for (const post of pendingPosts) {
                    const message = typeof post.copy_final === 'string' ? post.copy_final.trim() : '';
                    if (!message) {
                        const errorMsg = 'La publicación no tiene copy final. Agrega el copy y vuelve a aprobarla antes de enviarla a Meta.';
                        db.prepare(`
                            UPDATE publicaciones
                            SET estado = 'Error API',
                                api_error_log = ?,
                                updated_at = ?
                            WHERE id = ?
                        `).run(errorMsg, now, post.id);
                        console.error(`[PublishScheduler] ❌ Post ID #${post.id} sin copy final — no se enviará a Meta.`);
                        results.push({ id: post.id, titulo: post.titulo, success: false, error: errorMsg });
                        continue;
                    }

                    // Validar que tenga cuenta_id (FASE 4: no hay fallback .env)
                    const cuentaId = post.cuenta_id as number | null;
                    if (!cuentaId) {
                        const errorMsg = 'La publicación no tiene cuenta_id asignada. Edítala en el cronograma y selecciona una cuenta Meta.';
                        db.prepare(`
                            UPDATE publicaciones
                            SET estado = 'Error API',
                                api_error_log = ?,
                                retry_count = COALESCE(retry_count, 0) + 1,
                                ultimo_reintento_at = ?,
                                updated_at = ?
                            WHERE id = ?
                        `).run(errorMsg, now, now, post.id);
                        console.error(`[PublishScheduler] ❌ Post ID #${post.id} sin cuenta_id — marcado Error API.`);
                        results.push({ id: post.id, titulo: post.titulo, success: false, error: errorMsg });
                        continue;
                    }

                    // Refrescar token si está próximo a expirar
                    const cuenta = await ensureFreshToken(cuentaId);
                    if (!cuenta) {
                        const errorMsg = `Cuenta ${cuentaId} revocada o sin token. Re-conéctala vía OAuth.`;
                        db.prepare(`
                            UPDATE publicaciones
                            SET estado = 'Error API',
                                api_error_log = ?,
                                retry_count = COALESCE(retry_count, 0) + 1,
                                ultimo_reintento_at = ?,
                                updated_at = ?
                            WHERE id = ?
                        `).run(errorMsg, now, now, post.id);
                        console.error(`[PublishScheduler] ❌ Post ID #${post.id}: ${errorMsg}`);
                        results.push({ id: post.id, titulo: post.titulo, success: false, error: errorMsg });
                        continue;
                    }

                    // Determinar URL/Ruta de la imagen si está disponible
                    let imageUrl: string | undefined = undefined;
                    let carouselImageUrls: string[] = [];
                    const esCarrusel = post.es_carrusel === 1;
                    const rawImage = post.sharepoint_item_id;

                    if (esCarrusel && post.carousel_images) {
                        carouselImageUrls = extraerUrlsCarrusel(post.carousel_images);
                        if (carouselImageUrls.length > 0) {
                            imageUrl = carouselImageUrls[0];
                        }
                    } else if (rawImage && typeof rawImage === 'string' && rawImage.trim().length > 0) {
                        imageUrl = rawImage.trim();
                    }

                    if (esCarrusel && carouselImageUrls.length < 2) {
                        const errorMsg = `El carrusel no tiene al menos 2 imágenes válidas persistidas (${carouselImageUrls.length} encontrada(s)).`;
                        db.prepare(`
                            UPDATE publicaciones
                            SET estado = 'Error API',
                                api_error_log = ?,
                                retry_count = COALESCE(retry_count, 0) + 1,
                                ultimo_reintento_at = ?,
                                updated_at = ?
                            WHERE id = ?
                        `).run(errorMsg, now, now, post.id);
                        console.error(`[PublishScheduler] ❌ Post ID #${post.id}: ${errorMsg}`);
                        results.push({ id: post.id, titulo: post.titulo, success: false, error: errorMsg });
                        continue;
                    }

                    const fechaStr = new Date(post.fecha_programada * 1000).toLocaleString();
                    console.log(`[PublishScheduler] 🚀 PROCESANDO Post ID #${post.id}: "${post.titulo}" (Cuenta: ${cuentaId} | Programado para: ${fechaStr})`);

                    // Resolver redes destino desde publicacion_redes (1=FB, 2=IG)
                    const redesRows = db.prepare(
                        `SELECT red_social_id FROM publicacion_redes WHERE publicacion_id = ?`
                    ).all(post.id) as { red_social_id: number }[];
                    const destinos = redesRows.map(r => r.red_social_id);

                    // Sin redes destino asignadas → error explícito (no fallback a FB)
                    if (destinos.length === 0) {
                        const errorMsg = 'La publicación no tiene redes destino asignadas. Edítala en el cronograma y selecciona al menos una red social.';
                        db.prepare(`
                            UPDATE publicaciones
                            SET estado = 'Error API',
                                api_error_log = ?,
                                retry_count = COALESCE(retry_count, 0) + 1,
                                ultimo_reintento_at = ?,
                                updated_at = ?
                            WHERE id = ?
                        `).run(errorMsg, now, now, post.id);
                        console.error(`[PublishScheduler] ❌ Post ID #${post.id} sin redes destino — marcado Error API.`);
                        results.push({ id: post.id, titulo: post.titulo, success: false, error: errorMsg });
                        continue;
                    }

                    // Publicar a cada red destino
                    let anySuccess = false;
                    let lastError: string | undefined;
                    let lastPostId: string | undefined;

                    for (const redId of destinos) {
                    if (redId === 1) {
                        // Facebook
                        if (esCarrusel && carouselImageUrls.length >= 2) {
                            // Multi-imagen: publicar todas las imágenes del carrusel en un solo post.
                            console.log(`[PublishScheduler] 🖼️ Post ID #${post.id} — publicando ${carouselImageUrls.length} imágenes (multi-foto FB).`);
                            const pubResult = await FacebookService.publicarMultiFoto(
                                { message, imageUrls: carouselImageUrls },
                                cuentaId
                            );
                            if (pubResult.success) {
                                anySuccess = true;
                                lastPostId = pubResult.postId;
                                console.log(`[PublishScheduler] ✅ Post ID #${post.id} publicado en FB multi-foto (Meta Post ID: ${pubResult.postId || 'N/A'})`);
                            } else {
                                lastError = `[FB multi] ${pubResult.error || 'Error desconocido'}`;
                                console.error(`[PublishScheduler] ❌ FB multi falló Post ID #${post.id}: ${lastError}`);
                            }
                        } else {
                            const pubResult = await FacebookService.publicarPost(
                                { message, imageUrl },
                                cuentaId
                            );
                            if (pubResult.success) {
                                anySuccess = true;
                                lastPostId = pubResult.postId;
                                console.log(`[PublishScheduler] ✅ Post ID #${post.id} publicado en FB (Meta Post ID: ${pubResult.postId || 'N/A'})`);
                            } else {
                                lastError = `[FB] ${pubResult.error || 'Error desconocido'}`;
                                console.error(`[PublishScheduler] ❌ FB falló Post ID #${post.id}: ${lastError}`);
                            }
                        }
                    } else if (redId === 2) {
                            // Instagram
                            const igResult = esCarrusel
                                ? await InstagramService.publicarCarrusel(cuentaId, carouselImageUrls, message)
                                : (!imageUrl || !imageUrl.startsWith('https://'))
                                    ? { success: false, error: 'Instagram requiere imageUrl HTTPS pública.' }
                                    : await InstagramService.publicarMedia(cuentaId, {
                                        imageUrl,
                                        caption: message
                                    });
                            if (igResult.success) {
                                anySuccess = true;
                                lastPostId = igResult.postId;
                                console.log(`[PublishScheduler] ✅ Post ID #${post.id} publicado en IG (Post ID: ${igResult.postId || 'N/A'})`);
                            } else {
                                lastError = `[IG] ${igResult.error || 'Error desconocido'}`;
                                console.error(`[PublishScheduler] ❌ IG falló Post ID #${post.id}: ${lastError}`);
                            }
                        } else {
                            // Red destino no soportada para publicación automática (p.ej. SharePoint=4: solo guardar)
                            console.warn(`[PublishScheduler] ⚠️ Post ID #${post.id}: red_social_id=${redId} no tienePublisher——se omite (no es publicable automáticamente).`);
                        }
                    }

                    if (anySuccess) {
                        db.prepare(`
                            UPDATE publicaciones
                            SET estado = 'Publicado',
                                published = 1,
                                published_at = ?,
                                meta_post_id = ?,
                                api_error_log = NULL,
                                updated_at = ?
                            WHERE id = ?
                        `).run(now, lastPostId || null, now, post.id);

                        results.push({
                            id: post.id,
                            titulo: post.titulo,
                            success: true,
                            metaPostId: lastPostId
                        });
                    } else {
                        const newRetryCount = (post.retry_count || 0) + 1;
                        const errorMsg = lastError || 'Error desconocido al publicar';

                        db.prepare(`
                            UPDATE publicaciones
                            SET estado = 'Error API',
                                api_error_log = ?,
                                retry_count = ?,
                                ultimo_reintento_at = ?,
                                updated_at = ?
                            WHERE id = ?
                        `).run(errorMsg, newRetryCount, now, now, post.id);

                        console.error(`[PublishScheduler] ❌ Post ID #${post.id} falló en todas las redes. Intento ${newRetryCount}/3.`);
                        results.push({
                            id: post.id,
                            titulo: post.titulo,
                            success: false,
                            error: errorMsg
                        });
                    }
                }

                console.log(`[PublishScheduler] 🏁 Ciclo de publicaciones finalizado. Procesados: ${results.length}\n`);
            }
        } catch (error: any) {
            console.error('[PublishScheduler] 💥 Error crítico en el ciclo del scheduler:', error);
        } finally {
            this.isRunning = false;
        }

        return results;
    }

    /**
     * Inicia el scheduler periódico (ejecuta cada intervalMs milisegundos).
     * Por defecto se ejecuta cada 60 segundos (1 minuto).
     */
    static startScheduler(intervalMs = 60 * 1000) {
        // En Node/SvelteKit, evitamos duplicar intervals con esta propiedad global en desarrollo
        const globalRef = globalThis as any;
        if (globalRef.__publishSchedulerStarted) {
            return;
        }
        globalRef.__publishSchedulerStarted = true;

        if (this.timerId) {
            return;
        }

        console.log(`[PublishScheduler] ⏱️ Scheduler de publicaciones automáticas iniciado (Intervalo: ${intervalMs / 1000}s)`);
        
        // Ejecución inicial al arrancar el servidor
        this.processScheduledPosts();

        // Programar intervalo periódico
        this.timerId = setInterval(() => {
            this.processScheduledPosts();
        }, intervalMs);
    }

    /**
     * Detiene el scheduler si estuviera activo.
     */
    static stopScheduler() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
            (globalThis as any).__publishSchedulerStarted = false;
            console.log('[PublishScheduler] 🛑 Scheduler de publicaciones detenido.');
        }
    }
}
