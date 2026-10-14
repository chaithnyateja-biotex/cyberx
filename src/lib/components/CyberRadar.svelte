<script>
	/**
	 * Rotating sweep radar populated with fictional contacts.
	 * Pure SVG so it stays crisp at any size; the sweep is one rotating
	 * group, which the compositor handles without repainting the dial.
	 */
	import { onMount } from 'svelte';
	import { ui } from '../stores/ui.svelte.js';

	let { size = 230, contacts = 9 } = $props();

	const R = 100;
	let blips = $state([]);
	let uid = Math.random().toString(36).slice(2, 8);

	function seedBlips() {
		blips = Array.from({ length: contacts }, (_, i) => {
			const a = Math.random() * Math.PI * 2;
			const d = 16 + Math.random() * 78;
			return {
				id: i,
				x: Math.cos(a) * d,
				y: Math.sin(a) * d,
				r: 1.6 + Math.random() * 2.4,
				delay: (Math.random() * 4).toFixed(2),
				hostile: Math.random() < 0.22,
				tag: Math.random().toString(16).slice(2, 6).toUpperCase()
			};
		});
	}

	onMount(() => {
		seedBlips();
		if (ui.reducedMotion) return;
		const t = setInterval(seedBlips, 9000);
		return () => clearInterval(t);
	});
</script>

<svg
	viewBox="-110 -110 220 220"
	width={size}
	height={size}
	class="radar"
	role="img"
	aria-label="Simulated contact radar showing {contacts} fictional returns"
>
	<defs>
		<radialGradient id="rg-{uid}">
			<stop offset="0%" stop-color="rgba(var(--glow), 0.16)" />
			<stop offset="65%" stop-color="rgba(var(--glow), 0.04)" />
			<stop offset="100%" stop-color="transparent" />
		</radialGradient>
		<linearGradient id="sw-{uid}" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0%" stop-color="rgba(var(--glow), 0.42)" />
			<stop offset="100%" stop-color="transparent" />
		</linearGradient>
	</defs>

	<circle r={R} fill="url(#rg-{uid})" />

	<!-- range rings -->
	{#each [25, 50, 75, 100] as r}
		<circle {r} fill="none" stroke="rgba(var(--glow), 0.2)" stroke-width="0.7" />
	{/each}

	<!-- crosshairs + bearing ticks -->
	<line x1={-R} y1="0" x2={R} y2="0" stroke="rgba(var(--glow), 0.18)" stroke-width="0.7" />
	<line x1="0" y1={-R} x2="0" y2={R} stroke="rgba(var(--glow), 0.18)" stroke-width="0.7" />
	{#each Array(24) as _, i}
		{@const a = (i * 15 * Math.PI) / 180}
		<line
			x1={Math.cos(a) * (R - (i % 6 === 0 ? 9 : 4))}
			y1={Math.sin(a) * (R - (i % 6 === 0 ? 9 : 4))}
			x2={Math.cos(a) * R}
			y2={Math.sin(a) * R}
			stroke="rgba(var(--glow), {i % 6 === 0 ? 0.5 : 0.25})"
			stroke-width="0.8"
		/>
	{/each}

	<!-- sweep -->
	<g class="sweep-g">
		<path d="M 0 0 L {R} 0 A {R} {R} 0 0 0 {R * 0.5} {-R * 0.866} Z" fill="url(#sw-{uid})" />
		<line x1="0" y1="0" x2={R} y2="0" stroke="rgba(var(--glow), 0.95)" stroke-width="1.1" />
	</g>

	<!-- contacts -->
	{#each blips as b (b.id)}
		<g class="blip" style="animation-delay:{b.delay}s">
			<circle
				cx={b.x}
				cy={b.y}
				r={b.r}
				fill={b.hostile ? 'var(--c-danger)' : 'var(--c-primary)'}
			/>
			<circle
				cx={b.x}
				cy={b.y}
				r={b.r * 3}
				fill="none"
				stroke={b.hostile ? 'var(--c-danger)' : 'var(--c-primary)'}
				stroke-width="0.6"
				opacity="0.4"
			/>
			<text x={b.x + 6} y={b.y + 2.5} class="tag">{b.tag}</text>
		</g>
	{/each}

	<circle r="2" fill="var(--c-primary)" />
</svg>

<style>
	.radar {
		display: block;
		max-width: 100%;
		height: auto;
		filter: drop-shadow(0 0 14px rgba(var(--glow), 0.25));
	}
	.sweep-g {
		transform-origin: 0 0;
		animation: radar-spin 3.6s linear infinite;
	}
	@keyframes radar-spin {
		to {
			transform: rotate(360deg);
		}
	}
	.blip {
		animation: blip-fade 3.6s ease-out infinite;
	}
	@keyframes blip-fade {
		0% {
			opacity: 1;
		}
		70% {
			opacity: 0.12;
		}
		100% {
			opacity: 0.05;
		}
	}
	.tag {
		font-family: var(--font-mono);
		font-size: 4.4px;
		fill: var(--c-muted);
		letter-spacing: 0.08em;
	}
	@media (prefers-reduced-motion: reduce) {
		.sweep-g {
			animation: none;
		}
		.blip {
			animation: none;
			opacity: 0.85;
		}
	}
</style>
