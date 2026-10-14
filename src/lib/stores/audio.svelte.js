/**
 * Audio store — reactive mirror of the AudioEngine's mixer, plus a single
 * named entry point (`play`) that the rest of the app uses so no component
 * ever touches the Web Audio graph directly.
 */

import { audio } from '../services/AudioEngine.js';

const KEY = 'cyberx.audio.v1';
const canStore = () => typeof window !== 'undefined' && !!window.localStorage;

function load() {
	if (!canStore()) return {};
	try {
		return JSON.parse(localStorage.getItem(KEY) || '{}');
	} catch {
		return {};
	}
}

class AudioStore {
	enabled = $state(true);
	unlocked = $state(false);
	master = $state(0.7);
	music = $state(0.4);
	effects = $state(0.8);
	ambience = $state(true);

	constructor() {
		const s = load();
		if (typeof s.enabled === 'boolean') this.enabled = s.enabled;
		if (typeof s.ambience === 'boolean') this.ambience = s.ambience;
		if (typeof s.master === 'number') this.master = s.master;
		if (typeof s.music === 'number') this.music = s.music;
		if (typeof s.effects === 'number') this.effects = s.effects;
	}

	/** Must be called from inside a user gesture. */
	async unlock() {
		const ok = await audio.unlock();
		this.unlocked = ok;
		if (ok) {
			this._sync();
			if (this.enabled && this.ambience) audio.startAmbience();
		}
		return ok;
	}

	_sync() {
		audio.setVolume('master', this.master);
		audio.setVolume('music', this.music);
		audio.setVolume('effects', this.effects);
		audio.setEnabled(this.enabled);
	}

	set(bus, value) {
		this[bus] = value;
		audio.setVolume(bus === 'effects' ? 'effects' : bus, value);
		this.persist();
	}

	toggle() {
		this.enabled = !this.enabled;
		audio.setEnabled(this.enabled);
		if (this.enabled) {
			if (this.ambience) audio.startAmbience();
		} else {
			audio.stopAmbience();
		}
		this.persist();
	}

	toggleAmbience() {
		this.ambience = !this.ambience;
		if (this.ambience && this.enabled) audio.startAmbience();
		else audio.stopAmbience();
		this.persist();
	}

	/**
	 * Single dispatch point for every sound in the app.
	 * @param {string} name
	 */
	play(name) {
		if (!this.enabled || !this.unlocked) return;
		switch (name) {
			case 'startup': return audio.startup();
			case 'key': return audio.keyClick();
			case 'beep': return audio.beep();
			case 'blip': return audio.blip();
			case 'tick': return audio.tick();
			case 'woosh': return audio.woosh();
			case 'scan': return audio.scan();
			case 'glitch': return audio.glitch();
			case 'warning': return audio.warning();
			case 'complete': return audio.complete();
			case 'download': return audio.download();
			case 'processStart': return audio.startProcessing();
			case 'processStop': return audio.stopProcessing();
			default: return;
		}
	}

	persist() {
		if (!canStore()) return;
		try {
			localStorage.setItem(
				KEY,
				JSON.stringify({
					enabled: this.enabled,
					ambience: this.ambience,
					master: this.master,
					music: this.music,
					effects: this.effects
				})
			);
		} catch {
			/* non-fatal */
		}
	}
}

export const sound = new AudioStore();
