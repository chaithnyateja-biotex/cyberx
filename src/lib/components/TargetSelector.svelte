<script>
	/**
	 * Target selection console.
	 *
	 * Targets are invented facilities from the CYBERX fiction. The custom
	 * field accepts a free-text designation which is used purely as a label
	 * on the simulation — nothing is validated, resolved or looked up.
	 */
	import { sim, FACILITIES } from '../stores/simulation.svelte.js';
	import { sound } from '../stores/audio.svelte.js';
	import { ui } from '../stores/ui.svelte.js';
	import { tilt, ripple, counter } from '../actions.js';
	import { icon } from '../icons.js';
	import WireGlobe from './WireGlobe.svelte';

	const Lock = icon('lock');
	const Crosshair = icon('crosshair');
	const Shield = icon('shield-alert');

	let custom = $state('');

	function choose(f) {
		sound.play('beep');
		sim.setFacility(f);
	}

	function applyCustom() {
		const v = custom.trim();
		if (!v) return;
		sound.play('complete');
		sim.setCustomDesignation(v);
	}

	const hardening = $derived(sim.facility?.hardening ?? 0);
	const difficulty = $derived(
		hardening > 80 ? 'EXTREME' : hardening > 60 ? 'HIGH' : hardening > 40 ? 'MODERATE' : 'LOW'
	);
	const diffColor = $derived(
		hardening > 80
			? 'var(--c-danger)'
			: hardening > 60
				? 'var(--c-warn)'
				: hardening > 40
					? 'var(--c-info)'
					: 'var(--c-ok)'
	);
</script>

