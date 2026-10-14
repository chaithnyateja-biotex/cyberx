<script>
	/**
	 * Full-screen cinematic run view: stage rail, live terminal, progress
	 * and transport controls. Takes over the viewport while a module runs
	 * and hands off to the results dashboard on completion.
	 */
	import { gsap } from 'gsap';
	import { sim, STAGES, SPEEDS } from '../stores/simulation.svelte.js';
	import { ui } from '../stores/ui.svelte.js';
	import { sound } from '../stores/audio.svelte.js';
	import { icon } from '../icons.js';
	import TerminalConsole from './TerminalConsole.svelte';

	let { onviewresults } = $props();

	const Pause = icon('pause');
	const Play = icon('play');
	const Skip = icon('skip-forward');
	const X = icon('x');
	const Replay = icon('rotate-ccw');

	let root = $state(null);

	const stageIndex = $derived(STAGES.findIndex((s) => s.id === sim.stage));
	const mod = $derived(sim.dataset?.module ?? null);
	const title = $derived(
		sim.activeModuleId
			? (mod?.title ??
				(sim.engine?.dataset?.module?.title ?? sim.activeModuleId.toUpperCase()))
			: 'IDLE'
	);
	const code = $derived(sim.engine?.dataset?.module?.code ?? mod?.code ?? '');

	$effect(() => {
		if (!root || ui.reducedMotion) return;
		gsap.from(root, { opacity: 0, duration: 0.3, ease: 'power2.out' });
		gsap.from('.sim-chrome', {
			opacity: 0,
			y: -14,
			duration: 0.45,
			delay: 0.08,
			ease: 'power2.out'
		});
	});

	function close() {
		sim.abort();
	}

	function finish() {
		sound.play('woosh');
		sim.closeOverlay();
		onviewresults?.();
	}
</script>

<div
	bind:this={root}
	class="sim-root fixed inset-0 z-[150] flex flex-col"
	style="background: radial-gradient(ellipse 90% 70% at 50% 0%, rgba(var(--glow),.07), transparent 65%), rgba(2,4,10,.97); backdrop-filter: blur(8px)"
	role="dialog"
	aria-modal="true"
	aria-label="Simulation in progress"
>
	<!-- chrome -->
	<header
		class="sim-chrome sim-head flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-6"
		style="border-color: var(--c-line)"
	>
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<span class="dot dot-pulse" style="color: var(--c-primary)"></span>
				<p class="label !text-[0.52rem]">{code} · RUNNING AGAINST</p>
			</div>
			<h2 class="font-display truncate text-[0.95rem] font-bold tracking-[0.1em] sm:text-lg">
				{title}
			</h2>
			<p class="label truncate !text-[0.52rem]" style="color: var(--c-faint)">
				{sim.facility?.name} · {sim.facility?.designation}
			</p>
		</div>

		<span class="sim-badge order-3 w-full sm:order-none sm:w-auto">
			<span class="dot dot-pulse"></span> SIMULATION MODE — SYNTHETIC DATA
		</span>

		<button class="btn btn-sm btn-ghost shrink-0" onclick={close} aria-label="Abort simulation">
			<X size={13} /> ABORT
		</button>
	</header>

	<!-- stage rail -->
	<div
		class="sim-chrome hide-scroll flex shrink-0 gap-2 overflow-x-auto border-b px-4 py-2.5 sm:px-6"
		style="border-color: var(--c-line)"
	>
		{#each STAGES as s, i (s.id)}
			{@const state = i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'pending'}
			<div class="stage-chip {state} shrink-0">
				<span class="font-mono text-[0.56rem] opacity-60">0{s.n}</span>
				<span class="font-mono text-[0.58rem] tracking-[0.14em]">{s.label}</span>
				{#if state === 'done'}
					<span class="text-[0.6rem]">✓</span>
				{:else if state === 'active'}
					<span class="dot dot-pulse"></span>
				{/if}
			</div>
		{/each}
	</div>

	<!-- terminal -->
	<div class="min-h-0 flex-1 p-3 sm:p-5">
		<TerminalConsole
			lines={sim.lines}
			stage={sim.stage}
			progress={sim.progress}
			status={sim.status}
			dense={ui.isMobile}
		/>
	</div>

	<!-- transport -->
	<footer
		class="sim-foot flex shrink-0 flex-wrap items-center gap-2 border-t px-4 py-3 sm:px-6"
		style="border-color: var(--c-line)"
	>
		{#if sim.status === 'done'}
			<button class="btn btn-primary flex-1 sm:flex-none" onclick={finish}>
				VIEW SIMULATED RESULTS
			</button>
			<button class="btn" onclick={() => sim.replay()}>
				<Replay size={13} /> REPLAY
			</button>
		{:else}
			<button class="btn" onclick={() => sim.pauseResume()}>
				{#if sim.status === 'paused'}
					<Play size={13} /> RESUME
				{:else}
					<Pause size={13} /> PAUSE
				{/if}
			</button>
			<button class="btn" onclick={() => sim.skip()}>
				<Skip size={13} /> SKIP TO END
			</button>
		{/if}

		<div class="ml-auto flex items-center gap-2">
			<span class="label hidden !text-[0.5rem] sm:inline">SPEED</span>
			<div class="flex gap-1">
				{#each Object.entries(SPEEDS) as [key, s] (key)}
					<button
						class="speed-btn"
						class:on={sim.speed === key}
						onclick={() => {
							sim.setSpeed(key);
							sound.play('tick');
						}}
					>
						{s.label}
					</button>
				{/each}
			</div>
		</div>
	</footer>
</div>

<style>
	/* The overlay covers the whole viewport, so its top and bottom bars
	   carry the safe-area insets. */
	.sim-root {
		padding-left: var(--safe-l);
		padding-right: var(--safe-r);
	}
	.sim-head {
		padding-top: calc(0.75rem + var(--safe-t));
	}
	.sim-foot {
		padding-bottom: calc(0.75rem + var(--safe-b));
	}

	.stage-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.3rem 0.65rem;
		border: 1px solid var(--c-line);
		border-radius: 5px;
		color: var(--c-faint);
		transition: all 0.3s ease;
	}
	.stage-chip.done {
		color: var(--c-ok);
		border-color: rgba(52, 211, 153, 0.3);
	}
	.stage-chip.active {
		color: var(--c-primary);
		border-color: var(--c-line-strong);
		background: rgba(var(--glow), 0.1);
		box-shadow: 0 0 18px -6px rgba(var(--glow), 0.7);
	}

	.speed-btn {
		padding: 0.26rem 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.54rem;
		letter-spacing: 0.1em;
		color: var(--c-faint);
		border: 1px solid var(--c-line);
		border-radius: 4px;
		transition: all 0.2s ease;
	}
	.speed-btn:hover {
		color: var(--c-text);
		border-color: var(--c-line-strong);
	}
	.speed-btn.on {
		color: var(--c-primary);
		border-color: var(--c-primary);
		background: rgba(var(--glow), 0.12);
	}
</style>
