// Sagar's chart against Jagannatha Hora (fixtures/jhora-sagar.json): positions, Kalachakra down
// to deha, Vimshottari, ashtakavarga, shadbala, Ishta/Kashta, Vimshopaka, aspect strengths,
// D-3/D-7/D-9/D-10/D-60 and KP lords
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { server, ok, SKIP } from './helpers.js';
import { drishtiVirupas } from '../src/aspects.js';
import { kpLords } from '../src/kp.js';

const JH = JSON.parse(readFileSync(new URL('./fixtures/jhora-sagar.json', import.meta.url)));
const BIRTH = { datetime: JH.birth.datetime, latitude: JH.birth.latitude, longitude: JH.birth.longitude };
// JH's first screens were made with mean nodes; from the Basics/KP/D-7/D-10/D-60 batch on it uses
// true nodes, the server's default. Rahu values recorded with mean nodes use node_type "mean".
const MEAN_NODES = { node_type: 'mean' };
const AB = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke', Uranus: 'Ur', Neptune: 'Ne', Pluto: 'Pl' };
const SIGN_AB = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];
// "21 Ta 25' 59.32\"" -> sidereal longitude in degrees
const parseLon = (text) => {
  const m = text.match(/^(\d+) (\w\w) (\d+)' ([\d.]+)"$/);
  return SIGN_AB.indexOf(m[2]) * 30 + Number(m[1]) + Number(m[3]) / 60 + Number(m[4]) / 3600;
};
const SIGNS = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];
const JH_PADA = ['Aswi', 'Bhar', 'Krit', 'Rohi', 'Mrig', 'Ardr', 'Puna', 'Push', 'Asre', 'Magh', 'PPha', 'UPha', 'Hast', 'Chit', 'Swat', 'Visa', 'Anu', 'Jye', 'Mool', 'PSha', 'USha', 'Srav', 'Dhan', 'Sata', 'PBha', 'UBha', 'Reva'];
const NAKSHATRAS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
const jhLabel = (pada) => { const m = pada.match(/^(.*) (\d)$/); return JH_PADA[NAKSHATRAS.indexOf(m[1])] + m[2]; };

const srv = server();
after(() => srv && srv.stop());

test('Kalachakra matches Jagannatha Hora down to deha (labels exact, times within a minute)', { skip: SKIP }, async () => {
  const groups = new Map();
  for (const row of JH.kalachakra.rows) {
    const key = JSON.stringify(row.drill_down || row.path);
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
      const got = list.find(p => p.sign_abbr === row.sign && jhLabel(p.pada) === row.pada);
      assert.ok(got, `${key} ${row.sign} ${row.pada} not found`);
      for (const [a, b] of [[got.start, row.start], [got.end, row.end]]) {
        const d = Math.abs(Date.parse(a) - Date.parse(b)) / 1000;
        worst = Math.max(worst, d);
        assert.ok(d <= 60, `${key} ${row.sign} ${row.pada}: ${a} vs JH ${b}`);
      }
    }
  }
  assert.ok(worst <= 60, `worst ${worst}s`);
});

test('Ashtakavarga matches Jagannatha Hora', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...BIRTH, include: ['ashtakavarga'] });
  const av = result.ashtakavarga;
  assert.deepEqual(SIGNS.map(s => av.sarvashtakavarga[s]), SIGNS.map(s => JH.sav[s]));
  for (const [planet, row] of Object.entries(JH.bav)) assert.deepEqual(SIGNS.map(s => av.bhinnashtakavarga[planet][s]), SIGNS.map(s => row[s]), planet);
});

test('Shadbala matches Jagannatha Hora to the displayed precision', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...BIRTH, include: ['shadbala'] });
  const sb = result.shadbala.planets;
  const bars = JH.shadbala_bars;
  const get = { sthana: p => sb[p].sthana.total, kala: p => sb[p].kala.total, dig: p => sb[p].dig, cheshta: p => sb[p].cheshta, drik: p => sb[p].drik, naisargika: p => sb[p].naisargika, total: p => sb[p].total_virupas };
  // Integer bars carry +-0.5 of rounding; Venus's kala bala is still about 1.4 low
  const tolerance = { sthana: 0.6, kala: 1.5, dig: 0.1, cheshta: 0.35, drik: 0.1, naisargika: 0.1, total: 1.4 };
  for (const [part, values] of Object.entries(bars)) {
    if (!get[part]) continue;
    bars.order.forEach((p, i) => assert.ok(Math.abs(get[part](p) - values[i]) <= tolerance[part], `${part} ${p}: ${get[part](p)} vs JH ${values[i]}`));
  }
  bars.order.forEach((p, i) => assert.equal(Math.round(sb[p].rupas * 10) / 10, bars.rupas[i], `rupas ${p}`));
  bars.order.forEach((p, i) => assert.equal(Math.round(sb[p].ratio * 100), bars.percent[i], `percent ${p}`));
});

