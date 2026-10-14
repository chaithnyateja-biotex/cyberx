/**
 * MockDataGenerator — builds the entire fictional world of CYBERX.
 *
 * Everything here is invented: the facilities, the crew, the comms traffic,
 * the subsystem telemetry. Nothing is fetched, looked up, or derived from
 * anything real. A seeded PRNG drives generation so a session can be
 * replayed byte-for-byte from its seed.
 */

/* ------------------------------------------------------------------
   Seeded randomness
   ------------------------------------------------------------------ */

export function hashSeed(str) {
	let h = 1779033703 ^ str.length;
	for (let i = 0; i < str.length; i++) {
		h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
		h = (h << 13) | (h >>> 19);
	}
	return (h ^ (h >>> 16)) >>> 0;
}

export function makeRng(seed) {
	let a = seed >>> 0;
	const rng = () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	rng.int = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
	rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
	rng.picks = (arr, n) => {
		const pool = [...arr];
		const out = [];
		for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
		return out;
	};
	rng.chance = (p) => rng() < p;
	rng.hex = (n) =>
		Array.from({ length: n }, () => '0123456789ABCDEF'[Math.floor(rng() * 16)]).join('');
	return rng;
}

/* ------------------------------------------------------------------
   The fictional world
   ------------------------------------------------------------------ */

export const FACILITIES = [
	{
		id: 'kepler9',
		name: 'ORBITAL RELAY KEPLER-9',
		operator: 'HELIOS DYNAMICS',
		designation: 'KPL-9-ORB-4471',
		sector: 'HIGH ORBIT / LAGRANGE 2',
		tier: 'TIER II',
		hardening: 42,
		blurb: 'Deep-space communications relay. Fourteen crew, rotating shifts.'
	},
	{
		id: 'meridian',
		name: 'VAULT SUBLEVEL 4',
		operator: 'MERIDIAN BIOLABS',
		designation: 'MRD-V4-SUB-0912',
		sector: 'SUBSURFACE / GRID 7',
		tier: 'TIER III',
		hardening: 68,
		blurb: 'Sealed research vault. Cryogenic storage, restricted archive.'
	},
	{
		id: 'atlas',
		name: 'MUNICIPAL FUSION CORE',
		operator: 'ATLAS GRID AUTHORITY',
		designation: 'ATL-GRD-CORE-7730',
		sector: 'CONTINENTAL / NODE 12',
		tier: 'TIER IV',
		hardening: 81,
		blurb: 'Primary power generation. Hardened civil infrastructure.'
	},
	{
		id: 'cassiopeia',
		name: 'DEEP HAULER "CASSIOPEIA"',
		operator: 'TITAN FREIGHT CONSORTIUM',
		designation: 'TTN-DH-CASS-2208',
		sector: 'OUTER BELT / TRANSIT',
		tier: 'TIER I',
		hardening: 27,
		blurb: 'Automated ore hauler. Skeleton crew, legacy systems.'
	},
	{
		id: 'obsidian',
		name: 'BLACKSITE OBSIDIAN',
		operator: '[ REDACTED ]',
		designation: 'OBS-████-████',
		sector: 'UNKNOWN',
		tier: 'TIER ???',
		hardening: 96,
		blurb: 'No public registry entry. Signal origin triangulated only.'
	}
];

const CALLSIGNS = [
	'VESPER-01', 'HALCYON-7', 'DRIFTWOOD', 'LONGSHORE', 'ANVIL-3', 'PALE HORSE',
	'KESTREL', 'MERIDIAN ACTUAL', 'GREY LANTERN', 'TIDEWATCH', 'NINE-OF-CUPS',
	'SALTIRE', 'DEADLIGHT', 'FERRYMAN', 'COLDHARBOUR', 'BRIAR-12'
];

