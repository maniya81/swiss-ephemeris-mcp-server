// calculate_gochar: Saturn states with retrograde re-entries, bala, natal hits and searches
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { server, ok, SKIP, VARSHA, B0 } from './helpers.js';
import { createEphemeris } from '../src/ephemeris.js';

const srv = server();
after(() => srv && srv.stop());
const base = { datetime: B0, ...VARSHA };
const TRADITIONAL_LAHIRI = { siderealFlag: '-sidudef2435553.5,23.245522528', positionFlag: ' -true' };

test('Sade Sati spans include retrograde re-entries (Taurus Moon)', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_gochar', { ...base, as_of: '2025-06-01T12:00:00+05:30' });
  assert.equal(result.natal.janma_nakshatra, 'Rohini');
  const ss = result.saturn.sade_sati;
  assert.equal(ss.active, false);
  assert.equal(ss.previous_end, '2005-05-26T06:01:56+05:30');
  const e = ss.next_episode;
  assert.equal(e.start, '2027-06-03T04:04:25+05:30');
  assert.equal(e.end, '2034-07-13T02:59:15+05:30');
  assert.deepEqual(e.spans.map(s => s.phase), ['rising', 'rising', 'peak', 'rising', 'peak', 'setting']);
  assert.deepEqual(e.spans.map(s => s.sign), ['Ar', 'Ar', 'Ta', 'Ar', 'Ta', 'Ge']);
  // Saturn has just left Aquarius (10th from the Moon): Kantaka ended at that ingress
  assert.equal(result.saturn.kantaka.previous_end, '2025-03-29T20:16:45+05:30');
  assert.equal(result.positions.Saturn.house_from_moon, 11);
});

test('Span boundaries are Saturn sign ingresses accurate to a second', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_gochar', { ...base, as_of: '2025-06-01T12:00:00+05:30', from: '2027-01-01', to: '2034-12-31', search_planets: ['Saturn'], search_events: ['sign'] });
  const ingresses = result.range.events.map(e => e.at);
  const spans = result.range.saturn_episodes.sade_sati[0].spans;
  for (const s of spans) {
    assert.ok(ingresses.includes(s.start), `span start ${s.start} is an ingress`);
    assert.ok(ingresses.includes(s.end), `span end ${s.end} is an ingress`);
  }
  // Saturn straddles the sign boundary one second either side of each ingress
  const eph = createEphemeris();
  for (const at of ingresses.slice(0, 3)) {
    const t = Date.parse(at);
    const before = eph.longitude('Saturn', new Date(t - 1500), TRADITIONAL_LAHIRI).lon;
    const after = eph.longitude('Saturn', new Date(t + 1500), TRADITIONAL_LAHIRI).lon;
    assert.notEqual(Math.floor(before / 30), Math.floor(after / 30), at);
  }
});

test('Tara bala, chandra bala and natal hits', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_gochar', { ...base, as_of: '2025-06-01T12:00:00+05:30' });
  assert.equal(result.tara_bala.tara, 'Sadhaka');
  assert.equal(result.tara_bala.favourable, true);
  assert.equal(result.chandra_bala.house_from_moon, 3);
  assert.equal(result.chandra_bala.favourable, true);
  assert.ok(Date.parse(result.tara_bala.until) > Date.parse(result.as_of));
  const hit = (await ok(srv, 'calculate_gochar', { ...base, as_of: '2029-03-01T12:00:00+05:30' })).result.natal_hits.find(h => h.planet === 'Saturn' && h.target === 'cusp10 (MC)');
  assert.ok(hit, 'Saturn on the natal MC');
  assert.ok(hit.orb_deg <= 1);
  assert.equal(hit.exact.length >= 1, true);
});

test('Date lists are compact; long searches are truncated with a hint', { skip: SKIP }, async () => {
  const dates = Array.from({ length: 12 }, (_, i) => `${2020 + i}-03-01T12:00:00+05:30`);
  const list = await ok(srv, 'calculate_gochar', { ...base, as_of: dates });
  assert.equal(list.result.dates.length, 12);
  assert.ok(list.result.saturn_episodes.sade_sati.length >= 1);
  const big = await ok(srv, 'calculate_gochar', { ...base, from: '2000-01-01', to: '2030-12-31', search_planets: ['Moon'] });
  assert.equal(big.result.range.truncated, true);
  assert.match(big.result.range.narrow_with, /Narrow/);
  assert.ok(big.size < 90000);
  const bad = await srv.call('calculate_gochar', { ...base, from: '2025-01-01' });
  assert.equal(bad.parameter, 'to');
});
