import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./standalone', import.meta.url));

// Emits dist-single/index.html: one portable file with every asset —
// including the woff2 font subsets — inlined as base64.
export default defineConfig({
	root,
	base: './',
	plugins: [tailwindcss(), svelte(), viteSingleFile({ removeViteModuleLoader: true })],
	resolve: {
		alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) }
	},
	build: {
		target: 'es2022',
		outDir: fileURLToPath(new URL('./dist-single', import.meta.url)),
		emptyOutDir: true,
		assetsInlineLimit: 100_000_000,
		cssCodeSplit: false,
		reportCompressedSize: false
	}
});
