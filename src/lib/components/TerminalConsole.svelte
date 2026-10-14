<script>
	/**
	 * Reusable terminal view.
	 *
	 * Rendering strategy: the store caps the log at 240 lines, so the DOM
	 * stays small and no virtualisation is needed. Lines flagged `typed`
	 * get a per-character reveal driven by one shared timer; everything
	 * else renders instantly, which is what keeps dense bursts cheap.
	 *
	 * Auto-scroll yields to the user: scrolling up pauses follow mode until
	 * they return to the bottom.
	 */
	import { onDestroy } from 'svelte';
	import { ui } from '../stores/ui.svelte.js';

	let {
		lines = [],
		stage = null,
		progress = 0,
		status = 'idle',
		dense = false,
		showCursor = true
	} = $props();

	let scroller = $state(null);
	let follow = $state(true);

	/** id → revealed character count for `typed` lines. */
	let reveal = $state({});
	const started = new Set();
	let timer = null;
	const queue = [];

	function pump() {
		if (!queue.length) {
			timer = null;
			return;
		}
		const job = queue[0];
		job.n += 2;
		if (job.n >= job.len) {
			reveal = { ...reveal, [job.id]: job.len };
			queue.shift();
		} else {
			reveal = { ...reveal, [job.id]: job.n };
		}
		timer = setTimeout(pump, 14);
	}

	$effect(() => {
		for (const l of lines) {
			if (!l.typed || started.has(l.id)) continue;
			started.add(l.id);
			if (ui.reducedMotion || !l.text) {
				reveal[l.id] = l.text?.length ?? 0;
				continue;
			}
			queue.push({ id: l.id, n: 0, len: l.text.length });
		}
		if (queue.length && !timer) pump();
	});

	// Follow the tail whenever new lines land, unless the user scrolled away.
	$effect(() => {
		void lines.length;
		if (!scroller || !follow) return;
		requestAnimationFrame(() => {
			if (scroller) scroller.scrollTop = scroller.scrollHeight;
		});
	});

	function onScroll() {
		if (!scroller) return;
		const gap = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
		follow = gap < 48;
	}

	function jumpToTail() {
		follow = true;
		if (scroller) scroller.scrollTop = scroller.scrollHeight;
	}

	const LEVEL_CLASS = {
		sys: 'lv-sys',
		ok: 'lv-ok',
		warn: 'lv-warn',
		err: 'lv-err',
		info: 'lv-info',
		dim: 'lv-dim',
		raw: 'lv-raw',
		log: 'lv-info'
	};

	function body(l) {
		if (!l.typed) return l.text;
		const n = reveal[l.id];
		return n === undefined ? '' : l.text.slice(0, n);
	}

	const isTyping = (l) => l.typed && (reveal[l.id] ?? 0) < l.text.length;

	onDestroy(() => {
		clearTimeout(timer);
		queue.length = 0;
	});
</script>

<div class="terminal-surface relative flex h-full min-h-0 flex-col overflow-hidden rounded-[10px]">
	<!-- chrome -->
	<div
		class="flex shrink-0 items-center gap-3 border-b px-3 py-2 sm:px-4"
		style="border-color: var(--c-line); background: rgba(0,0,0,.35)"
	>
		<div class="flex gap-1.5">
			<span class="dot" style="color:#fb5779"></span>
			<span class="dot" style="color:#fbbf24"></span>
			<span class="dot" style="color:#34d399"></span>
		</div>
		<span class="label truncate !text-[0.56rem]">
			cyberx@sim ~ {stage ? `[${stage}]` : 'console'}
		</span>
		<div class="ml-auto flex items-center gap-2">
			{#if status === 'running'}
				<span class="pill" style="color: var(--c-ok); border-color: rgba(52,211,153,.3)">
					<span class="dot dot-pulse"></span> LIVE
				</span>
			{:else if status === 'paused'}
				<span class="pill" style="color: var(--c-warn); border-color: rgba(251,191,36,.3)">
					<span class="dot"></span> HELD
				</span>
			{:else if status === 'done'}
				<span class="pill" style="color: var(--c-primary)">
					<span class="dot"></span> DONE
				</span>
			{/if}
			<span class="font-mono text-[0.56rem]" style="color: var(--c-faint)">
				{lines.length} ln
			</span>
		</div>
	</div>

	<!-- log -->
	<div
		bind:this={scroller}
		onscroll={onScroll}
		class="flicker hide-scroll relative min-h-0 flex-1 overflow-y-auto px-3 py-2.5 sm:px-4"
		style="font-size: {dense ? '0.66rem' : '0.72rem'}"
		role="log"
		aria-live="polite"
		aria-atomic="false"
		aria-label="Simulation terminal output"
	>
		{#if lines.length === 0}
			<div class="flex h-full items-center justify-center">
				<p class="label text-center !text-[0.6rem] leading-relaxed">
					TERMINAL IDLE<br />
					<span style="color: var(--c-faint)">AWAITING MODULE EXECUTION</span>
				</p>
			</div>
		{/if}

		{#each lines as l (l.id)}
			<div class="term-line {LEVEL_CLASS[l.level] ?? 'lv-raw'} {l.hl ? 'hl' : ''}">
				<span class="shrink-0 select-none" style="color: var(--c-faint); opacity:.55">
					{String(l.id % 10000).padStart(4, '0')}
				</span>
				<span class="min-w-0 flex-1"
					>{body(l)}{#if isTyping(l)}<span class="cursor-blink"></span>{/if}</span
				>
			</div>
		{/each}

		{#if showCursor && status !== 'done' && lines.length > 0}
			<div class="term-line lv-sys">
				<span class="shrink-0 select-none" style="color: var(--c-faint); opacity:.55">····</span>
				<span class="cursor-blink"></span>
			</div>
		{/if}
	</div>

	<!-- footer -->
	<div
		class="flex shrink-0 items-center gap-3 border-t px-3 py-2 sm:px-4"
		style="border-color: var(--c-line); background: rgba(0,0,0,.35)"
	>
		<div class="progress-track flex-1">
			<div class="progress-fill" style="width:{progress}%"></div>
		</div>
		<span
			class="font-mono text-[0.66rem] font-bold tabular-nums"
			style="color: var(--c-primary)">{String(Math.round(progress)).padStart(3, ' ')}%</span
		>
	</div>

	{#if !follow}
		<button
			class="btn btn-sm absolute right-4 bottom-14 z-10"
			onclick={jumpToTail}
			aria-label="Resume following terminal output"
		>
			↓ FOLLOW
		</button>
	{/if}
</div>
