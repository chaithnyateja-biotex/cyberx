/**
 * Simulation store — owns the active run, the terminal log, and the
 * session history.
 *
 * The terminal log uses `$state.raw` deliberately: lines arrive in bursts of
 * up to a few dozen, and a raw array lets us swap the whole reference once
 * per burst instead of deep-proxying several hundred log objects.
 */

import { SimulationEngine, SPEEDS, STAGES } from '../services/SimulationEngine.js';
import { FACILITIES, getModule, hashSeed } from '../services/MockDataGenerator.js';
import { sound } from './audio.svelte.js';

const LINE_CAP = 240;
const KEY = 'cyberx.sim.v1';
const canStore = () => typeof window !== 'undefined' && !!window.localStorage;

class SimulationStore {
	facility = $state(FACILITIES[0]);
	customDesignation = $state('');

	/** @type {SimulationEngine|null} */
	engine = null;

	activeModuleId = $state(null);
	lines = $state.raw([]);
	progress = $state(0);
	stage = $state(null);
	status = $state('idle'); // idle | running | paused | done
	dataset = $state(null);
	speed = $state('normal');
	overlayOpen = $state(false);

	/** Completed runs from this browsing session. */
	history = $state([]);

	constructor() {
		if (canStore()) {
			try {
				const s = JSON.parse(localStorage.getItem(KEY) || '{}');
				if (s.speed && SPEEDS[s.speed]) this.speed = s.speed;
				if (s.facilityId) {
					const f = FACILITIES.find((x) => x.id === s.facilityId);
					if (f) this.facility = f;
				}
			} catch {
				/* defaults are fine */
			}
		}
	}

	/* ---------------- target ---------------- */

	setFacility(f) {
		this.facility = f;
		this.persist();
	}

	/**
	 * Build a one-off facility from a user-supplied fictional designation.
	 * This is a label for the simulation only — nothing is looked up.
	 */
	setCustomDesignation(text) {
		const clean = String(text).trim().toUpperCase().slice(0, 32).replace(/[^A-Z0-9\-_. ]/g, '');
		this.customDesignation = clean;
		if (!clean) return;
		this.facility = {
			id: 'custom',
			name: clean,
			operator: 'UNREGISTERED OPERATOR',
			designation: clean,
			sector: 'OPERATOR-DEFINED',
			tier: 'TIER ?',
			hardening: 20 + (hashSeed(clean) % 70),
			blurb: 'Facility defined by the operator. No registry entry.',
			custom: true
		};
	}

	setSpeed(s) {
		this.speed = s;
		this.engine?.setSpeed(s);
		this.persist();
	}

	/* ---------------- run control ---------------- */

	launch(moduleId, { seed = null } = {}) {
		this.teardown();

		const mod = getModule(moduleId);
		if (!mod) return;

		this.activeModuleId = moduleId;
		this.lines = [];
		this.progress = 0;
		this.stage = 'handshake';
		this.dataset = null;
		this.status = 'running';
		this.overlayOpen = true;

		const runSeed =
			seed ?? (hashSeed(`${this.facility.designation}:${moduleId}:${Date.now()}`) >>> 0);

		this.engine = new SimulationEngine({
			moduleId,
			facility: this.facility,
			seed: runSeed,
			speed: this.speed,
			on: {
				lines: (batch) => {
					const next = this.lines.concat(batch);
					this.lines = next.length > LINE_CAP ? next.slice(next.length - LINE_CAP) : next;
				},
				stage: (s) => (this.stage = s),
				progress: (p) => (this.progress = p),
				sfx: (n) => sound.play(n),
				done: (ds) => this.#finish(ds)
			}
		});

		this.engine.play();
	}

	#finish(ds) {
		this.dataset = ds;
		this.status = 'done';
		this.progress = 100;
		this.history = [
			{
				sessionId: ds.sessionId,
				moduleId: ds.moduleId,
				moduleTitle: ds.module.title,
				moduleCode: ds.module.code,
				facility: ds.facility.name,
				designation: ds.facility.designation,
				records: ds.records.length,
				seed: ds.seed,
				at: new Date(),
				dataset: ds
			},
			...this.history
		].slice(0, 24);
	}

	pauseResume() {
		if (!this.engine) return;
		this.engine.toggle();
		this.status = this.engine.state === 'paused' ? 'paused' : 'running';
		sound.play('tick');
	}

	skip() {
		if (!this.engine || this.status === 'done') return;
		this.engine.skipToEnd();
		sound.play('complete');
	}

	abort() {
		this.engine?.abort();
		this.status = 'idle';
		this.overlayOpen = false;
		this.activeModuleId = null;
		sound.play('woosh');
	}

	/** Re-run the exact same sequence from the same seed. */
	replay() {
		const seed = this.dataset?.seed ?? this.engine?.seed;
		const moduleId = this.activeModuleId;
		if (!moduleId) return;
		this.launch(moduleId, { seed });
	}

	/** Re-open a completed run from history. */
	restore(entry) {
		this.activeModuleId = entry.moduleId;
		this.dataset = entry.dataset;
		this.status = 'done';
		this.progress = 100;
		this.overlayOpen = false;
	}

	closeOverlay() {
		this.overlayOpen = false;
		sound.play('woosh');
	}

	clearTerminal() {
		this.lines = [];
	}

	teardown() {
		this.engine?.destroy();
		this.engine = null;
		sound.play('processStop');
	}

	persist() {
		if (!canStore()) return;
		try {
			localStorage.setItem(
				KEY,
				JSON.stringify({ speed: this.speed, facilityId: this.facility?.id })
			);
		} catch {
			/* non-fatal */
		}
	}

	get stageInfo() {
		return STAGES.find((s) => s.id === this.stage) ?? STAGES[0];
	}

	get isBusy() {
		return this.status === 'running' || this.status === 'paused';
	}
}

export const sim = new SimulationStore();
export { SPEEDS, STAGES, FACILITIES };
