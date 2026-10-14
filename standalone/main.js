/**
 * Standalone entry point.
 *
 * Mounts the same App component the SvelteKit route uses, but as a plain
 * Vite build so the whole thing can be emitted as one self-contained HTML
 * file (fonts, styles and scripts all inlined).
 */
import '../src/app.css';
import { mount } from 'svelte';
import App from '../src/lib/App.svelte';

mount(App, { target: document.getElementById('app') });
