// calculate_vedic_chart blocks on Sagar's chart: alternative methods, dignity, aspects, compact
// size, errors and determinism (JH's own values are in jhora.test.js)
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { server, ok, SKIP, SAGAR, estimateTokens } from './helpers.js';

const srv = server();
after(() => srv && srv.stop());

const SIGNS = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];
const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const sum = (o) => Object.entries(o).filter(([k]) => k !== 'total').reduce((a, [, v]) => a + v, 0);

test('Vargas: D-60 deities and lagna_sign_change', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, vargas: ['D1', 'D9', 'D60'], include: ['vargas'] });
  for (const x of [result.vargas.D60.lagna, ...Object.values(result.vargas.D60.planets)]) {
    assert.ok(x.deity && ['benefic', 'malefic'].includes(x.nature), JSON.stringify(x));
  }
  // JH's D-1 and D-9: the lagna (Li), Mars (Li) and Jupiter (Ar) are vargottama
  assert.deepEqual(result.vargottama, ['Lagna', 'Mars', 'Jupiter']);
  // lagna_sign_change brackets the birth time
  for (const c of Object.values(result.lagna_sign_change)) {
    assert.ok(c.earlier_s === null || c.earlier_s < 0);
    assert.ok(c.later_s === null || c.later_s > 0);
  }
  assert.match(result.settings.vimshopaka, /^jh/);
});

test('Ashtakavarga with the BPHS tables differs from JH only in the Moon\'s and Venus\'s BAV', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, include: ['ashtakavarga'], shodhana: true, ashtakavarga_tables: 'bphs' });
  const av = result.ashtakavarga;
  assert.equal(av.sarvashtakavarga.total, 337);
  assert.equal(av.sav_self_check.passed, true);
  const jh = (await ok(srv, 'calculate_vedic_chart', { ...SAGAR, include: ['ashtakavarga'] })).result.ashtakavarga;
  for (const p of PLANETS) {
    const a = SIGNS.map(s => av.bhinnashtakavarga[p][s]);
    const b = SIGNS.map(s => jh.bhinnashtakavarga[p][s]);
    assert.equal(a.reduce((x, y) => x + y), b.reduce((x, y) => x + y), `${p} total`);
    if (p !== 'Moon' && p !== 'Venus') assert.deepEqual(a, b, p);
  }
  assert.ok(av.shodhana.Sun.shodhya_pinda > 0);
});

test('Shadbala with the Raman method: parts add up and differ from JH\'s where documented', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, include: ['shadbala', 'bhavabala'], shadbala_method: 'raman' });
  const jh = (await ok(srv, 'calculate_vedic_chart', { ...SAGAR, include: ['shadbala'] })).result.shadbala.planets;
  const sb = result.shadbala.planets;
  for (const p of PLANETS) {
    const x = sb[p];
    assert.ok(Math.abs(sum(x.sthana) - x.sthana.total) < 0.05 && Math.abs(sum(x.kala) - x.kala.total) < 0.05, p);
    // Raman counts every planet's cheshta bala
    const total = x.sthana.total + x.dig + x.kala.total + x.cheshta + x.naisargika + x.drik;
    assert.ok(Math.abs(total - x.total_virupas) < 0.05, `${p} total`);
    assert.equal(x.cheshta_in_total, undefined);
    assert.equal(x.rupas, Math.round((x.total_virupas / 60) * 100) / 100);
  }
  // Krishna paksha: JH gives the Moon twice the benefic paksha bala (Jupiter's); Raman treats the
  // waning Moon as a malefic
  assert.ok(Math.abs(jh.Moon.kala.paksha - 2 * jh.Jupiter.kala.paksha) < 0.05);
  assert.ok(Math.abs(sb.Moon.kala.paksha - (60 - sb.Jupiter.kala.paksha)) < 0.05);
  assert.equal(jh.Sun.cheshta_in_total, false);
  assert.match(result.settings.shadbala.method, /^raman/);
  for (let h = 1; h <= 12; h++) assert.ok(Number.isFinite(result.bhavabala[h].total_virupas ?? result.bhavabala[h].total), `bhava ${h}`);
});

