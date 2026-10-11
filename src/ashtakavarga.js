// Ashtakavarga (Parashara): bhinnashtakavarga, sarvashtakavarga, prastharashtakavarga,
// shodhana and shodhya pinda, and transit bindus with kakshyas
import { SIGN_ABBR, SIGN_LORDS, norm360, signOf, round } from './constants.js';

const CONTRIBUTORS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Lagna'];
// Benefic places (houses counted from each contributor) for each planet's BAV (BPHS)
export const BAV_TABLES = {
  Sun: { Sun: [1, 2, 4, 7, 8, 9, 10, 11], Moon: [3, 6, 10, 11], Mars: [1, 2, 4, 7, 8, 9, 10, 11], Mercury: [3, 5, 6, 9, 10, 11, 12], Jupiter: [5, 6, 9, 11], Venus: [6, 7, 12], Saturn: [1, 2, 4, 7, 8, 9, 10, 11], Lagna: [3, 4, 6, 10, 11, 12] },
  Moon: { Sun: [3, 6, 7, 8, 10, 11], Moon: [1, 3, 6, 7, 10, 11], Mars: [2, 3, 5, 6, 9, 10, 11], Mercury: [1, 3, 4, 5, 7, 8, 10, 11], Jupiter: [1, 4, 7, 8, 10, 11, 12], Venus: [3, 4, 5, 7, 9, 10, 11], Saturn: [3, 5, 6, 11], Lagna: [3, 6, 10, 11] },
  Mars: { Sun: [3, 5, 6, 10, 11], Moon: [3, 6, 11], Mars: [1, 2, 4, 7, 8, 10, 11], Mercury: [3, 5, 6, 11], Jupiter: [6, 10, 11, 12], Venus: [6, 8, 11, 12], Saturn: [1, 4, 7, 8, 9, 10, 11], Lagna: [1, 3, 6, 10, 11] },
  Mercury: { Sun: [5, 6, 9, 11, 12], Moon: [2, 4, 6, 8, 10, 11], Mars: [1, 2, 4, 7, 8, 9, 10, 11], Mercury: [1, 3, 5, 6, 9, 10, 11, 12], Jupiter: [6, 8, 11, 12], Venus: [1, 2, 3, 4, 5, 8, 9, 11], Saturn: [1, 2, 4, 7, 8, 9, 10, 11], Lagna: [1, 2, 4, 6, 8, 10, 11] },
  Jupiter: { Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11], Moon: [2, 5, 7, 9, 11], Mars: [1, 2, 4, 7, 8, 10, 11], Mercury: [1, 2, 4, 5, 6, 9, 10, 11], Jupiter: [1, 2, 3, 4, 7, 8, 10, 11], Venus: [2, 5, 6, 9, 10, 11], Saturn: [3, 5, 6, 12], Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11] },
  Venus: { Sun: [8, 11, 12], Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12], Mars: [3, 5, 6, 9, 11, 12], Mercury: [3, 5, 6, 9, 11], Jupiter: [5, 8, 9, 10, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11], Saturn: [3, 4, 5, 8, 9, 10, 11], Lagna: [1, 2, 3, 4, 5, 8, 9, 11] },
  Saturn: { Sun: [1, 2, 4, 7, 8, 10, 11], Moon: [3, 6, 11], Mars: [3, 5, 6, 10, 11, 12], Mercury: [6, 8, 9, 10, 11, 12], Jupiter: [5, 6, 11, 12], Venus: [6, 11, 12], Saturn: [3, 5, 6, 11], Lagna: [1, 3, 4, 6, 10, 11] },
  Lagna: { Sun: [3, 4, 6, 10, 11, 12], Moon: [3, 6, 10, 11, 12], Mars: [1, 3, 6, 10, 11], Mercury: [1, 2, 4, 6, 8, 10, 11], Jupiter: [1, 2, 4, 5, 6, 7, 9, 10, 11], Venus: [1, 2, 3, 4, 5, 8, 9], Saturn: [1, 3, 4, 6, 10, 11], Lagna: [3, 6, 10, 11] },
};
// Jagannatha Hora's tables differ in four rows (same totals): in the Moon's BAV the Moon gives
// the 9th, Mars does not, and Jupiter gives 1, 2, 4, 7, 8, 10, 11; in Venus's BAV Mars gives the
// 4th instead of the 5th
export const JH_BAV_TABLES = {
  ...BAV_TABLES,
  Moon: { ...BAV_TABLES.Moon, Moon: [1, 3, 6, 7, 9, 10, 11], Mars: [2, 3, 5, 6, 10, 11], Jupiter: [1, 2, 4, 7, 8, 10, 11] },
  Venus: { ...BAV_TABLES.Venus, Mars: [3, 4, 6, 9, 11, 12] },
};
const SAV_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
// Shodhya pinda multipliers
const RASHI_GUNAKARA = [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12];
const GRAHA_GUNAKARA = { Sun: 5, Moon: 5, Mars: 8, Mercury: 5, Jupiter: 10, Venus: 7, Saturn: 5 };
// Kakshya lords of the eight 3°45' divisions of every sign
export const KAKSHYA_LORDS = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon', 'Lagna'];

