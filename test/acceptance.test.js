// Section 6 acceptance tests T1-T8 (current outputs that must not change)
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { server, ok, SKIP, VARSHA, B0, B5 } from './helpers.js';

const srv = server();
after(() => srv && srv.stop());

test('T1 Lahiri chart 05:25:00: lagna and Moon', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { datetime: B0, ...VARSHA, ayanamsa: 'lahiri', include: [] });
  assert.equal(result.lagna.sign, 'Cancer');
  assert.equal(result.lagna.degree_dms, '15°46\'05"');
  assert.equal(result.lagna.nakshatra, 'Pushya');
  assert.equal(result.lagna.nakshatra_pada, 4);
  assert.equal(result.lagna.sub_lord, 'Jupiter');
  assert.equal(result.planets.Moon.sign, 'Taurus');
  assert.equal(result.planets.Moon.degree_dms, '13°35\'31"');
  assert.equal(result.planets.Moon.nakshatra, 'Rohini');
  assert.equal(result.planets.Moon.nakshatra_pada, 2);
});

test('T2 Kalachakra 05:25:00', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_kalachakra_dasha', { datetime: B0 });
  assert.equal(result.direction, 'Apasavya');
  assert.equal(result.paramayush, 83);
  assert.match(String(result.deha), /^Li|Libra/);
  assert.match(String(result.jiva), /^Vi|Virgo/);
  assert.equal(result.mahadashas.find(m => m.sign_abbr === 'Sg').start, '2023-03-05T09:38:00+05:30');
});

test('T3 Kalachakra 05:25:05: Sg MD and sensitivity', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_kalachakra_dasha', { datetime: B5 });
  assert.equal(result.mahadashas.find(m => m.sign_abbr === 'Sg').start, '2023-02-26T17:35:42+05:30');
  assert.equal(result.birth_time_sensitivity.kalachakra_days_per_birth_second, 1.3581);
  assert.equal(result.birth_time_sensitivity.vimshottari_days_per_birth_second, 0.0409);
});

test('T4 Kalachakra 05:25:05 chain on 2001-06-09', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_kalachakra_dasha', { datetime: B5, as_of: '2001-06-09T06:30:45+05:30', output: 'chain', levels: 4 });
  assert.equal(result.current.chain, 'Sc-Ta-Li-Sc');
});

test('T5 Kalachakra 05:25:05 Simhavalokana jumps', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_kalachakra_dasha', { datetime: B5 });
  const md = (s) => result.mahadashas.find(m => m.sign_abbr === s);
  const cpPi = md('Cp').antardashas.find(a => a.sign_abbr === 'Pi');
  assert.equal(cpPi.gati, 'Simhavalokana');
  assert.equal(cpPi.start, '2022-04-23T01:27:33+05:30');
  assert.equal(cpPi.end, '2022-10-15T16:50:53+05:30');
  const aqSg = md('Aq').antardashas.find(a => a.sign_abbr === 'Sg');
  assert.equal(aqSg.gati, 'Simhavalokana');
  assert.equal(aqSg.start, '2016-09-15T08:40:38+05:30');
  assert.equal(aqSg.end, '2017-03-06T20:05:07+05:30');
  assert.equal(md('Pi').gati, 'Simhavalokana');
  assert.equal(md('Pi').start, '2005-02-26T02:43:14+05:30');
});

test('T6 Vimshottari (Traditional Lahiri) 05:25:00', { skip: SKIP }, async () => {
  const full = (await ok(srv, 'calculate_vedic_chart', { datetime: B0, ...VARSHA, include: [] })).result;
  assert.equal(full.vimshottari_dasha.mahadashas.find(m => m.lord === 'Moon').end, '1986-12-05T11:33:43+05:30');
  const chain = (await ok(srv, 'calculate_vedic_chart', { datetime: B0, ...VARSHA, include: [], as_of: '1998-02-01T11:00:00+05:30', levels: 4 })).result;
  assert.equal(chain.vimshottari_dasha.current.chain, 'Rahu-Jupiter-Venus-Saturn');
});

test('T7 Vimshottari kp_old 05:25:05 on 2023-07-31', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_vedic_chart', { datetime: B5, ...VARSHA, ayanamsa: 'kp_old', as_of: '2023-07-31T12:00:00+05:30', output: 'chain', levels: 4, include: [] });
  assert.equal(result.vimshottari_dasha.current.chain, 'Jupiter-Moon-Jupiter-Jupiter');
});

// T8 was recorded with the sub-period rule used before 1.1.0 (direction compared with the Moon's
// pada). Jagannatha Hora compares each period with its parent (the default now, see
// jhora.test.js), which changes Varsha's pratyantardashas inside the savya Sg mahadasha.
test('T8 Kalachakra sweep event tests intersect to +4.65 s ... +5.60 s (subperiod_direction "natal")', { skip: SKIP }, async () => {
  const D = (d) => `${d}+05:30`;
  const dates = ['1998-02-01T11:00:00', '1999-06-06T15:29:55', '2001-06-09T06:30:45', '2020-07-15T19:18:00', '2022-01-10T09:00:00', '2022-01-16T12:00:00', '2022-03-06T12:00:00', '2022-05-28T12:00:00', '2023-01-07T12:00:00', '2023-02-27T12:00:00', '2023-06-18T12:00:00', '2023-07-31T12:00:00', '2024-10-08T12:00:00', '2025-02-01T12:00:00', '2025-05-26T12:00:00', '2025-08-18T12:00:00', '2025-12-14T19:00:00', '2025-12-20T09:20:00', '2025-12-31T23:45:00', '2026-05-07T12:00:00', '2026-05-28T09:00:00', '2026-05-29T12:00:00', '2026-06-28T23:00:00'].map(D);
  const tests = [
    ['vehicle_pd', '2025-02-01T12:00:00', 3, ['Li']], ['vehicle_sd', '2025-02-01T12:00:00', 4, ['Li']],
    ['property', '2023-06-18T12:00:00', 3, ['Li']], ['registration', '2023-07-31T12:00:00', 3, ['Vi']],
    ['dhruvit_job', '2025-05-26T12:00:00', 3, ['Sc']], ['sagar_engagement', '2025-08-18T12:00:00', 3, ['Pi']],
    ['us_offer', '2026-05-29T12:00:00', 3, ['Li']], ['husband_business', '2026-05-07T12:00:00', 3, ['Li']],
    ['jail', '2022-01-10T09:00:00', 2, ['Sc']], ['mother_in_law', '2026-06-28T23:00:00', 2, ['Vi']],
    ['bike_slip', '2026-05-28T09:00:00', 2, ['Li']], ['sagar_wedding', '2025-12-14T19:00:00', 3, ['Sg']],
    ['dhruvit_birth', '2001-06-09T06:30:45', 4, ['Sc']], ['melbourne', '2023-02-27T12:00:00', 1, ['Sg']],
  ].map(([id, d, level, expect]) => ({ id, as_of: D(d), system: 'kalachakra', level, expect }));
  const { result, size } = await ok(srv, 'calculate_kalachakra_dasha', { datetime: B0, as_of: dates, levels: 4, birth_time_sweep: { from_seconds: -4, to_seconds: 7, step_seconds: 0.05 }, event_tests: tests, subperiod_direction: 'natal' });
  const [w] = result.event_tests.intersection;
  assert.equal(result.event_tests.intersection.length, 1);
  assert.equal(w.grid_from_s, 4.65);
  assert.equal(w.grid_to_s, 5.6);
  assert.ok(size < 87000, `sweep output ${size} chars`);
});