<section class="space-y-6">
	<header class="rise-in">
		<p class="label">SECTION 01</p>
		<h2 class="font-display text-xl font-bold tracking-[0.12em] sm:text-2xl">
			TARGET SIMULATION CONSOLE
		</h2>
		<p class="mt-1.5 max-w-2xl text-[0.78rem] leading-relaxed" style="color: var(--c-muted)">
			Select a fictional facility to run the simulation against. Every target below is
			invented for this simulator — none of them exist, and nothing is contacted.
		</p>
	</header>

	<!-- Facility grid -->
	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
		{#each FACILITIES as f, i (f.id)}
			{@const active = sim.facility?.id === f.id}
			<button
				use:tilt={{ max: 5 }}
				use:ripple
				class="tilt panel bracketed relative overflow-hidden p-4 text-left transition-colors"
				class:is-active={active}
				onclick={() => choose(f)}
				style="animation-delay:{i * 60}ms"
			>
				<div class="tilt-sheen"></div>
				<div class="relative flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="label !text-[0.52rem]">{f.operator}</p>
						<h3 class="font-display truncate text-[0.84rem] font-bold tracking-[0.08em]">
							{f.name}
						</h3>
					</div>
					{#if active}
						<span class="pill shrink-0" style="color: var(--c-primary); border-color: var(--c-line-strong)">
							<span class="dot dot-pulse"></span> LOCKED
						</span>
					{/if}
				</div>

				<p class="relative mt-2.5 text-[0.7rem] leading-relaxed" style="color: var(--c-muted)">
					{f.blurb}
				</p>

				<dl class="relative mt-3 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[0.62rem]">
					<div class="flex justify-between gap-2">
						<dt style="color: var(--c-faint)">DESIG</dt>
						<dd class="truncate">{f.designation}</dd>
					</div>
					<div class="flex justify-between gap-2">
						<dt style="color: var(--c-faint)">TIER</dt>
						<dd>{f.tier}</dd>
					</div>
				</dl>

				<div class="relative mt-3 flex items-center gap-2">
					<span class="label !text-[0.5rem]">HARDENING</span>
					<div class="progress-track h-[4px] flex-1">
						<div class="progress-fill static" style="width:{f.hardening}%"></div>
					</div>
					<span class="font-mono text-[0.6rem]" style="color: var(--c-primary)">{f.hardening}</span>
				</div>
			</button>
		{/each}

		<!-- Custom designation -->
		<div class="panel bracketed p-4">
			<p class="label !text-[0.52rem]">OPERATOR DEFINED</p>
			<h3 class="font-display mb-2 text-[0.84rem] font-bold tracking-[0.08em]">
				CUSTOM DESIGNATION
			</h3>
			<p class="mb-3 text-[0.7rem] leading-relaxed" style="color: var(--c-muted)">
				Name your own fictional facility. Used as a label only.
			</p>
			<div class="flex gap-2">
				<input
					class="field flex-1"
					placeholder="DEMO-SITE-2048"
					maxlength="32"
					bind:value={custom}
					onkeydown={(e) => e.key === 'Enter' && applyCustom()}
					aria-label="Custom fictional facility designation"
				/>
				<button class="btn btn-sm shrink-0" onclick={applyCustom} disabled={!custom.trim()}>
					SET
				</button>
			</div>
		</div>
	</div>

	<!-- Target visualisation -->
	{#if sim.facility}
		<div class="panel live-border glow-edge relative overflow-hidden p-5 sm:p-6">
			<div class="grid gap-6 lg:grid-cols-[1fr_auto]">
				<div class="min-w-0">
					<div class="mb-4 flex flex-wrap items-center gap-2">
						<span class="pill" style="color: var(--c-primary); border-color: var(--c-line-strong)">
							<Crosshair size={11} /> TARGET ACQUIRED
						</span>
						<span class="sim-badge">
							<span class="dot dot-pulse"></span> SYNTHETIC — FICTIONAL TARGET
						</span>
					</div>

					<h3
						class="font-display glitch text-[clamp(1.1rem,4vw,1.85rem)] font-black tracking-[0.08em]"
						data-text={sim.facility.name}
						style="color: var(--c-primary)"
					>
						{sim.facility.name}
					</h3>
					<p class="label mt-1 !text-[0.58rem]">{sim.facility.operator}</p>

					<dl class="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
						{#each [['TARGET IDENTIFIER', sim.facility.designation], ['SECTOR', sim.facility.sector], ['SESSION ID', sim.dataset?.sessionId ?? 'AWAITING RUN'], ['SIMULATION STATUS', sim.status.toUpperCase()]] as [k, v]}
							<div class="border-l-2 pl-3" style="border-color: var(--c-line)">
								<dt class="label !text-[0.5rem]">{k}</dt>
								<dd class="font-mono text-[0.76rem] break-all">{v}</dd>
							</div>
						{/each}
					</dl>

					<div class="mt-5 flex flex-wrap items-center gap-4">
						<div class="flex items-center gap-2">
							<Shield size={14} color={diffColor} />
							<span class="label !text-[0.52rem]">DIFFICULTY</span>
							<span
								class="font-mono text-[0.72rem] font-bold tracking-[0.12em]"
								style="color: {diffColor}">{difficulty}</span
							>
						</div>
						<div class="flex items-center gap-2">
							<Lock size={14} color="var(--c-muted)" />
							<span class="label !text-[0.52rem]">MODULES AVAILABLE</span>
							<span class="font-mono text-[0.72rem] font-bold" style="color: var(--c-primary)"
								><span use:counter={{ value: 9 }}>0</span></span
							>
						</div>
					</div>

					<div class="mt-5 flex flex-wrap gap-2">
						<button class="btn btn-primary" onclick={() => ui.setView('intercept')}>
							OPEN INTERCEPT MODULES
						</button>
						<button class="btn" onclick={() => ui.setView('subsystems')}>
							SUBSYSTEM TAPS
						</button>
					</div>
				</div>

				<div class="hidden shrink-0 place-items-center lg:grid">
					<WireGlobe size={252} />
					<p class="label mt-2 text-center !text-[0.5rem]">RELAY MESH — DECORATIVE</p>
				</div>
			</div>
		</div>
	{/if}
</section>

<style>
	.is-active {
		border-color: var(--c-line-strong);
		box-shadow:
			0 0 0 1px rgba(var(--glow), 0.25),
			0 0 30px -8px rgba(var(--glow), 0.5);
	}
</style>
