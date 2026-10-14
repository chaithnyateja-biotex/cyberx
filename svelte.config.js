import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),
		// Relative asset paths so the production build also works when opened
		// straight off disk (file://) or served from a sub-path.
		paths: { relative: true },
		appDir: 'app'
	}
};

export default config;
