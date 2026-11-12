// Data 9 (Sagar, 1999-06-06 15:30:01 IST, Bhavnagar) against Jagannatha Hora
// (fixtures/jhora-data9.json and fixtures/jhora-data9-kalachakra.txt):
// Kalachakra down to deha (94 periods), positions, Rasi (D-1), Navamsa (D-9), Bhrigu Bindu and ayanamsa
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { server, ok, SKIP, JH, SAGAR } from './helpers.js';

const SIGN_AB = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];
// "21 Ta 26' 55.85\"" -> sidereal longitude in degrees
const parseLon = (text) => {
  const m = text.match(/^(\d+) (\w\w) (\d+)' ([\d.]+)"$/);
  return SIGN_AB.indexOf(m[2]) * 30 + Number(m[1]) + Number(m[3]) / 60 + Number(m[4]) / 3600;
};
const JH_PADA = ['Aswi', 'Bhar', 'Krit', 'Rohi', 'Mrig', 'Ardr', 'Puna', 'Push', 'Asre', 'Magh', 'PPha', 'UPha', 'Hast', 'Chit', 'Swat', 'Visa', 'Anu', 'Jye', 'Mool', 'PSha', 'USha', 'Srav', 'Dhan', 'Sata', 'PBha', 'UBha', 'Reva'];
const NAKSHATRAS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
const jhLabel = (pada) => { const m = pada.match(/^(.*) (\d)$/); return JH_PADA[NAKSHATRAS.indexOf(m[1])] + m[2]; };

const srv = server();
after(() => srv && srv.stop());

test('Kalachakra matches Jagannatha Hora Data 9 down to deha (94 periods, labels exact, times within a minute)', { skip: SKIP }, async () => {
  const groups = new Map();
  for (const row of JH.kalachakra.rows) {
    const key = JSON.stringify(row.parents);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  let worst = 0;
  for (const [key, rows] of groups) {
    const steps = JSON.parse(key);
    const r = await ok(srv, 'calculate_kalachakra_dasha', { datetime: JH.kalachakra.datetime, ...(steps.length ? { drill_down: steps } : {}), output: steps.length ? 'chain' : 'full', levels: 1 });
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

test('Data 9 Rasi (D-1) and Navamsa (D-9) signs match Jagannatha Hora for Lagna and all 9 grahas', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, ayanamsa: 'true_lahiri', include: ['vargas'], vargas: ['D1', 'D9'] });
  assert.equal(result.vargas.D1.lagna.sign, JH.bodies.Lagna.rasi, 'D1 Lagna');
  assert.equal(result.vargas.D9.lagna.sign, JH.bodies.Lagna.navamsa, 'D9 Lagna');
  for (const [name, jh] of Object.entries(JH.bodies)) {
    if (name === 'Lagna') continue;
    assert.equal(result.vargas.D1.planets[name].sign, jh.rasi, `D1 ${name}`);
    assert.equal(result.vargas.D9.planets[name].sign, jh.navamsa, `D9 ${name}`);
  }
});

test('Data 9 positions and Bhrigu Bindu match Jagannatha Hora\'s table under True Lahiri', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, ayanamsa: 'true_lahiri', include: [], output: 'full' });
  for (const [p, jh] of Object.entries(JH.bodies)) {
    const x = p === 'Lagna' ? result.lagna : result.planets[p];
    const diff = (x.longitude - parseLon(jh.longitude)) * 3600;
    // JH's lagna is 12.61" lower: it subtracts the ayanamsa without nutation from the true ascendant
    const expected = p === 'Lagna' ? 12.61 : 0;
    assert.ok(Math.abs(diff - expected) <= 0.5, `${p}: ${x.degree_dms} is ${diff.toFixed(2)}" from JH ${jh.longitude}`);
    assert.equal(jhLabel(`${x.nakshatra} ${x.nakshatra_pada}`), `${jh.nakshatra}${jh.pada}`, `${p} nakshatra`);
  }
  // Bhrigu Bindu (used by calculate_gochar): midpoint from Rahu forward to the Moon
  const rahu = result.planets.Rahu.longitude;
  const bb = (rahu + ((result.planets.Moon.longitude - rahu + 360) % 360) / 2) % 360;
  assert.ok(Math.abs(bb - parseLon(JH.special_points['Bhrigu Bindu'].split('"')[0] + '"')) * 3600 <= 0.5);
});
