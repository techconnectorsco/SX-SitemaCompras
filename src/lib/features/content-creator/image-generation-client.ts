export type ImageGenerationEvent =
	| { phase: 'generating'; attempt: number; maxAttempts: number }
	| { phase: 'retrying'; attempt: number; maxAttempts: number; delayMs: number }
	| { phase: 'saving' }
	| { phase: 'success'; imageUrl: string }
	| { phase: 'error'; error: string };

export async function generateImageWithProgress(
	url: string,
	body: unknown,
	onProgress?: (event: ImageGenerationEvent) => void
): Promise<string> {
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
		body: JSON.stringify(body)
	});
	if (!response.ok || !response.body)
		throw new Error('No se pudo iniciar la generación de imagen.');

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let pending = '';
	let imageUrl: string | null = null;
	while (true) {
		const { done, value } = await reader.read();
		pending += decoder.decode(value ?? new Uint8Array(), { stream: !done });
		const messages = pending.split('\n\n');
		pending = messages.pop() ?? '';
		for (const message of messages) {
			const data = message
				.split('\n')
				.find((line) => line.startsWith('data: '))
				?.slice(6);
			if (!data) continue;
			const event = JSON.parse(data) as ImageGenerationEvent;
			onProgress?.(event);
			if (event.phase === 'success') imageUrl = event.imageUrl;
			if (event.phase === 'error') throw new Error(event.error);
		}
		if (done) break;
	}
	if (!imageUrl) throw new Error('La generación terminó sin una imagen válida.');
	return imageUrl;
}

export function imageProgressLabel(event: ImageGenerationEvent | null, creating = false): string {
	if (!event || event.phase === 'generating') return `${creating ? 'Creando' : 'Editando'} imagen…`;
	if (event.phase === 'retrying')
		return `Servicio ocupado. Reintentando (${event.attempt}/${event.maxAttempts})…`;
	if (event.phase === 'saving') return 'Guardando imagen…';
	return creating ? 'Creando imagen…' : 'Editando imagen…';
}
