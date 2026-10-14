/**
 * ReportExporter — writes the locally generated synthetic dataset out as
 * CSV, JSON or a printable HTML report.
 *
 * Every export is built in the browser from data this session generated.
 * Nothing is uploaded, and every artefact carries the synthetic-data notice
 * in its own body so the label travels with the file.
 */

const NOTICE = 'SYNTHETIC DEMONSTRATION DATA — NOT REAL ACCOUNT INFORMATION';
const NOTICE_LONG =
	'This report was produced by CYBERX, a fictional infiltration simulator. ' +
	'The facility, personnel, channels, records and telemetry described below ' +
	'do not exist. No system was accessed, scanned or contacted to produce this ' +
	'file, and none of its contents describe any real person, device or network.';

function stamp() {
	const d = new Date();
	const p = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * Resolve the host's `downloads` capability once.
 *
 * When this app runs as a published Artifact the viewer frame refuses
 * plain `<a download>` saves, so the file has to be handed over through
 * `claude.downloads.save`. Everywhere else (dev server, static build,
 * a local file) `window.claude` is absent and this resolves to null
 * immediately, so the anchor path is used.
 *
 * @type {undefined | null | { save: (r: object) => Promise<object> }}
 */
let downloadsCap;

async function getDownloads() {
	if (downloadsCap !== undefined) return downloadsCap;
	try {
		downloadsCap = (await globalThis.claude?.use?.('downloads')) ?? null;
	} catch {
		downloadsCap = null;
	}
	return downloadsCap;
}

/** Classic anchor save — works in a normal browser context. */
function anchorSave(content, filename, mime) {
	try {
		const blob = new Blob([content], { type: `${mime};charset=utf-8` });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.rel = 'noopener';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		// Give the browser a beat to start the transfer before releasing.
		setTimeout(() => URL.revokeObjectURL(url), 4000);
		return { ok: true };
	} catch (err) {
		return { ok: false, reason: 'error', message: String(err?.message ?? err) };
	}
}

/**
 * @returns {Promise<{ok: boolean, reason?: string, message?: string}>}
 */
async function download(content, filename, mime) {
	const cap = await getDownloads();
	if (cap) {
		try {
			await cap.save({ filename, data: content });
			return { ok: true };
		} catch (err) {
			const code = err?.code ?? 'unavailable';
			// The viewer actively said no — don't fall back and save anyway.
			if (code === 'declined') return { ok: false, reason: 'declined' };
			if (code === 'rate_limited')
				return { ok: false, reason: 'busy', message: 'Another save is already open.' };
			if (code === 'too_large')
				return { ok: false, reason: 'error', message: 'Report is too large to save here.' };
			// Lifecycle / capability problems: try the ordinary route.
			return anchorSave(content, filename, mime);
		}
	}
	return anchorSave(content, filename, mime);
}

const baseName = (ds) => `cyberx-${ds.moduleId}-${ds.sessionId.toLowerCase()}-${stamp()}`;

/** Ordered header/value pairs shared by every format. */
function header(ds) {
	return [
		['REPORT', 'CYBERX SIMULATION REPORT'],
		['NOTICE', NOTICE],
		['SESSION ID', ds.sessionId],
		['MODULE', `${ds.module.code} — ${ds.module.title}`],
		['TARGET FACILITY', ds.facility.name],
		['OPERATOR', ds.facility.operator],
		['DESIGNATION', ds.facility.designation],
		['SECTOR', ds.facility.sector],
		['GENERATED', new Date(ds.generatedAt).toLocaleString()],
		['SEED', String(ds.seed)],
		['RECORD COUNT', String(ds.records.length)],
		['COVERAGE', `${ds.integrity.coverage}%`],
		['CONFIDENCE', `${ds.integrity.confidence}%`],
		['DATA CLASS', 'SYNTHETIC / FICTIONAL']
	];
}

/* ------------------------------------------------------------------
   CSV
   ------------------------------------------------------------------ */

const esc = (v) => {
	const s = v === null || v === undefined ? '' : String(v);
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function exportCSV(ds) {
	const rows = [];
	for (const [k, v] of header(ds)) rows.push(`# ${k},${esc(v)}`);
	rows.push('#');
	rows.push(`# ${NOTICE_LONG}`);
	rows.push('');

	const keys = Object.keys(ds.records[0] ?? {});
	rows.push(keys.map((k) => esc(k.toUpperCase())).join(','));
	for (const r of ds.records) rows.push(keys.map((k) => esc(r[k])).join(','));

	rows.push('');
	rows.push('# ACTIVITY DISTRIBUTION (24 SLOTS)');
	rows.push('SLOT,VALUE');
	ds.charts.activity.forEach((v, i) => rows.push(`${i},${v}`));

	rows.push('');
	rows.push('# CATEGORY BREAKDOWN');
	rows.push('CATEGORY,VALUE,PERCENT');
	for (const c of ds.charts.categories) rows.push(`${esc(c.label)},${c.value},${c.pct}`);

	rows.push('');
	rows.push(`# END OF REPORT — ${NOTICE}`);

	return download(rows.join('\r\n'), `${baseName(ds)}.csv`, 'text/csv');
}

/* ------------------------------------------------------------------
   JSON
   ------------------------------------------------------------------ */

export async function exportJSON(ds) {
	const payload = {
		report: 'CYBERX SIMULATION REPORT',
		notice: NOTICE,
		disclaimer: NOTICE_LONG,
		dataClass: 'SYNTHETIC/FICTIONAL',
		session: {
			id: ds.sessionId,
			generatedAt: ds.generatedAt,
			seed: ds.seed,
			module: { code: ds.module.code, id: ds.moduleId, title: ds.module.title }
		},
		target: {
			name: ds.facility.name,
			operator: ds.facility.operator,
			designation: ds.facility.designation,
			sector: ds.facility.sector,
			tier: ds.facility.tier,
			fictional: true
		},
		integrity: ds.integrity,
		columns: ds.columns,
		records: ds.records,
		charts: ds.charts
	};
	return download(JSON.stringify(payload, null, 2), `${baseName(ds)}.json`, 'application/json');
}

/* ------------------------------------------------------------------
   Printable HTML
   ------------------------------------------------------------------ */

const htmlEsc = (s) =>
	String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

export function buildHTML(ds) {
	const keys = Object.keys(ds.records[0] ?? {});
	const maxAct = Math.max(...ds.charts.activity, 1);

	const metaRows = header(ds)
		.filter(([k]) => k !== 'REPORT' && k !== 'NOTICE')
		.map(([k, v]) => `<tr><th>${htmlEsc(k)}</th><td>${htmlEsc(v)}</td></tr>`)
		.join('');

	const bodyRows = ds.records
		.map(
			(r) =>
				`<tr${r.flagged ? ' class="flag"' : ''}>${keys
					.map((k) => `<td>${htmlEsc(r[k])}</td>`)
					.join('')}</tr>`
		)
		.join('');

	const bars = ds.charts.activity
		.map(
			(v, i) =>
				`<div class="bar" title="slot ${i}: ${v}"><span style="height:${Math.round((v / maxAct) * 100)}%"></span><em>${i}</em></div>`
		)
		.join('');

	const cats = ds.charts.categories
		.map(
			(c) =>
				`<li><span class="cl">${htmlEsc(c.label)}</span><span class="cb"><i style="width:${c.pct}%"></i></span><span class="cv">${c.value} · ${c.pct}%</span></li>`
		)
		.join('');

	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CYBERX Simulation Report — ${htmlEsc(ds.sessionId)}</title>
<style>
  :root{--ink:#0d1420;--mut:#5d6b80;--line:#d6dde8;--acc:#0e7490;--warn:#92400e}
  *{box-sizing:border-box}
  body{margin:0;padding:38px 32px;font:14px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:#fff;max-width:1100px;margin-inline:auto}
  h1{font-size:23px;letter-spacing:.14em;margin:0 0 2px;text-transform:uppercase}
  h2{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--mut);margin:34px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line)}
  .sub{color:var(--mut);font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:18px}
  .notice{border:2px solid var(--warn);background:#fffbeb;color:var(--warn);padding:13px 15px;border-radius:7px;font-size:12px;margin:18px 0 6px}
  .notice strong{display:block;letter-spacing:.11em;text-transform:uppercase;margin-bottom:5px;font-size:12px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  .meta{max-width:560px}
  .meta th{text-align:left;padding:5px 14px 5px 0;color:var(--mut);font-weight:500;letter-spacing:.07em;text-transform:uppercase;font-size:11px;white-space:nowrap;vertical-align:top}
  .meta td{padding:5px 0;font-family:ui-monospace,Menlo,monospace}
  .data th{text-align:left;background:#f1f5f9;padding:8px 9px;font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--mut);border-bottom:2px solid var(--line)}
  .data td{padding:7px 9px;border-bottom:1px solid #eef2f7;font-family:ui-monospace,Menlo,monospace;font-size:11.5px;vertical-align:top}
  .data tr.flag td{background:#fff7ed}
  .data tr.flag td:first-child{box-shadow:inset 3px 0 0 #f97316}
  .chart{display:flex;align-items:flex-end;gap:3px;height:132px;padding-top:10px}
  .bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%}
  .bar span{width:100%;background:linear-gradient(180deg,#22d3ee,#0e7490);border-radius:2px 2px 0 0;min-height:2px}
  .bar em{font-style:normal;font-size:8px;color:var(--mut);margin-top:3px}
  ul.cats{list-style:none;padding:0;margin:8px 0 0;font-size:12px}
  ul.cats li{display:flex;align-items:center;gap:11px;padding:4px 0}
  .cl{width:110px;font-family:ui-monospace,monospace;font-size:11px}
  .cb{flex:1;height:9px;background:#eef2f7;border-radius:5px;overflow:hidden}
  .cb i{display:block;height:100%;background:linear-gradient(90deg,#22d3ee,#0e7490)}
  .cv{width:92px;text-align:right;color:var(--mut);font-size:11px;font-family:ui-monospace,monospace}
  footer{margin-top:40px;padding-top:14px;border-top:1px solid var(--line);color:var(--mut);font-size:10.5px;letter-spacing:.07em;text-transform:uppercase}
  @media print{body{padding:0}.notice{break-inside:avoid}h2{break-after:avoid}tr{break-inside:avoid}}
</style></head><body>
<h1>CYBERX Simulation Report</h1>
<div class="sub">${htmlEsc(ds.module.code)} — ${htmlEsc(ds.module.title)} · Session ${htmlEsc(ds.sessionId)}</div>

<div class="notice"><strong>${NOTICE}</strong>${NOTICE_LONG}</div>

<h2>Session Parameters</h2>
<table class="meta">${metaRows}</table>

<h2>Generated Records (${ds.records.length})</h2>
<table class="data"><thead><tr>${keys.map((k) => `<th>${htmlEsc(k.toUpperCase())}</th>`).join('')}</tr></thead>
<tbody>${bodyRows}</tbody></table>

<h2>Activity Distribution</h2>
<div class="chart">${bars}</div>

<h2>Category Breakdown</h2>
<ul class="cats">${cats}</ul>

<footer>${NOTICE} · Generated ${htmlEsc(new Date(ds.generatedAt).toLocaleString())} · CYBERX fictional infiltration simulator · Seed ${htmlEsc(ds.seed)}</footer>
</body></html>`;
}

export async function exportHTML(ds) {
	return download(buildHTML(ds), `${baseName(ds)}.html`, 'text/html');
}

/** Open the report in a new window and trigger the print dialog. */
export function printHTML(ds) {
	const w = window.open('', '_blank', 'noopener,width=1024,height=800');
	if (!w) return false; // popup blocked — caller falls back to download
	w.document.write(buildHTML(ds));
	w.document.close();
	w.focus();
	setTimeout(() => {
		try {
			w.print();
		} catch {
			/* user can print manually */
		}
	}, 420);
	return true;
}

export const EXPORT_NOTICE = NOTICE;
