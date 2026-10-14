<script>
	/**
	 * CYBERX application shell.
	 *
	 * A fictional infiltration simulator. Targets are invented facilities;
	 * every record, log line and chart is generated in the browser from a
	 * seeded PRNG. The app makes no network requests of any kind.
	 */
	import { onMount } from 'svelte';
	import { ui } from './stores/ui.svelte.js';
	import { sim } from './stores/simulation.svelte.js';
	import { sound } from './stores/audio.svelte.js';
	import { MODULES } from './services/MockDataGenerator.js';
	import { icon } from './icons.js';

	import MatrixBackground from './components/MatrixBackground.svelte';
	import BootSequence from './components/BootSequence.svelte';
	import StatusBar from './components/StatusBar.svelte';
	import Sidebar from './components/Sidebar.svelte';
	import CyberDashboard from './components/CyberDashboard.svelte';
	import TargetSelector from './components/TargetSelector.svelte';
	import ModuleCard from './components/ModuleCard.svelte';
	import TerminalConsole from './components/TerminalConsole.svelte';
	import SimulationOverlay from './components/SimulationOverlay.svelte';
	import ResultsDashboard from './components/ResultsDashboard.svelte';
	import ActivityTimeline from './components/ActivityTimeline.svelte';
	import SimHistory from './components/SimHistory.svelte';
	import SettingsPanel from './components/SettingsPanel.svelte';

	const Play = icon('play');
	const Pause = icon('pause');
	const Skip = icon('skip-forward');
	const Replay = icon('rotate-ccw');
	const XIcon = icon('x');

	const intercept = MODULES.filter((m) => m.group === 'intercept');
	const subsystems = MODULES.filter((m) => m.group === 'subsystem');

	let showResults = $state(false);

	onMount(() => ui.init());

	function run(moduleId) {
		showResults = false;
		sim.launch(moduleId);
	}

	function viewResults() {
		showResults = true;
		ui.setView('results');
	}

	function newSimulation() {
		showResults = false;
		sound.play('woosh');
		ui.setView('intercept');
	}

	// Results is a pseudo-view reachable only after a run completes.
	const activeView = $derived(ui.view === 'results' && !sim.dataset ? 'dashboard' : ui.view);
</script>

<svelte:head>
	<title>CYBERX Simulation Console</title>
</svelte:head>

<MatrixBackground />