test('True nodes by default, mean nodes on request: only Rahu/Ketu results change', { skip: SKIP }, async () => {
  const args = { ...SAGAR, include: ['vargas', 'shadbala', 'ashtakavarga'], vargas: 'all', levels: 6, as_of: '2026-10-11T12:00:00+05:30' };
  const t = (await ok(srv, 'calculate_vedic_chart', args)).result;
  const m = (await ok(srv, 'calculate_vedic_chart', { ...args, node_type: 'mean' })).result;
  assert.equal(t.settings.nodes, 'true');
  assert.equal(m.settings.nodes, 'mean');
  // The true node oscillates about the mean one by up to about 1.7°; Ketu is opposite Rahu in both
  const d = t.planets.Rahu.longitude - m.planets.Rahu.longitude;
  assert.ok(Math.abs(d) > 0.01 && Math.abs(d) < 2, `true - mean ${d}°`);
  for (const r of [t, m]) assert.ok(Math.abs(((r.planets.Ketu.longitude - r.planets.Rahu.longitude + 360) % 360) - 180) < 1e-6);
  // Nothing that the seven planets or the Moon alone decide moves
  for (const p of PLANETS) {
    assert.equal(t.planets[p].longitude, m.planets[p].longitude, p);
    assert.deepEqual(t.vimshopaka[p], m.vimshopaka[p], `vimshopaka ${p}`);
    assert.equal(t.shadbala.planets[p].total_virupas, m.shadbala.planets[p].total_virupas, `shadbala ${p}`);
  }
  assert.deepEqual(t.ashtakavarga.sarvashtakavarga, m.ashtakavarga.sarvashtakavarga);
  assert.equal(t.vimshottari_dasha.current.chain, m.vimshottari_dasha.current.chain);
  assert.equal(t.kalachakra_dasha.current.chain, m.kalachakra_dasha.current.chain);
  // Rahu's and Ketu's Vimshopaka do move: 1.4° separates the two nodes in several finer vargas
  assert.notDeepEqual(t.vimshopaka.Rahu, m.vimshopaka.Rahu);
  assert.notDeepEqual(t.vimshopaka.Ketu, m.vimshopaka.Ketu);
});

test('Dignity, aspects and settings echo', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, include: ['dignity', 'aspects'], rahu_ketu_aspects: '5_7_9_12' });
  // Mercury in Gemini, 13.57° from the Sun: own sign and combust (limit 14°)
  assert.equal(result.dignity.Mercury.own_sign, true);
  assert.equal(result.dignity.Mercury.combust, true);
  assert.equal(result.dignity.Mercury.combust_limit_deg, 14);
  assert.ok(Math.abs(result.dignity.Mercury.combust_orb_deg - (result.planets.Mercury.longitude - result.planets.Sun.longitude)) < 0.01);
  assert.deepEqual(result.aspects.by_graha.Jupiter.aspects_houses.length, 3);
  assert.equal(result.aspects.by_graha.Rahu.aspects_houses.length, 4);
  assert.match(result.settings.aspects.rahu_ketu_aspects, /^5_7_9_12/);
  assert.equal(result.settings.dignity.rahu_exaltation, 'Ta');
});

test('Compact chart with every block stays under 3,000 tokens', { skip: SKIP }, async () => {
  for (const extra of [{}, { as_of: '2025-06-01T12:00:00+05:30' }]) {
    const { text, result } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, include: 'all', kp_significators: true, output: 'chain', ...extra });
    assert.ok(estimateTokens(text) < 3000, `${text.length} chars, about ${estimateTokens(text)} tokens`);
    for (const block of ['dignity', 'vargas', 'aspects', 'ashtakavarga', 'shadbala', 'bhavabala', 'kp_significators', 'yogini_dasha', 'ashtottari_dasha', 'chara_dasha', 'narayana_dasha']) {
      assert.ok(result[block], `${block} missing`);
    }
  }
});

test('Errors are JSON with a reason and the parameter to fix', { skip: SKIP }, async () => {
  const bad = await srv.call('calculate_vedic_chart', { ...SAGAR, vargas: ['D5'] });
  assert.equal(bad.parameter, 'vargas');
  assert.ok(bad.error.length > 10);
  const badRk = await srv.call('calculate_vedic_chart', { ...SAGAR, rahu_ketu_aspects: 'all' });
  assert.equal(badRk.parameter, 'rahu_ketu_aspects');
});

test('Determinism: identical input gives identical output', { skip: SKIP }, async () => {
  const args = { ...SAGAR, include: 'all', as_of: '2025-06-01T12:00:00+05:30' };
  const a = await ok(srv, 'calculate_vedic_chart', args);
  const b = await ok(srv, 'calculate_vedic_chart', args);
  assert.equal(a.text, b.text);
});
