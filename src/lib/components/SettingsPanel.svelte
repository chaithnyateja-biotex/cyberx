<script>
	/**
	 * Settings — audio mixer, animation speed, theme, and presentation mode.
	 */
	import { sound } from '../stores/audio.svelte.js';
	import { ui, THEMES } from '../stores/ui.svelte.js';
	import { sim, SPEEDS } from '../stores/simulation.svelte.js';
	import { icon } from '../icons.js';

	const Vol = icon('volume-2');
	const Mute = icon('volume-x');

	const BUSES = [
		{ key: 'master', label: 'MASTER VOLUME' },
		{ key: 'music', label: 'MUSIC VOLUME' },
		{ key: 'effects', label: 'EFFECTS VOLUME' }
	];

	async function enable() {
		await sound.unlock();
		sound.play('startup');
	}

	function onSlide(key, e) {
		sound.set(key, Number(e.currentTarget.value) / 100);
		if (key !== 'music') sound.play('tick');
	}
</script>

<section class="space-y-5">
	<header class="rise-in">
		<p class="label">SECTION 08</p>
		<h2 class="font-display text-xl font-bold tracking-[0.12em] sm:text-2xl">SETTINGS</h2>
	</header>

	<div class="grid gap-4 lg:grid-cols-2">
		<!-- audio -->
		<div class="panel bracketed p-5">
			<div class="mb-4 flex items-center justify-between gap-3">
				<div>
					<p class="label !text-[0.5rem]">AUDIO ENGINE</p>
					<h3 class="font-display text-[0.86rem] font-bold tracking-[0.1em]">
						PROCEDURAL SOUND
					</h3>
				</div>
				<button
					class="btn btn-sm"
					class:btn-primary={!sound.enabled || !sound.unlocked}
					onclick={() => (sound.unlocked ? sound.toggle() : enable())}
				>
					{#if !sound.unlocked}
						ENABLE AUDIO
					{:else if sound.enabled}
						<Vol size={12} /> SOUND ON
					{:else}
						<Mute size={12} /> SOUND OFF
					{/if}
				</button>
			</div>

			{#if !sound.unlocked}
				<p class="mb-4 text-[0.72rem] leading-relaxed" style="color: var(--c-muted)">
					Browsers require a click before audio can start. Enable it to hear the engine —
					every sound is synthesised live from oscillators and filtered noise.
				</p>
			{/if}

			<div class="space-y-4" class:opacity-40={!sound.unlocked || !sound.enabled}>
				{#each BUSES as b (b.key)}
					<div>
						<div class="mb-1.5 flex items-baseline justify-between">
							<label class="label !text-[0.5rem]" for="vol-{b.key}">{b.label}</label>
							<span class="font-mono text-[0.62rem]" style="color: var(--c-primary)">
								{Math.round(sound[b.key] * 100)}%
							</span>
						</div>
						<input
							id="vol-{b.key}"
							type="range"
							min="0"
							max="100"
							value={Math.round(sound[b.key] * 100)}
							oninput={(e) => onSlide(b.key, e)}
							disabled={!sound.unlocked || !sound.enabled}
							class="slider"
						/>
					</div>
				{/each}

				<label class="flex cursor-pointer items-center justify-between gap-3 border-t pt-3" style="border-color: var(--c-line)">
					<span>
						<span class="label !text-[0.5rem]">BACKGROUND AMBIENCE</span>
						<span class="block text-[0.68rem]" style="color: var(--c-faint)">
							Sub-bass bed and drifting pad
						</span>
					</span>
					<input
						type="checkbox"
						checked={sound.ambience}
						onchange={() => sound.toggleAmbience()}
						disabled={!sound.unlocked || !sound.enabled}
						class="switch"
					/>
				</label>
			</div>

			<div class="mt-4 border-t pt-3" style="border-color: var(--c-line)">
				<p class="label mb-2 !text-[0.5rem]">TEST SOUNDS</p>
				<div class="flex flex-wrap gap-1.5">
					{#each ['startup', 'key', 'beep', 'scan', 'glitch', 'warning', 'complete', 'download'] as s}
						<button
							class="btn btn-sm btn-ghost !text-[0.52rem]"
							onclick={() => sound.play(s)}
							disabled={!sound.unlocked || !sound.enabled}
						>
							{s.toUpperCase()}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- presentation -->
		<div class="space-y-4">
			<div class="panel bracketed p-5">
				<p class="label !text-[0.5rem]">ANIMATION</p>
				<h3 class="font-display mb-3 text-[0.86rem] font-bold tracking-[0.1em]">
					SIMULATION SPEED
				</h3>
				<div class="grid grid-cols-2 gap-2">
					{#each Object.entries(SPEEDS) as [key, s] (key)}
						<button
							class="btn btn-sm"
							class:btn-primary={sim.speed === key}
							onclick={() => {
								sim.setSpeed(key);
								sound.play('tick');
							}}
						>
							{s.label}
						</button>
					{/each}
				</div>
				<p class="mt-3 text-[0.68rem]" style="color: var(--c-faint)">
					Normal runs the reference ~13 second sequence. Cinematic stretches it for
					presentation.
				</p>
			</div>

			<div class="panel bracketed p-5">
				<p class="label !text-[0.5rem]">APPEARANCE</p>
				<h3 class="font-display mb-3 text-[0.86rem] font-bold tracking-[0.1em]">THEME</h3>
				<div class="grid gap-2 sm:grid-cols-3">
					{#each THEMES as t (t.id)}
						<button
							class="theme-card"
							class:on={ui.theme === t.id}
							onclick={() => {
								ui.setTheme(t.id);
								sound.play('tick');
							}}
						>
							<span class="theme-sw" style="background: {t.swatch}"></span>
							<span class="font-mono text-[0.54rem] tracking-[0.1em]">{t.label}</span>
						</button>
					{/each}
				</div>

				<label class="mt-4 flex cursor-pointer items-center justify-between gap-3 border-t pt-3" style="border-color: var(--c-line)">
					<span>
						<span class="label !text-[0.5rem]">CINEMATIC MODE</span>
						<span class="block text-[0.68rem]" style="color: var(--c-faint)">
							Hide navigation for presentation
						</span>
					</span>
					<input type="checkbox" checked={ui.cinematic} onchange={() => ui.toggleCinematic()} class="switch" />
				</label>

				{#if ui.reducedMotion}
					<p class="mt-3 rounded border p-2.5 text-[0.66rem] leading-relaxed" style="border-color: rgba(251,191,36,.3); color: var(--c-warn)">
						Your system requests reduced motion — ambient animation is disabled and
						sequences play without typing effects. Simulations still complete normally.
					</p>
				{/if}
			</div>

			<div class="panel bracketed p-5">
				<p class="label !text-[0.5rem]">DATA</p>
				<h3 class="font-display mb-2 text-[0.86rem] font-bold tracking-[0.1em]">
					SIMULATION SAFETY
				</h3>
				<ul class="space-y-1.5 text-[0.7rem] leading-relaxed" style="color: var(--c-muted)">
					{#each ['All records are generated locally from a seeded PRNG.', 'No network request is made by the simulator.', 'Targets, crew and traffic are fictional inventions.', 'Terminal output is decorative; nothing is executed.', 'Exports carry a synthetic-data notice in the file.'] as item}
						<li class="flex gap-2">
							<span style="color: var(--c-ok)">✓</span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
				<button
					class="btn btn-sm mt-4"
					onclick={() => {
						sim.history = [];
						sim.clearTerminal();
						sound.play('woosh');
					}}
				>
					CLEAR SESSION HISTORY
				</button>
			</div>
		</div>
	</div>
</section>

<style>
	.slider {
		width: 100%;
		height: 4px;
		appearance: none;
		background: rgba(var(--glow), 0.16);
		border-radius: 999px;
		outline: none;
		cursor: pointer;
	}
	.slider::-webkit-slider-thumb {
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--c-primary);
		box-shadow: 0 0 10px rgba(var(--glow), 0.8);
		cursor: pointer;
		transition: transform 0.15s ease;
	}
	.slider::-webkit-slider-thumb:hover {
		transform: scale(1.18);
	}
	.slider::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border: none;
		border-radius: 50%;
		background: var(--c-primary);
		box-shadow: 0 0 10px rgba(var(--glow), 0.8);
		cursor: pointer;
	}
	.slider:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.switch {
		position: relative;
		width: 38px;
		height: 20px;
		flex: none;
		appearance: none;
		background: rgba(var(--glow), 0.14);
		border: 1px solid var(--c-line);
		border-radius: 999px;
		cursor: pointer;
		transition: background 0.22s ease;
	}
	.switch::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--c-muted);
		transition: all 0.22s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.switch:checked {
		background: rgba(var(--glow), 0.3);
		border-color: var(--c-primary);
	}
	.switch:checked::after {
		left: 20px;
		background: var(--c-primary);
		box-shadow: 0 0 9px rgba(var(--glow), 0.9);
	}
	.switch:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.theme-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
		padding: 0.75rem 0.4rem;
		border: 1px solid var(--c-line);
		border-radius: 7px;
		color: var(--c-muted);
		transition: all 0.22s ease;
	}
	.theme-card:hover {
		border-color: var(--c-line-strong);
		color: var(--c-text);
	}
	.theme-card.on {
		border-color: var(--c-primary);
		background: rgba(var(--glow), 0.1);
		color: var(--c-primary);
	}
	.theme-sw {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		box-shadow: 0 0 14px -2px currentColor;
	}
</style>
