// Vedic aspects: Parashari graha drishti (sign-based), BPHS degree-based strength in virupas,
// and Jaimini rashi drishti
import { SIGN_ABBR, GRAHAS, norm360, signOf, houseFrom, round } from './constants.js';

const SPECIAL = { Mars: [4, 8], Jupiter: [5, 9], Saturn: [3, 10] };
export const RAHU_KETU_ASPECTS = { none: [], '5_9': [5, 7, 9], '5_7_9_12': [5, 7, 9, 12] };

// Houses (counted from the planet's sign) a graha aspects
export function aspectHouses(planet, rahuKetu = '5_9') {
  if (planet === 'Rahu' || planet === 'Ketu') return RAHU_KETU_ASPECTS[rahuKetu];
  return [7, ...(SPECIAL[planet] || [])].sort((a, b) => a - b);
}

// Base drishti strength (virupas) of an aspect across `angle` degrees (aspected minus aspecting
// longitude), the same for every planet (BPHS)
function baseVirupas(d) {
  if (d >= 30 && d < 60) return (d - 30) / 2;
  if (d >= 60 && d < 90) return d - 45;
  if (d >= 90 && d < 120) return (120 - d) / 2 + 30;
  if (d >= 120 && d < 150) return 150 - d;
  if (d >= 150 && d < 180) return 2 * (d - 150);
  if (d >= 180 && d < 300) return (300 - d) / 2;
  return 0;
}
// Exact special aspects: Mars 4th (90°) and 8th (210°), Jupiter 5th (120°) and 9th (240°),
// Saturn 3rd (60°) and 10th (270°)
const SPECIAL_PEAKS = { Mars: [90, 210], Jupiter: [120, 240], Saturn: [60, 270] };

// Drishti strength in virupas. Rules:
//  jh (default, Jagannatha Hora): special aspects rise linearly from the base value 30° before
//     the exact aspect to a full 60 at it, then fall back to the base value 30° after it
//  bphs: BPHS/B.V. Raman add-ons on top of the base value: Saturn 3rd/10th +45, Jupiter
//     5th/9th +30, Mars 4th/8th +15 (capped at 60 unless cap is false)
export function drishtiVirupas(planet, angle, { rule = 'jh', cap = true } = {}) {
  const d = norm360(angle);
  if (rule === 'jh') {
    for (const peak of SPECIAL_PEAKS[planet] || []) {
      const before = baseVirupas(peak - 30);
      const after = baseVirupas(peak + 30);
      if (d >= peak - 30 && d < peak) return before + ((60 - before) * (d - (peak - 30))) / 30;
      if (d >= peak && d < peak + 30) return 60 + ((after - 60) * (d - peak)) / 30;
    }
    return baseVirupas(d);
  }
  let v = baseVirupas(d);
  const inRange = (from, to) => d >= from && d < to;
  if (planet === 'Saturn' && (inRange(60, 90) || inRange(270, 300))) v += 45;
  if (planet === 'Jupiter' && (inRange(120, 150) || inRange(240, 270))) v += 30;
  if (planet === 'Mars' && (inRange(90, 120) || inRange(210, 240))) v += 15;
  return cap ? Math.min(60, v) : v;
}

// Jaimini rashi drishti: movable signs aspect the fixed signs except the adjacent one, fixed
// signs aspect the movable signs except the adjacent one, dual signs aspect the other duals
export function rashiDrishti(sign) {
  const out = [];
  for (let s = 0; s < 12; s++) {
    if (s === sign) continue;
    const m = sign % 3;
    if (m === 0 && s % 3 === 1 && s !== (sign + 1) % 12) out.push(s);
    if (m === 1 && s % 3 === 0 && s !== (sign + 11) % 12) out.push(s);
    if (m === 2 && s % 3 === 2) out.push(s);
  }
  return out;
}

export function computeAspects(longitudes, lagnaLon, options = {}) {
  const rahuKetu = options.rahu_ketu_aspects || '5_9';
  const lagnaSign = signOf(lagnaLon);
  const signs = Object.fromEntries(Object.entries(longitudes).map(([n, l]) => [n, signOf(l)]));
  const grahas = GRAHAS.filter(g => g in longitudes);

  const byGraha = {};
  const byHouse = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, []]));
  for (const g of grahas) {
    const targetSigns = aspectHouses(g, rahuKetu).map(h => (signs[g] + h - 1) % 12);
    const houses = targetSigns.map(s => houseFrom(lagnaSign, s));
    const aspected = grahas.filter(o => o !== g && targetSigns.includes(signs[o]));
    byGraha[g] = {
      aspects_houses: houses,
      aspects_signs: targetSigns.map(s => SIGN_ABBR[s]),
      aspects_grahas: aspected,
    };
    if (options.aspect_strength) {
      byGraha[g].virupas = Object.fromEntries(grahas.filter(o => o !== g)
        .map(o => [o, round(drishtiVirupas(g, longitudes[o] - longitudes[g], { rule: options.drishti_rule || 'jh' }), 2)])
        .filter(([, v]) => v > 0));
    }
    houses.forEach(h => byHouse[h].push(g));
  }
  const out = { by_graha: byGraha, aspected_by_house: byHouse };
  if (options.jaimini_aspects) {
    out.jaimini_rashi_drishti = Object.fromEntries(grahas.map(g => {
      const targets = rashiDrishti(signs[g]);
      return [g, { signs: targets.map(s => SIGN_ABBR[s]), grahas: grahas.filter(o => o !== g && targets.includes(signs[o])) }];
    }));
  }
  return out;
}

export function compactAspects(aspects) {
  const abbr = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };
  return Object.fromEntries(Object.entries(aspects.by_graha).map(([g, a]) => [
    g, `H${a.aspects_houses.join(',H')}${a.aspects_grahas.length ? ` -> ${a.aspects_grahas.map(x => abbr[x]).join(',')}` : ''}`,
  ]));
}
