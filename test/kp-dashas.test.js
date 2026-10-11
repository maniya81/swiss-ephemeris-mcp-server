// KP ruling planets, hour trigger, transit rectification and the other dasha systems
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { server, ok, SKIP, VARSHA, B0 } from './helpers.js';
import { createEphemeris } from '../src/ephemeris.js';

const srv = server();
after(() => srv && srv.stop());
const TRADITIONAL_LAHIRI = { siderealFlag: '-sidudef2435553.5,23.245522528', positionFlag: ' -true' };

test('Ruling planets and the hour trigger', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_ruling_planets', { datetime: '2025-06-01T10:15:30+05:30', ...VARSHA, birth_datetime: B0 });
  assert.equal(result.components.day_lord, 'Sun');
  assert.deepEqual(result.components.moon, { sign_lord: 'Moon', star_lord: 'Mercury', sub_lord: 'Mars' });
  assert.deepEqual(result.components.lagna, { sign_lord: 'Moon', star_lord: 'Saturn', sub_lord: 'Rahu' });
  assert.equal(result.ruling_planets[0], 'Saturn');
  assert.ok(result.cleaned.every(p => !result.excluded.some(e => e.planet === p)));
  assert.equal(result.hour_trigger.moon_sub_lord, 'Mars');
  assert.deepEqual(result.hour_trigger.moon_sub_lord_matches, ['antardasha']);
  assert.equal(result.hour_trigger.triggered, true);
});

test('KP significators: four levels per planet and ordered cusp significators', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { datetime: B0, ...VARSHA, include: ['kp_significators'] });
  const sig = result.kp_significators;
  assert.deepEqual(sig.planets.Moon.B_occupies, [10]);
  assert.equal(sig.planets.Mars.in_node_star, 'Rahu');
  assert.deepEqual(sig.cusps[10].ordered, ['Moon', 'Mars']);
  assert.deepEqual(sig.in_node_stars, ['Mars', 'Ketu']);
});

test('rectify_by_transit puts the natal cusp on the transit planet', { skip: SKIP }, async () => {
  const anchors = [
    { as_of: '2023-02-27T12:00:00+05:30', planet: 'Rahu', target: 'cusp10' },
    { as_of: '2022-01-10T09:00:00+05:30', planet: 'Saturn', target: 'cusp7' },
  ];
  const { result } = await ok(srv, 'rectify_by_transit', { datetime: B0, ...VARSHA, window_seconds: 1800, anchors });
  const [rahu] = result.anchors;
  assert.equal(rahu.in_window, true);
  const eph = createEphemeris();
  const cusps = eph.houses(new Date(rahu.birth_time), VARSHA.latitude, VARSHA.longitude, TRADITIONAL_LAHIRI).cusps;
  const transit = eph.grahas(new Date(anchors[0].as_of), TRADITIONAL_LAHIRI).Rahu.lon;
  const diff = Math.abs(((cusps[10] - transit + 540) % 360) - 180);
  assert.ok(diff < 0.01, `cusp10 off by ${diff}°`);
  assert.equal(result.best_fit.anchors_used, 2);
  assert.ok(result.best_fit.spread_s > 0);
  const bad = await srv.call('rectify_by_transit', { datetime: B0, ...VARSHA, anchors: [{ as_of: '2023-02-27', planet: 'Rahu', target: 'cusp13' }] });
  assert.equal(bad.parameter, 'anchors');
});

test('Yogini, Ashtottari, Chara and Narayana dashas', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { datetime: B0, ...VARSHA, include: ['yogini', 'ashtottari', 'chara', 'narayana'], as_of: '2025-06-01T12:00:00+05:30', levels: 3 });
  assert.deepEqual(result.yogini_dasha.balance_at_birth, { yogini: 'Siddha', lord: 'Venus', years: 5.1142 });
  assert.equal(result.yogini_dasha.current.chain, 'Sankata-Bhadrika-Sankata');
  assert.equal(result.ashtottari_dasha.applicability.applicable, true);
  assert.equal(result.ashtottari_dasha.applicability.rahu_rule.rahu_house_from_lagna_lord, 4);
  assert.equal(result.ashtottari_dasha.balance_at_birth.lord, 'Venus');
  assert.equal(result.ashtottari_dasha.current.chain, 'Mercury-Jupiter-Jupiter');
  assert.equal(result.chara_dasha.current.chain.split('-').length, 3);
  assert.equal(result.narayana_dasha.first_sign, 'Cn');
  for (const d of ['yogini_dasha', 'ashtottari_dasha', 'chara_dasha', 'narayana_dasha']) {
    const md = result[d].current.mahadasha;
    assert.ok(md.ends_in && md.next, `${d} countdown`);
  }
  // Date lists and the Melbourne local time
  const list = await ok(srv, 'calculate_vedic_chart', { datetime: B0, ...VARSHA, include: ['yogini'], as_of: ['2001-06-09T06:30:45+05:30', '2023-02-27T12:00:00+05:30'], current_timezone: 'Australia/Melbourne' });
  assert.equal(list.result.yogini_dasha.chains.length, 2);
  const local = await ok(srv, 'calculate_vedic_chart', { datetime: B0, ...VARSHA, include: ['narayana'], current_timezone: 'Australia/Melbourne' });
  assert.match(local.result.narayana_dasha.mahadashas[0].end_local, /AE[SD]T/);
});

test('Yogini birth-time sweep with event tests', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', {
    datetime: B0, ...VARSHA, birth_time_sweep: { from_seconds: -600, to_seconds: 600, step_seconds: 10 }, sweep_dasha: 'yogini',
    as_of: ['2023-02-27T12:00:00+05:30'], levels: 2, event_tests: [{ id: 'y', as_of: '2023-02-27T12:00:00+05:30', level: 2, expect: ['Pingala'] }],
  });
  assert.equal(result.event_tests.tests[0].system, 'yogini');
  assert.ok(result.event_tests.tests[0].windows.length >= 1);
});