{#if !ui.booted}
	<BootSequence oncomplete={() => (ui.booted = true)} />
{/if}

{#if ui.booted}
	{#if !ui.cinematic}
		<StatusBar />
	{/if}
	<Sidebar />

	<main class="app-main" class:cinematic={ui.cinematic}>
		<div class="mx-auto w-full max-w-[1480px] flex-1 px-4 pt-4 pb-16 sm:px-5 sm:pt-6">
			{#if ui.cinematic}
				<button
					class="btn btn-sm btn-ghost mb-4"
					onclick={() => {
						ui.toggleCinematic();
						sound.play('woosh');
					}}
				>
					<XIcon size={12} /> EXIT CINEMATIC MODE
				</button>
			{/if}

			{#key activeView}
				<div class="view">
					{#if activeView === 'dashboard'}
						<CyberDashboard onrun={run} />
					{:else if activeView === 'target'}
						<TargetSelector />
					{:else if activeView === 'intercept'}
						<section class="space-y-5">
							<header class="rise-in">
								<p class="label">SECTION 03</p>
								<h2 class="font-display text-xl font-bold tracking-[0.12em] sm:text-2xl">
									INTERCEPT MODULES
								</h2>
								<p class="mt-1.5 max-w-2xl text-[0.78rem] leading-relaxed" style="color: var(--c-muted)">
									Running a module opens the cinematic console and generates a synthetic
									dataset for
									<span class="font-mono" style="color: var(--c-primary)">{sim.facility?.name}</span>.
								</p>
							</header>
							<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
								{#each intercept as m, i (m.id)}
									<ModuleCard module={m} index={i} disabled={sim.isBusy} onrun={run} />
								{/each}
							</div>
						</section>
					{:else if activeView === 'subsystems'}
						<section class="space-y-5">
							<header class="rise-in">
								<p class="label">SECTION 04</p>
								<h2 class="font-display text-xl font-bold tracking-[0.12em] sm:text-2xl">
									SUBSYSTEM TAPS
								</h2>
								<p class="mt-1.5 max-w-2xl text-[0.78rem] leading-relaxed" style="color: var(--c-muted)">
									Telemetry taps against the facility's fictional plant systems.
								</p>
							</header>
							<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
								{#each subsystems as m, i (m.id)}
									<ModuleCard module={m} index={i} disabled={sim.isBusy} onrun={run} />
								{/each}
							</div>
						</section>
					{:else if activeView === 'timeline'}
						<ActivityTimeline />
					{:else if activeView === 'terminal'}
						<section class="space-y-4">
							<header class="rise-in flex flex-wrap items-end justify-between gap-3">
								<div>
									<p class="label">SECTION 06</p>
									<h2 class="font-display text-xl font-bold tracking-[0.12em] sm:text-2xl">
										TERMINAL CONSOLE
									</h2>
								</div>
								<div class="flex flex-wrap gap-2">
									{#if sim.isBusy}
										<button class="btn btn-sm" onclick={() => sim.pauseResume()}>
											{#if sim.status === 'paused'}<Play size={12} /> RESUME{:else}<Pause
													size={12}
												/> PAUSE{/if}
										</button>
										<button class="btn btn-sm" onclick={() => sim.skip()}>
											<Skip size={12} /> SKIP
										</button>
									{:else if sim.dataset}
										<button class="btn btn-sm" onclick={() => sim.replay()}>
											<Replay size={12} /> REPLAY
										</button>
									{/if}
									<button class="btn btn-sm btn-ghost" onclick={() => sim.clearTerminal()}>
										CLEAR
									</button>
								</div>
							</header>
							<div class="h-[clamp(380px,62vh,680px)]">
								<TerminalConsole
									lines={sim.lines}
									stage={sim.stage}
									progress={sim.progress}
									status={sim.status}
								/>
							</div>
							<p class="label !text-[0.5rem]" style="color: var(--c-faint)">
								OUTPUT IS DECORATIVE — NO COMMAND IS EXECUTED
							</p>
						</section>
					{:else if activeView === 'results'}
						<ResultsDashboard onnew={newSimulation} />
					{:else if activeView === 'reports'}
						<SimHistory onopen={viewResults} />
					{:else if activeView === 'settings'}
						<SettingsPanel />
					{/if}
				</div>
			{/key}
		</div>

		<footer class="mx-auto w-full max-w-[1480px] px-4 pb-8 sm:px-5">
			<div class="flex flex-wrap items-center justify-between gap-3 border-t pt-4" style="border-color: var(--c-line)">
				<p class="label !text-[0.48rem] leading-relaxed">
					CYBERX · CYBER INTELLIGENCE SIMULATOR · FICTIONAL TARGETS ONLY
				</p>
				<span class="sim-badge">
					<span class="dot dot-pulse"></span> SIMULATION MODE — SYNTHETIC DATA
				</span>
			</div>
		</footer>
	</main>
{/if}

{#if sim.overlayOpen}
	<SimulationOverlay onviewresults={viewResults} />
{/if}

{#if ui.glitching}
	<div class="glitch-wipe"></div>
{/if}

<div class="vignette"></div>
<div class="scanlines"></div>
{#if !ui.reducedMotion}
	<div class="sweep"></div>
{/if}

<style>
	.app-main {
		display: flex;
		flex-direction: column;
		/* 100% of <body>, which is 100% of a :root that may already be
		   inset by the host's safe-area padding — so this never overflows
		   the way 100vh would. */
		min-height: 100%;
		padding-top: calc(var(--bar-h) + var(--safe-t));
		padding-left: var(--safe-l);
		padding-right: var(--safe-r);
		padding-bottom: var(--safe-b);
		transition: padding 0.32s cubic-bezier(0.22, 1, 0.36, 1);
	}
	@media (min-width: 1024px) {
		.app-main {
			padding-left: calc(234px + var(--safe-l));
		}
		.app-main.cinematic {
			padding-top: var(--safe-t);
			padding-left: var(--safe-l);
		}
	}
	.app-main.cinematic {
		padding-top: var(--safe-t);
	}

	.view {
		animation: view-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes view-in {
		from {
			opacity: 0;
			transform: translateY(10px);
			filter: blur(3px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
			filter: blur(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.view {
			animation: none;
		}
	}
</style>