const CREW = [
	{ name: 'CMDR. T. VASQUEZ-REYN', role: 'STATION COMMAND', clearance: 'OMEGA' },
	{ name: 'DR. A. SOLENNE', role: 'CHIEF RESEARCH', clearance: 'OMEGA' },
	{ name: 'LT. M. OKONKWO-HALE', role: 'SYSTEMS', clearance: 'DELTA' },
	{ name: 'ENS. K. BRIGHTWATER', role: 'COMMS', clearance: 'GAMMA' },
	{ name: 'SPEC. R. DUMONT-ASHE', role: 'ENGINEERING', clearance: 'DELTA' },
	{ name: 'DR. N. IRAVANI', role: 'MEDICAL', clearance: 'GAMMA' },
	{ name: 'WO. J. STRAND', role: 'SECURITY', clearance: 'DELTA' },
	{ name: 'TECH. P. ALMEIDA-COLE', role: 'MAINTENANCE', clearance: 'BETA' },
	{ name: 'ENS. L. FAIRWEATHER', role: 'NAVIGATION', clearance: 'GAMMA' },
	{ name: 'DR. S. KOVALENKO-BIRCH', role: 'CRYOGENICS', clearance: 'DELTA' },
	{ name: 'SPEC. H. NAKAMURA-WELLS', role: 'SENSORS', clearance: 'GAMMA' },
	{ name: '[ UNREGISTERED ]', role: 'UNKNOWN', clearance: '— — —' }
];

const DOORS = [
	'AIRLOCK C', 'REACTOR GALLERY', 'CRYO BAY 2', 'ARCHIVE VAULT', 'COMMAND DECK',
	'HAB RING A', 'COOLANT LOOP 3', 'SPECIMEN HOLD', 'COMMS SPINE', 'DOCKING CLAMP 7',
	'SUBLEVEL STAIR', 'FABRICATION BAY'
];

const PROCESSES = [
	'helios.relay.d', 'cryo-watchdog', 'atmos-balance', 'nav.ephemeris', 'auth-broker',
	'telemetry-pump', 'vault.seal.mgr', 'coolant-governor', 'sensor-fusion', 'comms-cipher',
	'hull-integrity', 'reactor-trim', 'archive-index', 'drone-dispatch', 'life-support.core',
	'gravity-ring.pid', 'solar-track', 'waste-recycle', 'beacon-emit', 'quarantine.lock'
];

const COMMS_FRAGMENTS = [
	'confirm the seal on bay two before you log off',
	'telemetry is drifting again, third time this cycle',
	'who authorised the override on the archive door?',
	'resupply window moved up eleven hours',
	'reactor trim is holding, no action needed',
	'I need eyes on the coolant loop, now',
	'logging off, handing over to the night shift',
	'the signal from the outer array is not ours',
	'cancel that request, command countermanded it',
	'cryo bay temperature is within tolerance, barely',
	'tell maintenance the clamp is still sticking',
	'nobody has seen the specimen manifest since tuesday',
	'rerouting power from hab ring, approved up top',
	'this is the fourth unlogged entry this week',
	'standing by for your mark',
	'something answered on the dead channel'
];

const SUBSYSTEMS = {
	power: { label: 'POWER GRID', nodes: ['REACTOR TRIM', 'BUS A', 'BUS B', 'SOLAR ARRAY', 'BATTERY BANK', 'EMERGENCY CELL'], unit: 'MW' },
	cryo: { label: 'CRYO STORAGE', nodes: ['BAY 1', 'BAY 2', 'BAY 3', 'COOLANT LOOP', 'COMPRESSOR', 'THERMAL SINK'], unit: 'K' },
	sensor: { label: 'SENSOR ARRAY', nodes: ['LIDAR MAST', 'THERMAL GRID', 'PRESSURE NET', 'MOTION LATTICE', 'SPECTRO BANK', 'DEEP SCAN'], unit: 'dB' },
	defense: { label: 'DEFENSE GRID', nodes: ['PERIMETER FENCE', 'BLAST DOORS', 'TURRET MOUNT 1', 'TURRET MOUNT 2', 'JAMMER', 'LOCKDOWN RELAY'], unit: '%' },
	uplink: { label: 'SATELLITE UPLINK', nodes: ['DISH PRIMARY', 'DISH BACKUP', 'ENCODER', 'BEAM FORMER', 'GROUND LINK', 'BURST CACHE'], unit: 'Mb/s' }
};

/* ------------------------------------------------------------------
   Module registry
   ------------------------------------------------------------------ */

