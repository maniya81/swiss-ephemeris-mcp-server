// calculate_vedic_chart blocks against Jagannatha Hora and AstroSage reference charts
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { server, ok, SKIP, VARSHA, B0, estimateTokens } from './helpers.js';

const srv = server();
after(() => srv && srv.stop());

const SIGNS = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];
const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
// Sagar: 6 Jun 1999, Gujarat
const SAGAR_JH = { datetime: '1999-06-06T15:30:00+05:30', latitude: 21.7667, longitude: 72.15 };
const SAGAR_ASTROSAGE = { datetime: '1999-06-06T15:30:03+05:30', latitude: 22 + 10 / 60, longitude: 71 + 40 / 60, ayanamsa: 'lahiri' };

test('D-9 matches Jagannatha Hora (Sagar)', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR_JH, vargas: ['D1', 'D9', 'D60'], include: ['vargas'] });
  const d9 = result.vargas.D9;
  assert.equal(d9.lagna.sign, 'Li');
  const jh = { Sun: 'Cn', Moon: 'Cp', Mars: 'Li', Mercury: 'Sc', Jupiter: 'Ar', Venus: 'Vi', Saturn: 'Vi', Rahu: 'Cp', Ketu: 'Cn' };
  for (const [planet, sign] of Object.entries(jh)) assert.equal(d9.planets[planet].sign, sign, planet);
  // D-60: Parashara shashtiamsa with deity and nature
  assert.equal(result.vargas.D60.lagna.sign, 'Sc');
  assert.equal(result.vargas.D60.lagna.deity, 'Rakshasa');
  assert.equal(result.vargas.D60.lagna.nature, 'malefic');
  // lagna_sign_change brackets the birth time
  for (const c of Object.values(result.lagna_sign_change)) {
    assert.ok(c.earlier_s === null || c.earlier_s < 0);
    assert.ok(c.later_s === null || c.later_s > 0);
  }
});

test('Ashtakavarga with the BPHS tables: SAV 337 self-check and BAV as AstroSage (Sagar)', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR_ASTROSAGE, include: ['ashtakavarga'], shodhana: true, ashtakavarga_tables: 'bphs' });
  const av = result.ashtakavarga;
  assert.equal(av.sarvashtakavarga.total, 337);
  assert.equal(av.sav_self_check.passed, true);
  const astro = {
    Sun: [4, 4, 3, 4, 5, 2, 3, 5, 6, 5, 4, 3], Moon: [4, 1, 3, 5, 5, 3, 4, 5, 5, 3, 5, 6], Mars: [4, 2, 1, 5, 3, 2, 5, 3, 4, 3, 4, 3],
    Mercury: [4, 6, 2, 5, 4, 4, 6, 7, 2, 4, 4, 6], Jupiter: [5, 4, 6, 5, 6, 2, 5, 6, 3, 4, 4, 6], Venus: [4, 3, 4, 2, 6, 3, 4, 5, 6, 4, 7, 4],
    Saturn: [2, 3, 3, 3, 5, 3, 1, 2, 5, 2, 5, 5],
  };
  for (const [planet, row] of Object.entries(astro)) {
    assert.deepEqual(SIGNS.map(s => av.bhinnashtakavarga[planet][s]), row, planet);
  }
  assert.ok(av.shodhana.Sun.shodhya_pinda > 0);
});

