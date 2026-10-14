<script>
	/**
	 * Rotating wireframe globe with decorative relay arcs.
	 *
	 * Real 3D maths (rotation + perspective projection) rendered through the
	 * 2D canvas API — all the depth of a WebGL globe for a few hundred bytes
	 * instead of a 600 KB engine. The node positions are arbitrary points on
	 * a sphere; they do not correspond to any real place.
	 */
	import { onMount } from 'svelte';
	import { ui } from '../stores/ui.svelte.js';

	let { size = 260 } = $props();

	let canvas = $state(null);

	onMount(() => {
		const ctx = canvas.getContext('2d');
		let raf = 0;
		let running = true;
		let dpr = Math.min(window.devicePixelRatio || 1, 2);
		let W = size,
			H = size;

		const TILT = -0.42; // radians, fixed camera pitch
		const CAM = 3.1; // camera distance in sphere radii
		let spin = 0;

		function fit() {
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			const rect = canvas.getBoundingClientRect();
			W = Math.max(1, rect.width);
			H = Math.max(1, rect.height);
			canvas.width = Math.floor(W * dpr);
			canvas.height = Math.floor(H * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}

		const glow = () =>
			getComputedStyle(document.documentElement).getPropertyValue('--glow').trim() ||
			'34, 211, 238';

		/** Lat/lon (radians) → rotated 3D point. */
		function toXYZ(lat, lon, yaw) {
			const cl = Math.cos(lat);
			let x = cl * Math.cos(lon + yaw);
			let y = Math.sin(lat);
			let z = cl * Math.sin(lon + yaw);
			// pitch
			const cy = Math.cos(TILT),
				sy = Math.sin(TILT);
			const y2 = y * cy - z * sy;
			const z2 = y * sy + z * cy;
			return { x, y: y2, z: z2 };
		}

		/** 3D → screen, with the perspective factor returned for depth cues. */
		function project(p, r) {
			const k = CAM / (CAM - p.z);
			return { sx: W / 2 + p.x * r * k, sy: H / 2 + p.y * r * k, k, z: p.z };
		}

		// Fictional relay sites — arbitrary sphere coordinates.
		const SITES = Array.from({ length: 11 }, () => ({
			lat: (Math.random() - 0.5) * 2.2,
			lon: Math.random() * Math.PI * 2,
			pulse: Math.random() * Math.PI * 2
		}));
		const ARCS = Array.from({ length: 7 }, () => {
			let a = Math.floor(Math.random() * SITES.length);
			let b = Math.floor(Math.random() * SITES.length);
			if (a === b) b = (b + 1) % SITES.length;
			return { a, b, t: Math.random() };
		});

		function draw() {
			const g = glow();
			const r = Math.min(W, H) * 0.37;
			ctx.clearRect(0, 0, W, H);

			// --- Meridians ---
			for (let m = 0; m < 12; m++) {
				const lon = (m / 12) * Math.PI * 2;
				ctx.beginPath();
				let started = false;
				for (let i = 0; i <= 48; i++) {
					const lat = -Math.PI / 2 + (i / 48) * Math.PI;
					const p = project(toXYZ(lat, lon, spin), r);
					if (p.z < -0.15) {
						started = false;
						continue;
					}
					if (!started) {
						ctx.moveTo(p.sx, p.sy);
						started = true;
					} else ctx.lineTo(p.sx, p.sy);
				}
				ctx.strokeStyle = `rgba(${g}, 0.17)`;
				ctx.lineWidth = 0.8;
				ctx.stroke();
			}

			// --- Parallels ---
			for (let la = -60; la <= 60; la += 30) {
				const lat = (la * Math.PI) / 180;
				ctx.beginPath();
				let started = false;
				for (let i = 0; i <= 64; i++) {
					const lon = (i / 64) * Math.PI * 2;
					const p = project(toXYZ(lat, lon, spin), r);
					if (p.z < -0.15) {
						started = false;
						continue;
					}
					if (!started) {
						ctx.moveTo(p.sx, p.sy);
						started = true;
					} else ctx.lineTo(p.sx, p.sy);
				}
				ctx.strokeStyle = `rgba(${g}, ${la === 0 ? 0.3 : 0.14})`;
				ctx.lineWidth = la === 0 ? 1 : 0.7;
				ctx.stroke();
			}

			// --- Limb glow ---
			ctx.beginPath();
			ctx.arc(W / 2, H / 2, r * (CAM / (CAM - 0)) * 0.999, 0, Math.PI * 2);
			ctx.strokeStyle = `rgba(${g}, 0.42)`;
			ctx.lineWidth = 1.1;
			ctx.shadowColor = `rgba(${g}, 0.6)`;
			ctx.shadowBlur = 12;
			ctx.stroke();
			ctx.shadowBlur = 0;

			// --- Relay arcs ---
			for (const arc of ARCS) {
				const A = SITES[arc.a],
					B = SITES[arc.b];
				ctx.beginPath();
				let started = false;
				const STEPS = 30;
				for (let i = 0; i <= STEPS; i++) {
					const t = i / STEPS;
					const lat = A.lat + (B.lat - A.lat) * t;
					const lon = A.lon + (B.lon - A.lon) * t;
					const lift = 1 + Math.sin(t * Math.PI) * 0.17;
					const p3 = toXYZ(lat, lon, spin);
					const p = project({ x: p3.x * lift, y: p3.y * lift, z: p3.z * lift }, r);
					if (p.z < -0.3) {
						started = false;
						continue;
					}
					if (!started) {
						ctx.moveTo(p.sx, p.sy);
						started = true;
					} else ctx.lineTo(p.sx, p.sy);
				}
				ctx.strokeStyle = `rgba(${g}, 0.35)`;
				ctx.lineWidth = 0.9;
				ctx.stroke();

				// Packet travelling the arc
				arc.t = (arc.t + 0.0055) % 1;
				const t = arc.t;
				const lat = A.lat + (B.lat - A.lat) * t;
				const lon = A.lon + (B.lon - A.lon) * t;
				const lift = 1 + Math.sin(t * Math.PI) * 0.17;
				const p3 = toXYZ(lat, lon, spin);
				const p = project({ x: p3.x * lift, y: p3.y * lift, z: p3.z * lift }, r);
				if (p.z > -0.3) {
					ctx.beginPath();
					ctx.arc(p.sx, p.sy, 1.9, 0, Math.PI * 2);
					ctx.fillStyle = `rgba(${g}, 0.95)`;
					ctx.shadowColor = `rgba(${g}, 1)`;
					ctx.shadowBlur = 8;
					ctx.fill();
					ctx.shadowBlur = 0;
				}
			}

			// --- Relay sites ---
			const now = performance.now() / 700;
			for (const s of SITES) {
				const p = project(toXYZ(s.lat, s.lon, spin), r);
				if (p.z < -0.1) continue;
				const depth = Math.max(0.2, (p.z + 1) / 2);
				const pulse = 0.5 + 0.5 * Math.sin(now + s.pulse);
				ctx.beginPath();
				ctx.arc(p.sx, p.sy, 1.6 + pulse * 0.9, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(${g}, ${(0.55 + pulse * 0.45) * depth})`;
				ctx.fill();
				ctx.beginPath();
				ctx.arc(p.sx, p.sy, 3 + pulse * 4.5, 0, Math.PI * 2);
				ctx.strokeStyle = `rgba(${g}, ${0.3 * (1 - pulse) * depth})`;
				ctx.lineWidth = 0.8;
				ctx.stroke();
			}
		}

		function frame() {
			if (!running) return;
			spin += 0.0023;
			draw();
			raf = requestAnimationFrame(frame);
		}

		const ro = new ResizeObserver(() => {
			fit();
			draw();
		});
		ro.observe(canvas);

		fit();
		if (ui.reducedMotion) {
			draw();
		} else {
			raf = requestAnimationFrame(frame);
		}

		const onVis = () => {
			if (document.hidden) {
				running = false;
				cancelAnimationFrame(raf);
			} else if (!ui.reducedMotion) {
				running = true;
				raf = requestAnimationFrame(frame);
			}
		};
		document.addEventListener('visibilitychange', onVis);

		return () => {
			running = false;
			cancelAnimationFrame(raf);
			ro.disconnect();
			document.removeEventListener('visibilitychange', onVis);
		};
	});
</script>

<!-- Purely decorative: it carries no information the surrounding text
     doesn't already state, so it's hidden from assistive tech. -->
<canvas
	bind:this={canvas}
	style="width:{size}px;height:{size}px;max-width:100%"
	class="block"
	aria-hidden="true"
></canvas>
