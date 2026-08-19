import type { SupabaseClient } from '@supabase/supabase-js';

// ==========================================
// INTERFACES
// ==========================================

export interface UploadResult {
    url: string | null;
    error: string | null;
    metadata?: {
        size: number;
        type: string;
        name: string;
    };
}

export interface UploadProgress {
    fileName: string;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
}

// ==========================================
// FUNCIÓN PRINCIPAL: SUBIR ARCHIVO
// ==========================================

/**
 * Sube un archivo (imagen, video o documento) a Supabase Storage
 * * @param file - File object del navegador
 * @param folder - Carpeta donde guardar (ej: finca_id o user_id)
 * @param bucket - Nombre del bucket ('propiedades-multimedia' o 'propiedades-documentos')
 * @param supabase - Instancia del cliente Supabase autenticado
 * @returns URL pública del archivo o error
 */
export async function uploadFileToStorage(
    file: File,
    folder: string,
    bucket: 'propiedades-multimedia' | 'propiedades-documentos' = 'propiedades-multimedia',
    supabase: SupabaseClient
): Promise<UploadResult> {
    try {
        // 1. VERIFICACIÓN DE SESIÓN (CRÍTICO PARA EVITAR ERROR RLS)
        // Usamos la instancia pasada que debe tener la sesión activa
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            console.error('❌ Error: Cliente Supabase sin sesión.');
            return { url: null, error: 'No se detectó sesión de usuario. Por favor recarga la página.' };
        }

        // 2. VALIDACIONES BÁSICAS
        if (!file) {
            return { url: null, error: 'No se proporcionó archivo' };
        }

        // 3. VALIDACIÓN DE TAMAÑO Y TIPO POR BUCKET
        if (bucket === 'propiedades-multimedia') {
            // Fotos: máximo 10 MB
            if (file.type.startsWith('image/') && file.size > 10 * 1024 * 1024) {
                return {
                    url: null,
                    error: 'Las fotos no pueden superar 10 MB. Por favor, comprime la imagen.'
                };
            }
            
            // Videos: máximo 50 MB
            if (file.type.startsWith('video/') && file.size > 50 * 1024 * 1024) {
                return {
                    url: null,
                    error: 'Los videos no pueden superar 50 MB (aprox. 3-4 min).'
                };
            }
        }
        
        // Documentos: máximo 20 MB
        if (bucket === 'propiedades-documentos' && file.size > 20 * 1024 * 1024) {
            return {
                url: null,
                error: 'Los documentos no pueden superar 20 MB'
            };
        }

        // Validar tipo de archivo permitido
        const isValid = validateFileType(file, bucket);
        if (!isValid) {
            return {
                url: null,
                error: 'Tipo de archivo no permitido'
            };
        }

        // 4. GENERAR NOMBRE ÚNICO
        const fileName = generateUniqueFileName(file, folder);

        // console.log(`📤 Subiendo a ${bucket}:`, { fileName, size: file.size, user: session.user.email });

        // 5. SUBIR A STORAGE
        const { data, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type
            });

        if (uploadError) {
            console.error('❌ Error subiendo:', uploadError);
            return { url: null, error: uploadError.message };
        }

        // 6. OBTENER URL PÚBLICA
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

        // console.log('✅ Archivo subido exitosamente:', urlData.publicUrl);

        return {
            url: urlData.publicUrl,
            error: null,
            metadata: {
                size: file.size,
                type: file.type,
                name: file.name
            }
        };
    } catch (err) {
        console.error('❌ Error inesperado:', err);
        return { url: null, error: String(err) };
    }
}

// ==========================================
// FUNCIÓN: SUBIR MÚLTIPLES ARCHIVOS
// ==========================================

/**
 * Sube múltiples archivos en paralelo
 * * @param files - Array de Files
 * @param folder - Carpeta base
 * @param bucket - Bucket destino
 * @param supabase - Instancia del cliente Supabase autenticado
 * @param onProgress - Callback para reportar progreso
 * @returns Array de resultados
 */