test('Shadbala and Bhavabala with the Raman method against AstroSage (Sagar)', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR_ASTROSAGE, include: ['shadbala', 'bhavabala'], shadbala_method: 'raman' });
  const sb = result.shadbala.planets;
  // AstroSage components (virupas), Sun..Saturn
  const A = {
    uchcha: [46.19, 33.03, 20.88, 26.67, 29.08, 26.77, 0.73], ojayugma: [0, 15, 30, 15, 30, 30, 15], kendradi: [30, 30, 60, 15, 60, 60, 60],
    dig: [47.04, 46.07, 29.89, 21.62, 0.69, 2.12, 54.11], nathonnatha: [45.99, 14.01, 14.01, 60, 45.99, 45.99, 14.01],
    paksha: [26.88, 26.88, 26.88, 33.12, 33.12, 33.12, 26.88], tribhaga: [0, 0, 0, 0, 60, 0, 60],
    ayana: [117.87, 41.84, 17.96, 59.92, 42.79, 55.62, 10.51], drik: [-0.37, -4.34, 29.31, 3.73, -7.63, -12.36, -5.31],
  };
  const get = {
    uchcha: p => sb[p].sthana.uchcha, ojayugma: p => sb[p].sthana.ojayugma, kendradi: p => sb[p].sthana.kendradi, dig: p => sb[p].dig,
    nathonnatha: p => sb[p].kala.nathonnatha, paksha: p => sb[p].kala.paksha, tribhaga: p => sb[p].kala.tribhaga, ayana: p => sb[p].kala.ayana, drik: p => sb[p].drik,
  };
  for (const [part, values] of Object.entries(A)) {
    PLANETS.forEach((p, i) => assert.ok(Math.abs(get[part](p) - values[i]) <= 0.15, `${part} ${p}: ${get[part](p)} vs ${values[i]}`));
  }
  // Cheshta: within a virupa for all but Mercury
  const cheshta = [55.09, 33.12, 50.34, null, 42.96, 38.19, 10.71];
  PLANETS.forEach((p, i) => cheshta[i] !== null && assert.ok(Math.abs(sb[p].cheshta - cheshta[i]) <= 0.5, `cheshta ${p}`));
  // Totals where the year/month/hour lords agree with AstroSage
  const totals = { Moon: 373.29, Mars: 423.95, Jupiter: 453.75, Venus: 417.91, Saturn: 322.72 };
  for (const [p, v] of Object.entries(totals)) {
    assert.ok(Math.abs(sb[p].total_virupas - v) <= 1, `total ${p}`);
    assert.equal(sb[p].rupas, Math.round((sb[p].total_virupas / 60) * 100) / 100);
  }
  assert.equal(result.shadbala.kala_lords.hora, 'Mercury');
  // Bhavabala: dig and drishti per house
  const dig = [60, 10, 40, 0, 20, 40, 30, 40, 20, 0, 50, 50];
  const drishti = [95.39, 46.52, 57.29, 77.88, 14.27, 22.94, -5.51, -2.22, 10.14, 23, 37, 73.35];
  for (let h = 1; h <= 12; h++) {
    assert.equal(result.bhavabala[h].dig, dig[h - 1], `bhava dig ${h}`);
    assert.ok(Math.abs(result.bhavabala[h].drishti - drishti[h - 1]) <= 0.2, `bhava drishti ${h}`);
  }
});

test('Ishta and Kashta phala against Jagannatha Hora (Dhruvit)', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { datetime: '2001-06-09T06:30:45+05:30', latitude: 21 + 10 / 60, longitude: 72 + 49 / 60, include: ['shadbala'] });
  const jh = { Saturn: [5.41, 54.28], Jupiter: [7.16, 26.82], Moon: [29.99, 21.7], Mars: [48.19, 7.69] };
  for (const [p, [ishta, kashta]] of Object.entries(jh)) {
    assert.ok(Math.abs(result.shadbala.planets[p].ishta_phala - ishta) <= 0.25, `ishta ${p}`);
    assert.ok(Math.abs(result.shadbala.planets[p].kashta_phala - kashta) <= 0.25, `kashta ${p}`);
  }
});

test('Dignity, aspects and settings echo', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { datetime: B0, ...VARSHA, include: ['dignity', 'aspects'], rahu_ketu_aspects: '5_7_9_12' });
  assert.equal(result.dignity.Moon.exalted, true);
  assert.equal(typeof result.dignity.Venus.combust, 'boolean');
  assert.ok(result.dignity.Venus.combust_limit_deg > 0);
  assert.deepEqual(result.aspects.by_graha.Jupiter.aspects_houses.length, 3);
  assert.equal(result.aspects.by_graha.Rahu.aspects_houses.length, 4);
  assert.match(result.settings.aspects.rahu_ketu_aspects, /^5_7_9_12/);
  assert.equal(result.settings.dignity.rahu_exaltation, 'Ta');
});

test('Compact chart with every block stays under 3,000 tokens', { skip: SKIP }, async () => {
  for (const extra of [{}, { as_of: '2025-06-01T12:00:00+05:30' }]) {
    const { text, result } = await ok(srv, 'calculate_vedic_chart', { datetime: B0, ...VARSHA, include: 'all', kp_significators: true, output: 'chain', ...extra });
    assert.ok(estimateTokens(text) < 3000, `${text.length} chars, about ${estimateTokens(text)} tokens`);
    for (const block of ['dignity', 'vargas', 'aspects', 'ashtakavarga', 'shadbala', 'bhavabala', 'kp_significators', 'yogini_dasha', 'ashtottari_dasha', 'chara_dasha', 'narayana_dasha']) {
      assert.ok(result[block], `${block} missing`);
    }
  }
});

test('Errors are JSON with a reason and the parameter to fix', { skip: SKIP }, async () => {
  const bad = await srv.call('calculate_vedic_chart', { datetime: B0, ...VARSHA, vargas: ['D5'] });
  assert.equal(bad.parameter, 'vargas');
  assert.ok(bad.error.length > 10);
  const badRk = await srv.call('calculate_vedic_chart', { datetime: B0, ...VARSHA, rahu_ketu_aspects: 'all' });
  assert.equal(badRk.parameter, 'rahu_ketu_aspects');
});

test('Determinism: identical input gives identical output', { skip: SKIP }, async () => {
  const args = { datetime: B0, ...VARSHA, include: 'all', as_of: '2025-06-01T12:00:00+05:30' };
  const a = await ok(srv, 'calculate_vedic_chart', args);
  const b = await ok(srv, 'calculate_vedic_chart', args);
  assert.equal(a.text, b.text);
});
