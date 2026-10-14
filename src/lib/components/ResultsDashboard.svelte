<script>
	/**
	 * Simulated results view — animated statistics, charts, the generated
	 * record set, and export actions.
	 *
	 * Every figure shown here was produced locally by MockDataGenerator for
	 * this session. The synthetic-data banner is rendered unconditionally
	 * and is carried into every exported file.
	 */
	import { onDestroy } from 'svelte';
	import { sim } from '../stores/simulation.svelte.js';
	import { sound } from '../stores/audio.svelte.js';
	import { ui } from '../stores/ui.svelte.js';
	import { counter, reveal, ripple } from '../actions.js';
	import { icon } from '../icons.js';
	import { exportCSV, exportJSON, exportHTML, printHTML } from '../services/ReportExporter.js';

	let { onnew } = $props();

	const Csv = icon('file-spreadsheet');
	const Json = icon('file-json');
	const Html = icon('file-text');
	const Print = icon('printer');
	const Replay = icon('rotate-ccw');
	const New = icon('refresh-cw');
	const Warn = icon('warning');

	let detail = $state(null);

	const ds = $derived(sim.dataset);
	const maxAct = $derived(ds ? Math.max(...ds.charts.activity, 1) : 1);

	let exportMsg = $state('');
	let exportBad = $state(false);
	let msgTimer;

	function note(text, bad = false) {
		clearTimeout(msgTimer);
		exportMsg = text;
		exportBad = bad;
		msgTimer = setTimeout(() => (exportMsg = ''), 5000);
	}

	/** A save is never guaranteed — report what actually happened. */
	async function dl(fn, label) {
		if (!ds) return;
		sound.play('download');
		const r = await fn(ds);
		if (r?.ok) note(`${label} report saved.`);
		else if (r?.reason === 'declined') note('Save cancelled.', true);
		else note(r?.message || `Couldn't save the ${label} report here.`, true);
	}

	async function doPrint() {
		if (!ds) return;
		sound.play('download');
		// Printing is blocked in some embedded contexts; fall back to the file.
		if (printHTML(ds)) return;
		const r = await exportHTML(ds);
		if (r?.ok) note('Printing unavailable here — saved the HTML report instead.');
		else if (r?.reason === 'declined') note('Save cancelled.', true);
		else note(r?.message || "Couldn't print or save the report here.", true);
	}

	onDestroy(() => clearTimeout(msgTimer));

	/** Build the SVG path for the signal trace. */
	const tracePath = $derived.by(() => {
		if (!ds) return { line: '', area: '' };
		const pts = ds.charts.trace;
		const W = 300,
			H = 64;
		const step = W / (pts.length - 1);
		const y = (v) => H - (v / 100) * (H - 6) - 3;
		let d = `M 0 ${y(pts[0]).toFixed(2)}`;
		for (let i = 1; i < pts.length; i++) {
			const x0 = (i - 1) * step,
				x1 = i * step;
			const cx = (x0 + x1) / 2;
			d += ` C ${cx.toFixed(2)} ${y(pts[i - 1]).toFixed(2)}, ${cx.toFixed(2)} ${y(pts[i]).toFixed(2)}, ${x1.toFixed(2)} ${y(pts[i]).toFixed(2)}`;
		}
		return { line: d, area: `${d} L ${W} ${H} L 0 ${H} Z` };
	});

	const STATUS_COLOR = {
		GRANTED: 'var(--c-ok)',
		DENIED: 'var(--c-danger)',
		OVERRIDE: 'var(--c-warn)',
		NOMINAL: 'var(--c-ok)',
		DEGRADED: 'var(--c-warn)',
		FAULT: 'var(--c-danger)',
		RUN: 'var(--c-ok)',
		WAIT: 'var(--c-info)',
		HUNG: 'var(--c-danger)'
	};
	const cellColor = (v) => STATUS_COLOR[String(v)] ?? 'inherit';
	const keys = $derived(ds?.records?.length ? Object.keys(ds.records[0]) : []);
	const shown = $derived(keys.filter((k) => k !== 'flagged'));
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && detail) detail = null;
	}}
/>

