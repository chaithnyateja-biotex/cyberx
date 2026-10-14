<script>
	/**
	 * Opening boot sequence.
	 *
	 * GSAP drives the container/logo choreography; the line-by-line typing
	 * runs on its own timer so each keystroke can be sound-synced precisely.
	 * The whole thing is skippable and self-terminates in ~5s.
	 */
	import { onMount, tick } from 'svelte';
	import { gsap } from 'gsap';
	import { sound } from '../stores/audio.svelte.js';
	import { ui } from '../stores/ui.svelte.js';

	let { oncomplete } = $props();

	const SCRIPT = [
		{ text: 'CYBERX SYSTEM INITIALIZING', ms: 420 },
		{ text: 'LOADING VISUAL INTERFACE', ms: 380 },
		{ text: 'ESTABLISHING SIMULATION ENVIRONMENT', ms: 460 },
		{ text: 'STARTING TERMINAL ENGINE', ms: 380 },
		{ text: 'CHECKING MODULE STATUS', ms: 400 },
		{ text: 'SIMULATION READY', ms: 300, final: true }
	];

	let root = $state(null);
	let logoEl = $state(null);

	let rows = $state([]); // { text, typed, done, final }
	let barPct = $state(0);
	let phase = $state('typing'); // typing | ready | leaving
	let audioPrompt = $state(true);
	let finished = false;

	const timers = new Set();
	const later = (fn, ms) => {
		const t = setTimeout(() => {
			timers.delete(t);
			fn();
		}, ms);
		timers.add(t);
		return t;
	};
	const clearTimers = () => {
		for (const t of timers) clearTimeout(t);
		timers.clear();
	};

	async function unlockAudio() {
		if (!audioPrompt) return;
		audioPrompt = false;
		const ok = await sound.unlock();
		if (ok) sound.play('startup');
	}

	function typeRow(i, done) {
		const spec = SCRIPT[i];
		rows = [...rows, { text: spec.text, typed: '', done: false, final: !!spec.final }];
		const idx = rows.length - 1;
		const chars = spec.text.length;
		// Reduced motion: show the whole line at once.
		const per = ui.reducedMotion ? 0 : Math.max(9, Math.round(spec.ms / chars));
		let c = 0;

		const step = () => {
			c += ui.reducedMotion ? chars : 1 + Math.floor(Math.random() * 2);
			if (c > chars) c = chars;
			rows[idx].typed = spec.text.slice(0, c);
			rows = [...rows];
			if (c % 3 === 0) sound.play('key');
			if (c < chars) later(step, per);
			else {
				rows[idx].done = true;
				rows = [...rows];
				sound.play(spec.final ? 'complete' : 'blip');
				later(done, spec.final ? 420 : 110);
			}
		};
		step();
	}

	function run(i = 0) {
		if (finished) return;
		if (i >= SCRIPT.length) {
			phase = 'ready';
			later(leave, 620);
			return;
		}
		barPct = Math.round(((i + 1) / SCRIPT.length) * 100);
		if (i === 2 && !ui.reducedMotion) sound.play('glitch');
		typeRow(i, () => run(i + 1));
	}

	function leave() {
		if (finished) return;
		finished = true;
		phase = 'leaving';
		clearTimers();
		sound.play('woosh');

		if (ui.reducedMotion) {
			oncomplete?.();
			return;
		}
		gsap.to(root, {
			opacity: 0,
			scale: 1.06,
			filter: 'blur(14px)',
			duration: 0.5,
			ease: 'power2.in',
			onComplete: () => oncomplete?.()
		});
	}

	export function skip() {
		sound.play('tick');
		leave();
	}

	onMount(() => {
		if (!ui.reducedMotion) {
			gsap.from(logoEl, { opacity: 0, scale: 0.86, duration: 0.8, ease: 'power3.out' });
			gsap.from('.boot-frame', {
				opacity: 0,
				y: 18,
				duration: 0.6,
				delay: 0.15,
				ease: 'power2.out'
			});
		}
		later(() => run(0), 420);

		// Any interaction anywhere counts as the gesture that unlocks audio.
		const onAny = () => unlockAudio();
		window.addEventListener('pointerdown', onAny, { once: true });
		window.addEventListener('keydown', onAny, { once: true });

		return () => {
			clearTimers();
			window.removeEventListener('pointerdown', onAny);
			window.removeEventListener('keydown', onAny);
		};
	});
</script>

<div
	bind:this={root}
	class="fixed inset-0 z-[200] flex flex-col items-center justify-center px-5"
	style="background: radial-gradient(ellipse at 50% 42%, rgba(var(--glow),0.1), transparent 58%), var(--c-void)"
>
	<!-- Logo -->
	<div bind:this={logoEl} class="mb-10 text-center">
		<h1
			class="font-display glitch text-[clamp(2.4rem,11vw,5.2rem)] leading-none font-black tracking-[0.18em]"
			data-text="CYBERX"
			style="color: var(--c-primary); text-shadow: 0 0 42px rgba(var(--glow),0.55)"
		>
			CYBERX
		</h1>
		<p class="label mt-3 !text-[0.6rem] tracking-[0.42em]">CYBER INTELLIGENCE SIMULATOR</p>
	</div>

	<!-- Boot log -->
	<div class="boot-frame panel glow-edge w-full max-w-[640px] p-5 sm:p-6">
		<div class="mb-4 flex items-center justify-between gap-3">
			<span class="label">BOOT SEQUENCE</span>
			<span class="font-mono text-[0.6rem]" style="color: var(--c-primary)">{barPct}%</span>
		</div>

		<div class="progress-track mb-5">
			<div class="progress-fill" style="width:{barPct}%"></div>
		</div>

		<div class="min-h-[172px] space-y-[5px]">
			{#each rows as row, i (i)}
				<div class="flex items-baseline gap-2 font-mono text-[0.7rem] sm:text-[0.74rem]">
					<span style="color: var(--c-faint)">›</span>
					<span
						class="flex-1"
						style="color: {row.final ? 'var(--c-ok)' : row.done ? 'var(--c-text)' : 'var(--c-muted)'}"
						>{row.typed}{#if !row.done}<span class="cursor-blink"></span>{/if}</span
					>
					{#if row.done}
						<span
							class="rise-in font-mono text-[0.58rem] tracking-[0.14em]"
							style="color: {row.final ? 'var(--c-ok)' : 'var(--c-primary)'}"
							>{row.final ? '●  READY' : '[ OK ]'}</span
						>
					{/if}
				</div>
			{/each}
		</div>

		<div class="mt-5 flex items-center justify-between gap-3 border-t pt-4" style="border-color: var(--c-line)">
			<span class="sim-badge">
				<span class="dot dot-pulse"></span>
				SIMULATION MODE — SYNTHETIC DATA
			</span>
			<button class="btn btn-sm btn-ghost" onclick={skip}>SKIP INTRO</button>
		</div>
	</div>

	{#if audioPrompt}
		<p class="label mt-6 animate-pulse !text-[0.58rem]">
			CLICK ANYWHERE TO ENABLE AUDIO
		</p>
	{:else}
		<p class="label mt-6 !text-[0.58rem]" style="color: var(--c-faint)">
			FICTIONAL TARGETS · NO REAL SYSTEM IS CONTACTED
		</p>
	{/if}
</div>

<style>
	@media (prefers-reduced-motion: reduce) {
		.animate-pulse {
			animation: none;
		}
	}
</style>
