/**
 * AudioEngine — a fully procedural cyberpunk sound engine.
 *
 * Every sound in CYBERX is synthesised at runtime from oscillators,
 * filtered noise and envelopes. There are no audio files anywhere in the
 * project.
 *
 * Signal routing:
 *
 *     one-shot FX ──┐
 *                   ├─► fxGain ──┐
 *     ambience ─────┴─► musicGain┴─► masterGain ─► limiter ─► destination
 *
 * The AudioContext is created lazily on the first real user gesture so the
 * engine complies with browser autoplay policy. Every one-shot voice
 * disconnects itself when its source stops, so long sessions don't
 * accumulate dead nodes.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class AudioEngine {
	constructor() {
		/** @type {AudioContext|null} */
		this.ctx = null;
		this.masterGain = null;
		this.musicGain = null;
		this.fxGain = null;
		this.limiter = null;

		/** @type {AudioBuffer|null} */
		this._noise = null;

		this.enabled = true;
		this.volumes = { master: 0.7, music: 0.45, effects: 0.8 };

		// Persistent voices
		this._ambience = null;
		this._processing = null;
		this._ambienceTimer = null;

		this._started = false;
		this._lastKeyAt = 0;
	}

	/* ------------------------------------------------------------------
	   Lifecycle
	   ------------------------------------------------------------------ */

	/** Create (or resume) the context. Safe to call on every gesture. */
	async unlock() {
		if (!this.ctx) {
			const Ctor = window.AudioContext || window.webkitAudioContext;
			if (!Ctor) return false;
			this.ctx = new Ctor({ latencyHint: 'interactive' });

			// Soft limiter keeps dense terminal bursts from clipping.
			this.limiter = this.ctx.createDynamicsCompressor();
			this.limiter.threshold.value = -8;
			this.limiter.knee.value = 6;
			this.limiter.ratio.value = 10;
			this.limiter.attack.value = 0.003;
			this.limiter.release.value = 0.18;

			this.masterGain = this.ctx.createGain();
			this.musicGain = this.ctx.createGain();
			this.fxGain = this.ctx.createGain();

			this.musicGain.connect(this.masterGain);
			this.fxGain.connect(this.masterGain);
			this.masterGain.connect(this.limiter);
			this.limiter.connect(this.ctx.destination);

			this._applyVolumes();
			this._buildNoise();
			this._started = true;
		}
		if (this.ctx.state === 'suspended') {
			try {
				await this.ctx.resume();
			} catch {
				/* ignore — user gesture will retry */
			}
		}
		return this.ctx.state === 'running';
	}

	get ready() {
		return !!this.ctx && this.ctx.state === 'running' && this.enabled;
	}

	destroy() {
		this.stopAmbience();
		this.stopProcessing();
		if (this._ambienceTimer) clearTimeout(this._ambienceTimer);
		if (this.ctx) {
			try {
				this.ctx.close();
			} catch {
				/* already closed */
			}
		}
		this.ctx = null;
		this._started = false;
	}

	/* ------------------------------------------------------------------
	   Mixer
	   ------------------------------------------------------------------ */

	setVolume(bus, value) {
		this.volumes[bus] = clamp(value, 0, 1);
		this._applyVolumes();
	}

	setEnabled(on) {
		this.enabled = on;
		this._applyVolumes();
		if (!on) this.stopProcessing();
	}

	_applyVolumes() {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		const m = this.enabled ? this.volumes.master : 0;
		// Short ramps avoid zipper noise when dragging a slider.
		this.masterGain.gain.setTargetAtTime(m, t, 0.02);
		this.musicGain.gain.setTargetAtTime(this.volumes.music * 0.55, t, 0.04);
		this.fxGain.gain.setTargetAtTime(this.volumes.effects, t, 0.02);
	}

	/* ------------------------------------------------------------------
	   Primitives
	   ------------------------------------------------------------------ */

	/** Two seconds of lightly low-passed (pink-ish) noise, generated once. */
	_buildNoise() {
		const sr = this.ctx.sampleRate;
		const len = sr * 2;
		const buf = this.ctx.createBuffer(1, len, sr);
		const d = buf.getChannelData(0);
		let b0 = 0,
			b1 = 0,
			b2 = 0;
		for (let i = 0; i < len; i++) {
			const w = Math.random() * 2 - 1;
			// Cheap 3-pole pink-ish shaping — warmer than raw white noise.
			b0 = 0.99765 * b0 + w * 0.099046;
			b1 = 0.963 * b1 + w * 0.2965164;
			b2 = 0.57 * b2 + w * 1.0526913;
			d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22;
		}
		this._noise = buf;
	}

	_noiseSource(loop = false) {
		const src = this.ctx.createBufferSource();
		src.buffer = this._noise;
		src.loop = loop;
		return src;
	}

	/**
	 * A single enveloped oscillator voice.
	 * @param {object} o
	 */
	_voice({
		type = 'sine',
		freq = 440,
		toFreq = null,
		dur = 0.2,
		gain = 0.2,
		attack = 0.004,
		bus = 'fx',
		detune = 0,
		filter = null,
		pan = 0,
		delay = 0
	}) {
		if (!this.ready) return;
		const ctx = this.ctx;
		const t0 = ctx.currentTime + delay;

		const osc = ctx.createOscillator();
		osc.type = type;
		osc.detune.value = detune;
		osc.frequency.setValueAtTime(freq, t0);
		if (toFreq !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, toFreq), t0 + dur);

		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t0);
		g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

		/** @type {AudioNode} */
		let node = osc;
		if (filter) {
			const f = ctx.createBiquadFilter();
			f.type = filter.type || 'lowpass';
			f.frequency.setValueAtTime(filter.freq ?? 1200, t0);
			if (filter.toFreq)
				f.frequency.exponentialRampToValueAtTime(Math.max(1, filter.toFreq), t0 + dur);
			f.Q.value = filter.q ?? 1;
			node.connect(f);
			node = f;
		}

		node.connect(g);

		let out = g;
		if (pan !== 0 && ctx.createStereoPanner) {
			const p = ctx.createStereoPanner();
			p.pan.value = clamp(pan, -1, 1);
			g.connect(p);
			out = p;
		}
		out.connect(bus === 'music' ? this.musicGain : this.fxGain);

		osc.start(t0);
		osc.stop(t0 + dur + 0.05);
		osc.onended = () => {
			try {
				osc.disconnect();
				g.disconnect();
				out.disconnect();
			} catch {
				/* already torn down */
			}
		};
	}

	/** An enveloped burst of filtered noise. */
	_noiseBurst({
		dur = 0.12,
		gain = 0.2,
		type = 'bandpass',
		freq = 2000,
		toFreq = null,
		q = 1,
		attack = 0.002,
		bus = 'fx',
		pan = 0,
		delay = 0
	}) {
		if (!this.ready) return;
		const ctx = this.ctx;
		const t0 = ctx.currentTime + delay;

		const src = this._noiseSource(false);
		src.playbackRate.value = 0.8 + Math.random() * 0.5;

		const f = ctx.createBiquadFilter();
		f.type = type;
		f.frequency.setValueAtTime(freq, t0);
		if (toFreq) f.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), t0 + dur);
		f.Q.value = q;

		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t0);
		g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

		src.connect(f);
		f.connect(g);

		let out = g;
		if (pan !== 0 && ctx.createStereoPanner) {
			const p = ctx.createStereoPanner();
			p.pan.value = clamp(pan, -1, 1);
			g.connect(p);
			out = p;
		}
		out.connect(bus === 'music' ? this.musicGain : this.fxGain);

		// Start at a random offset so repeated bursts never sound identical.
		src.start(t0, Math.random() * 1.5, dur + 0.05);
		src.onended = () => {
			try {
				src.disconnect();
				f.disconnect();
				g.disconnect();
				out.disconnect();
			} catch {
				/* already torn down */
			}
		};
	}

	/* ==================================================================
	   SOUND 1 — SYSTEM STARTUP
	   Deep rising sweep + sub thump + bright confirm blip.
	   ================================================================== */
	startup() {
		if (!this.ready) return;
		this._voice({ type: 'sawtooth', freq: 55, toFreq: 880, dur: 1.25, gain: 0.1, attack: 0.3, filter: { type: 'lowpass', freq: 240, toFreq: 4200, q: 4 } });
		this._voice({ type: 'sine', freq: 38, toFreq: 70, dur: 1.4, gain: 0.3, attack: 0.1 });
		this._noiseBurst({ dur: 1.2, gain: 0.07, type: 'bandpass', freq: 400, toFreq: 5200, q: 0.9, attack: 0.5 });
		this._voice({ type: 'triangle', freq: 1318, dur: 0.3, gain: 0.14, delay: 1.18 });
		this._voice({ type: 'sine', freq: 1976, dur: 0.4, gain: 0.08, delay: 1.24 });
	}

	/* ==================================================================
	   SOUND 2 — KEYBOARD TYPING
	   Mechanical click: short noise transient + pitched tick.
	   Pitch, filter and pan all jitter so rapid repeats stay organic.
	   ================================================================== */
	keyClick(intensity = 1) {
		if (!this.ready) return;
		// Rate-limit so a 40-line burst doesn't become white noise.
		const now = performance.now();
		if (now - this._lastKeyAt < 18) return;
		this._lastKeyAt = now;

		const pan = (Math.random() - 0.5) * 0.5;
		this._noiseBurst({
			dur: 0.016 + Math.random() * 0.012,
			gain: (0.055 + Math.random() * 0.04) * intensity,
			type: 'bandpass',
			freq: 2200 + Math.random() * 1900,
			q: 1.6 + Math.random(),
			attack: 0.001,
			pan
		});
		this._voice({
			type: 'square',
			freq: 680 + Math.random() * 520,
			dur: 0.012,
			gain: 0.022 * intensity,
			attack: 0.001,
			filter: { type: 'highpass', freq: 500 },
			pan
		});
	}

	/* ==================================================================
	   SOUND 3 — DIGITAL BEEP
	   ================================================================== */
	beep(freq = 1480, dur = 0.07, gain = 0.1) {
		this._voice({ type: 'square', freq, dur, gain, attack: 0.002, filter: { type: 'lowpass', freq: 5200, q: 1 } });
	}

	blip() {
		this.beep(900 + Math.random() * 900, 0.045, 0.07);
	}

	/* ==================================================================
	   SOUND 4 — SCANNING SWEEP
	   Resonant bandpass climbing across the noise floor.
	   ================================================================== */
	scan(dur = 0.9) {
		if (!this.ready) return;
		this._noiseBurst({ dur, gain: 0.13, type: 'bandpass', freq: 220, toFreq: 6400, q: 7, attack: 0.08 });
		this._voice({ type: 'sine', freq: 180, toFreq: 2400, dur, gain: 0.045, attack: 0.1 });
	}

	/* ==================================================================
	   SOUND 5 — PROCESSING PULSE (looping)
	   Carrier gated by an LFO — a soft rhythmic digital throb.
	   ================================================================== */
	startProcessing() {
		if (!this.ready || this._processing) return;
		const ctx = this.ctx;
		const t = ctx.currentTime;

		const carrier = ctx.createOscillator();
		carrier.type = 'sine';
		carrier.frequency.value = 116;

		const sub = ctx.createOscillator();
		sub.type = 'triangle';
		sub.frequency.value = 58;

		const noise = this._noiseSource(true);
		const nf = ctx.createBiquadFilter();
		nf.type = 'bandpass';
		nf.frequency.value = 1500;
		nf.Q.value = 2.2;
		const ng = ctx.createGain();
		ng.gain.value = 0.1;

		// Gate: LFO drives a gain node to create the pulse.
		const gate = ctx.createGain();
		gate.gain.value = 0;

		const lfo = ctx.createOscillator();
		lfo.type = 'sawtooth';
		lfo.frequency.value = 4.6;
		const lfoDepth = ctx.createGain();
		lfoDepth.gain.value = 0.085;

		const out = ctx.createGain();
		out.gain.setValueAtTime(0.0001, t);
		out.gain.exponentialRampToValueAtTime(0.85, t + 0.25);

		lfo.connect(lfoDepth);
		lfoDepth.connect(gate.gain);

		carrier.connect(gate);
		sub.connect(gate);
		noise.connect(nf);
		nf.connect(ng);
		ng.connect(gate);

		gate.connect(out);
		out.connect(this.fxGain);

		carrier.start(t);
		sub.start(t);
		noise.start(t);
		lfo.start(t);

		this._processing = { nodes: [carrier, sub, noise, lfo], out, gate };
	}

	stopProcessing() {
		if (!this._processing || !this.ctx) return;
		const { nodes, out } = this._processing;
		const t = this.ctx.currentTime;
		out.gain.cancelScheduledValues(t);
		out.gain.setTargetAtTime(0.0001, t, 0.07);
		for (const n of nodes) {
			try {
				n.stop(t + 0.35);
			} catch {
				/* not a source node */
			}
		}
		setTimeout(() => {
			try {
				out.disconnect();
			} catch {
				/* gone */
			}
		}, 600);
		this._processing = null;
	}

	/* ==================================================================
	   SOUND 6 — CYBER GLITCH
	   Stacked noise shards + an FM'd square stab.
	   ================================================================== */
	glitch(intensity = 1) {
		if (!this.ready) return;
		const shards = 3 + Math.floor(Math.random() * 4);
		for (let i = 0; i < shards; i++) {
			this._noiseBurst({
				dur: 0.02 + Math.random() * 0.05,
				gain: (0.07 + Math.random() * 0.08) * intensity,
				type: Math.random() > 0.5 ? 'bandpass' : 'highpass',
				freq: 500 + Math.random() * 5200,
				q: 2 + Math.random() * 6,
				delay: i * (0.012 + Math.random() * 0.035),
				pan: (Math.random() - 0.5) * 1.5
			});
		}
		this._voice({
			type: 'square',
			freq: 160 + Math.random() * 320,
			toFreq: 40,
			dur: 0.16,
			gain: 0.07 * intensity,
			filter: { type: 'bandpass', freq: 1400, toFreq: 300, q: 5 }
		});
	}

	/* ==================================================================
	   SOUND 7 — WARNING
	   ================================================================== */
	warning() {
		if (!this.ready) return;
		for (let i = 0; i < 2; i++) {
			this._voice({ type: 'square', freq: 932, dur: 0.11, gain: 0.1, delay: i * 0.22, filter: { type: 'lowpass', freq: 3000, q: 2 } });
			this._voice({ type: 'square', freq: 699, dur: 0.11, gain: 0.09, delay: i * 0.22 + 0.11, filter: { type: 'lowpass', freq: 3000, q: 2 } });
		}
	}

	/* ==================================================================
	   SOUND 8 — COMPLETION
	   Rising arpeggio + shimmer tail + sub confirm.
	   ================================================================== */
	complete() {
		if (!this.ready) return;
		const notes = [440, 587.33, 739.99, 880, 1174.66];
		notes.forEach((f, i) => {
			this._voice({ type: 'triangle', freq: f, dur: 0.42, gain: 0.1, attack: 0.006, delay: i * 0.075, filter: { type: 'lowpass', freq: 6000, q: 1 } });
			this._voice({ type: 'sine', freq: f * 2, dur: 0.3, gain: 0.04, delay: i * 0.075 });
		});
		this._voice({ type: 'sine', freq: 55, toFreq: 110, dur: 0.7, gain: 0.22, attack: 0.02, delay: 0.3 });
		this._noiseBurst({ dur: 0.9, gain: 0.05, type: 'highpass', freq: 3000, toFreq: 9000, attack: 0.25, delay: 0.3 });
	}

	/* ==================================================================
	   SOUND 9 — DOWNLOAD
	   ================================================================== */
	download() {
		if (!this.ready) return;
		[880, 659.25, 440].forEach((f, i) => {
			this._voice({ type: 'triangle', freq: f, dur: 0.14, gain: 0.11, delay: i * 0.085 });
		});
		this._voice({ type: 'sine', freq: 180, toFreq: 70, dur: 0.3, gain: 0.12, delay: 0.24 });
	}

	/** Soft UI feedback — hover/tap. */
	tick() {
		this._voice({ type: 'sine', freq: 1760, dur: 0.028, gain: 0.03, attack: 0.001 });
	}

	/** Navigation / view change. */
	woosh() {
		this._noiseBurst({ dur: 0.28, gain: 0.06, type: 'bandpass', freq: 900, toFreq: 3400, q: 1.4, attack: 0.05 });
	}

	/* ==================================================================
	   SOUND 10 — BACKGROUND AMBIENCE (looping)
	   Sub-bass breathing + detuned pad through a slowly moving filter
	   + a faint noise floor, with occasional distant sweeps.
	   ================================================================== */
	startAmbience() {
		if (!this.ready || this._ambience) return;
		const ctx = this.ctx;
		const t = ctx.currentTime;

		const out = ctx.createGain();
		out.gain.setValueAtTime(0.0001, t);
		out.gain.exponentialRampToValueAtTime(1, t + 3);
		out.connect(this.musicGain);

		const nodes = [];

		// --- Sub-bass with a slow breathing envelope ---
		const sub = ctx.createOscillator();
		sub.type = 'sine';
		sub.frequency.value = 46;
		const subGain = ctx.createGain();
		subGain.gain.value = 0.3;
		const subLfo = ctx.createOscillator();
		subLfo.type = 'sine';
		subLfo.frequency.value = 0.13;
		const subLfoDepth = ctx.createGain();
		subLfoDepth.gain.value = 0.2;
		subLfo.connect(subLfoDepth);
		subLfoDepth.connect(subGain.gain);
		sub.connect(subGain);
		subGain.connect(out);
		nodes.push(sub, subLfo);

		// --- Detuned saw pad through a drifting lowpass ---
		const padFilter = ctx.createBiquadFilter();
		padFilter.type = 'lowpass';
		padFilter.frequency.value = 340;
		padFilter.Q.value = 3.5;
		const padGain = ctx.createGain();
		padGain.gain.value = 0.055;
		padFilter.connect(padGain);
		padGain.connect(out);

		for (const [f, d] of [
			[110, -7],
			[110, 9],
			[164.81, 4],
			[220, -4]
		]) {
			const o = ctx.createOscillator();
			o.type = 'sawtooth';
			o.frequency.value = f;
			o.detune.value = d;
			o.connect(padFilter);
			nodes.push(o);
		}

		const filtLfo = ctx.createOscillator();
		filtLfo.type = 'sine';
		filtLfo.frequency.value = 0.055;
		const filtDepth = ctx.createGain();
		filtDepth.gain.value = 190;
		filtLfo.connect(filtDepth);
		filtDepth.connect(padFilter.frequency);
		nodes.push(filtLfo);

		// --- Faint noise floor ---
		const nz = this._noiseSource(true);
		const nzf = ctx.createBiquadFilter();
		nzf.type = 'lowpass';
		nzf.frequency.value = 820;
		const nzg = ctx.createGain();
		nzg.gain.value = 0.022;
		nz.connect(nzf);
		nzf.connect(nzg);
		nzg.connect(out);
		nodes.push(nz);

		for (const n of nodes) {
			try {
				n.start(t);
			} catch {
				/* already started */
			}
		}

		this._ambience = { nodes, out };
		this._scheduleAmbientSweep();
	}

	/** Distant periodic sweeps keep the bed from feeling static. */
	_scheduleAmbientSweep() {
		if (this._ambienceTimer) clearTimeout(this._ambienceTimer);
		const next = 9000 + Math.random() * 11000;
		this._ambienceTimer = setTimeout(() => {
			if (this._ambience && this.ready) {
				this._noiseBurst({
					dur: 3.2,
					gain: 0.026,
					type: 'bandpass',
					freq: 300 + Math.random() * 400,
					toFreq: 1800 + Math.random() * 1800,
					q: 3,
					attack: 1.4,
					bus: 'music',
					pan: Math.random() * 1.6 - 0.8
				});
				this._voice({
					type: 'sine',
					freq: [220, 293.66, 329.63, 440][Math.floor(Math.random() * 4)],
					dur: 4,
					gain: 0.018,
					attack: 1.8,
					bus: 'music',
					filter: { type: 'lowpass', freq: 1400 }
				});
			}
			this._scheduleAmbientSweep();
		}, next);
	}

	stopAmbience() {
		if (this._ambienceTimer) {
			clearTimeout(this._ambienceTimer);
			this._ambienceTimer = null;
		}
		if (!this._ambience || !this.ctx) return;
		const { nodes, out } = this._ambience;
		const t = this.ctx.currentTime;
		out.gain.cancelScheduledValues(t);
		out.gain.setTargetAtTime(0.0001, t, 0.5);
		for (const n of nodes) {
			try {
				n.stop(t + 2.2);
			} catch {
				/* not a source */
			}
		}
		setTimeout(() => {
			try {
				out.disconnect();
			} catch {
				/* gone */
			}
		}, 2600);
		this._ambience = null;
	}

	get ambienceRunning() {
		return !!this._ambience;
	}
}

/** Shared singleton — one context for the whole app. */
export const audio = new AudioEngine();
