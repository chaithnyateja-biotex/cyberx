<script>
	/**
	 * Session history — every run completed during this browsing session,
	 * restorable and re-exportable. Held in memory only; closing the tab
	 * clears it.
	 */
	import { sim } from '../stores/simulation.svelte.js';
	import { ui } from '../stores/ui.svelte.js';
	import { sound } from '../stores/audio.svelte.js';
	import { reveal } from '../actions.js';
	import { icon } from '../icons.js';
	import { exportCSV, exportJSON, exportHTML } from '../services/ReportExporter.js';

	let { onopen } = $props();

	const Csv = icon('file-spreadsheet');
	const Json = icon('file-json');
	const Html = icon('file-text');
	const Replay = icon('rotate-ccw');

	function restore(entry) {
		sound.play('beep');
		sim.restore(entry);
		onopen?.();
	}

	function rerun(entry) {
		sound.play('beep');
		sim.setFacility(entry.dataset.facility);
		sim.launch(entry.moduleId, { seed: entry.seed });
	}

	const timeText = (d) =>
		d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
</script>

<section class="space-y-5">
	<header class="rise-in">
		<p class="label">SECTION 07</p>
		<h2 class="font-display text-xl font-bold tracking-[0.12em] sm:text-2xl">
			SIMULATION REPORTS
		</h2>
		<p class="mt-1.5 text-[0.78rem]" style="color: var(--c-muted)">
			Runs completed in this browsing session. Replay reproduces a run exactly from its seed.
		</p>
	</header>

	{#if sim.history.length === 0}
		<div class="panel grid place-items-center p-12 text-center">
			<div>
				<p class="label mb-2">NO SESSIONS YET</p>
				<p class="mb-5 text-[0.78rem]" style="color: var(--c-muted)">
					Completed runs will be listed here.
				</p>
				<button class="btn btn-primary" onclick={() => ui.setView('intercept')}>
					RUN A MODULE
				</button>
			</div>
		</div>
	{:else}
		<div class="space-y-3">
			{#each sim.history as h, i (h.sessionId)}
				<article use:reveal={{ delay: i * 55 }} class="panel bracketed p-4">
					<div class="flex flex-wrap items-start gap-4">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<span class="label !text-[0.5rem]" style="color: var(--c-primary)">
									{h.moduleCode}
								</span>
								<span class="pill !py-0 !text-[0.48rem]">{h.records} RECORDS</span>
								<span class="sim-badge !py-0 !text-[0.46rem]">SYNTHETIC</span>
							</div>
							<h3 class="font-display mt-0.5 text-[0.86rem] font-bold tracking-[0.08em]">
								{h.moduleTitle}
							</h3>
							<p class="mt-0.5 truncate font-mono text-[0.66rem]" style="color: var(--c-muted)">
								{h.facility} · {h.designation}
							</p>
							<p class="label mt-1 !text-[0.48rem]" style="color: var(--c-faint)">
								{h.sessionId} · {timeText(h.at)} · SEED {h.seed}
							</p>
						</div>

						<div class="flex flex-wrap gap-1.5">
							<button class="btn btn-sm" onclick={() => restore(h)}>VIEW</button>
							<button class="btn btn-sm btn-ghost" onclick={() => rerun(h)} title="Replay this exact run">
								<Replay size={12} />
							</button>
							<button
								class="btn btn-sm btn-ghost"
								onclick={() => {
									sound.play('download');
									exportCSV(h.dataset);
								}}
								title="Export CSV"
							>
								<Csv size={12} />
							</button>
							<button
								class="btn btn-sm btn-ghost"
								onclick={() => {
									sound.play('download');
									exportJSON(h.dataset);
								}}
								title="Export JSON"
							>
								<Json size={12} />
							</button>
							<button
								class="btn btn-sm btn-ghost"
								onclick={() => {
									sound.play('download');
									exportHTML(h.dataset);
								}}
								title="Export printable HTML"
							>
								<Html size={12} />
							</button>
						</div>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</section>
