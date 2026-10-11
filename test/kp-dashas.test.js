// KP ruling planets, significators, transit rectification and the other dasha systems on
// Sagar's chart. Values JH shows (KP lords, weekday) are compared directly; the rest is checked
// against the ephemeris or the classical rule that defines it.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { server, ok, SKIP, JH, SAGAR } from './helpers.js';
import { createEphemeris } from '../src/ephemeris.js';

const srv = server();
after(() => srv && srv.stop());
const TRADITIONAL_LAHIRI = { siderealFlag: '-sidudef2435553.5,23.245522528', positionFlag: ' -true' };
const AB = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };

test('Ruling planets at the birth moment are JH\'s KP lords and weekday', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_ruling_planets', { ...SAGAR, birth_datetime: SAGAR.datetime });
  const c = result.components;
  assert.equal(JH.key_info.vedic_weekday, 'Sunday');
  assert.equal(c.day_lord, 'Sun');
  // Lagna Libra, Moon Aquarius; star and sub lords from JH's KP tab
  assert.deepEqual([AB[c.lagna.sign_lord], AB[c.lagna.star_lord], AB[c.lagna.sub_lord]], ['Ve', ...JH.kp.bodies.As.slice(0, 2)]);
  assert.deepEqual([AB[c.moon.sign_lord], AB[c.moon.star_lord], AB[c.moon.sub_lord]], ['Sa', ...JH.kp.bodies.Mo.slice(0, 2)]);
  assert.equal(result.ruling_planets[0], 'Mars'); // lagna star lord first
  assert.ok(result.cleaned.every(p => !result.excluded.some(e => e.planet === p)));
  // Hour trigger: the Moon's sub lord against the running Vimshottari chain
  const t = result.hour_trigger;
  assert.equal(t.moon_sub_lord, c.moon.sub_lord);
  const chain = t.running_chain.split('-');
  assert.ok(t.moon_sub_lord_matches.length > 0);
  assert.equal(t.triggered, true);
  assert.ok(t.moon_sub_lord_matches.every(level => chain[['mahadasha', 'antardasha', 'pratyantardasha', 'sookshma', 'prana', 'deha'].indexOf(level)] === t.moon_sub_lord));
});

test('KP significators: four levels per planet and ordered cusp significators', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, include: ['kp_significators'] });
  const sig = result.kp_significators;
  // JH: the Moon is in Rahu's star (Satabhishak)
  assert.equal(AB[sig.planets.Moon.star_lord], JH.kp.bodies.Mo[0]);
  assert.equal(sig.planets.Moon.in_node_star, 'Rahu');
  assert.ok(sig.in_node_stars.includes('Moon'));
  for (const [p, x] of Object.entries(sig.planets)) {
    assert.deepEqual(x.houses, [...new Set([...x.A_star_lord_occupies, ...x.B_occupies, ...x.C_star_lord_owns, ...x.D_owns])].sort((a, b) => a - b), p);
  }
  for (let h = 1; h <= 12; h++) {
    const c = sig.cusps[h];
    assert.ok(c.D_owner.every(p => c.ordered.includes(p)), `cusp ${h}`);
    assert.deepEqual(c.ordered, [...new Set([...c.A_in_star_of_occupants, ...c.B_occupants, ...c.C_in_star_of_owner, ...c.D_owner])], `cusp ${h}`);
  }
});