// signs: { Sun: 0-11, ..., Saturn, Lagna }
export function prastharashtakavarga(signs, tables = JH_BAV_TABLES) {
  const out = {};
  for (const [planet, table] of Object.entries(tables)) {
    out[planet] = {};
    for (const c of CONTRIBUTORS) {
      const row = Array(12).fill(0);
      table[c].forEach(h => { row[(signs[c] + h - 1) % 12] = 1; });
      out[planet][c] = row;
    }
  }
  return out;
}

export function bhinnashtakavarga(prastara) {
  return Object.fromEntries(Object.entries(prastara).map(([planet, rows]) => [
    planet,
    Array.from({ length: 12 }, (_, s) => CONTRIBUTORS.reduce((n, c) => n + rows[c][s], 0)),
  ]));
}

// Trikona shodhana: in each group of trine signs, subtract the smallest count from all three
function trikonaShodhana(bindus) {
  const out = bindus.slice();
  for (let g = 0; g < 4; g++) {
    const trine = [g, g + 4, g + 8];
    const min = Math.min(...trine.map(s => out[s]));
    trine.forEach(s => { out[s] -= min; });
  }
  return out;
}

// Ekadhipatya shodhana on the pairs of signs with one lord (not Cancer/Leo), BPHS rules
function ekadhipatyaShodhana(bindus, occupied) {
  const out = bindus.slice();
  for (const [a, b] of [[0, 7], [1, 6], [2, 5], [8, 11], [9, 10]]) {
    if (out[a] === 0 || out[b] === 0) continue;
    const oa = occupied[a];
    const ob = occupied[b];
    if (oa && ob) continue;
    if (!oa && !ob) {
      if (out[a] === out[b]) { out[a] = 0; out[b] = 0; } else { const m = Math.min(out[a], out[b]); out[a] = m; out[b] = m; }
      continue;
    }
    const [occ, free] = oa ? [a, b] : [b, a];
    if (out[occ] > out[free]) out[free] = 0;
    else if (out[occ] < out[free]) out[free] = out[occ];
    else out[free] = 0;
  }
  return out;
}

