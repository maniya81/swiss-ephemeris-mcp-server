// calculate_gochar on Sagar's chart: Saturn states with retrograde re-entries, bala, natal hits
// and searches. Timestamps are checked against the ephemeris rather than frozen.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { server, ok, SKIP, SAGAR } from './helpers.js';
import { createEphemeris } from '../src/ephemeris.js';
import { taraBala } from '../src/gochar.js';
import { NAKSHATRAS } from '../src/constants.js';

const srv = server();
after(() => srv && srv.stop());
const TRADITIONAL_LAHIRI = { siderealFlag: '-sidudef2435553.5,23.245522528', positionFlag: ' -true' };
const eph = createEphemeris();
const saturnSign = (ms) => Math.floor(eph.longitude('Saturn', new Date(ms), TRADITIONAL_LAHIRI).lon / 30);

test('Sade Sati for the Aquarius Moon includes Saturn\'s retrograde re-entries', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_gochar', { ...SAGAR, as_of: '2025-06-01T12:00:00+05:30' });
  // Jagannatha Hora: Moon in Satabhishak
  assert.equal(result.natal.janma_nakshatra, 'Shatabhisha');
  assert.match(result.natal.moon, /^Aq /);
  const ss = result.saturn.sade_sati;
  assert.equal(ss.active, true);
  assert.equal(ss.phase, 'setting');
  const spans = ss.episode.spans;
  assert.deepEqual(spans.map(s => s.phase), ['rising', 'peak', 'rising', 'peak', 'setting', 'setting']);
  assert.deepEqual(spans.map(s => s.sign), ['Cp', 'Aq', 'Cp', 'Aq', 'Pi', 'Pi']);
  // Each span is Saturn in that sign: one second inside its start, one second before its end
  const SIGN = { Cp: 9, Aq: 10, Pi: 11 };
  for (const s of spans) {
    assert.equal(saturnSign(Date.parse(s.start) + 1500), SIGN[s.sign], `${s.sign} from ${s.start}`);
    assert.equal(saturnSign(Date.parse(s.end) - 1500), SIGN[s.sign], `${s.sign} to ${s.end}`);
  }
  assert.equal(result.positions.Saturn.house_from_moon, 2);
});

test('Span boundaries are Saturn sign ingresses accurate to a second', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_gochar', { ...SAGAR, as_of: '2025-06-01T12:00:00+05:30', from: '2019-06-01', to: '2028-12-31', search_planets: ['Saturn'], search_events: ['sign'] });
  const ingresses = result.range.events.map(e => e.at);
  const spans = result.range.saturn_episodes.sade_sati[0].spans;
  for (const s of spans) {
    assert.ok(ingresses.includes(s.start), `span start ${s.start} is an ingress`);
    assert.ok(ingresses.includes(s.end), `span end ${s.end} is an ingress`);
  }
  // Saturn straddles the sign boundary 1.5 s either side of each ingress
  for (const at of ingresses) {
    const t = Date.parse(at);
    assert.notEqual(saturnSign(t - 1500), saturnSign(t + 1500), at);
  }
});

test('Tara bala, chandra bala and natal hits', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_gochar', { ...SAGAR, as_of: '2025-06-01T12:00:00+05:30' });
  // Tara counted from Shatabhisha to the transit Moon's nakshatra
  const natalMoon = 10 * 30 + 12 + 5 / 60;
  const expected = taraBala(natalMoon, result.positions.Moon.longitude);
  assert.equal(result.tara_bala.tara, expected.tara);
  assert.equal(result.tara_bala.transit_nakshatra, result.positions.Moon.nakshatra);
  assert.equal(NAKSHATRAS.indexOf(result.tara_bala.janma_nakshatra), 23);
  assert.equal(result.chandra_bala.house_from_moon, result.positions.Moon.house_from_moon);
  assert.ok(Date.parse(result.tara_bala.until) > Date.parse(result.as_of));
  // Saturn crosses the natal Moon twice in 2023 (direct, then retrograde)
  const hits = (await ok(srv, 'calculate_gochar', { ...SAGAR, as_of: '2023-06-01T12:00:00+05:30' })).result.natal_hits;
  const hit = hits.find(h => h.planet === 'Saturn' && h.target === 'natal Moon');
  assert.ok(hit, 'Saturn on the natal Moon');
  assert.equal(hit.exact.length, 2);
  const chart = (await ok(srv, 'calculate_vedic_chart', { ...SAGAR, include: [] })).result;
  for (const at of hit.exact) {
    const lon = eph.longitude('Saturn', new Date(at), TRADITIONAL_LAHIRI).lon;
    assert.ok(Math.abs(lon - chart.planets.Moon.longitude) < 0.001, `${at}: Saturn ${lon}`);
  }
});

test('Date lists are compact; long searches are truncated with a hint', { skip: SKIP }, async () => {
  const dates = Array.from({ length: 12 }, (_, i) => `${2020 + i}-03-01T12:00:00+05:30`);
  const list = await ok(srv, 'calculate_gochar', { ...SAGAR, as_of: dates });
  assert.equal(list.result.dates.length, 12);
  assert.ok(list.result.saturn_episodes.sade_sati.length >= 1);
  const big = await ok(srv, 'calculate_gochar', { ...SAGAR, from: '2000-01-01', to: '2030-12-31', search_planets: ['Moon'] });
  assert.equal(big.result.range.truncated, true);
  assert.match(big.result.range.narrow_with, /Narrow/);
  assert.ok(big.size < 90000);
  const bad = await srv.call('calculate_gochar', { ...SAGAR, from: '2025-01-01' });
  assert.equal(bad.parameter, 'to');
});
