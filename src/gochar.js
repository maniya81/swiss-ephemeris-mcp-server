// Gochar (transits): ingress and station search, house states from the natal Moon (Sade Sati,
// Ashtama, Kantaka, Ardhashtama) with retrograde re-entries, tara and chandra bala, and
// transit-to-natal hits
import { NAKSHATRA_SPAN, DAY_MS, norm360, signOf, houseFrom } from './constants.js';

export const TARAS = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyari', 'Sadhaka', 'Vadha', 'Mitra', 'Parama Mitra'];
const FAVOURABLE_TARAS = new Set([2, 4, 6, 8, 9]);
// Chandra bala: transit Moon in these houses from the natal Moon is favourable; 2, 5 and 9 only
// in the bright half
const CHANDRA_GOOD = [1, 3, 6, 7, 10, 11];
const CHANDRA_GOOD_SHUKLA = [2, 5, 9];
// Re-entries closer together than this belong to one stay in a sign
export const EPISODE_GAP_DAYS = { Saturn: 4 * 365, Jupiter: 2 * 365, Rahu: 2 * 365, Ketu: 2 * 365 };
// Sampling step (days) for each body: small enough that a step never crosses two boundaries
export const STEP_DAYS = { Moon: 0.25, Sun: 1, Mercury: 1, Venus: 1, Mars: 1, Jupiter: 1, Saturn: 1, Rahu: 1, Ketu: 1 };
const NO_STATIONS = new Set(['Sun', 'Moon', 'Rahu', 'Ketu']);

const wrap180 = (x) => { const d = norm360(x); return d > 180 ? d - 360 : d; };

// Samples one body from fromMs to toMs and returns an interpolated, unwrapped longitude function
export function sampleBody(eph, body, fromMs, toMs, settings, stepDays = STEP_DAYS[body]) {
  const stepMs = stepDays * DAY_MS;
  const count = Math.max(2, Math.ceil((toMs - fromMs) / stepMs) + 1);
  const samples = eph.series(body, new Date(fromMs), count, stepDays, settings);
  const lons = samples.map(s => s.lon);
  for (let i = 1; i < lons.length; i++) {
    while (lons[i] < lons[i - 1] - 180) lons[i] += 360;
    while (lons[i] > lons[i - 1] + 180) lons[i] -= 360;
  }
  // Cubic Hermite interpolation with the daily speeds as tangents
  const at = (ms) => {
    const pos = Math.min(Math.max((ms - fromMs) / stepMs, 0), count - 1);
    const i = Math.min(Math.floor(pos), count - 2);
    const x = pos - i;
    const m0 = samples[i].speed * stepDays;
    const m1 = samples[i + 1].speed * stepDays;
    const x2 = x * x;
    const x3 = x2 * x;
    return (2 * x3 - 3 * x2 + 1) * lons[i] + (x3 - 2 * x2 + x) * m0 + (-2 * x3 + 3 * x2) * lons[i + 1] + (x3 - x2) * m1;
  };
  return { body, fromMs, toMs: fromMs + (count - 1) * stepMs, stepMs, count, samples, lons, at, lonAt: (ms) => norm360(at(ms)) };
}

