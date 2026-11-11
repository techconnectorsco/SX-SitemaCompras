import db from '$lib/config/db-config';

export type ImageProvider = 'gemini' | 'openai';

db.exec(`CREATE TABLE IF NOT EXISTS content_image_settings (
 id INTEGER PRIMARY KEY CHECK(id = 1),
 provider TEXT NOT NULL CHECK(provider IN ('gemini', 'openai'))
)`);

export function getImageProvider(): ImageProvider {
	return (
		(
			db.prepare('SELECT provider FROM content_image_settings WHERE id=1').get() as
				| { provider: ImageProvider }
				| undefined
		)?.provider ?? 'gemini'
	);
}

export function setImageProvider(provider: ImageProvider): void {
	db.prepare(
		'INSERT INTO content_image_settings (id, provider) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET provider=excluded.provider'
	).run(provider);
}
