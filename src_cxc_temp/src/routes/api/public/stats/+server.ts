
// ARCHIVO: src/routes/api/public/stats/+server.ts


import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase-admin';

export const GET: RequestHandler = async () => {
	try {
		// Contar automatizaciones activas
		const { count: totalAutos } = await supabaseAdmin
			.from('automatizaciones')
			.select('*', { count: 'exact', head: true })
			.eq('esta_activa', true);

		// Contar ejecuciones exitosas
		const { count: totalExitosas } = await supabaseAdmin
			.from('ejecuciones')
			.select('*', { count: 'exact', head: true })
			.eq('estado', 'Exitoso');

		// Contar total ejecuciones
		const { count: totalEjecuciones } = await supabaseAdmin
			.from('ejecuciones')
			.select('*', { count: 'exact', head: true });

		// Contar clientes activos (que tienen al menos una automatización)
		const { data: clientesConAutos } = await supabaseAdmin
			.from('automatizaciones')
			.select('cliente_id')
			.eq('esta_activa', true);

		const clientesUnicos = new Set(clientesConAutos?.map((a) => a.cliente_id) || []);

		// Calcular tasa de éxito global
		const tasaExito =
			totalEjecuciones && totalEjecuciones > 0
				? Math.round(((totalExitosas || 0) / totalEjecuciones) * 1000) / 10
				: 0;

		// Obtener tipos únicos de automatización
		const { data: tipos } = await supabaseAdmin
			.from('automatizaciones')
			.select('tipo')
			.eq('esta_activa', true);

		const tiposUnicos = [...new Set(tipos?.map((t) => t.tipo).filter(Boolean) || [])];

		// Formatear para display público (sin datos exactos sensibles)
		const stats = {
			total_automatizaciones_activas: totalAutos || 0,
			total_ejecuciones_exitosas: formatearNumeroPublico(totalExitosas || 0),
			clientes_activos: clientesUnicos.size,
			tasa_exito_global: `${tasaExito}%`,
			tipos_automatizacion: tiposUnicos
		};

		return json({ stats });
	} catch (err) {
		console.error('[api/public/stats] Error:', err);
		return json({
			stats: {
				total_automatizaciones_activas: 0,
				total_ejecuciones_exitosas: '0',
				clientes_activos: 0,
				tasa_exito_global: '0%',
				tipos_automatizacion: []
			}
		});
	}
};

/**
 * Formatea números para display público (ej: 5432 → "5,000+")
 */
function formatearNumeroPublico(n: number): string {
	if (n < 100) return `${n}`;
	if (n < 1000) return `${Math.floor(n / 100) * 100}+`;
	if (n < 10000) return `${Math.floor(n / 1000)},000+`;
	return `${Math.floor(n / 1000)},000+`;
}