<script>
	/**
	 * Interactive module tile: 3D tilt, cursor-tracked sheen, animated icon
	 * and a per-module mini visualisation that previews what the module
	 * returns before it is run.
	 */
	import { tilt, ripple, reveal } from '../actions.js';
	import { icon } from '../icons.js';
	import { sound } from '../stores/audio.svelte.js';

	let { module: mod, index = 0, disabled = false, onrun } = $props();

	const Glyph = $derived(icon(mod.icon));

	const ACCENT = {
		primary: 'var(--c-primary)',
		info: 'var(--c-info)',
		secondary: 'var(--c-secondary)',
		warn: 'var(--c-warn)',
		danger: 'var(--c-danger)'
	};
	const accent = $derived(ACCENT[mod.accent] ?? 'var(--c-primary)');

	// Deterministic sparkline so each card has its own stable silhouette.
	const spark = $derived.by(() => {
		let s = 0;
		for (let i = 0; i < mod.id.length; i++) s = (s * 31 + mod.id.charCodeAt(i)) >>> 0;
		const out = [];
		for (let i = 0; i < 22; i++) {
			s = (s * 1103515245 + 12345) >>> 0;
			out.push(18 + ((s >>> 16) % 78));
		}
		return out;
	});

	function run() {
		if (disabled) return;
		sound.play('beep');
		onrun?.(mod.id);
	}
</script>

<article
	use:tilt={{ max: 6 }}
	use:reveal={{ delay: index * 55 }}
	class="tilt panel bracketed group relative flex flex-col overflow-hidden p-4 sm:p-5"
	class:opacity-50={disabled}
	style="--accent: {accent}"
>
	<div class="tilt-sheen"></div>

	<!-- header -->
	<div class="relative mb-3 flex items-start gap-3">
		<div
			class="icon-well grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-all duration-300"
		>
			<Glyph size={20} strokeWidth={1.6} color={accent} />
		</div>
		<div class="min-w-0 flex-1">
			<p class="label !text-[0.54rem]" style="color: {accent}">{mod.code}</p>
			<h3
				class="font-display text-[0.8rem] leading-tight font-bold tracking-[0.07em] break-words sm:text-[0.86rem]"
			>
				{mod.title}
			</h3>
		</div>
	</div>

	<p class="relative mb-4 text-[0.74rem] leading-relaxed" style="color: var(--c-muted)">
		{mod.blurb}
	</p>

	<!-- preview sparkline -->
	<div class="relative mb-4 flex h-9 items-end gap-[2px]" aria-hidden="true">
		{#each spark as v, i}
			<span
				class="spark-bar flex-1 rounded-[1px]"
				style="height:{v}%; background: linear-gradient(180deg, {accent}, transparent); animation-delay:{i * 42}ms"
			></span>
		{/each}
	</div>

	<button
		use:ripple
		class="btn relative mt-auto w-full overflow-hidden"
		onclick={run}
		{disabled}
		style="border-color: color-mix(in srgb, {accent} 42%, transparent)"
	>
		{mod.action}
	</button>
</article>

<style>
	.icon-well {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 26%, transparent);
	}
	article:hover .icon-well {
		background: color-mix(in srgb, var(--accent) 22%, transparent);
		box-shadow: 0 0 22px -5px var(--accent);
		transform: translateY(-1px);
	}
	article::after {
		/* top edge accent that lights up on hover */
		content: '';
		position: absolute;
		top: -1px;
		left: 14px;
		right: 14px;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--accent), transparent);
		opacity: 0;
		transition: opacity 0.35s ease;
		pointer-events: none;
	}
	article:hover::after {
		opacity: 0.9;
	}
	.spark-bar {
		opacity: 0.45;
		transform-origin: bottom;
		animation: bar-grow 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
		transition: opacity 0.3s ease;
	}
	article:hover .spark-bar {
		opacity: 0.85;
	}
	@media (prefers-reduced-motion: reduce) {
		.spark-bar {
			animation: none;
			opacity: 0.6;
		}
	}
</style>