test('rectify_by_transit puts the natal cusp on the transit planet', { skip: SKIP }, async () => {
  const anchors = [
    { as_of: '2025-12-01T12:00:00+05:30', planet: 'Saturn', target: 'cusp6' },
    { as_of: '2025-12-01T12:00:00+05:30', planet: 'Jupiter', target: 'cusp10' },
  ];
  const { result } = await ok(srv, 'rectify_by_transit', { ...SAGAR, window_seconds: 1800, anchors });
  const eph = createEphemeris();
  for (const [i, a] of result.anchors.entries()) {
    assert.equal(a.in_window, true, anchors[i].target);
    const cusps = eph.houses(new Date(a.birth_time), SAGAR.latitude, SAGAR.longitude, TRADITIONAL_LAHIRI).cusps;
    const transit = eph.grahas(new Date(anchors[i].as_of), TRADITIONAL_LAHIRI)[anchors[i].planet].lon;
    const cusp = Number(anchors[i].target.slice(4));
    const diff = Math.abs(((cusps[cusp] - transit + 540) % 360) - 180);
    assert.ok(diff < 0.01, `${anchors[i].target} off by ${diff}°`);
  }
  assert.equal(result.best_fit.anchors_used, 2);
  assert.ok(result.best_fit.spread_s > 0);
  const bad = await srv.call('rectify_by_transit', { ...SAGAR, anchors: [{ as_of: '2025-12-01', planet: 'Saturn', target: 'cusp13' }] });
  assert.equal(bad.parameter, 'anchors');
});

test('Yogini, Ashtottari, Chara and Narayana dashas', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, include: ['yogini', 'ashtottari', 'chara', 'narayana'], as_of: '2025-06-01T12:00:00+05:30', levels: 3 });
  // Shatabhisha (24th nakshatra): Yogini (24 + 3) mod 8 = 3, Dhanya (Jupiter); Ashtottari group
  // Dhanishta-Shatabhisha-Purva Bhadrapada, Jupiter
  assert.equal(result.yogini_dasha.balance_at_birth.yogini, 'Dhanya');
  assert.equal(result.yogini_dasha.balance_at_birth.lord, 'Jupiter');
  assert.equal(result.ashtottari_dasha.balance_at_birth.lord, 'Jupiter');
  // Rahu (Cancer) with the lagna lord Venus (Cancer); Krishna paksha day birth
  assert.equal(result.ashtottari_dasha.applicability.rahu_rule.rahu_house_from_lagna_lord, 1);
  assert.equal(result.ashtottari_dasha.applicability.paksha_rule.paksha, 'krishna');
  assert.equal(result.ashtottari_dasha.applicability.applicable, true);
  for (const d of ['yogini_dasha', 'ashtottari_dasha', 'chara_dasha', 'narayana_dasha']) {
    assert.equal(result[d].current.chain.split('-').length, 3, d);
    const md = result[d].current.mahadasha;
    assert.ok(md.ends_in && md.next, `${d} countdown`);
  }
  // Narayana starts from the stronger of the lagna (Li) and the 7th (Ar)
  assert.ok(['Li', 'Ar'].includes(result.narayana_dasha.first_sign));
  // Date lists and the Melbourne local time
  const list = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, include: ['yogini'], as_of: ['2010-01-01T12:00:00+05:30', '2026-10-11T12:00:00+05:30'] });
  assert.equal(list.result.yogini_dasha.chains.length, 2);
  const local = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, include: ['narayana'], current_timezone: 'Australia/Melbourne' });
  assert.match(local.result.narayana_dasha.mahadashas[0].end_local, /AE[SD]T/);
});

test('Yogini birth-time sweep with event tests', { skip: SKIP }, async () => {
  const { result: base } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, include: ['yogini'], as_of: '2026-10-11T12:00:00+05:30', levels: 2 });
  const expected = base.yogini_dasha.current.chain.split('-')[1];
  const { result } = await ok(srv, 'calculate_vedic_chart', {
    ...SAGAR, birth_time_sweep: { from_seconds: -600, to_seconds: 600, step_seconds: 10 }, sweep_dasha: 'yogini',
    as_of: ['2026-10-11T12:00:00+05:30'], levels: 2, event_tests: [{ id: 'y', as_of: '2026-10-11T12:00:00+05:30', level: 2, expect: [expected] }],
  });
  const t = result.event_tests.tests[0];
  assert.equal(t.system, 'yogini');
  assert.ok(t.windows.some(w => w.grid_from_s <= 0 && w.grid_to_s >= 0), JSON.stringify(t.windows));
});
