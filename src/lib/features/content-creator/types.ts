export interface Marca {
    id: number;
    nombre: string;
    prompt_sistema: string | null;
}

export interface Formato {
    id: number;
    nombre: string;
    max_size_mb: number | null;
    max_duracion_sec: number | null;
    aspect_ratio: string | null;
}

export interface Audiencia {
    id: number;
    nombre: string;
}

export interface RedSocial {
    id: number;
    nombre: string;
}

export interface Cuenta {
    id: number;
    nombre: string;
    meta_facebook_page_id?: string | null;
    meta_instagram_id?: string | null;
}

export interface Publicacion {
    id: number;
    user_id: string;
    cuenta_id: number;
    marca_id: number;
    formato_id: number | null;
    audiencia_id: number | null;
    titulo: string;
    contexto: string | null;
    objetivo: string | null;
    cta: string | null;
    presupuesto_usd: number | null;
    copy_ia_original: string | null;
    copy_final: string | null;
    estado: 'Borrador' | 'En revisión' | 'Guardado' | 'Aprobado' | 'Publicado' | 'Error API';
    api_error_log: string | null;
    retry_count: number;
    notas_revision: string | null;
    aprobado_por: string | null;
    aprobado_at: number | null;
    campana: string | null;
    fecha_programada: number | null;
    meta_pauta_inicio?: number | null;
    meta_pauta_fin?: number | null;
    created_at: number;
    updated_at: number | null;
    // Relations that are loaded via JOINs
    marca?: string;
    formato?: string;
    audiencia?: string;
    redes?: string[]; // Array of network names
    cuenta?: string;
}

export interface CreatePublicacionDTO {
    titulo: string;
    cuenta_id: number;
    marca_id: number;
    formato_id?: number | null;
    audiencia_id?: number | null;
    contexto?: string | null;
    objetivo?: string | null;
    cta?: string | null;
    presupuesto_usd?: number | null;
    campana?: string | null;
    fecha_programada?: number | null;
    meta_pauta_inicio?: number | null;
    meta_pauta_fin?: number | null;
    redes_ids?: number[];
    estado?: 'Borrador' | 'En revisión' | 'Guardado';
}

export interface UpdatePublicacionDTO extends Partial<CreatePublicacionDTO> {
    copy_final?: string | null;
    estado?: 'Borrador' | 'En revisión' | 'Guardado' | 'Aprobado' | 'Publicado';
}

export interface FiltrosPublicacion {
    estado?: string;
    marca_id?: number;
    campana?: string;
    desde?: number;
    hasta?: number;
}

export interface DashboardStats {
    total: number;
    borradores: number;
    en_revision: number;
    aprobados: number;
    publicados: number;
    errores: number;
}

export interface CatalogosResponse {
    marcas: Marca[];
    formatos: Formato[];
    audiencias: Audiencia[];
    redes: RedSocial[];
    cuentas: Cuenta[];
}

export interface MarcaAsset {
    id: number;
    marca_id: number;
    nombre: string;
    tipo: 'logo' | 'isotipo' | 'sello' | 'fondo' | 'other';
    file_path: string;
    file_name: string | null;
    mime_type: string | null;
    file_size: number | null;
    created_at: number;
    deleted_at: number | null;
}
