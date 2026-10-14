# CYBERX — Cyber Intelligence Simulation Console

A cinematic infiltration simulator. You pick a fictional facility, run a module,
and watch a full-screen console work through it — procedural audio, a live
terminal, animated results, exportable reports.

**Everything in it is invented.** The facilities, crews, comms traffic and
telemetry are generated in your browser from a seeded PRNG. The app makes no
network requests at runtime, contacts nothing, and executes none of the commands
its terminal prints. Targets are places like `ORBITAL RELAY KEPLER-9`, not people.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Static site → `build/` (deploy anywhere) |
| `npm run preview` | Serve the production build locally |
| `npm run build:single` | One self-contained `dist-single/index.html` |
| `npm run check` | `svelte-check` (types + a11y) |

`build:single` inlines **everything** — CSS, JS and all nine font subsets — into
a single HTML file that runs straight off disk by double-clicking it. No server,
no internet.

---

## What's in it

**9 modules.** Four intercept modules (comms, access logs, subroutine map, full
dump) and five subsystem taps (power, cryo, sensors, defense, uplink). Each
produces its own dataset shape, charts and record table.

**5 fictional targets** plus a free-text custom designation.

**The run sequence.** Five stages — handshake, surface sweep, extraction,
assembly, complete — scripted to about 13 seconds at NORMAL. Pause, resume, skip
to end, or replay a run exactly from its seed. Four speeds: slow / normal / fast
/ cinematic.

**Procedural audio.** Ten synthesised sounds plus an ambient bed, built live from
oscillators and filtered noise. There are no audio files in this project. Master,
music and effects faders; ambience toggle; audio unlocks on first interaction per
browser autoplay rules.

**Exports.** CSV, JSON and a printable HTML report. Every file carries
`SYNTHETIC DEMONSTRATION DATA — NOT REAL ACCOUNT INFORMATION` in its own body, so
the label travels with the file.

**Three themes** (cyber blue, matrix green, red alert), cinematic full-screen
mode, and session history you can re-open or re-export.

---

## Layout

```
src/
├── app.css                  design tokens, 3 themes, component classes
├── app.html                 SvelteKit shell
├── lib/
│   ├── App.svelte           the whole application shell
│   ├── actions.js           tilt · ripple · magnetic · reveal · counter
│   ├── icons.js             tree-shaken Lucide map
│   ├── components/          13 components
│   ├── services/
│   │   ├── AudioEngine.js       Web Audio synthesis + mixer
│   │   ├── MockDataGenerator.js the fictional world + seeded PRNG
│   │   ├── SimulationEngine.js  compiled run script + transport
│   │   └── ReportExporter.js    CSV / JSON / printable HTML
│   └── stores/              ui · audio · simulation (Svelte 5 runes)
├── routes/                  thin SvelteKit wrapper around App.svelte
└── standalone/              entry for the single-file build
```

`src/routes/+page.svelte` is deliberately a three-line wrapper. All application
code lives in `src/lib/App.svelte` so the identical tree builds as both a
SvelteKit site and a standalone single file.

---

## How it works

**The simulation engine compiles before it plays.** `SimulationEngine` turns a
run into a flat array of timed steps up front. That makes pause/resume trivial
(stop advancing a cursor), replay exact (same seed → same script), and keeps the
hot loop branch-free. Lines inside a burst carry `delay: 0` so the engine
coalesces them into one UI update; the `wait` steps between bursts are what
create the visible stutter-and-rush cadence.

**The terminal stays cheap.** The store caps the log at 240 lines and holds it in
`$state.raw`, so a burst swaps one array reference instead of deep-proxying
hundreds of objects. Only the dozen-odd `typed` lines get a per-character reveal.

**Audio is a three-bus graph.** One-shots → `fxGain`, ambience → `musicGain`,
both → `masterGain` → a soft limiter → output. Every voice disconnects itself in
`onended`, so long sessions don't accumulate dead nodes. The keystroke sound
rate-limits itself to 18 ms so a 40-line burst reads as a rattle, not white noise.

**One canvas, one rAF.** Digital rain, the proximity-linked node field and the
grid all draw in a single loop that stops when the tab is hidden. The globe is 3D
maths projected through the 2D canvas API — no WebGL library.

**Reduced motion is respected throughout.** Ambient animation stops, typing
resolves instantly, and simulations still run and complete normally.

---

## Two notes if you edit the CSS

1. **`.btn` and `.pill` are deliberately not in `@layer components`.** Putting
   them there drops them below Tailwind's preflight, which resets `border` and
   button backgrounds — the buttons lose their frame entirely. The trade-off is
   that a bare `hidden` utility can't override `.btn`'s `display`, so anywhere a
   button needs responsive hiding it's wrapped in a plain element that gets the
   `hidden` class instead.

2. **`@source` in `app.css` is load-bearing.** Tailwind infers its scan roots
   from the Vite root, and the standalone build roots at `./standalone`. Without
   the explicit `@source` lines it emits almost no utilities and every grid
   collapses to one column.

---

## Verification

43 automated browser checks pass against the dev server, the production build and
the standalone file: boot, navigation, all 9 modules, pause/resume/skip/replay,
exports (contents checked for the synthetic-data notice), themes, speed controls,
mobile/tablet/desktop layouts, reduced motion, and zero external network
requests. `svelte-check` reports 0 errors and 0 warnings. Each of the ten sounds
was measured for actual output signal, and mute and master-zero were confirmed to
reach true silence.

---

## Stack

Svelte 5 (runes) · SvelteKit 2 · Vite 6 · Tailwind CSS 4 · GSAP 3 · Lucide ·
Web Audio API · Canvas 2D. Fonts (JetBrains Mono, Orbitron, Space Grotesk) are
self-hosted Latin subsets — 144 KB total, no external font request.
