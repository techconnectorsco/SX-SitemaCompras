/**
 * Componentes del chat de IA. Uso:
 *   import { ChatWidget } from '$lib/components/ia-chat';
 */
export { default as ChatWidget } from './ChatWidget.svelte';
export { default as ChatButton } from './ChatButton.svelte';
export { default as ChatHeader } from './ChatHeader.svelte';
export { default as ChatBubble } from './ChatBubble.svelte';
export { default as ChatInput } from './ChatInput.svelte';
export { default as GestionIA } from './GestionIA.svelte';
export type { MensajeUI, CostoInteraccion, RespuestaApi, ContextoPantalla } from './tipos';