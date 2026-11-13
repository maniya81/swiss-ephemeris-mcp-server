// Data 9 (Sagar, 1999-06-06 15:30:01 IST, Bhavnagar) against Jagannatha Hora
// (fixtures/jhora-data9.json and fixtures/jhora-data9-kalachakra.txt):
// Kalachakra down to deha (94 periods), positions, Rasi (D-1), Navamsa (D-9), Bhrigu Bindu and ayanamsa
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { server, ok, SKIP, JH, SAGAR, midpoint } from './helpers.js';

const JH_TRAD = JSON.parse(readFileSync(new URL('./fixtures/jhora-data9-traditional.json', import.meta.url)));
const LORD_ABBR = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };

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

test('Data 9 positions, KP lords (all 13 bodies), D-1/D-9 and Bhrigu Bindu match Jagannatha Hora under Traditional Lahiri (default)', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, include: ['vargas'], vargas: ['D1', 'D9'], output: 'full' });
  assert.equal(result.ayanamsa.name, 'Traditional Lahiri');
  for (const [p, jh] of Object.entries(JH_TRAD.bodies)) {
    const x = p === 'Lagna' ? result.lagna : result.planets[p];
    const diff = (x.longitude - parseLon(jh.longitude)) * 3600;
    const expected = p === 'Lagna' ? 12.61 : 0;
    assert.ok(Math.abs(diff - expected) <= 0.5, `${p}: ${x.degree_dms} is ${diff.toFixed(2)}" from JH ${jh.longitude}`);
    assert.equal(jhLabel(`${x.nakshatra} ${x.nakshatra_pada}`), `${jh.nakshatra}${jh.pada}`, `${p} nakshatra`);
    assert.deepEqual([LORD_ABBR[x.star_lord], LORD_ABBR[x.sub_lord], LORD_ABBR[x.sub_sub_lord]], jh.kp, `${p} KP lords`);
  }
  for (const [p, expectedKp] of Object.entries(JH_TRAD.outer_kp)) {
    const x = result.planets[p];
    assert.deepEqual([LORD_ABBR[x.star_lord], LORD_ABBR[x.sub_lord], LORD_ABBR[x.sub_sub_lord]], expectedKp, `${p} KP lords`);
  }
  assert.equal(result.vargas.D1.lagna.sign, JH_TRAD.bodies.Lagna.rasi, 'D1 Lagna');
  assert.equal(result.vargas.D9.lagna.sign, JH_TRAD.bodies.Lagna.navamsa, 'D9 Lagna');
  for (const [name, jh] of Object.entries(JH_TRAD.bodies)) {
    if (name === 'Lagna') continue;
    assert.equal(result.vargas.D1.planets[name].sign, jh.rasi, `D1 ${name}`);
    assert.equal(result.vargas.D9.planets[name].sign, jh.navamsa, `D9 ${name}`);
  }
  const rahu = result.planets.Rahu.longitude;
  const bb = (rahu + ((result.planets.Moon.longitude - rahu + 360) % 360) / 2) % 360;
  assert.ok(Math.abs(bb - parseLon(JH_TRAD.bhrigu_bindu)) * 3600 <= 0.5, 'Bhrigu Bindu');
  // All 12 Placidus cusps carry the same 12.61" JHora nutation offset as Lagna
  for (const [h, jhCusp] of Object.entries(JH_TRAD.placidus_cusps)) {
    const diff = (result.houses[h].longitude - parseLon(jhCusp)) * 3600;
    assert.ok(Math.abs(diff - 12.61) <= 0.5, `Cusp ${h}: ${result.houses[h].degree_dms} is ${diff.toFixed(2)}" from JH ${jhCusp}`);
  }
});

test('Data 9 Traditional Lahiri Vimshottari dasha matches Jagannatha Hora down to Deha (2018, 2028, 2093; 42 periods)', { skip: SKIP }, async () => {
  // Verify all 27 Deha chains in a single batch call at each Deha midpoint
  const dehaCases = JH_TRAD.vimshottari.flatMap((block) =>
    block.dehas.map((d) => ({
      as_of: midpoint(d),
      chain: [...block.lords, d.lord].join('-'),
    }))
  );
  const { result: batch } = await ok(srv, 'calculate_vedic_chart', {
    ...SAGAR,
    include: [],
    as_of: dehaCases.map((c) => c.as_of),
    levels: 6,
  });
  dehaCases.forEach((c, i) => {
    assert.equal(batch.vimshottari_dasha.chains[i].chain, c.chain, `Deha chain at ${c.as_of}`);
  });

  // Verify exact start/end timestamps across MD..Deha for each of the 3 blocks
  for (const block of JH_TRAD.vimshottari) {
    const { result } = await ok(srv, 'calculate_vedic_chart', {
      ...SAGAR,
      include: [],
      output: 'full',
      as_of: block.chain_at_midpoint,
      levels: 6,
    });
    const cur = result.vimshottari_dasha.current;
    // Periods through 2045 match within 60s (3s in 2018, 13s in 2028, 37s in 2045); 2089-2095 (~90y out) within 120s due to ΔT extrapolation
    const tol = (iso) => (Number(iso.slice(0, 4)) >= 2080 ? 120 : 60);
    for (const row of block.levels) {
      const got = cur[row.level];
      assert.equal(got.lord, row.lord, `${block.chain_at_midpoint} ${row.level}`);
      for (const k of ['start', 'end']) {
        const d = Math.abs(Date.parse(got[k]) - Date.parse(row[k])) / 1000;
        assert.ok(d <= tol(row[k]), `${row.level} ${row.lord} ${k}: ${got[k]} vs JH ${row[k]} (${d}s)`);
      }
    }
    // Check the active Deha at chain_at_midpoint
    const t = Date.parse(block.chain_at_midpoint);
    const activeDeha = block.dehas.find((d) => Date.parse(d.start) <= t && t < Date.parse(d.end));
    assert.equal(cur.deha.lord, activeDeha.lord);
    for (const k of ['start', 'end']) {
      const d = Math.abs(Date.parse(cur.deha[k]) - Date.parse(activeDeha[k])) / 1000;
      assert.ok(d <= tol(activeDeha[k]), `deha ${activeDeha.lord} ${k}: ${cur.deha[k]} vs JH ${activeDeha[k]} (${d}s)`);
    }
  }
});

