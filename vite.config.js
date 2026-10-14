import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Standard SvelteKit build (npm run build -> ./build).
// The single-file bundle is a separate target: vite.standalone.config.js.
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	build: {
		target: 'es2022',
		chunkSizeWarningLimit: 1500
	},
	server: { port: 5173, strictPort: false }
});
