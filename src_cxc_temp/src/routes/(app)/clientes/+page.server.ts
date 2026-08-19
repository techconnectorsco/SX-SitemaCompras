import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	// Clientes activos con sus automatizaciones y proyectos
	const { data: clientes } = await supabase
		.from('clientes')
		.select(`
			id, nombre, slug, descripcion, logo_url, sitio_web, esta_activo,
			automatizaciones ( id, esta_activa ),
			proyectos_software ( id )
		`)
		.eq('esta_activo', true)
		.order('nombre', { ascending: true });

	// Total de ejecuciones por cliente (via automatizaciones)
	const { data: ejecuciones } = await supabase
		.from('ejecuciones')
		.select('id, automatizaciones(cliente_id)');

	// Construir mapa cliente_id → total ejecuciones
	const ejecucionesMap: Record<string, number> = {};
	ejecuciones?.forEach((e: any) => {
		const cid = e.automatizaciones?.cliente_id;
		if (cid) ejecucionesMap[cid] = (ejecucionesMap[cid] ?? 0) + 1;
	});

	// Enriquecer clientes con stats
	const clientesEnriquecidos = (clientes ?? []).map((c: any) => ({
		id:            c.id,
		nombre:        c.nombre,
		slug:          c.slug,
		descripcion:   c.descripcion,
		logo_url:      c.logo_url,
		sitio_web:     c.sitio_web,
		botsActivos:   (c.automatizaciones ?? []).filter((a: any) => a.esta_activa).length,
		totalBots:     (c.automatizaciones ?? []).length,
		totalProyectos:(c.proyectos_software ?? []).length,
		totalEjecuciones: ejecucionesMap[c.id] ?? 0,
	}));

	// Stats globales
	const totalEjecuciones = Object.values(ejecucionesMap).reduce((a, b) => a + b, 0);
	const totalBots        = clientesEnriquecidos.reduce((s, c) => s + c.totalBots, 0);
	const totalProyectos   = clientesEnriquecidos.reduce((s, c) => s + c.totalProyectos, 0);

	return {
		session,
		user,
		clientes: clientesEnriquecidos,
		stats: { totalEjecuciones, totalBots, totalProyectos }
	};
};