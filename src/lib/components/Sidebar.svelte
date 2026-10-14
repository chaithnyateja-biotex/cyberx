<script>
	/**
	 * Primary navigation. Fixed rail on desktop; slide-over drawer on
	 * mobile, dismissed by backdrop tap, Escape or route change.
	 */
	import { ui, VIEWS } from '../stores/ui.svelte.js';
	import { sim } from '../stores/simulation.svelte.js';
	import { sound } from '../stores/audio.svelte.js';
	import { icon } from '../icons.js';

	const X = icon('x');
	const Chevron = icon('chevron-right');

	function go(id) {
		sound.play('woosh');
		ui.setView(id);
	}

	const badge = (id) => {
		if (id === 'reports' && sim.history.length) return String(sim.history.length);
		if (id === 'terminal' && sim.isBusy) return '●';
		return null;
	};
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && ui.sidebarOpen) ui.sidebarOpen = false;
	}}
/>

{#if ui.sidebarOpen && ui.isMobile}
	<button
		class="fixed inset-0 z-[98] lg:hidden"
		style="background: rgba(2,4,10,.72); backdrop-filter: blur(3px)"
		onclick={() => (ui.sidebarOpen = false)}
		aria-label="Close navigation"
	></button>
{/if}

<nav
	class="sidebar {ui.sidebarOpen ? 'open' : ''}"
	aria-label="Main navigation"
	class:cinematic={ui.cinematic}
>
	<div class="flex h-14 shrink-0 items-center gap-2 px-4 lg:hidden" style="border-bottom:1px solid var(--c-line)">
		<span class="font-display text-sm font-black tracking-[0.16em]" style="color: var(--c-primary)">
			CYBERX
		</span>
		<button
			class="btn btn-sm btn-ghost ml-auto"
			onclick={() => (ui.sidebarOpen = false)}
			aria-label="Close navigation"
		>
			<X size={14} />
		</button>
	</div>

	<ul class="hide-scroll flex-1 space-y-0.5 overflow-y-auto p-2.5">
		{#each VIEWS as v (v.id)}
			{@const Glyph = icon(v.icon)}
			{@const b = badge(v.id)}
			<li>
				<button
					class="nav-item"
					class:on={ui.view === v.id}
					onclick={() => go(v.id)}
					aria-current={ui.view === v.id ? 'page' : undefined}
				>
					<Glyph size={15} strokeWidth={1.7} class="shrink-0" />
					<span class="flex-1 truncate text-left">{v.label}</span>
					{#if b}
						<span class="nav-badge">{b}</span>
					{:else if ui.view === v.id}
						<Chevron size={13} class="shrink-0 opacity-70" />
					{/if}
				</button>
			</li>
		{/each}
	</ul>

	<div class="shrink-0 space-y-2.5 border-t p-3" style="border-color: var(--c-line)">
		<div class="space-y-1.5">
			{#each [['SYSTEM ONLINE', 'var(--c-ok)'], ['SIMULATION ENGINE ACTIVE', 'var(--c-primary)'], ['ENCRYPTION VISUALIZER', 'var(--c-secondary)'], [sim.isBusy ? 'TERMINAL BUSY' : 'TERMINAL READY', sim.isBusy ? 'var(--c-warn)' : 'var(--c-info)']] as [label, color]}
				<div class="flex items-center gap-2 font-mono text-[0.54rem] tracking-[0.1em]" style="color: {color}">
					<span class="dot dot-pulse"></span>
					<span class="truncate">{label}</span>
				</div>
			{/each}
		</div>
		<p class="label !text-[0.46rem] leading-relaxed" style="color: var(--c-faint)">
			ALL TARGETS FICTIONAL<br />NO REAL SYSTEM IS CONTACTED
		</p>
	</div>
</nav>

<style>
	.sidebar {
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		z-index: 99;
		display: flex;
		width: calc(234px + var(--safe-l));
		padding-top: var(--safe-t);
		padding-bottom: var(--safe-b);
		padding-left: var(--safe-l);
		flex-direction: column;
		background: linear-gradient(180deg, rgba(8, 14, 30, 0.92), rgba(5, 9, 20, 0.95));
		border-right: 1px solid var(--c-line);
		backdrop-filter: blur(16px);
		transform: translateX(-100%);
		transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
	}
	:root[data-theme='green'] .sidebar {
		background: linear-gradient(180deg, rgba(4, 18, 10, 0.92), rgba(2, 10, 6, 0.95));
	}
	:root[data-theme='red'] .sidebar {
		background: linear-gradient(180deg, rgba(26, 8, 14, 0.92), rgba(14, 4, 8, 0.95));
	}
	.sidebar.open {
		transform: translateX(0);
	}

	@media (min-width: 1024px) {
		.sidebar {
			/* sits below the status bar, which already absorbed the top inset */
			top: calc(var(--bar-h) + var(--safe-t));
			padding-top: 0;
			transform: translateX(0);
		}
		.sidebar.cinematic {
			transform: translateX(-100%);
		}
	}

	.nav-item {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 0.6rem;
		padding: 0.58rem 0.7rem;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		color: var(--c-muted);
		border: 1px solid transparent;
		border-radius: 6px;
		transition: all 0.2s ease;
	}
	.nav-item:hover {
		color: var(--c-text);
		background: rgba(var(--glow), 0.07);
		border-color: var(--c-line);
	}
	.nav-item.on {
		color: var(--c-primary);
		background: rgba(var(--glow), 0.12);
		border-color: var(--c-line-strong);
		box-shadow: inset 2px 0 0 var(--c-primary);
	}

	.nav-badge {
		padding: 0.05rem 0.35rem;
		font-size: 0.5rem;
		color: var(--c-primary);
		background: rgba(var(--glow), 0.16);
		border: 1px solid var(--c-line-strong);
		border-radius: 999px;
		flex: none;
	}
</style>