test('Data 9 Traditional Lahiri Ashtakavarga (SAV + 8 BAVs), Vimshopaka and Shadbala match Jagannatha Hora', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', {
    ...SAGAR,
    include: ['vargas', 'ashtakavarga', 'shadbala'],
    vargas: 'all',
    output: 'full',
  });

  // 1. Ashtakavarga: SAV (12 signs + total) and all 8 BAVs (96 cells)
  assert.deepEqual(result.ashtakavarga.sarvashtakavarga, JH_TRAD.ashtakavarga.SAV, 'SAV');
  for (const body of ['Lagna', 'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) {
    const got = { ...result.ashtakavarga.bhinnashtakavarga[body] };
    delete got.total;
    assert.deepEqual(got, JH_TRAD.ashtakavarga[body], `${body} BAV`);
  }

  // 2. Vimshopaka: all 9 grahas x 4 varga schemes (36 scores within 0.02)
  for (const [body, expected] of Object.entries(JH_TRAD.vimshopaka)) {
    const got = result.vimshopaka[body];
    for (const scheme of ['shadvarga', 'saptavarga', 'dashavarga', 'shodashavarga']) {
      assert.ok(Math.abs(got[scheme] - expected[scheme]) <= 0.02, `${body} ${scheme}: ${got[scheme]} vs JH ${expected[scheme]}`);
    }
  }

  // 3. Shadbala: total virupas, rupas, % strength, IshtaPhala, KashtaPhala
  for (const [body, expected] of Object.entries(JH_TRAD.shadbala)) {
    const got = result.shadbala.planets[body];
    assert.ok(Math.abs(got.total_virupas - expected.virupas) <= 1.5, `${body} virupas: ${got.total_virupas} vs JH ${expected.virupas}`);
    assert.ok(Math.abs(got.rupas - expected.rupas) <= 0.03, `${body} rupas: ${got.rupas} vs JH ${expected.rupas}`);
    assert.ok(Math.abs(got.ishta_phala - expected.ishta) <= 0.2, `${body} ishta: ${got.ishta_phala} vs JH ${expected.ishta}`);
    assert.ok(Math.abs(got.kashta_phala - expected.kashta) <= 0.2, `${body} kashta: ${got.kashta_phala} vs JH ${expected.kashta}`);
  }
});

test('Data 9 Traditional Lahiri: Bhavabala and Divisional Charts (D-2 US, D-3, D-10, D-30)', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', {
    ...SAGAR,
    include: ['bhavabala', 'vargas'],
    vargas: ['D3', 'D10', 'D30'],
    output: 'full',
  });

  for (const [house, expected] of Object.entries(JH_TRAD.bhavabala)) {
    const got = result.bhavabala[house];
    assert.strictEqual(got.dig, expected.dig, `H${house} dig`);
    assert.ok(Math.abs(got.drishti - expected.drishti) <= 0.02, `H${house} drishti: ${got.drishti} vs JH ${expected.drishti}`);
    assert.ok(Math.abs(got.bhavadhipati - expected.lord_bala) <= 1.5, `H${house} lord_bala: ${got.bhavadhipati} vs JH ${expected.lord_bala}`);
    assert.ok(Math.abs(got.total_virupas - expected.virupas) <= 1.5, `H${house} virupas: ${got.total_virupas} vs JH ${expected.virupas}`);
    assert.ok(Math.abs(got.rupas - expected.rupas) <= 0.03, `H${house} rupas: ${got.rupas} vs JH ${expected.rupas}`);
  }

  for (const varga of ['D3', 'D10', 'D30']) {
    const expected = JH_TRAD.vargas[varga];
    assert.strictEqual(result.vargas[varga].lagna.sign, expected.Lagna, `${varga} Lagna`);
    for (const [body, sign] of Object.entries(expected)) {
      if (body === 'Lagna') continue;
      assert.strictEqual(result.vargas[varga].planets[body].sign, sign, `${varga} ${body}`);
    }
  }

  const { result: d2Result } = await ok(srv, 'calculate_vedic_chart', {
    ...SAGAR,
    include: ['vargas'],
    vargas: ['D2'],
    varga_method: { D2: 'pvr' },
    output: 'full',
  });
  assert.strictEqual(d2Result.vargas.D2.lagna.sign, JH_TRAD.vargas.D2_pvr.Lagna, 'D2 pvr Lagna');
  for (const [body, sign] of Object.entries(JH_TRAD.vargas.D2_pvr)) {
    if (body === 'Lagna') continue;
    assert.strictEqual(d2Result.vargas.D2.planets[body].sign, sign, `D2 pvr ${body}`);
  }
});