export async function uploadMultipleFiles(
    files: File[],
    folder: string,
    bucket: 'propiedades-multimedia' | 'propiedades-documentos' = 'propiedades-multimedia',
    supabase: SupabaseClient,
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    // Subir archivos en lotes (batch) de 3 para no saturar la red
    const batchSize = 3;
    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        const batchPromises = batch.map(async (file) => {
            // Reportar inicio
            if (onProgress) {
                onProgress({
                    fileName: file.name,
                    progress: 0,
                    status: 'uploading'
                });
            }

            // Subir archivo PASANDO LA INSTANCIA DE SUPABASE
            const result = await uploadFileToStorage(file, folder, bucket, supabase);

            // Reportar resultado
            if (onProgress) {
                onProgress({
                    fileName: file.name,
                    progress: 100,
                    status: result.error ? 'error' : 'completed'
                });
            }

            return result;
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }

    return results;
}

// ==========================================
// FUNCIÓN: ELIMINAR ARCHIVO
// ==========================================

/**
 * Elimina un archivo de Storage
 * * @param url - URL completa del archivo
 * @param bucket - Bucket donde está el archivo
 * @param supabase - Instancia del cliente Supabase autenticado
 * @returns true si se eliminó, false si hubo error
 */
export async function deleteFileFromStorage(
    url: string,
    bucket: 'propiedades-multimedia' | 'propiedades-documentos' = 'propiedades-multimedia',
    supabase: SupabaseClient
): Promise<{ success: boolean; error: string | null }> {
    try {
        // Extraer path del archivo desde la URL
        const filePath = extractFilePathFromUrl(url, bucket);

        if (!filePath) {
            return { success: false, error: 'No se pudo extraer la ruta del archivo' };
        }

        // console.log('🗑️ Eliminando archivo:', filePath);

        // Usar la instancia pasada
        const { error } = await supabase.storage.from(bucket).remove([filePath]);

        if (error) {
            console.error('❌ Error eliminando:', error);
            return { success: false, error: error.message };
        }

        // console.log('✅ Archivo eliminado exitosamente');
        return { success: true, error: null };
    } catch (err) {
        console.error('❌ Error inesperado:', err);
        return { success: false, error: String(err) };
    }
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

/**
 * Genera nombre único para el archivo
 */
function generateUniqueFileName(file: File, folder: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    // Limpiar extensión
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    // Limpiar nombre de carpeta
    const sanitizedFolder = folder.replace(/[^a-zA-Z0-9-_]/g, '_');

    return `${sanitizedFolder}/${timestamp}-${randomStr}.${ext}`;
}

/**
 * Valida que el tipo de archivo sea permitido
 */
function validateFileType(
    file: File,
    bucket: 'propiedades-multimedia' | 'propiedades-documentos'
): boolean {
    if (bucket === 'propiedades-multimedia') {
        // Permitir imágenes y videos comunes
        return (
            file.type.startsWith('image/') ||
            file.type.startsWith('video/') ||
            ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'].includes(
                file.type
            )
        );
    } else {
        // Permitir documentos comunes
        return (
            file.type === 'application/pdf' ||
            file.type === 'application/msword' || // .doc
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // .docx
            file.type === 'application/vnd.ms-excel' || // .xls
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // .xlsx
            file.type === 'text/plain'
        );
    }
}

/**
 * Extrae el path del archivo desde la URL completa
 */
function extractFilePathFromUrl(url: string, bucket: string): string | null {
    try {
        // Formato esperado: https://proyecto.supabase.co/storage/v1/object/public/bucket/path/file.jpg
        const parts = url.split(`/storage/v1/object/public/${bucket}/`);
        return parts[1] || null;
    } catch {
        return null;
    }
}

/**
 * Obtiene información de un archivo para UI
 */
export function getFileInfo(file: File) {
    return {
        name: file.name,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        type: file.type,
        isImage: file.type.startsWith('image/'),
        isVideo: file.type.startsWith('video/'),
        isDocument: !file.type.startsWith('image/') && !file.type.startsWith('video/')
    };
}

/**
 * Formatea el tamaño del archivo
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Genera thumbnail de una imagen (opcional, para previsualización rápida)
 */
export async function generateImageThumbnail(file: File, maxWidth = 300): Promise<string | null> {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ratio = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * ratio;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

                resolve(canvas.toDataURL());
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}