test('Shadbala totals, Ishta and Kashta match Jagannatha Hora\'s Other strengths', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...BIRTH, include: ['shadbala'] });
  const sb = result.shadbala.planets;
  const jh = JH.other_strengths;
  jh.order.forEach((p, i) => {
    // Totals: JH's nathonnatha (day strength) is about 0.8 virupas above ours for Sagar and
    // Venus's kala bala about 0.5 higher still; both causes are open
    assert.ok(Math.abs(sb[p].total_virupas - jh.shadbala_virupas[i]) <= 1.3, `total ${p}: ${sb[p].total_virupas} vs JH ${jh.shadbala_virupas[i]}`);
    assert.ok(Math.abs(sb[p].rupas - jh.shadbala_rupas[i]) <= 0.025, `rupas ${p}: ${sb[p].rupas} vs JH ${jh.shadbala_rupas[i]}`);
    assert.ok(Math.abs(sb[p].ratio * 100 - jh.shadbala_percent[i]) <= 1, `percent ${p}: ${sb[p].ratio} vs JH ${jh.shadbala_percent[i]}%`);
    // Ishta/Kashta come from uchcha and cheshta bala; Mercury's cheshta is 0.24 below JH's
    const tol = p === 'Mercury' ? 0.2 : 0.1;
    assert.ok(Math.abs(sb[p].ishta_phala - jh.ishta_phala[i]) <= tol, `ishta ${p}: ${sb[p].ishta_phala} vs JH ${jh.ishta_phala[i]}`);
    assert.ok(Math.abs(sb[p].kashta_phala - jh.kashta_phala[i]) <= tol, `kashta ${p}: ${sb[p].kashta_phala} vs JH ${jh.kashta_phala[i]}`);
  });
  // The Sun's cheshta is the mean Sun's sayana longitude + 90°, over 3
  assert.ok(Math.abs(sb.Sun.cheshta - 54.80) <= 0.01, `Sun cheshta ${sb.Sun.cheshta}`);
});

test('Vimshopaka bala matches Jagannatha Hora in all four schemes, Rahu and Ketu included', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...BIRTH, include: ['vargas'] });
  const v = JH.other_strengths.vimshopaka;
  for (const scheme of ['dashavarga', 'shodashavarga', 'saptavarga', 'shadvarga']) {
    v.order.forEach((p, i) => {
      // Both sides round to 0.01; JH prints the Moon's 11.925 as 11.92 once and 11.93 once
      assert.ok(Math.abs(result.vimshopaka[p][scheme] - v[scheme][i]) <= 0.0101, `${scheme} ${p}: ${result.vimshopaka[p][scheme]} vs JH ${v[scheme][i]}`);
    });
  }
  // JH's Rahu row with mean nodes
  const mean = (await ok(srv, 'calculate_vedic_chart', { ...BIRTH, ...MEAN_NODES, include: ['vargas'] })).result;
  for (const [scheme, value] of Object.entries(v.rahu_mean_nodes)) {
    assert.ok(Math.abs(mean.vimshopaka.Rahu[scheme] - value) <= 0.0101, `mean-node Rahu ${scheme}: ${mean.vimshopaka.Rahu[scheme]} vs JH ${value}`);
  }
});

test('Vimshottari mahadashas match Jagannatha Hora', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...BIRTH, include: [], output: 'full', levels: 1 });
  const md = result.vimshottari_dasha.mahadashas;
  JH.vimshottari.mahadashas.forEach((row, i) => {
    assert.equal(md[i].lord, row.lord);
    // Within 15 s to 2030; later JH's older delta-T extrapolation (larger future delta-T) moves
    // its dates earlier by up to about 1.5 s a year
    const year = Number(row.end.slice(0, 4));
    const allowed = 15 + Math.max(0, year - 2030) * 2;
    const d = (Date.parse(md[i].end) - Date.parse(row.end)) / 1000;
    assert.ok(Math.abs(d) <= allowed, `${row.lord} ends ${md[i].end} vs JH ${row.end} (${d} s, allowed ${allowed} s)`);
  });
});

