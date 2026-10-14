<script>
	/**
	 * Command-centre home view: live status, target summary, radar, globe,
	 * and quick launch for the intercept modules.
	 */
	import { sim } from '../stores/simulation.svelte.js';
	import { ui } from '../stores/ui.svelte.js';
	import { sound } from '../stores/audio.svelte.js';
	import { MODULES } from '../services/MockDataGenerator.js';
	import { counter, reveal, tilt } from '../actions.js';
	import { icon } from '../icons.js';
	import CyberRadar from './CyberRadar.svelte';
	import WireGlobe from './WireGlobe.svelte';
	import ModuleCard from './ModuleCard.svelte';

	let { onrun } = $props();

	const Crosshair = icon('crosshair');

	const intercept = MODULES.filter((m) => m.group === 'intercept');

	// Decorative floating hex column positions, fixed per mount.
	const hexes = Array.from({ length: 14 }, (_, i) => ({
		left: (i * 7.3 + 4) % 96,
		dur: 13 + (i % 7) * 2.6,
		delay: -(i * 1.9),
		val: Math.floor(Math.random() * 0xffffff)
			.toString(16)
			.toUpperCase()
			.padStart(6, '0')
	}));

	const telemetry = $derived([
		{ label: 'MODULES ONLINE', value: 9, unit: '' },
		{ label: 'SESSIONS RUN', value: sim.history.length, unit: '' },
		{ label: 'TARGET HARDENING', value: sim.facility?.hardening ?? 0, unit: '%' },
		{ label: 'RECORDS GENERATED', value: sim.history.reduce((a, h) => a + h.records, 0), unit: '' }
	]);
</script>

<section class="relative space-y-6">
	<!-- floating hex (decorative) -->
	{#if !ui.reducedMotion}
		<div class="pointer-events-none absolute inset-0 -z-[1] overflow-hidden" aria-hidden="true">
			{#each hexes as h, i (i)}
				<span
					class="hex-float"
					style="left:{h.left}%; top:{(i * 13) % 80}%; animation-duration:{h.dur}s; animation-delay:{h.delay}s"
					>0x{h.val}</span
				>
			{/each}
		</div>
	{/if}

	<!-- hero -->
	<div class="panel live-border glow-edge relative overflow-hidden p-5 sm:p-7">
		<div class="grid gap-7 lg:grid-cols-[1fr_auto]">
			<div class="min-w-0">
				<p class="label mb-2">COMMAND CENTRE</p>
				<h1
					class="font-display glitch text-[clamp(2rem,8vw,3.6rem)] leading-[0.95] font-black tracking-[0.1em]"
					data-text="CYBERX"
					style="color: var(--c-primary); text-shadow: 0 0 38px rgba(var(--glow),.42)"
				>
					CYBERX
				</h1>
				<p class="label mt-2 !text-[0.6rem] tracking-[0.34em]">CYBER INTELLIGENCE SIMULATOR</p>

				<div class="mt-5 flex flex-wrap gap-2">
					{#each [['SYSTEM ONLINE', 'var(--c-ok)'], ['SIMULATION ENGINE ACTIVE', 'var(--c-primary)'], ['ENCRYPTION VISUALIZER ACTIVE', 'var(--c-secondary)'], [sim.isBusy ? 'TERMINAL BUSY' : 'TERMINAL READY', sim.isBusy ? 'var(--c-warn)' : 'var(--c-info)']] as [label, color]}
						<span class="pill" style="color: {color}; border-color: color-mix(in srgb, {color} 30%, transparent)">
							<span class="dot dot-pulse"></span>{label}
						</span>
					{/each}
				</div>

				<p class="mt-5 max-w-xl text-[0.8rem] leading-relaxed" style="color: var(--c-muted)">
					A cinematic infiltration simulator. Pick a fictional facility, run a module, and
					watch the console work. Every record it produces is generated here in your
					browser — the facilities, crews and traffic are invented for this simulator.
				</p>

				<div class="mt-5 flex flex-wrap gap-2">
					<button class="btn btn-primary" onclick={() => ui.setView('target')}>
						<Crosshair size={13} /> SELECT TARGET
					</button>
					<button class="btn" onclick={() => ui.setView('intercept')}>BROWSE MODULES</button>
				</div>
			</div>

			<div class="grid shrink-0 place-items-center gap-3">
				<CyberRadar size={210} contacts={10} />
				<p class="label !text-[0.48rem]">SIMULATED CONTACT RETURNS</p>
			</div>
		</div>
	</div>

	<!-- telemetry -->
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#each telemetry as t, i (t.label)}
			<div use:reveal={{ delay: i * 65 }} use:tilt={{ max: 4 }} class="tilt panel bracketed relative overflow-hidden p-4">
				<div class="tilt-sheen"></div>
				<p class="label !text-[0.48rem]">{t.label}</p>
				<p class="font-display mt-1 text-2xl font-black tabular-nums" style="color: var(--c-primary)">
					<span use:counter={{ value: t.value }}>0</span>{t.unit}
				</p>
			</div>
		{/each}
	</div>

	<!-- target + globe -->
	<div class="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
		<div class="panel bracketed p-5">
			<p class="label !text-[0.5rem]">ACTIVE TARGET</p>
			<h2 class="font-display mt-0.5 text-lg font-bold tracking-[0.08em]">
				{sim.facility?.name ?? 'NONE SELECTED'}
			</h2>
			<p class="label mt-1 !text-[0.54rem]">{sim.facility?.operator ?? '—'}</p>

			<dl class="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
				{#each [['DESIGNATION', sim.facility?.designation ?? '—'], ['SECTOR', sim.facility?.sector ?? '—'], ['TIER', sim.facility?.tier ?? '—'], ['LAST SESSION', sim.history[0]?.sessionId ?? 'NONE']] as [k, v]}
					<div class="border-l-2 pl-3" style="border-color: var(--c-line)">
						<dt class="label !text-[0.48rem]">{k}</dt>
						<dd class="font-mono text-[0.74rem] break-all">{v}</dd>
					</div>
				{/each}
			</dl>

			<div class="mt-4 flex items-center gap-3">
				<span class="label !text-[0.48rem]">HARDENING</span>
				<div class="progress-track flex-1">
					<div class="progress-fill static" style="width:{sim.facility?.hardening ?? 0}%"></div>
				</div>
				<span class="font-mono text-[0.68rem] font-bold" style="color: var(--c-primary)">
					{sim.facility?.hardening ?? 0}%
				</span>
			</div>

			<button class="btn btn-sm mt-4" onclick={() => ui.setView('target')}>CHANGE TARGET</button>
		</div>

		<div class="panel bracketed grid place-items-center p-5">
			<WireGlobe size={236} />
			<p class="label mt-2 text-center !text-[0.48rem]">
				RELAY MESH · DECORATIVE<br />
				<span style="color: var(--c-faint)">NO REAL LOCATIONS TRACKED</span>
			</p>
		</div>
	</div>

	<!-- quick launch -->
	<div>
		<div class="mb-3 flex items-end justify-between gap-3">
			<div>
				<p class="label">QUICK LAUNCH</p>
				<h2 class="font-display text-lg font-bold tracking-[0.1em]">INTERCEPT MODULES</h2>
			</div>
			<button class="btn btn-sm btn-ghost" onclick={() => ui.setView('subsystems')}>
				SUBSYSTEM TAPS →
			</button>
		</div>
		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			{#each intercept as m, i (m.id)}
				<ModuleCard module={m} index={i} disabled={sim.isBusy} {onrun} />
			{/each}
		</div>
	</div>
</section>