export function computeAshtakavarga(longitudes, lagnaLon, options = {}) {
  const signs = Object.fromEntries(SAV_PLANETS.map(p => [p, signOf(longitudes[p])]));
  signs.Lagna = signOf(lagnaLon);
  const prastara = prastharashtakavarga(signs, options.tables === 'bphs' ? BAV_TABLES : JH_BAV_TABLES);
  const bav = bhinnashtakavarga(prastara);
  const sav = Array.from({ length: 12 }, (_, s) => SAV_PLANETS.reduce((n, p) => n + bav[p][s], 0));
  const total = sav.reduce((a, b) => a + b, 0);
  const bySign = (arr) => Object.fromEntries(arr.map((v, s) => [SIGN_ABBR[s], v]));

  const out = {
    bhinnashtakavarga: Object.fromEntries(Object.entries(bav).map(([p, arr]) => [p, { ...bySign(arr), total: arr.reduce((a, b) => a + b, 0) }])),
    sarvashtakavarga: { ...bySign(sav), total },
    sav_self_check: { expected: 337, total, passed: total === 337 },
    note: 'Lagna\'s ashtakavarga is shown for reference and is not part of the sarvashtakavarga total.',
  };
  if (options.prastara) {
    out.prastharashtakavarga = Object.fromEntries(Object.entries(prastara).map(([p, rows]) => [
      p, Object.fromEntries(Object.entries(rows).map(([c, row]) => [c, row.join('')])),
    ]));
    out.prastharashtakavarga_note = 'Each row is 12 digits for Aries..Pisces: 1 = that contributor gave a bindu in that sign.';
  }
  if (options.shodhana) {
    const occupied = Array(12).fill(false);
    SAV_PLANETS.forEach(p => { occupied[signs[p]] = true; });
    out.shodhana = {};
    for (const p of SAV_PLANETS) {
      const trikona = trikonaShodhana(bav[p]);
      const eka = ekadhipatyaShodhana(trikona, occupied);
      const rashiPinda = eka.reduce((n, v, s) => n + v * RASHI_GUNAKARA[s], 0);
      const grahaPinda = SAV_PLANETS.reduce((n, q) => n + eka[signs[q]] * GRAHA_GUNAKARA[q], 0);
      out.shodhana[p] = {
        after_trikona: trikona.join(' '),
        after_ekadhipatya: eka.join(' '),
        rashi_pinda: rashiPinda,
        graha_pinda: grahaPinda,
        shodhya_pinda: rashiPinda + grahaPinda,
      };
    }
    out.shodhana_note = 'Counts are listed Aries..Pisces. Trikona: the smallest count in each trine group is subtracted from all three. Ekadhipatya: BPHS rules for the pairs of signs owned by Mars, Venus, Mercury, Jupiter and Saturn.';
  }
  out._raw = { bav, sav, prastara };
  return out;
}

// Transit bindus: for each transiting planet, the BAV and SAV bindus of the sign it is in, and
// its kakshya (1/8 of the sign), the kakshya lord and whether that lord gave a bindu there
export function transitBindus(raw, transitLongitudes) {
  const out = {};
  for (const [planet, lon] of Object.entries(transitLongitudes)) {
    const sign = signOf(lon);
    const deg = norm360(lon) - sign * 30;
    const k = Math.min(7, Math.floor(deg / 3.75));
    const lord = KAKSHYA_LORDS[k];
    const entry = { sign: SIGN_ABBR[sign], sav_bindus: raw.sav[sign] };
    if (raw.bav[planet]) {
      entry.bav_bindus = raw.bav[planet][sign];
      entry.kakshya = { number: k + 1, from_deg: round(k * 3.75, 2), to_deg: round((k + 1) * 3.75, 2), lord, lord_gave_bindu: raw.prastara[planet][lord][sign] === 1 };
    }
    out[planet] = entry;
  }
  return out;
}

export function compactAshtakavarga(av) {
  const line = (obj) => SIGN_ABBR.map(s => `${s}${obj[s]}`).join(' ');
  const out = {
    sav: `${line(av.sarvashtakavarga)} = ${av.sarvashtakavarga.total}${av.sav_self_check.passed ? ' (337 ok)' : ' (337 CHECK FAILED)'}`,
    bav_totals: Object.entries(av.bhinnashtakavarga).map(([p, b]) => `${p.slice(0, 2)} ${b.total}`).join(', '),
  };
  if (av.shodhana) out.shodhya_pinda = Object.entries(av.shodhana).map(([p, x]) => `${p.slice(0, 2)} ${x.shodhya_pinda}`).join(', ');
  return out;
}

export { SIGN_LORDS };
