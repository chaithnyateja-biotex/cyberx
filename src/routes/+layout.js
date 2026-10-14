// Pure client-side app: every visual system (canvas, Web Audio, GSAP) is
// browser-only, so there is nothing meaningful to render on the server.
export const prerender = true;
export const ssr = false;
export const trailingSlash = 'always';
