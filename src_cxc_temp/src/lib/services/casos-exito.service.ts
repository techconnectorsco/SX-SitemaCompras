import type { SupabaseClient } from '@supabase/supabase-js';

export interface StatPublica {
	valor: string;
	label: string;
}

export interface MetricasPublicas {
	stats: StatPublica[];
	icon?: string;
}

export interface CasoExito {
	id: string;
	titulo: string;
	descripcion: string;
	industria: string | null;
	tipo_automatizacion: string | null;
	metricas_publicas: MetricasPublicas | null;
	imagen_url: string | null;
	orden: number | null;
	mostrar_cliente: boolean | null;
	clientes: {
    nombre: string;
    logo_url: string | null;
    slug: string;
} | null;
}

export async function getCasosExitoPublicos(supabase: SupabaseClient): Promise<CasoExito[]> {
	const { data, error } = await supabase
		.from('casos_exito')
		.select(`
			id, titulo, descripcion, industria, tipo_automatizacion,
			metricas_publicas, imagen_url, orden,
			mostrar_cliente,
			clientes (
				nombre,
    logo_url,
    slug
			)
		`)
		.eq('esta_publicado', true)
		.order('orden', { ascending: true });

	if (error) {
		console.error('[casos-exito.service] Error:', error.message);
		return [];
	}

	return data ?? [];
}