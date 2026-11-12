// Test data 9: the 1999-06-06 15:30:01 IST Bhavnagar chart in Jagannatha Hora with the True
// Lahiri / Chitrapaksha ayanamsa (fixtures/jhora-data9.json and jhora-data9-kalachakra.txt).
// Kalachakra uses True Lahiri by default; the same birth under Traditional Lahiri (Sagar's
// 15:30:00 reference) is a different timeline.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { server, ok, SKIP } from './helpers.js';

const D9 = JSON.parse(readFileSync(new URL('./fixtures/jhora-data9.json', import.meta.url)));
const TEXT = readFileSync(new URL('./fixtures/jhora-data9-kalachakra.txt', import.meta.url), 'utf8');
const BIRTH = { datetime: D9.birth.datetime, latitude: D9.birth.latitude, longitude: D9.birth.longitude };

const SIGN_AB = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];
const JH_PADA = ['Aswi', 'Bhar', 'Krit', 'Rohi', 'Mrig', 'Ardr', 'Puna', 'Push', 'Asre', 'Magh', 'PPha', 'UPha', 'Hast', 'Chit', 'Swat', 'Visa', 'Anu', 'Jye', 'Mool', 'PSha', 'USha', 'Srav', 'Dhan', 'Sata', 'PBha', 'UBha', 'Reva'];
const NAKSHATRAS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
const jhLabel = (pada) => { const m = pada.match(/^(.*) (\d)$/); return `${JH_PADA[NAKSHATRAS.indexOf(m[1])]}${m[2]}`; };
// "0 Li 40' 30.23\"" -> sidereal longitude in degrees
const parseLon = (text) => {
  const m = text.match(/^(\d+) (\w\w) (\d+)' ([\d.]+)"$/);
  return SIGN_AB.indexOf(m[2]) * 30 + Number(m[1]) + Number(m[3]) / 60 + Number(m[4]) / 3600;
};

// JH's text export -> [{ parents: ['Ta Dhan3', ...], sign, pada, start, end }]
function parseKalachakra(text) {
  const LEVELS = { MD: 1, AD: 2, PD: 3, SD: 4, PAD: 5, DD: 6 };
  const time = (d, t) => { const [h, m, s] = t.split(':'); return `${d}T${h.padStart(2, '0')}:${m}:${s}${D9.birth.timezone}`; };
  const rows = [];
  let path = [];
  let inMahaList = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('Kalachakra Dasa')) { path = []; inMahaList = false; continue; }
    if (/^Maha Dasas:/.test(line)) { inMahaList = true; path = []; continue; }
    const head = line.match(/^(\w\w) \((\w+)\) (MD|AD|PD|SD|PAD|DD): (\S+) \(([\d:]+)\) - (\S+) \(([\d:]+)\)/);
    if (head) {
      const [, sign, pada, level, d1, t1, d2, t2] = head;
      path = path.slice(0, LEVELS[level] - 1);
      rows.push({ parents: [...path], sign, pada, start: time(d1, t1), end: time(d2, t2) });
      path.push(`${sign} ${pada}`);
      inMahaList = false;
      continue;
    }
    const item = line.match(/^(\w\w) \((\w+)\): (\S+) \(([\d:]+)\) - (\S+) \(([\d:]+)\)/);
    if (item) {
      const [, sign, pada, d1, t1, d2, t2] = item;
      rows.push({ parents: inMahaList ? [] : [...path], sign, pada, start: time(d1, t1), end: time(d2, t2) });
    }
  }
  const seen = new Set();
  return rows.filter((r) => { const k = JSON.stringify(r); return seen.has(k) ? false : (seen.add(k), true); });
}

// Same signs and the same times to a couple of seconds (the two calls interpolate the Sun on different grids)
function sameTimeline(a, b) {
  assert.deepEqual(a.map((m) => m.sign_abbr), b.map((m) => m.sign_abbr));
  a.forEach((m, i) => {
    for (const k of ['start', 'end']) assert.ok(Math.abs(Date.parse(m[k]) - Date.parse(b[i][k])) <= 2000, `${m.sign_abbr} ${k}: ${m[k]} vs ${b[i][k]}`);
  });
}

const srv = server();
after(() => srv && srv.stop());

test('Data 9 fixture holds JH\'s 9 mahadashas, 9 Ta antardashas, 9 PADs and six PD/SD/PAD/deha chains (94 periods)', () => {
  const rows = parseKalachakra(TEXT);
  assert.equal(rows.filter((r) => r.parents.length === 0).length, 9);
  assert.equal(rows.filter((r) => r.parents.length === 1).length, 9);
  assert.equal(rows.filter((r) => r.parents.length === 2).length, 4);
  assert.equal(rows.filter((r) => r.parents.length === 3).length, 5);
  assert.equal(rows.filter((r) => r.parents.length === 4).length, 13);
  assert.equal(rows.filter((r) => r.parents.length === 5).length, 54);
  assert.equal(rows.length, 94);
});