export const MODULES = [
	{ id: 'comms', group: 'intercept', code: 'MODULE 01', title: 'COMMS INTERCEPT', icon: 'radio', action: 'RUN COMMS INTERCEPT', blurb: 'Reconstruct channel traffic between station callsigns.', accent: 'primary' },
	{ id: 'access', group: 'intercept', code: 'MODULE 02', title: 'ACCESS LOGS', icon: 'scan-face', action: 'PULL ACCESS LOGS', blurb: 'Badge events, door states and authorisation outcomes.', accent: 'info' },
	{ id: 'subroutines', group: 'intercept', code: 'MODULE 03', title: 'SUBROUTINE MAP', icon: 'cpu', action: 'MAP SUBROUTINES', blurb: 'Enumerate running daemons and their resource envelope.', accent: 'secondary' },
	{ id: 'fulldump', group: 'intercept', code: 'MODULE 04', title: 'FULL SYSTEM DUMP', icon: 'database', action: 'EXECUTE FULL DUMP', blurb: 'Unified chronological record across every channel.', accent: 'warn' },
	{ id: 'power', group: 'subsystem', code: 'SUB 01', title: 'POWER GRID', icon: 'zap', action: 'TAP POWER GRID', blurb: 'Generation, distribution and reserve capacity.', accent: 'warn' },
	{ id: 'cryo', group: 'subsystem', code: 'SUB 02', title: 'CRYO STORAGE', icon: 'snowflake', action: 'TAP CRYO STORAGE', blurb: 'Thermal envelope across sealed storage bays.', accent: 'info' },
	{ id: 'sensor', group: 'subsystem', code: 'SUB 03', title: 'SENSOR ARRAY', icon: 'radar', action: 'TAP SENSOR ARRAY', blurb: 'Perimeter detection lattice and deep scan returns.', accent: 'primary' },
	{ id: 'defense', group: 'subsystem', code: 'SUB 04', title: 'DEFENSE GRID', icon: 'shield', action: 'TAP DEFENSE GRID', blurb: 'Barrier states, lockdown relays and counter-measures.', accent: 'danger' },
	{ id: 'uplink', group: 'subsystem', code: 'SUB 05', title: 'SATELLITE UPLINK', icon: 'satellite', action: 'TAP SATELLITE UPLINK', blurb: 'Outbound bandwidth, beam alignment and burst cache.', accent: 'secondary' }
];

export const getModule = (id) => MODULES.find((m) => m.id === id);

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, '0');