// Time where f changes sign inside [lo, hi] (f(lo) and f(hi) of opposite signs), to 1 ms
function bisect(f, lo, hi) {
  let flo = f(lo);
  while (hi - lo > 1) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

// Crossings of the boundaries width, 2*width, ... (signs: 30, nakshatras: 13°20')
export function boundaryCrossings(series, width) {
  const n = Math.round(360 / width);
  const out = [];
  for (let i = 0; i + 1 < series.count; i++) {
    const a = series.lons[i];
    const b = series.lons[i + 1];
    const ka = Math.floor(a / width + 1e-12);
    const kb = Math.floor(b / width + 1e-12);
    if (ka === kb) continue;
    const t0 = series.fromMs + i * series.stepMs;
    const forward = kb > ka;
    for (let k = forward ? ka + 1 : ka; forward ? k <= kb : k > kb; k += forward ? 1 : -1) {
      const ms = bisect(t => series.at(t) - k * width, t0, t0 + series.stepMs);
      const to = ((forward ? k : k - 1) % n + n) % n;
      const from = ((forward ? k - 1 : k) % n + n) % n;
      out.push({ ms, from, to, retrograde: !forward });
    }
  }
  return out;
}

// Retrograde and direct stations: the speed changes sign. The day bracket is refined with
// swetest at one-minute and then one-second steps.
export function stations(eph, series, settings) {
  if (NO_STATIONS.has(series.body)) return [];
  const out = [];
  for (let i = 0; i + 1 < series.count; i++) {
    const s0 = series.samples[i].speed;
    const s1 = series.samples[i + 1].speed;
    if ((s0 < 0) === (s1 < 0)) continue;
    let lo = series.fromMs + i * series.stepMs;
    for (const [count, stepSec] of [[Math.ceil(series.stepMs / 60000) + 1, 60], [61, 1]]) {
      const fine = eph.series(series.body, new Date(lo), count, stepSec / 86400, settings);
      const j = fine.findIndex((p, k) => k > 0 && (p.speed < 0) !== (fine[k - 1].speed < 0));
      if (j < 1) break;
      lo += (j - 1) * stepSec * 1000;
    }
    out.push({ ms: lo + 500, type: s0 > 0 ? 'retrograde station' : 'direct station', lon: series.lonAt(lo) });
  }
  return out;
}

// Stays in each sign: [{ sign, startMs, endMs, openStart, openEnd }]; open ends mean the stay
// continues beyond the sampled window
export function signIntervals(series) {
  const crossings = boundaryCrossings(series, 30);
  const out = [];
  let sign = signOf(series.lons[0]);
  let start = series.fromMs;
  let openStart = true;
  for (const c of crossings) {
    out.push({ sign, startMs: start, endMs: c.ms, openStart, openEnd: false });
    sign = c.to;
    start = c.ms;
    openStart = false;
  }
  out.push({ sign, startMs: start, endMs: series.toMs, openStart, openEnd: true });
  return out;
}

// Episodes of a state: stays in the given houses (counted from refSign), re-entries within
// gapMs joined into one episode. `block` joins adjacent houses (Sade Sati 12-1-2) into one
// episode; otherwise each house has its own episodes.
export function stateEpisodes(intervals, refSign, houses, gapMs, block = false) {
  const groupsFor = (wanted) => {
    const groups = [];
    for (const iv of intervals) {
      const house = houseFrom(refSign, iv.sign);
      if (!wanted.includes(house)) continue;
      const last = groups[groups.length - 1];
      const span = { house, sign: iv.sign, startMs: iv.startMs, endMs: iv.endMs, openStart: iv.openStart, openEnd: iv.openEnd };
      if (last && iv.startMs - last.endMs <= gapMs) {
        last.spans.push(span);
        last.endMs = iv.endMs;
        last.openEnd = iv.openEnd;
      } else {
        groups.push({ startMs: iv.startMs, endMs: iv.endMs, openStart: iv.openStart, openEnd: iv.openEnd, spans: [span] });
      }
    }
    return groups;
  };
  const episodes = block ? groupsFor(houses) : houses.flatMap(h => groupsFor([h]));
  return episodes.sort((a, b) => a.startMs - b.startMs);
}

// The episode running at t (status current, possibly in a retrograde gap) or the next one
export function episodeAt(episodes, t) {
  const current = episodes.find(e => e.startMs <= t && t < e.endMs);
  if (current) {
    const span = current.spans.find(s => s.startMs <= t && t < s.endMs) || null;
    return { status: 'current', active: Boolean(span), span, episode: current };
  }
  const next = episodes.find(e => e.startMs > t) || null;
  const previous = [...episodes].reverse().find(e => e.endMs <= t) || null;
  return { status: next ? 'next' : 'none', active: false, span: null, episode: next, previous };
}

// Tara bala: nakshatras counted from the janma nakshatra (natal Moon) to the transit Moon's
export function taraBala(natalMoonLon, transitMoonLon) {
  const natal = Math.floor(norm360(natalMoonLon) / NAKSHATRA_SPAN);
  const transit = Math.floor(norm360(transitMoonLon) / NAKSHATRA_SPAN);
  const count = ((transit - natal + 27) % 27) + 1;
  const number = ((count - 1) % 9) + 1;
  return { tara: TARAS[number - 1], number, nakshatra_count: count, favourable: FAVOURABLE_TARAS.has(number) };
}

// Chandra bala: the transit Moon's house from the natal Moon
export function chandraBala(natalMoonLon, transitMoonLon, transitSunLon) {
  const house = houseFrom(signOf(natalMoonLon), signOf(transitMoonLon));
  const shukla = norm360(transitMoonLon - transitSunLon) < 180;
  const favourable = CHANDRA_GOOD.includes(house) || (shukla && CHANDRA_GOOD_SHUKLA.includes(house));
  return { house_from_moon: house, paksha: shukla ? 'shukla' : 'krishna', favourable };
}

// Transit-to-natal hit of a slow planet on one natal point: the stay within `orb`, the exact
// passes (zero separation) and the closest approach, around time t
export function natalHit(series, targetLon, t, orb) {
  const sep = (ms) => wrap180(series.at(ms) - targetLon);
  const now = sep(t);
  if (Math.abs(now) > orb) return null;
  const outside = (ms) => Math.abs(sep(ms)) - orb;
  const i0 = Math.min(series.count - 1, Math.max(0, Math.round((t - series.fromMs) / series.stepMs)));
  let a = i0;
  while (a > 0 && outside(series.fromMs + a * series.stepMs) <= 0) a--;
  let b = i0;
  while (b < series.count - 1 && outside(series.fromMs + b * series.stepMs) <= 0) b++;
  const ta = series.fromMs + a * series.stepMs;
  const tb = series.fromMs + b * series.stepMs;
  const start = outside(ta) > 0 ? bisect(outside, ta, Math.min(tb, ta + series.stepMs)) : ta;
  const end = outside(tb) > 0 ? bisect(outside, Math.max(ta, tb - series.stepMs), tb) : tb;
  const exact = [];
  let closest = { ms: t, orb: Math.abs(now) };
  for (let i = a; i < b; i++) {
    const lo = series.fromMs + i * series.stepMs;
    const hi = lo + series.stepMs;
    const s0 = sep(lo);
    const s1 = sep(hi);
    if (s0 === 0 || (s0 < 0) !== (s1 < 0)) exact.push(bisect(sep, lo, hi));
    for (const [ms, s] of [[lo, s0], [hi, s1]]) if (Math.abs(s) < closest.orb) closest = { ms, orb: Math.abs(s) };
  }
  if (!exact.length) {
    // Golden-section refinement of the minimum separation around the closest sample
    let lo = Math.max(start, closest.ms - series.stepMs);
    let hi = Math.min(end, closest.ms + series.stepMs);
    const g = (Math.sqrt(5) - 1) / 2;
    for (let k = 0; k < 60 && hi - lo > 1000; k++) {
      const m1 = hi - g * (hi - lo);
      const m2 = lo + g * (hi - lo);
      if (Math.abs(sep(m1)) < Math.abs(sep(m2))) hi = m2; else lo = m1;
    }
    const ms = Math.round((lo + hi) / 2);
    closest = { ms, orb: Math.abs(sep(ms)) };
  } else {
    const nearest = exact.reduce((x, y) => (Math.abs(y - t) < Math.abs(x - t) ? y : x));
    closest = { ms: nearest, orb: 0 };
  }
  const later = Math.abs(sep(t + 3600000));
  return {
    orb_deg: Math.abs(now),
    separation_deg: now,
    applying: later < Math.abs(now),
    inOrb: { startMs: start, endMs: end, openStart: outside(ta) <= 0, openEnd: outside(tb) <= 0 },
    exact,
    closest,
  };
}