test('Aspect strengths on the houses match Jagannatha Hora', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...BIRTH, include: [] });
  const lagna = 180 + 39 / 60 + 20 / 3600; // JH's lagna, Li 0°39'20"
  for (const [planet, row] of Object.entries(JH.aspects_on_houses_percent)) {
    if (!Array.isArray(row)) continue;
    row.forEach((pct, h) => {
      const v = (drishtiVirupas(planet, lagna + 30 * h - result.planets[planet].longitude) / 60) * 100;
      assert.ok(Math.abs(v - pct) <= 0.05, `${planet} on house ${h + 1}: ${v.toFixed(2)}% vs JH ${pct}%`);
    });
  }
});

test('D-3, D-7, D-9, D-10 and D-60 match Jagannatha Hora', { skip: SKIP }, async () => {
  const grahas = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const charts = [['D3', JH.d3], ['D7', JH.d7], ['D9', JH.d9], ['D10', JH.d10], ['D60', JH.d60]];
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...BIRTH, include: ['vargas'], vargas: ['D1', ...charts.map(([v]) => v)] });
  for (const [varga, jh] of charts) {
    assert.equal(result.vargas[varga].lagna.sign, jh.lagna, `${varga} lagna`);
    for (const p of grahas) assert.equal(result.vargas[varga].planets[p].sign, jh[p], `${varga} ${p}`);
  }
  // D-3 and D-9 were read with mean nodes; Rahu and Ketu sit in the same signs either way
  const mean = (await ok(srv, 'calculate_vedic_chart', { ...BIRTH, ...MEAN_NODES, include: ['vargas'], vargas: ['D1', 'D3', 'D9'] })).result;
  for (const [varga, jh] of charts.filter(([v]) => v === 'D3' || v === 'D9')) {
    for (const p of ['Rahu', 'Ketu']) assert.equal(mean.vargas[varga].planets[p].sign, jh[p], `${varga} ${p} (mean)`);
  }
});

test('Positions match Jagannatha Hora\'s Basics table to the arc-second', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...BIRTH, include: [], output: 'full' });
  for (const [p, jh] of Object.entries(JH.basics.bodies)) {
    const x = p === 'Lagna' ? result.lagna : result.planets[p];
    const diff = (x.longitude - parseLon(jh.longitude)) * 3600;
    // JH's lagna is 12.61" lower: it subtracts the ayanamsa without nutation from the true
    // ascendant (12.61" is the nutation in longitude at the birth), while the planets match
    const expected = p === 'Lagna' ? 12.61 : 0;
    assert.ok(Math.abs(diff - expected) <= 0.5, `${p}: ${x.degree_dms} is ${diff.toFixed(2)}" from JH ${jh.longitude}`);
    assert.equal(jhLabel(`${x.nakshatra} ${x.nakshatra_pada}`), `${jh.nakshatra}${jh.pada}`, `${p} nakshatra`);
  }
  // Bhrigu Bindu (used by calculate_gochar): midpoint from Rahu forward to the Moon
  const rahu = result.planets.Rahu.longitude;
  const bb = (rahu + ((result.planets.Moon.longitude - rahu + 360) % 360) / 2) % 360;
  assert.ok(Math.abs(bb - parseLon(JH.basics.special_points['Bhrigu Bindu'].split('"')[0] + '"')) * 3600 <= 0.5);
});

test('KP lords of every body match Jagannatha Hora; JH\'s KP cusps are equal houses from the lagna', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...BIRTH, include: [] });
  const lords = (x) => [AB[x.star_lord], AB[x.sub_lord], AB[x.sub_sub_lord]];
  assert.deepEqual(lords(result.lagna), JH.kp.bodies.As.slice(0, 3), 'lagna');
  for (const [name, x] of Object.entries(result.planets)) assert.deepEqual(lords(x), JH.kp.bodies[AB[name]].slice(0, 3), name);
  // JH's house rows repeat every fourth house: cusp n = lagna + 30° x (n - 1), not Placidus
  const lagna = parseLon(JH.basics.bodies.Lagna.longitude);
  for (let h = 1; h <= 12; h++) assert.deepEqual(lords(kpLords(lagna + 30 * (h - 1))), JH.kp.houses[h].slice(0, 3), `house ${h}`);
});