{#if !ds}
	<div class="panel grid place-items-center p-12 text-center">
		<div>
			<p class="label mb-2">NO SIMULATION DATA</p>
			<p class="mb-5 text-[0.78rem]" style="color: var(--c-muted)">
				Run a module to generate a synthetic report.
			</p>
			<button class="btn btn-primary" onclick={() => ui.setView('intercept')}>
				OPEN MODULES
			</button>
		</div>
	</div>
{:else}
	<section class="space-y-5">
		<!-- header -->
		<header class="rise-in flex flex-wrap items-start justify-between gap-4">
			<div class="min-w-0">
				<p class="label">{ds.module.code} · RESULTS</p>
				<h2 class="font-display text-xl font-bold tracking-[0.1em] sm:text-2xl">
					{ds.module.title}
				</h2>
				<p class="label mt-1 !text-[0.56rem]" style="color: var(--c-faint)">
					{ds.facility.name} · SESSION {ds.sessionId}
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<button class="btn btn-sm" onclick={() => sim.replay()}>
					<Replay size={12} /> REPLAY
				</button>
				<button class="btn btn-sm" onclick={() => onnew?.()}>
					<New size={12} /> NEW SIMULATION
				</button>
			</div>
		</header>

		<!-- synthetic banner -->
		<div
			class="flex items-start gap-3 rounded-lg border p-3.5"
			style="border-color: rgba(251,191,36,.38); background: rgba(251,191,36,.07)"
		>
			<Warn size={16} color="var(--c-warn)" class="shrink-0" />
			<p class="text-[0.72rem] leading-relaxed" style="color: var(--c-warn)">
				<strong class="font-mono tracking-[0.1em]">SYNTHETIC DEMONSTRATION DATA</strong> — every
				record below was generated locally by this simulator from seed
				<span class="font-mono">{ds.seed}</span>. The facility, personnel and traffic are
				fictional. No system was contacted.
			</p>
		</div>

		<!-- stats -->
		<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
			{#each ds.stats as s, i (s.label)}
				<div use:reveal={{ delay: i * 70 }} class="panel bracketed p-4">
					<p class="label !text-[0.5rem]">{s.label}</p>
					<p
						class="font-display mt-1 text-2xl font-black tabular-nums"
						style="color: var(--c-primary)"
					>
						<span use:counter={{ value: Number(s.value) || 0, decimals: String(s.value).includes('.') ? 1 : 0 }}>0</span
						>{s.unit}
					</p>
				</div>
			{/each}
		</div>

		<!-- charts -->
		<div class="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
			<!-- activity distribution -->
			<div use:reveal class="panel bracketed p-4 sm:p-5">
				<div class="mb-4 flex items-baseline justify-between gap-3">
					<div>
						<p class="label !text-[0.5rem]">CHART 01</p>
						<h3 class="font-display text-[0.8rem] font-bold tracking-[0.1em]">
							ACTIVITY DISTRIBUTION
						</h3>
					</div>
					<span class="label !text-[0.5rem]">24 SLOTS</span>
				</div>
				<div class="flex h-32 items-stretch gap-[3px] sm:h-40">
					{#each ds.charts.activity as v, i}
						{@const pct = Math.max(3, (v / maxAct) * 100)}
						<!-- The wrapper must be full height for the bar's percentage
						     height to resolve against something. -->
						<div class="group relative flex h-full flex-1 flex-col justify-end">
							<div
								class="chart-bar w-full rounded-t-[2px]"
								style="height:{pct}%; animation-delay:{i * 26}ms"
								title="slot {i}: {v}"
							></div>
							<span
								class="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 rounded px-1.5 py-0.5 font-mono text-[0.55rem] whitespace-nowrap group-hover:block"
								style="bottom: calc({pct}% + 5px); background: var(--c-panel-solid); color: var(--c-primary); border:1px solid var(--c-line)"
								>{v}</span
							>
						</div>
					{/each}
				</div>
				<div class="mt-2 flex justify-between font-mono text-[0.52rem]" style="color: var(--c-faint)">
					<span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
				</div>
			</div>

			<!-- category breakdown -->
			<div use:reveal={{ delay: 90 }} class="panel bracketed p-4 sm:p-5">
				<p class="label !text-[0.5rem]">CHART 02</p>
				<h3 class="font-display mb-4 text-[0.8rem] font-bold tracking-[0.1em]">
					CATEGORY BREAKDOWN
				</h3>
				<ul class="space-y-2.5">
					{#each ds.charts.categories as c, i (c.label)}
						<li class="flex items-center gap-3">
							<span class="w-[72px] shrink-0 truncate font-mono text-[0.6rem]">{c.label}</span>
							<span class="progress-track h-[7px] flex-1">
								<span
									class="progress-fill static block"
									style="width:{c.pct}%; animation-delay:{i * 110}ms"
								></span>
							</span>
							<span
								class="w-[54px] shrink-0 text-right font-mono text-[0.6rem] tabular-nums"
								style="color: var(--c-primary)">{c.pct}%</span
							>
						</li>
					{/each}
				</ul>

				<!-- signal trace -->
				<div class="mt-5 border-t pt-4" style="border-color: var(--c-line)">
					<p class="label mb-2 !text-[0.5rem]">SIGNAL TRACE</p>
					<svg viewBox="0 0 300 64" class="h-16 w-full" preserveAspectRatio="none" aria-hidden="true">
						<defs>
							<linearGradient id="tr-grad" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color="rgba(var(--glow), 0.42)" />
								<stop offset="100%" stop-color="rgba(var(--glow), 0)" />
							</linearGradient>
						</defs>
						<path d={tracePath.area} fill="url(#tr-grad)" />
						<path
							d={tracePath.line}
							fill="none"
							stroke="var(--c-primary)"
							stroke-width="1.5"
							class="trace-line"
						/>
					</svg>
				</div>
			</div>
		</div>

		<!-- records -->
		<div class="panel bracketed overflow-hidden">
			<div class="flex flex-wrap items-center justify-between gap-3 border-b p-4" style="border-color: var(--c-line)">
				<div>
					<p class="label !text-[0.5rem]">DATASET</p>
					<h3 class="font-display text-[0.8rem] font-bold tracking-[0.1em]">
						GENERATED RECORDS ({ds.records.length})
					</h3>
				</div>
				<span class="pill" style="color: var(--c-warn); border-color: rgba(251,191,36,.3)">
					DEMO DATA
				</span>
			</div>

			<!-- desktop table -->
			<div class="hidden max-h-[460px] overflow-auto md:block">
				<table class="w-full border-collapse text-left">
					<thead class="sticky top-0 z-10" style="background: var(--c-panel-solid)">
						<tr>
							{#each shown as k}
								<th class="label border-b px-3 py-2.5 !text-[0.5rem] whitespace-nowrap" style="border-color: var(--c-line)">
									{k.toUpperCase()}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each ds.records as r, i (r.id ?? i)}
							<tr
								class="row cursor-pointer border-b transition-colors"
								class:flagged={r.flagged}
								style="border-color: rgba(var(--glow),.07); animation-delay:{Math.min(i * 28, 700)}ms"
								onclick={() => {
									detail = r;
									sound.play('tick');
								}}
							>
								{#each shown as k}
									<td
										class="px-3 py-2 font-mono text-[0.68rem] whitespace-nowrap"
										style="color: {cellColor(r[k])}"
									>
										{r[k]}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- mobile cards -->
			<div class="max-h-[460px] space-y-2 overflow-auto p-3 md:hidden">
				{#each ds.records as r, i (r.id ?? i)}
					<button
						class="w-full rounded-md border p-3 text-left"
						style="border-color: {r.flagged ? 'rgba(251,191,36,.35)' : 'var(--c-line)'}; background: {r.flagged ? 'rgba(251,191,36,.05)' : 'rgba(0,0,0,.22)'}"
						onclick={() => {
							detail = r;
							sound.play('tick');
						}}
					>
						<div class="mb-1.5 flex items-center justify-between gap-2">
							<span class="font-mono text-[0.66rem]" style="color: var(--c-primary)">
								{r.id ?? `#${i + 1}`}
							</span>
							{#if r.flagged}
								<span class="pill !py-0 !text-[0.48rem]" style="color: var(--c-warn)">⚑ FLAGGED</span>
							{/if}
						</div>
						<dl class="grid grid-cols-2 gap-x-3 gap-y-1">
							{#each shown.filter((k) => k !== 'id').slice(0, 4) as k}
								<div class="min-w-0">
									<dt class="label !text-[0.46rem]">{k.toUpperCase()}</dt>
									<dd class="truncate font-mono text-[0.64rem]" style="color: {cellColor(r[k])}">
										{r[k]}
									</dd>
								</div>
							{/each}
						</dl>
					</button>
				{/each}
			</div>
		</div>

		<!-- exports -->
		<div class="panel bracketed p-4 sm:p-5">
			<div class="mb-4">
				<p class="label !text-[0.5rem]">EXPORT</p>
				<h3 class="font-display text-[0.8rem] font-bold tracking-[0.1em]">
					DOWNLOAD DEMO REPORT
				</h3>
				<p class="mt-1 text-[0.72rem]" style="color: var(--c-muted)">
					Every file is built in your browser and labelled
					<span class="font-mono" style="color: var(--c-warn)">SYNTHETIC DEMONSTRATION DATA</span>.
				</p>
			</div>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
				<button use:ripple class="btn" onclick={() => dl(exportCSV, 'CSV')}><Csv size={13} /> CSV</button>
				<button use:ripple class="btn" onclick={() => dl(exportJSON, 'JSON')}><Json size={13} /> JSON</button>
				<button use:ripple class="btn" onclick={() => dl(exportHTML, 'HTML')}><Html size={13} /> HTML</button>
				<button use:ripple class="btn" onclick={doPrint}><Print size={13} /> PRINT</button>
			</div>

			{#if exportMsg}
				<p
					class="rise-in mt-3 font-mono text-[0.66rem]"
					style="color: {exportBad ? 'var(--c-warn)' : 'var(--c-ok)'}"
					role="status"
				>
					{exportMsg}
				</p>
			{/if}
		</div>
	</section>

	<!-- record detail -->
	{#if detail}
		<div
			class="fixed inset-0 z-[160] grid place-items-center p-4"
			style="background: rgba(2,4,10,.82); backdrop-filter: blur(6px)"
			role="dialog"
			aria-modal="true"
			aria-label="Record detail"
		>
			<!-- Backdrop is a real button so dismissing works for keyboard and
			     assistive tech without putting handlers on a plain div. -->
			<button
				class="absolute inset-0 cursor-default"
				onclick={() => (detail = null)}
				aria-label="Close record detail"
				tabindex="-1"
			></button>

			<div
				class="panel glow-edge rise-in relative max-h-[80vh] w-full max-w-md overflow-auto p-5"
			>
				<div class="mb-4 flex items-center justify-between gap-3">
					<div>
						<p class="label !text-[0.5rem]">RECORD DETAIL</p>
						<h3 class="font-display text-[0.85rem] font-bold tracking-[0.1em]">
							{detail.id ?? 'RECORD'}
						</h3>
					</div>
					<button class="btn btn-sm btn-ghost" onclick={() => (detail = null)}>CLOSE</button>
				</div>
				<dl class="space-y-2.5">
					{#each Object.entries(detail) as [k, v]}
						<div class="flex gap-3 border-b pb-2" style="border-color: var(--c-line)">
							<dt class="label w-[88px] shrink-0 !text-[0.5rem]">{k.toUpperCase()}</dt>
							<dd class="flex-1 font-mono text-[0.7rem] break-words" style="color: {cellColor(v)}">
								{v}
							</dd>
						</div>
					{/each}
				</dl>
				<p class="label mt-4 !text-[0.5rem]" style="color: var(--c-faint)">
					FICTIONAL RECORD · GENERATED LOCALLY
				</p>
			</div>
		</div>
	{/if}
{/if}

<style>
	.chart-bar {
		background: linear-gradient(180deg, var(--c-primary), rgba(var(--glow), 0.12));
		transform-origin: bottom;
		animation: bar-grow 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
		transition: filter 0.2s ease;
	}
	.chart-bar:hover {
		filter: brightness(1.45) saturate(1.2);
	}

	.trace-line {
		stroke-dasharray: 700;
		stroke-dashoffset: 700;
		animation: draw 1.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
		filter: drop-shadow(0 0 5px rgba(var(--glow), 0.7));
	}
	@keyframes draw {
		to {
			stroke-dashoffset: 0;
		}
	}

	tbody .row {
		animation: rise-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	tbody .row:hover {
		background: rgba(var(--glow), 0.07);
	}
	tbody .row.flagged {
		background: rgba(251, 191, 36, 0.05);
		box-shadow: inset 2px 0 0 var(--c-warn);
	}
	tbody .row.flagged:hover {
		background: rgba(251, 191, 36, 0.1);
	}

	@media (prefers-reduced-motion: reduce) {
		.chart-bar,
		tbody .row {
			animation: none;
		}
		.trace-line {
			animation: none;
			stroke-dashoffset: 0;
		}
	}
</style>
