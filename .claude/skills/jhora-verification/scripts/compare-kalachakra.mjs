#!/usr/bin/env node
// Compares a Jagannatha Hora Kalachakra text export (the "Kalachakra Dasa (From Moon of D-1 ...)"
// blocks JH prints, pasted into a file) with the MCP server, period by period.
//
// Usage (from the repository root, with swetest on PATH and SE_EPHE_PATH set):
//   node .claude/skills/jhora-verification/scripts/compare-kalachakra.mjs \
//     --birth 1999-06-06T15:30:00+05:30 --file jh.txt [--repo .] [--tolerance 60] [--direction parent]
//
// Every line "Xx (Pada) LEVEL: date (time) - date (time)" opens a period at that level; a line
// "Xx (Pada): date (time) - date (time)" lists a sub-period of the block it is in (or a mahadasha
// after "Maha Dasas:"). Times are read in the birth offset. Prints one row per JH period with the
// server's label and the start/end differences, then a summary. Exit code 1 when a label differs
// or a time is off by more than --tolerance seconds.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
if (!args.birth || !args.file) {
  console.error('usage: compare-kalachakra.mjs --birth <ISO datetime with offset> --file <JH export> [--repo <repo root>] [--tolerance <s>] [--direction parent|natal]');
  process.exit(2);
}
const repo = path.resolve(args.repo || '.');
const tolerance = Number(args.tolerance || 60);
const offset = args.birth.match(/([+-]\d{2}:\d{2})$/)?.[1] || '+05:30';
const { startServer } = await import(pathToFileURL(path.join(repo, 'test/mcp-client.js')).href);

const LEVELS = { MD: 1, AD: 2, PD: 3, SD: 4, PAD: 5, DD: 6 };
const JH_PADA = ['Aswi', 'Bhar', 'Krit', 'Rohi', 'Mrig', 'Ardr', 'Puna', 'Push', 'Asre', 'Magh', 'PPha', 'UPha', 'Hast', 'Chit', 'Swat', 'Visa', 'Anu', 'Jye', 'Mool', 'PSha', 'USha', 'Srav', 'Dhan', 'Sata', 'PBha', 'UBha', 'Reva'];
const NAKSHATRAS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
const jhLabel = (pada) => { const m = pada.match(/^(.*) (\d)$/); return `${JH_PADA[NAKSHATRAS.indexOf(m[1])]}${m[2]}`; };
const time = (d, t) => { const [h, m, s] = t.split(':'); return `${d}T${h.padStart(2, '0')}:${m}:${s}${offset}`; };

// Parse into rows { parents: ['Ta Dhan3', ...], sign, pada, start, end }
const rows = [];
let path_ = [];
let inMahaList = false;
for (const raw of readFileSync(args.file, 'utf8').split('\n')) {
  const line = raw.trim();
  if (line.startsWith('Kalachakra Dasa')) { path_ = []; inMahaList = false; continue; }
  if (/^Maha Dasas:/.test(line)) { inMahaList = true; path_ = []; continue; }
  const head = line.match(/^(\w\w) \((\w+)\) (MD|AD|PD|SD|PAD|DD): (\S+) \(([\d:]+)\) - (\S+) \(([\d:]+)\)/);
  if (head) {
    const [, sign, pada, level, d1, t1, d2, t2] = head;
    const depth = LEVELS[level];
    path_ = path_.slice(0, depth - 1);
    rows.push({ parents: [...path_], sign, pada, start: time(d1, t1), end: time(d2, t2) });
    path_.push(`${sign} ${pada}`);
    inMahaList = false;
    continue;
  }
  const item = line.match(/^(\w\w) \((\w+)\): (\S+) \(([\d:]+)\) - (\S+) \(([\d:]+)\)/);
  if (item) {
    const [, sign, pada, d1, t1, d2, t2] = item;
    rows.push({ parents: inMahaList ? [] : [...path_], sign, pada, start: time(d1, t1), end: time(d2, t2) });
  }
}

// Deduplicate (the same period can be printed in several blocks)
const seen = new Set();
const unique = rows.filter(r => { const k = JSON.stringify(r); if (seen.has(k)) return false; seen.add(k); return true; });

const server = startServer();
const lists = new Map();
let worst = 0;
let failures = 0;
for (const row of unique) {
  const key = JSON.stringify(row.parents);
  if (!lists.has(key)) {
    const r = await server.call('calculate_kalachakra_dasha', {
      datetime: args.birth,
      ...(row.parents.length ? { drill_down: row.parents, output: 'chain', levels: 1 } : { output: 'full', levels: 1 }),
      ...(args.direction ? { subperiod_direction: args.direction } : {}),
    });
    if (r.error) { console.log(`ERROR ${row.parents.join(' > ') || 'mahadashas'}: ${r.error}`); failures++; lists.set(key, []); continue; }
    lists.set(key, row.parents.length ? Object.entries(r.result.drill_down).find(([k, v]) => k !== 'path' && Array.isArray(v))[1] : r.result.mahadashas);
  }
  const list = lists.get(key);
  const got = list.find(p => p.sign_abbr === row.sign && jhLabel(p.pada) === row.pada);
  const where = `${row.parents.join(' > ') || 'MD'} | ${row.sign} (${row.pada})`;
  if (!got) {
    failures++;
    console.log(`${where.padEnd(52)} NOT FOUND; server has ${list.map(p => `${p.sign_abbr} (${jhLabel(p.pada)})`).join(', ')}`);
    continue;
  }
  const dS = (Date.parse(got.start) - Date.parse(row.start)) / 1000;
  const dE = (Date.parse(got.end) - Date.parse(row.end)) / 1000;
  worst = Math.max(worst, Math.abs(dS), Math.abs(dE));
  const bad = Math.abs(dS) > tolerance || Math.abs(dE) > tolerance;
  if (bad) failures++;
  console.log(`${where.padEnd(52)} Δstart ${String(Math.round(dS)).padStart(6)}s  Δend ${String(Math.round(dE)).padStart(6)}s${bad ? '  OUT OF TOLERANCE' : ''}`);
}
server.stop();
console.log(`\n${unique.length} JH periods, ${failures} problems, largest time difference ${Math.round(worst)} s (tolerance ${tolerance} s)`);
process.exit(failures ? 1 : 0);
