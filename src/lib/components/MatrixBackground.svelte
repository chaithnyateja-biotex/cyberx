<script>
	/**
	 * Three ambient layers on a single canvas and a single rAF loop:
	 *   1. digital rain   — glyph columns with a bright leading character
	 *   2. network field  — drifting nodes joined by proximity lines
	 *   3. perspective grid
	 *
	 * Everything is drawn in device pixels with a capped DPR, and the whole
	 * loop stops when the tab is hidden or reduced-motion is requested.
	 */
	import { onMount } from 'svelte';
	import { ui } from '../stores/ui.svelte.js';

	let canvas = $state(null);
	let wrap = $state(null);

	const GLYPHS = 'アカサタナハマヤラワ0123456789ABCDEFﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘ<>/\\[]{}=+*#$%&@';

	onMount(() => {
		const ctx = canvas.getContext('2d', { alpha: true });
		let w = 0,
			h = 0,
			dpr = 1;
		let raf = 0;
		let running = true;

		/** @type {{x:number,y:number,speed:number,chars:string[],len:number}[]} */
		let columns = [];
		/** @type {{x:number,y:number,vx:number,vy:number,r:number}[]} */
		let nodes = [];

		const colSize = 16;

		function readColors() {
			const cs = getComputedStyle(document.documentElement);
			return {
				rain: cs.getPropertyValue('--rain').trim() || 'rgba(34,211,238,.85)',
				head: cs.getPropertyValue('--rain-head').trim() || '#c8fbff',
				glow: cs.getPropertyValue('--glow').trim() || '34, 211, 238',
				void: cs.getPropertyValue('--c-void').trim() || '#04060f'
			};
		}
		let colors = readColors();

		function resize() {
			const rect = wrap.getBoundingClientRect();
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			w = Math.max(1, Math.floor(rect.width));
			h = Math.max(1, Math.floor(rect.height));
			canvas.width = Math.floor(w * dpr);
			canvas.height = Math.floor(h * dpr);
			canvas.style.width = w + 'px';
			canvas.style.height = h + 'px';
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			// Rain columns
			const count = Math.ceil(w / colSize);
			columns = Array.from({ length: count }, (_, i) => ({
				x: i * colSize + colSize * 0.5,
				y: Math.random() * -h,
				speed: 0.9 + Math.random() * 2.6,
				len: 6 + Math.floor(Math.random() * 18),
				chars: []
			}));

			// Network nodes — density scaled to area, capped for small devices
			const target = Math.min(70, Math.max(18, Math.round((w * h) / 26000)));
			nodes = Array.from({ length: target }, () => ({
				x: Math.random() * w,
				y: Math.random() * h,
				vx: (Math.random() - 0.5) * 0.22,
				vy: (Math.random() - 0.5) * 0.22,
				r: 0.7 + Math.random() * 1.5
			}));
		}

		function drawGrid() {
			ctx.save();
			ctx.strokeStyle = `rgba(${colors.glow}, 0.05)`;
			ctx.lineWidth = 1;
			const step = 64;
			ctx.beginPath();
			for (let x = 0; x <= w; x += step) {
				ctx.moveTo(x + 0.5, 0);
				ctx.lineTo(x + 0.5, h);
			}
			for (let y = 0; y <= h; y += step) {
				ctx.moveTo(0, y + 0.5);
				ctx.lineTo(w, y + 0.5);
			}
			ctx.stroke();
			ctx.restore();
		}

		function drawNodes() {
			ctx.save();
			// Proximity lines
			const maxD = 128;
			ctx.lineWidth = 1;
			for (let i = 0; i < nodes.length; i++) {
				const a = nodes[i];
				a.x += a.vx;
				a.y += a.vy;
				if (a.x < 0 || a.x > w) a.vx *= -1;
				if (a.y < 0 || a.y > h) a.vy *= -1;

				for (let j = i + 1; j < nodes.length; j++) {
					const b = nodes[j];
					const dx = a.x - b.x;
					const dy = a.y - b.y;
					const d2 = dx * dx + dy * dy;
					if (d2 < maxD * maxD) {
						const alpha = (1 - Math.sqrt(d2) / maxD) * 0.3;
						ctx.strokeStyle = `rgba(${colors.glow}, ${alpha.toFixed(3)})`;
						ctx.beginPath();
						ctx.moveTo(a.x, a.y);
						ctx.lineTo(b.x, b.y);
						ctx.stroke();
					}
				}
			}
			// Nodes
			ctx.fillStyle = `rgba(${colors.glow}, 0.55)`;
			for (const n of nodes) {
				ctx.beginPath();
				ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.restore();
		}

		function drawRain() {
			ctx.save();
			ctx.font = `500 ${colSize - 3}px "JetBrains Mono", monospace`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			for (const col of columns) {
				col.y += col.speed;
				if (col.y - col.len * colSize > h) {
					col.y = -Math.random() * 300;
					col.speed = 0.9 + Math.random() * 2.6;
					col.len = 6 + Math.floor(Math.random() * 18);
				}
				const headRow = Math.floor(col.y / colSize);
				const ci = Math.floor(col.x / colSize);
				for (let k = 0; k < col.len; k++) {
					const row = headRow - k;
					const y = row * colSize;
					if (y < -colSize || y > h + colSize) continue;

					// Deterministic per-cell glyph; the leading character
					// reshuffles on a timer so the head always flickers.
					const churn = k === 0 ? ((Date.now() / 90) | 0) : 0;
					const idx = Math.abs(row * 31 + ci * 7 + churn) % GLYPHS.length;
					const ch = GLYPHS[idx];

					if (k === 0) {
						ctx.fillStyle = colors.head;
						ctx.shadowColor = colors.head;
						ctx.shadowBlur = 8;
					} else {
						const fade = (1 - k / col.len) * 0.5;
						ctx.fillStyle = `rgba(${colors.glow}, ${fade.toFixed(3)})`;
						ctx.shadowBlur = 0;
					}
					ctx.fillText(ch, col.x, y);
				}
			}
			ctx.shadowBlur = 0;
			ctx.restore();
		}

		function frame() {
			if (!running) return;
			// Trail fade rather than a hard clear — this is what gives the
			// rain its comet tails.
			ctx.fillStyle = 'rgba(2, 4, 10, 0.17)';
			ctx.fillRect(0, 0, w, h);

			drawGrid();
			drawNodes();
			drawRain();

			raf = requestAnimationFrame(frame);
		}

		function drawStatic() {
			ctx.clearRect(0, 0, w, h);
			drawGrid();
			ctx.fillStyle = `rgba(${colors.glow}, 0.4)`;
			for (const n of nodes) {
				ctx.beginPath();
				ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		function start() {
			cancelAnimationFrame(raf);
			if (ui.reducedMotion) {
				running = false;
				drawStatic();
				return;
			}
			running = true;
			raf = requestAnimationFrame(frame);
		}

		const onVisibility = () => {
			if (document.hidden) {
				running = false;
				cancelAnimationFrame(raf);
			} else {
				start();
			}
		};

		const ro = new ResizeObserver(() => {
			resize();
			if (ui.reducedMotion) drawStatic();
		});
		ro.observe(wrap);

		resize();
		start();
		document.addEventListener('visibilitychange', onVisibility);

		// Re-read palette whenever the theme attribute flips.
		const mo = new MutationObserver(() => {
			colors = readColors();
			if (ui.reducedMotion) drawStatic();
		});
		mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

		return () => {
			running = false;
			cancelAnimationFrame(raf);
			ro.disconnect();
			mo.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
		};
	});

	// React to a runtime reduced-motion change.
	$effect(() => {
		void ui.reducedMotion;
	});
</script>

<div bind:this={wrap} class="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
	<canvas bind:this={canvas} class="block h-full w-full opacity-[0.55]"></canvas>
	<div class="aurora"></div>
</div>

<style>
	/* Slow colour wash that sits under the canvas and keeps the void from
	   reading as flat black. */
	.aurora {
		position: absolute;
		inset: -20%;
		pointer-events: none;
		background:
			radial-gradient(
				38% 46% at calc(var(--mx) * 100%) calc(var(--my) * 100%),
				rgba(var(--glow), 0.1),
				transparent 70%
			),
			radial-gradient(44% 38% at 82% 18%, rgba(var(--glow), 0.07), transparent 70%),
			radial-gradient(36% 44% at 14% 86%, rgba(var(--glow), 0.06), transparent 70%);
		animation: drift 26s ease-in-out infinite alternate;
		mix-blend-mode: screen;
	}
	@keyframes drift {
		from {
			transform: translate3d(-1.5%, -1%, 0) scale(1);
		}
		to {
			transform: translate3d(1.5%, 1.5%, 0) scale(1.06);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.aurora {
			animation: none;
		}
	}
</style>