test('Data 9 summary: Apasavya, Paramayush 83, Deha Ta, Jiva Ge, True Lahiri', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_kalachakra_dasha', { datetime: BIRTH.datetime, output: 'chain', levels: 1 });
  assert.match(D9.kalachakra_summary, /Apasavya, Paramayush 83 yr, Deha Ta, Jiva Ge/);
  assert.equal(result.direction, 'Apasavya');
  assert.equal(result.paramayush, 83);
  assert.equal(result.deha, 'Ta');
  assert.equal(result.jiva, 'Ge');
  assert.match(result.settings.ayanamsa, /True Lahiri/);
});

test('Data 9 Kalachakra: every JH period down to deha matches under True Lahiri (labels exact, times within a minute)', { skip: SKIP }, async () => {
  const groups = new Map();
  for (const row of parseKalachakra(TEXT)) {
    const key = JSON.stringify(row.parents);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  let worst = 0;
  for (const [key, rows] of groups) {
    const steps = JSON.parse(key);
    const r = await ok(srv, 'calculate_kalachakra_dasha', { datetime: BIRTH.datetime, ...(steps.length ? { drill_down: steps } : {}), output: steps.length ? 'chain' : 'full', levels: 1 });
    const list = steps.length
      ? Object.entries(r.result.drill_down).find(([k, v]) => k !== 'path' && Array.isArray(v))[1]
      : r.result.mahadashas;
    for (const row of rows) {
      const got = list.find((p) => p.sign_abbr === row.sign && jhLabel(p.pada) === row.pada);
      assert.ok(got, `${key} ${row.sign} ${row.pada} not found`);
      for (const [a, b] of [[got.start, row.start], [got.end, row.end]]) {
        const d = Math.abs(Date.parse(a) - Date.parse(b)) / 1000;
        worst = Math.max(worst, d);
        assert.ok(d <= 60, `${key} ${row.sign} ${row.pada}: ${a} vs JH ${b} (${d} s)`);
      }
    }
  }
  assert.ok(worst <= 60, `worst ${worst}s`);
});

test('Data 9 positions with true_lahiri match JH\'s table (lagna carries JH\'s nutation offset)', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...BIRTH, ayanamsa: 'true_lahiri', include: [], output: 'full' });
  assert.match(result.ayanamsa.name, /True Lahiri/);
  for (const [name, jh] of Object.entries(D9.bodies)) {
    const x = name === 'Lagna' ? result.lagna : result.planets[name];
    const diff = (x.longitude - parseLon(jh.longitude)) * 3600;
    // As for the traditional ayanamsa, JH's lagna sits about 12.6" below the server's
    const limit = name === 'Lagna' ? 20 : 1.5;
    assert.ok(Math.abs(diff) <= limit, `${name}: ${x.degree_dms} is ${diff.toFixed(2)}" from JH ${jh.longitude}`);
    assert.equal(jhLabel(`${x.nakshatra} ${x.nakshatra_pada}`), `${jh.nakshatra}${jh.pada}`, `${name} nakshatra`);
  }
});

test('Kalachakra in the chart uses True Lahiri whatever the chart ayanamsa is', { skip: SKIP }, async () => {
  const kc = (await ok(srv, 'calculate_kalachakra_dasha', { datetime: BIRTH.datetime })).result;
  const chart = (await ok(srv, 'calculate_vedic_chart', { ...BIRTH, include: [], output: 'full', levels: 1 })).result;
  assert.match(chart.settings.kalachakra, /True Lahiri/);
  assert.notEqual(chart.settings.ayanamsa, kc.settings.ayanamsa);
  sameTimeline(chart.kalachakra_dasha.mahadashas, kc.mahadashas);
  // Vimshottari keeps the chart's own ayanamsa
  const trueLahiriChart = (await ok(srv, 'calculate_vedic_chart', { ...BIRTH, ayanamsa: 'true_lahiri', include: [], output: 'full', levels: 1 })).result;
  assert.notEqual(chart.vimshottari_dasha.mahadashas[1].start, trueLahiriChart.vimshottari_dasha.mahadashas[1].start);
  sameTimeline(trueLahiriChart.kalachakra_dasha.mahadashas, kc.mahadashas);
});

test('Traditional Lahiri stays available for Kalachakra and gives a different timeline', { skip: SKIP }, async () => {
  const trueLahiri = (await ok(srv, 'calculate_kalachakra_dasha', { datetime: BIRTH.datetime, output: 'full', levels: 1 })).result;
  const traditional = (await ok(srv, 'calculate_kalachakra_dasha', { datetime: BIRTH.datetime, output: 'full', levels: 1, ayanamsa_override: 'traditional_lahiri' })).result;
  assert.match(traditional.settings.ayanamsa, /Traditional Lahiri/);
  assert.deepEqual(traditional.mahadashas.map((m) => m.sign_abbr), trueLahiri.mahadashas.map((m) => m.sign_abbr));
  // About 56" of ayanamsa moves the Ta mahadasha start by months
  const shiftDays = Math.abs(Date.parse(traditional.mahadashas[2].start) - Date.parse(trueLahiri.mahadashas[2].start)) / 86400000;
  assert.ok(shiftDays > 30 && shiftDays < 365, `${shiftDays} days`);
});
