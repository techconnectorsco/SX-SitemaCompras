
// ARCHIVO: src/lib/services/index.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import { ClientesService } from './clientes.service';
import { AutomatizacionesService } from './automatizaciones.service';
import { ProyectosService } from './proyectos.service';
import { SolicitudesService } from './solicitudes.service';
import { MensajesService } from './mensajes.service';

/**
 * Factory para crear servicios con el cliente de Supabase
 */
export function createServices(supabase: SupabaseClient) {
	return {
		clientes: new ClientesService(supabase),
		automatizaciones: new AutomatizacionesService(supabase),
		proyectos: new ProyectosService(supabase),
		solicitudes: new SolicitudesService(supabase),
		mensajes: new MensajesService(supabase)
	};
}

export type Services = ReturnType<typeof createServices>;