/**
 * Shared Svelte actions for the interaction layer.
 * All of these write directly to CSS custom properties and never trigger a
 * component update, so pointer movement stays off the reactive graph.
 */

const reduced = () =>
	typeof window !== 'undefined' &&
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 3D perspective tilt + cursor-tracked sheen.
 * @param {HTMLElement} node
 * @param {{max?: number, scale?: number}} opts
 */
export function tilt(node, opts = {}) {
	let { max = 7, scale = 1 } = opts;
	let raf = 0;
	let rect = null;

	const enter = () => {
		if (reduced()) return;
		rect = node.getBoundingClientRect();
		node.classList.add('tilt-active');
	};

	const move = (e) => {
		if (reduced() || !rect) return;
		if (raf) return;
		raf = requestAnimationFrame(() => {
			raf = 0;
			if (!rect) return;
			const px = (e.clientX - rect.left) / rect.width;
			const py = (e.clientY - rect.top) / rect.height;
			node.style.setProperty('--rx', `${((px - 0.5) * max * 2).toFixed(2)}deg`);
			node.style.setProperty('--ry', `${(-(py - 0.5) * max * 2).toFixed(2)}deg`);
			node.style.setProperty('--px', `${(px * 100).toFixed(1)}%`);
			node.style.setProperty('--py', `${(py * 100).toFixed(1)}%`);
			if (scale !== 1) node.style.setProperty('--ts', String(scale));
		});
	};

	const leave = () => {
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
		rect = null;
		node.classList.remove('tilt-active');
		node.style.setProperty('--rx', '0deg');
		node.style.setProperty('--ry', '0deg');
	};

	node.addEventListener('pointerenter', enter);
	node.addEventListener('pointermove', move, { passive: true });
	node.addEventListener('pointerleave', leave);

	return {
		update(next = {}) {
			max = next.max ?? max;
			scale = next.scale ?? scale;
		},
		destroy() {
			if (raf) cancelAnimationFrame(raf);
			node.removeEventListener('pointerenter', enter);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', leave);
		}
	};
}

/**
 * Material-style ripple originating at the click point.
 * @param {HTMLElement} node
 */
export function ripple(node) {
	const onDown = (e) => {
		if (reduced()) return;
		const rect = node.getBoundingClientRect();
		const size = Math.max(rect.width, rect.height);
		const el = document.createElement('span');
		el.className = 'ripple';
		el.style.width = el.style.height = `${size}px`;
		el.style.left = `${(e.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2}px`;
		el.style.top = `${(e.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2}px`;
		// The host needs a stacking context for the ripple to clip correctly.
		if (getComputedStyle(node).position === 'static') node.style.position = 'relative';
		node.appendChild(el);
		setTimeout(() => el.remove(), 640);
	};
	node.addEventListener('pointerdown', onDown);
	return {
		destroy() {
			node.removeEventListener('pointerdown', onDown);
		}
	};
}

/**
 * Magnetic hover — the element drifts slightly toward the cursor.
 * @param {HTMLElement} node
 * @param {{strength?: number}} opts
 */
export function magnetic(node, opts = {}) {
	let strength = opts.strength ?? 0.22;
	let raf = 0;

	const move = (e) => {
		if (reduced()) return;
		if (raf) return;
		raf = requestAnimationFrame(() => {
			raf = 0;
			const r = node.getBoundingClientRect();
			const dx = (e.clientX - (r.left + r.width / 2)) * strength;
			const dy = (e.clientY - (r.top + r.height / 2)) * strength;
			node.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
		});
	};
	const leave = () => {
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
		node.style.transform = '';
	};

	node.addEventListener('pointermove', move, { passive: true });
	node.addEventListener('pointerleave', leave);

	return {
		update(next = {}) {
			strength = next.strength ?? strength;
		},
		destroy() {
			if (raf) cancelAnimationFrame(raf);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', leave);
		}
	};
}

/**
 * Reveal on scroll into view.
 * @param {HTMLElement} node
 * @param {{delay?: number}} opts
 */
export function reveal(node, opts = {}) {
	const delay = opts.delay ?? 0;
	node.style.opacity = '0';
	const io = new IntersectionObserver(
		([entry]) => {
			if (!entry.isIntersecting) return;
			node.style.animationDelay = `${delay}ms`;
			node.style.opacity = '';
			node.classList.add('rise-in');
			io.disconnect();
		},
		{ threshold: 0.12 }
	);
	io.observe(node);
	return {
		destroy() {
			io.disconnect();
		}
	};
}

/**
 * Animated integer counter.
 * @param {HTMLElement} node
 * @param {{value: number, duration?: number, decimals?: number}} opts
 */
export function counter(node, opts) {
	let raf = 0;
	let current = 0;

	function run(to, duration = 900, decimals = 0) {
		cancelAnimationFrame(raf);
		if (reduced()) {
			node.textContent = to.toFixed(decimals);
			current = to;
			return;
		}
		const from = current;
		const t0 = performance.now();
		const tick = (now) => {
			const p = Math.min(1, (now - t0) / duration);
			// easeOutExpo
			const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
			const v = from + (to - from) * e;
			node.textContent = v.toFixed(decimals);
			if (p < 1) raf = requestAnimationFrame(tick);
			else current = to;
		};
		raf = requestAnimationFrame(tick);
	}

	run(opts.value ?? 0, opts.duration, opts.decimals ?? 0);

	return {
		update(next) {
			run(next.value ?? 0, next.duration, next.decimals ?? 0);
		},
		destroy() {
			cancelAnimationFrame(raf);
		}
	};
}