test('Data 9 True Lahiri: Vimshottari Dasha down to Pratyantardasha (2026-2029) and Deha (2038)', { skip: SKIP }, async () => {
  const midIso = (a, b) => new Date((Date.parse(a) + Date.parse(b)) / 2).toISOString();
  const assertWithinSec = (gotIso, expIso, maxSec, label) => {
    const diff = Math.abs(Date.parse(gotIso) - Date.parse(expIso)) / 1000;
    assert.ok(diff <= maxSec, `${label}: ${gotIso} vs JH ${expIso} (${diff.toFixed(1)}s > ${maxSec}s)`);
  };

  // 1. Batch midpoint checks across all 9 PDs in Sat-Sat (2026-2029) and all 9 Dehas in Sat-Moon-Ket-Sat-Sun (2038)
  const pdBlock = JH.vimshottari.sat_sat_2026_2029;
  const { result: pdBatch } = await ok(srv, 'calculate_vedic_chart', {
    ...SAGAR,
    ayanamsa: 'true_lahiri',
    include: [],
    as_of: pdBlock.pds.map(p => midIso(p.start, p.end)),
    levels: 3,
  });
  pdBlock.pds.forEach((pd, i) => {
    assert.strictEqual(pdBatch.vimshottari_dasha.chains[i].chain, `Saturn-Saturn-${pd.lord}`, `PD ${i} chain`);
  });

  const dehaBlock = JH.vimshottari.sat_moon_ket_sat_sun_2038;
  const { result: dehaBatch } = await ok(srv, 'calculate_vedic_chart', {
    ...SAGAR,
    ayanamsa: 'true_lahiri',
    include: [],
    as_of: dehaBlock.dehas.map(d => midIso(d.start, d.end)),
    levels: 6,
  });
  dehaBlock.dehas.forEach((deha, i) => {
    assert.strictEqual(dehaBatch.vimshottari_dasha.chains[i].chain, `Saturn-Moon-Ketu-Saturn-Sun-${deha.lord}`, `Deha ${i} chain`);
  });

  // 2. Full timestamp checks (within 35s for 2026-2038, within 60s for 2045 MD end — 37s ΔT delta)
  const tolSec = (iso) => (Number(iso.slice(0, 4)) >= 2045 ? 60 : 35);
  const { result: satSatRes } = await ok(srv, 'calculate_vedic_chart', {
    ...SAGAR,
    ayanamsa: 'true_lahiri',
    include: [],
    as_of: midIso(pdBlock.pds[0].start, pdBlock.pds[0].end),
    levels: 3,
    output: 'full',
  });
  const satCur = satSatRes.vimshottari_dasha.current;
  for (const [level, exp] of [['mahadasha', pdBlock.md], ['antardasha', pdBlock.ad], ['pratyantardasha', pdBlock.pds[0]]]) {
    assert.strictEqual(satCur[level].lord, exp.lord, `Sat-Sat-Sat ${level}`);
    assertWithinSec(satCur[level].start, exp.start, tolSec(exp.start), `Sat-Sat-Sat ${level} start`);
    assertWithinSec(satCur[level].end, exp.end, tolSec(exp.end), `Sat-Sat-Sat ${level} end`);
  }

  const jupDeha = dehaBlock.dehas[4]; // Jupiter Deha inside Sat-Moon-Ket-Sat-Sun
  const { result: dehaFullRes } = await ok(srv, 'calculate_vedic_chart', {
    ...SAGAR,
    ayanamsa: 'true_lahiri',
    include: [],
    as_of: midIso(jupDeha.start, jupDeha.end),
    levels: 6,
    output: 'full',
  });
  const dehaCur = dehaFullRes.vimshottari_dasha.current;
  const targets = [
    ['mahadasha', dehaBlock.md],
    ['antardasha', dehaBlock.ad],
    ['pratyantardasha', dehaBlock.pd],
    ['sookshma', dehaBlock.sd],
    ['praana', dehaBlock.pad],
    ['deha', jupDeha],
  ];
  for (const [level, exp] of targets) {
    assert.strictEqual(dehaCur[level].lord, exp.lord, `2038 Jup deha ${level}`);
    assertWithinSec(dehaCur[level].start, exp.start, tolSec(exp.start), `2038 Jup deha ${level} start`);
    assertWithinSec(dehaCur[level].end, exp.end, tolSec(exp.end), `2038 Jup deha ${level} end`);
  }
});
