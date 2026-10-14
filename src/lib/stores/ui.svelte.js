/**
 * UI store — theme, navigation, viewport and motion preferences.
 * Svelte 5 runes in a plain module: one instance shared app-wide.
 */

const KEY = 'cyberx.ui.v1';

const canStore = () => typeof window !== 'undefined' && !!window.localStorage;

function load() {
	if (!canStore()) return {};
	try {
		return JSON.parse(localStorage.getItem(KEY) || '{}');
	} catch {
		return {};
	}
}

export const THEMES = [
	{ id: 'green', label: 'MATRIX GREEN', swatch: '#2dd45f' },
	{ id: 'blue', label: 'CYBER BLUE', swatch: '#22d3ee' },
	{ id: 'red', label: 'RED ALERT', swatch: '#fb4365' }
];

export const VIEWS = [
	{ id: 'dashboard', label: 'DASHBOARD', icon: 'layout-dashboard' },
	{ id: 'target', label: 'TARGET SELECTOR', icon: 'crosshair' },
	{ id: 'intercept', label: 'INTERCEPT MODULES', icon: 'radio-tower' },
	{ id: 'subsystems', label: 'SUBSYSTEM TAPS', icon: 'circuit-board' },
	{ id: 'timeline', label: 'ACTIVITY TIMELINE', icon: 'activity' },
	{ id: 'terminal', label: 'TERMINAL CONSOLE', icon: 'terminal' },
	{ id: 'reports', label: 'SIMULATION REPORTS', icon: 'file-text' },
	{ id: 'settings', label: 'SETTINGS', icon: 'settings' }
];

class UiStore {
	booted = $state(false);
	view = $state('dashboard');
	sidebarOpen = $state(false);
	theme = $state('blue');
	cinematic = $state(false);
	reducedMotion = $state(false);
	glitching = $state(false);
	isMobile = $state(false);
	now = $state(new Date());

	constructor() {
		const saved = load();
		if (saved.theme) this.theme = saved.theme;
		if (typeof saved.cinematic === 'boolean') this.cinematic = saved.cinematic;
	}

	init() {
		if (typeof window === 'undefined') return () => {};

		document.documentElement.setAttribute('data-theme', this.theme);

		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		this.reducedMotion = mq.matches;
		const onMq = (e) => (this.reducedMotion = e.matches);
		mq.addEventListener('change', onMq);

		const mqw = window.matchMedia('(max-width: 900px)');
		this.isMobile = mqw.matches;
		const onW = (e) => {
			this.isMobile = e.matches;
			if (!e.matches) this.sidebarOpen = false;
		};
		mqw.addEventListener('change', onW);

		const clock = setInterval(() => (this.now = new Date()), 1000);

		// Pointer-driven lighting — written straight to CSS vars via rAF so
		// mouse movement never triggers a Svelte update.
		let raf = 0;
		let px = 0.5,
			py = 0.5;
		const onMove = (e) => {
			px = e.clientX / window.innerWidth;
			py = e.clientY / window.innerHeight;
			if (!raf)
				raf = requestAnimationFrame(() => {
					document.documentElement.style.setProperty('--mx', px.toFixed(4));
					document.documentElement.style.setProperty('--my', py.toFixed(4));
					raf = 0;
				});
		};
		window.addEventListener('pointermove', onMove, { passive: true });

		return () => {
			mq.removeEventListener('change', onMq);
			mqw.removeEventListener('change', onW);
			window.removeEventListener('pointermove', onMove);
			clearInterval(clock);
			if (raf) cancelAnimationFrame(raf);
		};
	}

	setTheme(id) {
		this.theme = id;
		if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', id);
		this.persist();
	}

	setView(id) {
		if (this.view === id) return;
		this.view = id;
		this.sidebarOpen = false;
		this.flashGlitch();
	}

	/** Brief full-screen glitch wipe between views. */
	flashGlitch() {
		if (this.reducedMotion) return;
		this.glitching = true;
		setTimeout(() => (this.glitching = false), 440);
	}

	toggleCinematic() {
		this.cinematic = !this.cinematic;
		this.persist();
	}

	persist() {
		if (!canStore()) return;
		try {
			localStorage.setItem(KEY, JSON.stringify({ theme: this.theme, cinematic: this.cinematic }));
		} catch {
			/* storage unavailable — settings just won't persist */
		}
	}

	get clockText() {
		const p = (n) => String(n).padStart(2, '0');
		const d = this.now;
		return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
	}

	get dateText() {
		const p = (n) => String(n).padStart(2, '0');
		const d = this.now;
		return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
	}
}

export const ui = new UiStore();
