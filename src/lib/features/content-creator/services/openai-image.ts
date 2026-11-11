export const OPENAI_IMAGE_MODEL = 'gpt-image-2.5-sunburst';
type Part = { text?: string; inlineData?: { mimeType: string; data: string } };
export type ImageUsage = {
	input_tokens: number;
	output_tokens: number;
	total_tokens: number;
	input_tokens_details?: { text_tokens?: number; image_tokens?: number };
};

export function imageSize(ratio = '1:1'): string {
	const [w, h] = ratio.split(':').map(Number);
	if (!w || !h || !Number.isFinite(w / h) || w / h < 1 / 3 || w / h > 3)
		throw new Error('Proporción no compatible con OpenAI');
	const scale = 1024 / Math.min(w, h);
	return `${Math.round((w * scale) / 16) * 16}x${Math.round((h * scale) / 16) * 16}`;
}

export function imageCost(usage: ImageUsage): number {
	const image = usage.input_tokens_details?.image_tokens ?? 0;
	const text = usage.input_tokens_details?.text_tokens ?? usage.input_tokens - image;
	return (text * 5 + image * 8 + usage.output_tokens * 30) / 1_000_000;
}

export async function generateOpenAIImage(parts: Part[], ratio: string, apiKey: string) {
	if (!apiKey.trim()) throw new Error('Falta configurar OPENAI_API_KEY en el servidor');
	const prompt = parts
		.filter((p) => p.text)
		.map((p) => p.text)
		.join('\n\n');
	const images = parts.filter((p) => p.inlineData).map((p) => ({...p.inlineData!, data: p.inlineData!.data.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')}));
	if (!prompt || prompt.length > 32000)
		throw new Error('El prompt de imagen debe contener entre 1 y 32000 caracteres');
	if (images.length > 16) throw new Error('OpenAI admite hasta 16 imágenes de referencia');
	for (const image of images) {
		if (
			!['image/png', 'image/jpeg', 'image/webp'].includes(image.mimeType) ||
			!image.data ||
			Buffer.byteLength(image.data, 'base64') > 15 * 1024 * 1024
		)
			throw new Error('Imagen de referencia no compatible con OpenAI');
	}
	const response = await fetch(
		`https://api.openai.com/v1/images/${images.length ? 'edits' : 'generations'}`,
		{
			method: 'POST',
			headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
			signal: AbortSignal.timeout(180000),
			body: JSON.stringify({
				model: OPENAI_IMAGE_MODEL,
				prompt,
				n: 1,
				quality: 'high',
				size: imageSize(ratio || '1:1'),
				output_format: 'png',
				...(images.length
					? { images: images.map((i) => ({ image_url: `data:${i.mimeType};base64,${i.data}` })) }
					: {})
			})
		}
	);
	if (!response.ok)
		throw new Error(
			`OpenAI no pudo generar la imagen (HTTP ${response.status}). Revisa acceso, saldo y límites del proveedor.`
		);
	const result = await response.json();
	const data = result.data?.[0]?.b64_json;
	if (typeof data !== 'string' || !data || !/^[A-Za-z0-9+/]+={0,2}$/.test(data))
		throw new Error('OpenAI no devolvió una imagen válida');
	const bytes = Buffer.from(data, 'base64');
	if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
		throw new Error('OpenAI no devolvió una imagen PNG válida');
	return { image: { mimeType: 'image/png', data }, usage: result.usage as ImageUsage | undefined };
}