/** Fictional mission clock — not wall-clock time. */
function missionStamp(rng, offsetMin) {
	const base = 14 * 60 + 22; // T+14:22 into the cycle
	const t = base - offsetMin;
	const d = Math.floor(Math.abs(t) / 1440);
	const mins = ((t % 1440) + 1440) % 1440;
	return `CYCLE ${pad(118 - d)} · ${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
}

function duration(rng) {
	const s = rng.int(4, 1850);
	return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/* ------------------------------------------------------------------
   Per-module dataset builders
   ------------------------------------------------------------------ */

function buildComms(rng, facility) {
	const n = rng.int(9, 14);
	const records = [];
	for (let i = 0; i < n; i++) {
		const encrypted = rng.chance(0.3);
		records.push({
			id: `CH-${rng.hex(4)}`,
			channel: `CH ${rng.int(2, 88)}.${rng.int(10, 99)}`,
			callsign: rng.pick(CALLSIGNS),
			peer: rng.pick(CALLSIGNS),
			preview: encrypted
				? `▓▓ CIPHER BLOCK ${rng.hex(8)} — KEY NOT RECOVERED ▓▓`
				: `"${rng.pick(COMMS_FRAGMENTS)}"`,
			encrypted,
			messages: rng.int(3, 214),
			bursts: rng.int(1, 19),
			stamp: missionStamp(rng, i * rng.int(18, 95)),
			strength: rng.int(22, 99),
			flagged: rng.chance(0.22)
		});
	}
	return {
		columns: ['CHANNEL', 'CALLSIGN', 'PEER', 'MESSAGES', 'SIGNAL', 'STAMP'],
		records,
		stats: [
			{ label: 'CHANNELS', value: n, unit: '' },
			{ label: 'TRANSMISSIONS', value: records.reduce((a, r) => a + r.messages, 0), unit: '' },
			{ label: 'ENCRYPTED', value: records.filter((r) => r.encrypted).length, unit: '' },
			{ label: 'FLAGGED', value: records.filter((r) => r.flagged).length, unit: '' }
		]
	};
}

function buildAccess(rng, facility) {
	const n = rng.int(11, 16);
	const records = [];
	for (let i = 0; i < n; i++) {
		const person = rng.pick(CREW);
		const result = rng.chance(0.14) ? 'DENIED' : rng.chance(0.08) ? 'OVERRIDE' : 'GRANTED';
		records.push({
			id: `BDG-${rng.hex(5)}`,
			holder: person.name,
			role: person.role,
			clearance: person.clearance,
			door: rng.pick(DOORS),
			result,
			dwell: duration(rng),
			stamp: missionStamp(rng, i * rng.int(11, 70)),
			flagged: result !== 'GRANTED'
		});
	}
	return {
		columns: ['BADGE', 'HOLDER', 'APERTURE', 'RESULT', 'DWELL', 'STAMP'],
		records,
		stats: [
			{ label: 'EVENTS', value: n, unit: '' },
			{ label: 'GRANTED', value: records.filter((r) => r.result === 'GRANTED').length, unit: '' },
			{ label: 'DENIED', value: records.filter((r) => r.result === 'DENIED').length, unit: '' },
			{ label: 'OVERRIDES', value: records.filter((r) => r.result === 'OVERRIDE').length, unit: '' }
		]
	};
}

function buildSubroutines(rng, facility) {
	const names = rng.picks(PROCESSES, rng.int(10, 15));
	const records = names.map((name, i) => {
		const state = rng.chance(0.1) ? 'HUNG' : rng.chance(0.18) ? 'WAIT' : 'RUN';
		return {
			id: `PID-${rng.int(1000, 9999)}`,
			name,
			state,
			cpu: +(rng() * (state === 'HUNG' ? 96 : 34)).toFixed(1),
			mem: rng.int(12, 2048),
			threads: rng.int(1, 64),
			parent: i === 0 ? 'init' : rng.pick(['init', 'kernel', 'supervisor.d']),
			uptime: `${rng.int(0, 118)}d ${rng.int(0, 23)}h`,
			flagged: state === 'HUNG'
		};
	});
	return {
		columns: ['PID', 'SUBROUTINE', 'STATE', 'CPU %', 'MEM MB', 'UPTIME'],
		records,
		stats: [
			{ label: 'PROCESSES', value: records.length, unit: '' },
			{ label: 'RUNNING', value: records.filter((r) => r.state === 'RUN').length, unit: '' },
			{ label: 'HUNG', value: records.filter((r) => r.state === 'HUNG').length, unit: '' },
			{ label: 'PEAK CPU', value: Math.max(...records.map((r) => r.cpu)), unit: '%' }
		]
	};
}

function buildSubsystem(rng, facility, key) {
	const spec = SUBSYSTEMS[key];
	const records = spec.nodes.map((node, i) => {
		const status = rng.chance(0.12) ? 'FAULT' : rng.chance(0.2) ? 'DEGRADED' : 'NOMINAL';
		return {
			id: `ND-${rng.hex(4)}`,
			node,
			status,
			reading: +(rng() * 100).toFixed(1),
			unit: spec.unit,
			variance: +((rng() - 0.5) * 18).toFixed(2),
			lastSync: missionStamp(rng, i * rng.int(5, 40)),
			flagged: status === 'FAULT'
		};
	});
	return {
		columns: ['NODE', 'STATUS', `READING (${spec.unit})`, 'VARIANCE', 'LAST SYNC'],
		records,
		stats: [
			{ label: 'NODES', value: records.length, unit: '' },
			{ label: 'NOMINAL', value: records.filter((r) => r.status === 'NOMINAL').length, unit: '' },
			{ label: 'DEGRADED', value: records.filter((r) => r.status === 'DEGRADED').length, unit: '' },
			{ label: 'FAULTS', value: records.filter((r) => r.status === 'FAULT').length, unit: '' }
		]
	};
}

function buildFullDump(rng, facility) {
	const comms = buildComms(rng, facility);
	const access = buildAccess(rng, facility);
	const subs = buildSubroutines(rng, facility);
	const records = [
		...comms.records.slice(0, 6).map((r) => ({ id: r.id, kind: 'COMMS', detail: `${r.callsign} → ${r.peer}`, note: r.encrypted ? 'CIPHERED' : 'CLEAR', stamp: r.stamp, flagged: r.flagged })),
		...access.records.slice(0, 6).map((r) => ({ id: r.id, kind: 'ACCESS', detail: `${r.holder} · ${r.door}`, note: r.result, stamp: r.stamp, flagged: r.flagged })),
		...subs.records.slice(0, 5).map((r) => ({ id: r.id, kind: 'PROCESS', detail: r.name, note: r.state, stamp: `UPTIME ${r.uptime}`, flagged: r.flagged })),
		...Array.from({ length: rng.int(3, 6) }, (_, i) => ({
			id: `EVT-${rng.hex(4)}`,
			kind: 'SESSION',
			detail: rng.pick(['beacon handshake', 'clock resync', 'keyring rotation', 'manifest write', 'hull strain report', 'airlock cycle']),
			note: rng.pick(['OK', 'RETRY', 'STALE']),
			stamp: missionStamp(rng, 40 + i * 33),
			flagged: rng.chance(0.2)
		}))
	];
	// Shuffle into one timeline.
	for (let i = records.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[records[i], records[j]] = [records[j], records[i]];
	}
	return {
		columns: ['REF', 'KIND', 'DETAIL', 'STATE', 'STAMP'],
		records,
		stats: [
			{ label: 'TOTAL RECORDS', value: records.length, unit: '' },
			{ label: 'CHANNELS', value: comms.records.length, unit: '' },
			{ label: 'ACCESS EVENTS', value: access.records.length, unit: '' },
			{ label: 'ANOMALIES', value: records.filter((r) => r.flagged).length, unit: '' }
		]
	};
}

/* ------------------------------------------------------------------
   Charts
   ------------------------------------------------------------------ */

function buildCharts(rng, moduleId) {
	// 24-slot activity distribution with a believable double-peak shape.
	const activity = Array.from({ length: 24 }, (_, h) => {
		const shape =
			Math.exp(-((h - 9) ** 2) / 14) * 0.8 + Math.exp(-((h - 20) ** 2) / 10) * 1 + 0.12;
		return Math.max(2, Math.round(shape * 100 * (0.65 + rng() * 0.7)));
	});

	const catSets = {
		comms: ['VOICE', 'BURST', 'TEXT', 'TELEMETRY', 'CIPHERED'],
		access: ['GRANTED', 'DENIED', 'OVERRIDE', 'TIMEOUT'],
		subroutines: ['KERNEL', 'SERVICE', 'USER', 'ORPHAN'],
		fulldump: ['COMMS', 'ACCESS', 'PROCESS', 'SESSION'],
		power: ['REACTOR', 'SOLAR', 'BATTERY', 'RESERVE'],
		cryo: ['BAY 1', 'BAY 2', 'BAY 3', 'LOOP'],
		sensor: ['LIDAR', 'THERMAL', 'MOTION', 'DEEP'],
		defense: ['PERIMETER', 'INTERIOR', 'RELAY', 'JAMMER'],
		uplink: ['PRIMARY', 'BACKUP', 'CACHE', 'GROUND']
	};
	const labels = catSets[moduleId] || catSets.fulldump;
	const raw = labels.map(() => rng.int(8, 100));
	const total = raw.reduce((a, b) => a + b, 0);
	const categories = labels.map((label, i) => ({
		label,
		value: raw[i],
		pct: Math.round((raw[i] / total) * 100)
	}));

	// Signal trace for the sparkline/area chart.
	let v = 50;
	const trace = Array.from({ length: 40 }, () => {
		v = Math.max(6, Math.min(96, v + (rng() - 0.48) * 22));
		return Math.round(v);
	});

	return { activity, categories, trace };
}

/* ------------------------------------------------------------------
   Public API
   ------------------------------------------------------------------ */

export function generateSessionId(rng) {
	return `SIM-${rng.hex(4)}-${rng.hex(4)}-${rng.hex(4)}`;
}

/**
 * Build the complete synthetic dataset for one simulation run.
 * @param {string} moduleId
 * @param {object} facility
 * @param {number} seed
 */
export function generateDataset(moduleId, facility, seed) {
	const rng = makeRng(seed);
	let core;

	switch (moduleId) {
		case 'comms':
			core = buildComms(rng, facility);
			break;
		case 'access':
			core = buildAccess(rng, facility);
			break;
		case 'subroutines':
			core = buildSubroutines(rng, facility);
			break;
		case 'fulldump':
			core = buildFullDump(rng, facility);
			break;
		default:
			core = buildSubsystem(rng, facility, moduleId);
	}

	return {
		moduleId,
		module: getModule(moduleId),
		facility,
		seed,
		sessionId: generateSessionId(rng),
		generatedAt: new Date().toISOString(),
		synthetic: true,
		...core,
		charts: buildCharts(rng, moduleId),
		integrity: {
			coverage: rng.int(72, 99),
			confidence: rng.int(61, 97),
			noiseFloor: +(rng() * 12).toFixed(2)
		}
	};
}

/* ------------------------------------------------------------------
   Terminal filler — decorative only, never executed
   ------------------------------------------------------------------ */

const OPS = [
	'resolving node', 'walking sector table', 'rebuilding index', 'probing aperture',
	'de-interleaving frame', 'reconciling clock skew', 'unwinding stack', 'mapping bus',
	'seeding entropy pool', 'verifying checksum', 'pivoting on relay', 'caching manifest',
	'reading descriptor', 'flushing write queue', 'negotiating handshake', 'inflating block'
];

const ARTIFACTS = [
	'sector', 'frame', 'block', 'descriptor', 'manifest', 'keyring', 'lattice',
	'segment', 'partition', 'envelope', 'payload', 'checksum'
];

/**
 * One decorative terminal line. These are visual noise — they describe
 * nothing real and nothing here is ever run.
 */
export function fillerLine(rng, phase = 'scan') {
	const roll = rng();

	if (roll < 0.26) {
		// Hex dump row
		const addr = rng.hex(8);
		const bytes = Array.from({ length: 8 }, () => rng.hex(2)).join(' ');
		const ascii = Array.from({ length: 8 }, () =>
			rng.chance(0.55) ? String.fromCharCode(rng.int(33, 126)) : '.'
		).join('');
		return { level: 'dim', text: `0x${addr}  ${bytes}  |${ascii}|` };
	}

	if (roll < 0.44) {
		return {
			level: 'raw',
			text: `${rng.pick(OPS)} ${rng.pick(ARTIFACTS)}:${rng.hex(4)} → ${rng.int(0, 4095)} bytes`
		};
	}

	if (roll < 0.56) {
		const pct = rng.int(1, 100);
		return {
			level: 'info',
			text: `[I/O] ${rng.pick(ARTIFACTS)} stream ${rng.hex(3)} · ${pct}% · ${rng.int(2, 980)} kb/s`
		};
	}

	if (roll < 0.68) {
		return {
			level: 'ok',
			text: `[ OK ] ${rng.pick(OPS)} :: ${rng.hex(6)} verified in ${rng.int(2, 340)}ms`
		};
	}

	if (roll < 0.78) {
		return {
			level: 'warn',
			text: `[WARN] ${rng.pick(ARTIFACTS)} ${rng.hex(4)} returned stale header, retrying (${rng.int(1, 3)}/3)`
		};
	}

	if (roll < 0.845) {
		return {
			level: 'err',
			text: `[FAIL] aperture ${rng.hex(4)} refused handshake — falling back to passive read`
		};
	}

	if (roll < 0.93) {
		// Pseudo-code visualisation
		const fn = rng.pick(['walk', 'map', 'trace', 'fold', 'scan', 'emit']);
		return {
			level: 'raw',
			text: `  ${fn}(${rng.pick(ARTIFACTS)}[${rng.int(0, 64)}], mask=0x${rng.hex(4)}) ⇒ ok`
		};
	}

	return {
		level: 'sys',
		text: `[SYS] ${rng.pick(['lattice', 'relay', 'spine', 'bus'])} ${rng.hex(4)} responding · latency ${rng.int(3, 220)}ms`
	};
}
