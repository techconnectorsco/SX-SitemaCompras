/**
 * Estado del chat compartido durante la sesión de navegación.
 * Mantiene los mensajes y el costo vivos aunque el usuario cambie de ruta
 * (ej: pasar de compras a finanzas). Se reinicia al recargar la página
 * completa; la persistencia de 24h la maneja el historial del backend.
 *
 * Svelte 5: usamos un objeto con runes ($state) exportado como singleton.
 */

import type { MensajeUI } from './tipos';

function crearEstadoChat() {
	let mensajes = $state<MensajeUI[]>([]);
	let costoSesion = $state(0);
	let moneda = $state('USD');
	let historialCargado = $state(false);
	// Id de conversación estable para toda la sesión de navegación.
	const conversacionId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

	return {
		get mensajes() { return mensajes; },
		set mensajes(v: MensajeUI[]) { mensajes = v; },
		get costoSesion() { return costoSesion; },
		set costoSesion(v: number) { costoSesion = v; },
		get moneda() { return moneda; },
		set moneda(v: string) { moneda = v; },
		get historialCargado() { return historialCargado; },
		set historialCargado(v: boolean) { historialCargado = v; },
		get conversacionId() { return conversacionId; },
		reiniciar() {
			mensajes = [];
			costoSesion = 0;
			historialCargado = false;
		}
	};
}

/** Singleton: el mismo estado para todas las instancias del widget en la sesión. */
export const chatStore = crearEstadoChat();