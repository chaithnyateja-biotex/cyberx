<script>
	/**
	 * Top bar: brand, persistent simulation-mode badge, live clock,
	 * theme switcher and the sound toggle.
	 */
	import { ui, THEMES } from '../stores/ui.svelte.js';
	import { sound } from '../stores/audio.svelte.js';
	import { sim } from '../stores/simulation.svelte.js';
	import { icon } from '../icons.js';
	import { magnetic } from '../actions.js';

	const Menu = icon('menu');
	const Vol = icon('volume-2');
	const Mute = icon('volume-x');
	const Gauge = icon('gauge');

	async function toggleSound() {
		if (!sound.unlocked) {
			await sound.unlock();
			sound.play('beep');
			return;
		}
		sound.toggle();
		if (sound.enabled) sound.play('beep');
	}
</script>

<header class="statusbar">
	<span class="shrink-0 lg:hidden">
		<button
			class="btn btn-sm btn-ghost"
			onclick={() => (ui.sidebarOpen = !ui.sidebarOpen)}
			aria-label="Toggle navigation"
			aria-expanded={ui.sidebarOpen}
		>
			<Menu size={15} />
		</button>
	</span>

	<div class="flex min-w-0 items-baseline gap-2.5">
		<span
			class="font-display shrink-0 text-[0.86rem] font-black tracking-[0.16em] sm:text-base sm:tracking-[0.2em]"
			style="color: var(--c-primary); text-shadow: 0 0 18px rgba(var(--glow),.5)"
		>
			CYBERX
		</span>
		<span class="label hidden truncate !text-[0.5rem] md:inline">
			CYBER INTELLIGENCE SIMULATOR
		</span>
	</div>

	<span class="sim-badge ml-1 shrink-0">
		<span class="dot dot-pulse"></span>
		<span class="hidden sm:inline">SIMULATION MODE — SYNTHETIC DATA</span>
		<span class="sm:hidden">SIM MODE</span>
	</span>

	<div class="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
		<!-- Wrapped: `.btn`/`.pill` are unlayered and win over a bare `hidden`
		     utility, so responsive hiding happens on a plain element. -->
		{#if sim.isBusy}
			<span class="hidden lg:block">
				<span class="pill" style="color: var(--c-warn); border-color: rgba(251,191,36,.3)">
					<span class="dot dot-pulse"></span> RUN {sim.progress}%
				</span>
			</span>
		{/if}

		<!-- clock -->
		<div class="hidden text-right sm:block">
			<p
				class="font-mono text-[0.78rem] leading-none font-bold tabular-nums"
				style="color: var(--c-primary)"
			>
				{ui.clockText}
			</p>
			<p class="label !text-[0.46rem]">{ui.dateText}</p>
		</div>

		<!-- theme (hidden on phones — also available in Settings) -->
		<div class="hidden gap-1 sm:flex" role="group" aria-label="Theme">
			{#each THEMES as t (t.id)}
				<button
					use:magnetic={{ strength: 0.14 }}
					class="theme-dot"
					class:on={ui.theme === t.id}
					style="--sw: {t.swatch}"
					onclick={() => {
						ui.setTheme(t.id);
						sound.play('tick');
					}}
					title={t.label}
					aria-label={t.label}
					aria-pressed={ui.theme === t.id}
				></button>
			{/each}
		</div>

		<button
			class="btn btn-sm btn-ghost shrink-0"
			onclick={toggleSound}
			aria-label={sound.enabled && sound.unlocked ? 'Mute audio' : 'Enable audio'}
			title={sound.unlocked ? (sound.enabled ? 'Mute' : 'Unmute') : 'Enable audio'}
		>
			{#if sound.enabled && sound.unlocked}
				<Vol size={14} />
			{:else}
				<Mute size={14} />
			{/if}
		</button>

		<span class="hidden shrink-0 lg:block">
			<button
				class="btn btn-sm btn-ghost"
				onclick={() => {
					ui.toggleCinematic();
					sound.play('woosh');
				}}
				title="Cinematic full-screen mode"
				aria-pressed={ui.cinematic}
			>
				<Gauge size={14} />
			</button>
		</span>
	</div>
</header>

<style>
	/* Pinned to the viewport edge, so it carries the top and side insets
	   itself rather than relying on page padding. */
	.statusbar {
		position: fixed;
		top: 0;
		right: 0;
		left: 0;
		z-index: 100;
		display: flex;
		height: calc(var(--bar-h) + var(--safe-t));
		align-items: center;
		gap: 0.6rem;
		padding-top: var(--safe-t);
		padding-left: max(1rem, var(--safe-l));
		padding-right: max(1rem, var(--safe-r));
		background: rgba(4, 7, 16, 0.88);
		border-bottom: 1px solid var(--c-line);
		backdrop-filter: blur(16px) saturate(140%);
	}
	:root[data-theme='green'] .statusbar {
		background: rgba(2, 8, 4, 0.88);
	}
	:root[data-theme='red'] .statusbar {
		background: rgba(12, 3, 6, 0.88);
	}
	@media (min-width: 640px) {
		.statusbar {
			padding-left: max(1.1rem, var(--safe-l));
			padding-right: max(1.1rem, var(--safe-r));
		}
	}

	.theme-dot {
		width: 15px;
		height: 15px;
		border-radius: 50%;
		background: var(--sw);
		border: 2px solid transparent;
		opacity: 0.42;
		transition: all 0.22s ease;
	}
	.theme-dot:hover {
		opacity: 0.85;
		transform: scale(1.12);
	}
	.theme-dot.on {
		opacity: 1;
		border-color: rgba(255, 255, 255, 0.75);
		box-shadow: 0 0 12px var(--sw);
	}
</style>
