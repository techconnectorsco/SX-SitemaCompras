import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import Icons from 'unplugin-icons/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		Icons({
			compiler: 'svelte',
			autoInstall: true,
			scale: 1.2, // Scale of icons against 1em
			defaultStyle: '', // Style apply to icons
			defaultClass: '' // Class names apply to icons
		})
	],
	optimizeDeps: {
		exclude: ['chunk-GLY4YRBI', 'chunk-LEB4YL72', 'chunk-ZM77ZDA2']
	}
});
