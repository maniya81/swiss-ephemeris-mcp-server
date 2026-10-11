// Pure module tests (no swetest needed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yoginiStart, ashtottariStart, narayanaRaw, YOGINIS, ASHTOTTARI } from '../src/dashas.js';
import { stateEpisodes, episodeAt, taraBala, chandraBala } from '../src/gochar.js';
import { kpLords } from '../src/kp.js';
import { NAKSHATRA_SPAN } from '../src/constants.js';

test('Yogini starts: Ashwini Bhramari, Rohini Siddha, Ardra Mangala', () => {
  const at = (nak) => YOGINIS[yoginiStart(nak * NAKSHATRA_SPAN + 1).index].name;
  assert.equal(at(0), 'Bhramari');
  assert.equal(at(3), 'Siddha');
  assert.equal(at(4), 'Sankata');
  assert.equal(at(5), 'Mangala');
});

test('Ashtottari groups: Ardra Sun, Krittika Venus, Revati Rahu', () => {
  const lord = (nak) => ASHTOTTARI[ashtottariStart(nak * NAKSHATRA_SPAN + 0.5).index].lord;
  assert.equal(lord(5), 'Sun');
  assert.equal(lord(2), 'Venus');
  assert.equal(lord(26), 'Rahu');
  assert.equal(lord(21), 'Saturn');
});

test('Narayana mahadasha order matches the Jagannatha Hora table', () => {
  // Rows of JH's normal progression (first sign 0-11)
  const JH = [[0,1,2,3,4,5,6,7,8,9,10,11],[1,8,3,10,5,0,7,2,9,4,11,6],[2,10,6,5,1,9,8,4,0,11,7,3],[3,2,1,0,11,10,9,8,7,6,5,4],[4,9,2,7,0,5,10,3,8,1,6,11],[5,9,1,2,6,10,11,3,7,8,0,4],[6,7,8,9,10,11,0,1,2,3,4,5],[7,2,9,4,11,6,1,8,3,10,5,0],[8,4,0,11,7,3,2,10,6,5,1,9],[9,8,7,6,5,4,3,2,1,0,11,10],[10,3,8,1,6,11,4,9,2,7,0,5],[11,3,7,8,0,4,5,9,1,2,6,10]];
  const degrees = { Sun: 1, Moon: 2, Mars: 3, Mercury: 4, Jupiter: 5, Venus: 6, Saturn: 7, Rahu: 8, Ketu: 9 };
  for (let lagna = 0; lagna < 12; lagna++) {
    // Everything except Saturn and the nodes in the lagna makes it the stronger sign
    const signs = { Sun: lagna, Moon: lagna, Mars: lagna, Mercury: lagna, Jupiter: lagna, Venus: lagna, Saturn: (lagna + 1) % 12, Rahu: (lagna + 8) % 12, Ketu: (lagna + 2) % 12 };
    const raw = narayanaRaw({ signs, degrees, lagna, rahuExaltation: 'Ta' });
    assert.equal(raw.seed, lagna);
    // Sequence of all twelve first-cycle signs (zero-year signs are skipped in the periods)
    const order = raw.mahadashas.filter(m => m.cycle === 1).map(m => m.sign);
    assert.deepEqual(order, JH[lagna].filter(s => order.includes(s)), `first sign ${lagna}`);
  }
});

test('Saturn state episodes join retrograde re-entries', () => {
  const day = 86400000;
  // Moon in Taurus (1); Saturn: Pi, Ar, Pi (retro), Ar, Ta, Ar (retro), Ta, Ge, Cn
  const seq = [[11, 0], [0, 100], [11, 250], [0, 400], [1, 900], [0, 960], [1, 1100], [2, 1800], [3, 2600]];
  const intervals = seq.map(([sign, start], i) => ({ sign, startMs: start * day, endMs: (seq[i + 1] ? seq[i + 1][1] : 3000) * day, openStart: i === 0, openEnd: i === seq.length - 1 }));
  const sade = stateEpisodes(intervals, 1, [12, 1, 2], 4 * 365 * day, true);
  assert.equal(sade.length, 1);
  assert.equal(sade[0].startMs, 100 * day);
  assert.equal(sade[0].endMs, 2600 * day);
  assert.equal(sade[0].spans.length, 6);
  const gap = episodeAt(sade, 300 * day);
  assert.equal(gap.status, 'current');
  assert.equal(gap.active, false);
});

test('Tara and chandra bala', () => {
  // Natal Moon in Rohini (3), transit Moon in Ashlesha (8): 6th tara Sadhaka
  assert.deepEqual(taraBala(3 * NAKSHATRA_SPAN + 1, 8 * NAKSHATRA_SPAN + 1), { tara: 'Sadhaka', number: 6, nakshatra_count: 6, favourable: true });
  assert.equal(chandraBala(45, 105, 50).house_from_moon, 3);
  assert.equal(chandraBala(45, 105, 50).favourable, true);
});

test('KP lords: Cancer 15°46\' is Pushya, sub lord Jupiter', () => {
  const l = kpLords(90 + 15 + 46 / 60);
  assert.equal(l.sign_lord, 'Moon');
  assert.equal(l.star_lord, 'Saturn');
  assert.equal(l.sub_lord, 'Jupiter');
});
