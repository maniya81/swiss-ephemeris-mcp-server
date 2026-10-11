// Birth-time sweep machinery: sample labelled series across birth-time offsets (seconds),
// merge them into ranges, find exact flip points by bisection, and turn event expectations
// into passing birth-time windows.

// Output budget: about 25,000 tokens at ~3.5 characters per token
export const MAX_SWEEP_CHARS = 87000;
// Flip points are refined to this many seconds
const TOLERANCE_S = 0.0005;

export const roundOffset = (v) => Math.round(v * 1000) / 1000;

export function sampleOffsets(from, to, step) {
  const count = Math.floor((to - from) / step + 1e-9) + 1;
  return Array.from({ length: count }, (_, i) => from + i * step);
}

// Finds where keyAt changes between lo (value keyLo) and hi (a different value), by bisection.
// Returns every change found in [lo, hi] (more than one when the samples were too coarse).
export function refineChanges(keyAt, lo, hi, keyLo, keyHi, tolerance = TOLERANCE_S) {
  const changes = [];
  let a = lo;
  let ka = keyLo;
  let guard = 0;
  while (ka !== keyHi && guard++ < 64) {
    let l = a;
    let h = hi;
    let kh = keyHi;
    while (h - l > tolerance) {
      const mid = (l + h) / 2;
      const km = keyAt(mid);
      if (km === ka) l = mid;
      else { h = mid; kh = km; }
    }
    changes.push({ at: (l + h) / 2, from: ka, to: kh });
    a = h;
    ka = kh;
  }
  return changes;
}

// Flip points of one labelled series sampled at `offsets`. With `maxFlips`, only the first
// changes are refined (the rest are counted from the samples).
export function flipsOf(offsets, keys, keyAt, maxFlips = Infinity) {
  const flips = [];
  let sampledChanges = 0;
  for (let i = 1; i < offsets.length; i++) {
    if (keys[i] !== keys[i - 1]) {
      sampledChanges++;
      if (flips.length < maxFlips) {
        flips.push(...refineChanges(keyAt, offsets[i - 1], offsets[i], keys[i - 1], keys[i]));
      }
    }
  }
  if (flips.length > maxFlips) flips.length = maxFlips;
  flips.total = Math.max(sampledChanges, flips.length);
  return flips;
}

// Number of sampled changes in a series (a lower bound on its flips)
export const countChanges = (keys) => keys.reduce((n, k, i) => n + (i && k !== keys[i - 1] ? 1 : 0), 0);

// Windows [from, to] where pass(offset) is true, with refined edges. Edges at the sweep
// limits are marked open (the window may continue outside the swept range).
export function passWindows(offsets, passes, passAt) {
  const windows = [];
  const key = (v) => (v ? 'pass' : 'fail');
  const edges = flipsOf(offsets, passes.map(key), (o) => key(passAt(o)));
  let open = passes[0] ? { from: offsets[0], openStart: true } : null;
  for (const edge of edges) {
    if (edge.to === 'pass') open = { from: edge.at, openStart: false };
    else if (open) {
      windows.push({ ...open, to: edge.at, openEnd: false });
      open = null;
    }
  }
  if (open) windows.push({ ...open, to: offsets[offsets.length - 1], openEnd: true });
  return windows;
}

export function intersectWindows(a, b) {
  const out = [];
  for (const x of a) {
    for (const y of b) {
      const from = Math.max(x.from, y.from);
      const to = Math.min(x.to, y.to);
      if (from <= to) {
        out.push({
          from,
          to,
          openStart: from === x.from ? x.openStart : y.openStart,
          openEnd: to === x.to ? x.openEnd : y.openEnd,
        });
      }
    }
  }
  return out.sort((p, q) => p.from - q.from);
}

// Elementary intervals between all window edges; returns the largest set of tests that pass
// together and the intervals where exactly that set passes
export function bestSubset(testWindows, from, to) {
  const cuts = new Set([from, to]);
  testWindows.forEach(ws => ws.forEach(w => { cuts.add(w.from); cuts.add(w.to); }));
  const points = [...cuts].sort((a, b) => a - b);
  let best = { count: -1, sets: [] };
  for (let i = 1; i < points.length; i++) {
    const mid = (points[i - 1] + points[i]) / 2;
    const passing = testWindows.map((ws, k) => (ws.some(w => mid >= w.from && mid <= w.to) ? k : -1)).filter(k => k >= 0);
    if (passing.length > best.count) best = { count: passing.length, sets: [] };
    if (passing.length === best.count) {
      const key = passing.join(',');
      const last = best.sets[best.sets.length - 1];
      if (last && last.key === key && last.to === points[i - 1]) last.to = points[i];
      else best.sets.push({ key, passing, from: points[i - 1], to: points[i] });
    }
  }
  return best;
}

// Keeps a list within a character budget; returns the kept items and whether any were dropped
export function fitToBudget(items, budget) {
  let used = 0;
  const kept = [];
  for (const item of items) {
    const size = JSON.stringify(item).length + 1;
    if (used + size > budget) return { kept, truncated: true };
    used += size;
    kept.push(item);
  }
  return { kept, truncated: false };
}

// Cubic Hermite interpolation of a sampled longitude series (degrees, speeds in deg/day)
// sampled every `stepSeconds` from offset `from`; handles the 360° wrap
export function makeLongitudeInterpolator(from, stepSeconds, samples) {
  const lons = samples.map(s => s.lon);
  for (let i = 1; i < lons.length; i++) {
    while (lons[i] < lons[i - 1] - 180) lons[i] += 360;
    while (lons[i] > lons[i - 1] + 180) lons[i] -= 360;
  }
  const last = lons.length - 1;
  return (offset) => {
    if (last === 0) return ((lons[0] % 360) + 360) % 360;
    const pos = Math.min(Math.max((offset - from) / stepSeconds, 0), last);
    const i = Math.min(Math.floor(pos), last - 1);
    const x = pos - i;
    const h = stepSeconds / 86400;
    const p0 = lons[i];
    const p1 = lons[i + 1];
    const m0 = samples[i].speed * h;
    const m1 = samples[i + 1].speed * h;
    const x2 = x * x;
    const x3 = x2 * x;
    const v = (2 * x3 - 3 * x2 + 1) * p0 + (x3 - 2 * x2 + x) * m0 + (-2 * x3 + 3 * x2) * p1 + (x3 - x2) * m1;
    return ((v % 360) + 360) % 360;
  };
}

// Linear interpolation of a sampled longitude series without speeds (e.g. house cusps)
export function makeLinearInterpolator(from, stepSeconds, values) {
  const unwrapped = values.slice();
  for (let i = 1; i < unwrapped.length; i++) {
    while (unwrapped[i] < unwrapped[i - 1] - 180) unwrapped[i] += 360;
    while (unwrapped[i] > unwrapped[i - 1] + 180) unwrapped[i] -= 360;
  }
  const last = unwrapped.length - 1;
  return (offset) => {
    if (last === 0) return ((unwrapped[0] % 360) + 360) % 360;
    const pos = Math.min(Math.max((offset - from) / stepSeconds, 0), last);
    const i = Math.min(Math.floor(pos), last - 1);
    const v = unwrapped[i] + (unwrapped[i + 1] - unwrapped[i]) * (pos - i);
    return ((v % 360) + 360) % 360;
  };
}
