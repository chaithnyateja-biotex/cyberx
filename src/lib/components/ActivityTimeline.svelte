<script>
	/**
	 * Vertical timeline of the current run's synthetic records, revealed
	 * progressively as they scroll into view.
	 */
	import { sim } from '../stores/simulation.svelte.js';
	import { ui } from '../stores/ui.svelte.js';
	import { reveal } from '../actions.js';
	import { icon } from '../icons.js';

	const Warn = icon('warning');

	const ds = $derived(sim.dataset);

	const KIND_COLOR = {
		COMMS: 'var(--c-primary)',
		ACCESS: 'var(--c-info)',
		PROCESS: 'var(--c-secondary)',
		SESSION: 'var(--c-warn)'
	};

	/** Pick the most descriptive fields whatever the module shape. */
	function describe(r) {
		return {
			head: r.channel ?? r.door ?? r.name ?? r.node ?? r.detail ?? r.id ?? '—',
			sub:
				r.preview ??
				(r.holder ? `${r.holder} · ${r.role}` : null) ??
				(r.state ? `state ${r.state} · ${r.cpu}% cpu` : null) ??
				(r.status ? `${r.status} · ${r.reading}${r.unit ?? ''}` : null) ??
				r.kind ??
				'',
			stamp: r.stamp ?? r.lastSync ?? r.uptime ?? '',
			tag: r.kind ?? r.result ?? r.status ?? r.state ?? null
		};
	}
</script>

<section class="space-y-5">
	<header class="rise-in">
		<p class="label">SECTION 05</p>
		<h2 class="font-display text-xl font-bold tracking-[0.12em] sm:text-2xl">ACTIVITY TIMELINE</h2>
		<p class="mt-1.5 text-[0.78rem]" style="color: var(--c-muted)">
			Chronological view of the most recent run. All entries are fictional.
		</p>
	</header>

	{#if !ds}
		<div class="panel grid place-items-center p-12 text-center">
			<div>
				<p class="label mb-2">NO TIMELINE AVAILABLE</p>
				<p class="mb-5 text-[0.78rem]" style="color: var(--c-muted)">
					Run a module to populate the timeline.
				</p>
				<button class="btn btn-primary" onclick={() => ui.setView('intercept')}>
					OPEN MODULES
				</button>
			</div>
		</div>
	{:else}
		<div class="panel bracketed p-4 sm:p-6">
			<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
				<div>
					<p class="label !text-[0.5rem]">{ds.module.code} · {ds.sessionId}</p>
					<h3 class="font-display text-[0.9rem] font-bold tracking-[0.1em]">
						{ds.module.title} — {ds.records.length} ENTRIES
					</h3>
				</div>
				<span class="sim-badge"><span class="dot dot-pulse"></span> SYNTHETIC</span>
			</div>

			<ol class="timeline">
				{#each ds.records as r, i (r.id ?? i)}
					{@const d = describe(r)}
					<li use:reveal={{ delay: Math.min(i * 45, 600) }} class="tl-item">
						<span
							class="tl-dot"
							style="--c: {r.flagged ? 'var(--c-warn)' : (KIND_COLOR[r.kind] ?? 'var(--c-primary)')}"
						></span>
						<div class="min-w-0 flex-1 pb-5">
							<div class="flex flex-wrap items-center gap-2">
								<span class="font-mono text-[0.72rem] font-bold" style="color: var(--c-text)">
									{d.head}
								</span>
								{#if d.tag}
									<span
										class="pill !py-0 !text-[0.48rem]"
										style="color: {r.flagged ? 'var(--c-warn)' : (KIND_COLOR[r.kind] ?? 'var(--c-muted)')}"
									>
										{d.tag}
									</span>
								{/if}
								{#if r.flagged}
									<Warn size={11} color="var(--c-warn)" />
								{/if}
							</div>
							{#if d.sub}
								<p class="mt-0.5 truncate font-mono text-[0.66rem]" style="color: var(--c-muted)">
									{d.sub}
								</p>
							{/if}
							{#if d.stamp}
								<p class="label mt-0.5 !text-[0.48rem]" style="color: var(--c-faint)">{d.stamp}</p>
							{/if}
						</div>
					</li>
				{/each}
			</ol>
		</div>
	{/if}
</section>

<style>
	.timeline {
		position: relative;
		margin: 0;
		padding: 0 0 0 1.4rem;
		list-style: none;
	}
	.timeline::before {
		content: '';
		position: absolute;
		top: 4px;
		bottom: 18px;
		left: 4px;
		width: 1px;
		background: linear-gradient(
			180deg,
			rgba(var(--glow), 0.5),
			rgba(var(--glow), 0.14) 70%,
			transparent
		);
	}
	.tl-item {
		position: relative;
		display: flex;
		gap: 0.75rem;
	}
	.tl-dot {
		position: absolute;
		top: 5px;
		left: -1.4rem;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--c);
		box-shadow: 0 0 0 3px rgba(var(--glow), 0.1), 0 0 11px var(--c);
	}
</style>
