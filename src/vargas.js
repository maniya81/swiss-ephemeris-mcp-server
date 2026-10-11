// Divisional charts (vargas), Parashara / Jagannatha Hora defaults
import { SIGN_ABBR, SIGN_LORDS, norm360, signOf, houseFrom, round } from './constants.js';
import { relationToSignLord, VIMSHOPAKA_POINTS } from './dignity.js';

export const ALL_VARGAS = ['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'];
export const VARGA_NAMES = {
  D1: 'Rasi', D2: 'Hora', D3: 'Drekkana', D4: 'Chaturthamsa', D7: 'Saptamsa', D9: 'Navamsa', D10: 'Dasamsa',
  D12: 'Dwadasamsa', D16: 'Shodasamsa', D20: 'Vimsamsa', D24: 'Chaturvimsamsa', D27: 'Bhamsa', D30: 'Trimsamsa',
  D40: 'Khavedamsa', D45: 'Akshavedamsa', D60: 'Shashtiamsa',
};
export const VARGA_METHODS = {
  D2: ['parashara', 'parivritti'],
  D3: ['parashara', 'parivritti'],
  D30: ['parashara', 'parivritti'],
};

// Shashtiamsa deities (BPHS) in odd-sign order; even signs use the reverse order
export const SHASHTIAMSA = [
  'Ghora', 'Rakshasa', 'Deva', 'Kubera', 'Yaksha', 'Kinnara', 'Bhrashta', 'Kulaghna', 'Garala', 'Vahni',
  'Maya', 'Purishaka', 'Apampathi', 'Marutwana', 'Kaala', 'Sarpa', 'Amrita', 'Indu', 'Mridu', 'Komala',
  'Heramba', 'Brahma', 'Vishnu', 'Maheshwara', 'Deva', 'Ardra', 'Kalinasa', 'Kshiteesa', 'Kamalakara', 'Gulika',
  'Mrityu', 'Kaala', 'Davagni', 'Ghora', 'Yama', 'Kantaka', 'Sudha', 'Amrita', 'Poornachandra', 'Vishadagdha',
  'Kulanasa', 'Vamshakshaya', 'Utpata', 'Kaala', 'Saumya', 'Komala', 'Seetala', 'Karaladamshtra', 'Chandramukhi', 'Praveena',
  'Kaalapavaka', 'Dandayudha', 'Nirmala', 'Saumya', 'Kroora', 'Atiseetala', 'Amrita', 'Payodhi', 'Bhramana', 'Chandrarekha',
];
// 1-based positions of the malefic (krura) shashtiamsas; the rest are benefic (saumya)
const MALEFIC_SHASHTIAMSAS = new Set([1, 2, 7, 8, 9, 10, 11, 12, 15, 16, 30, 31, 32, 33, 34, 35, 36, 40, 41, 42, 43, 44, 48, 51, 52, 55, 59]);

// Vimshopaka weights per scheme (each sums to 20)
export const VIMSHOPAKA_SCHEMES = {
  shadvarga: { D1: 6, D2: 2, D3: 4, D9: 5, D12: 2, D30: 1 },
  saptavarga: { D1: 5, D2: 2, D3: 3, D7: 2.5, D9: 4.5, D12: 2, D30: 1 },
  dashavarga: { D1: 3, D2: 1.5, D3: 1.5, D7: 1.5, D9: 1.5, D10: 1.5, D12: 1.5, D16: 1.5, D30: 1.5, D60: 5 },
  shodashavarga: { D1: 3.5, D2: 1, D3: 1, D4: 0.5, D7: 0.5, D9: 3, D10: 0.5, D12: 0.5, D16: 2, D20: 0.5, D24: 0.5, D27: 0.5, D30: 1, D40: 0.5, D45: 0.5, D60: 4 },
};

const isOdd = (sign) => sign % 2 === 0; // Aries (0) is an odd sign
const modality = (sign) => sign % 3; // 0 movable, 1 fixed, 2 dual
const element = (sign) => sign % 4; // 0 fire, 1 earth, 2 air, 3 water

// Parashara trimsamsa boundaries: [end degree, sign] for odd and even signs
const TRIMSAMSA_ODD = [[5, 0], [10, 10], [18, 8], [25, 2], [30, 6]];
const TRIMSAMSA_EVEN = [[5, 1], [12, 5], [20, 11], [25, 9], [30, 7]];

// Equal divisions: n parts, first part's sign from the rasi sign
const equal = (n, startOf) => (sign, deg) => {
  const part = Math.min(n - 1, Math.floor(deg / (30 / n)));
  return { sign: (startOf(sign) + part) % 12, part, fraction: deg / (30 / n) - part, divisions: n };
};

// Varga sign of a longitude, with its part index and the position within the part (0-1)
export function vargaPosition(varga, lon, methods = {}) {
  const l = norm360(lon);
  const sign = signOf(l);
  const deg = l - sign * 30;
  switch (varga) {
    case 'D1':
      return { sign, part: 0, fraction: deg / 30, divisions: 1 };
    case 'D2':
      if (methods.D2 === 'parivritti') return equal(2, s => s * 2)(sign, deg);
      {
        // Parashara: odd signs Sun's hora (Leo) then Moon's (Cancer); even signs the reverse
        const part = deg < 15 ? 0 : 1;
        const sun = isOdd(sign) ? part === 0 : part === 1;
        return { sign: sun ? 4 : 3, part, fraction: (deg % 15) / 15, divisions: 2 };
      }
    case 'D3':
      if (methods.D3 === 'parivritti') return equal(3, s => s * 3)(sign, deg);
      {
        // Parashara: the sign itself, the 5th and the 9th
        const part = Math.min(2, Math.floor(deg / 10));
        return { sign: (sign + 4 * part) % 12, part, fraction: (deg - part * 10) / 10, divisions: 3 };
      }
    case 'D4': {
      const part = Math.min(3, Math.floor(deg / 7.5));
      return { sign: (sign + 3 * part) % 12, part, fraction: (deg - part * 7.5) / 7.5, divisions: 4 };
    }
    case 'D7':
      return equal(7, s => (isOdd(s) ? s : s + 6))(sign, deg);
    case 'D9':
      return equal(9, s => [0, 9, 6, 3][element(s)])(sign, deg);
    case 'D10':
      return equal(10, s => (isOdd(s) ? s : s + 8))(sign, deg);
    case 'D12':
      return equal(12, s => s)(sign, deg);
    case 'D16':
      return equal(16, s => [0, 4, 8][modality(s)])(sign, deg);
    case 'D20':
      return equal(20, s => [0, 8, 4][modality(s)])(sign, deg);
    case 'D24':
      return equal(24, s => (isOdd(s) ? 4 : 3))(sign, deg);
    case 'D27':
      // Bhamsa: fiery signs from Aries, earthy from Cancer, airy from Libra, watery from Capricorn
      return equal(27, s => [0, 3, 6, 9][element(s)])(sign, deg);
    case 'D30':
      if (methods.D30 === 'parivritti') return equal(30, s => s * 30)(sign, deg);
      {
        const table = isOdd(sign) ? TRIMSAMSA_ODD : TRIMSAMSA_EVEN;
        let startDeg = 0;
        for (let i = 0; i < table.length; i++) {
          const [end, s] = table[i];
          if (deg < end || i === table.length - 1) return { sign: s, part: i, fraction: (deg - startDeg) / (end - startDeg), divisions: 5, unequal: true };
          startDeg = end;
        }
      }
      break;
    case 'D40':
      return equal(40, s => (isOdd(s) ? 0 : 6))(sign, deg);
    case 'D45':
      return equal(45, s => [0, 4, 8][modality(s)])(sign, deg);
    case 'D60':
      return equal(60, s => s)(sign, deg);
    default:
      throw new Error(`Unknown varga ${varga}`);
  }
  return null;
}

// Degrees (within the rasi) at which a varga's parts begin, for sign-change searches
export function vargaBoundaries(varga, methods = {}) {
  if (varga === 'D30' && methods.D30 !== 'parivritti') return null; // unequal: handled by the table
  const n = { D1: 1, D2: 2, D3: 3, D4: 4, D7: 7, D9: 9, D10: 10, D12: 12, D16: 16, D20: 20, D24: 24, D27: 27, D30: 30, D40: 40, D45: 45, D60: 60 }[varga];
  return Array.from({ length: n }, (_, i) => (30 / n) * i);
}

// Every part boundary in absolute longitude (0-360) for a varga
export function allBoundaries(varga, methods = {}) {
  const out = [];
  for (let sign = 0; sign < 12; sign++) {
    if (varga === 'D30' && methods.D30 !== 'parivritti') {
      out.push(sign * 30);
      const table = isOdd(sign) ? TRIMSAMSA_ODD : TRIMSAMSA_EVEN;
      table.slice(0, -1).forEach(([end]) => out.push(sign * 30 + end));
    } else if (varga === 'D2' && methods.D2 !== 'parivritti') {
      out.push(sign * 30, sign * 30 + 15);
    } else {
      vargaBoundaries(varga, methods).forEach(b => out.push(sign * 30 + b));
    }
  }
  return out;
}

export function shashtiamsaDeity(lon) {
  const l = norm360(lon);
  const sign = signOf(l);
  const part = Math.min(59, Math.floor((l - sign * 30) * 2));
  const index = isOdd(sign) ? part : 59 - part;
  return { deity: SHASHTIAMSA[index], number: index + 1, nature: MALEFIC_SHASHTIAMSAS.has(index + 1) ? 'malefic' : 'benefic' };
}

// Varga placements for the lagna and each body. `bodies` maps name -> longitude
export function computeVargas(bodies, lagnaLon, vargas, methods = {}) {
  const out = {};
  for (const varga of vargas) {
    const lagna = vargaPosition(varga, lagnaLon, methods);
    const entry = { name: VARGA_NAMES[varga], lagna: { sign: SIGN_ABBR[lagna.sign], degree: round(lagna.fraction * 30, 3), lord: SIGN_LORDS[lagna.sign] } };
    if (varga === 'D60') Object.assign(entry.lagna, shashtiamsaDeity(lagnaLon));
    entry.planets = {};
    for (const [name, lon] of Object.entries(bodies)) {
      const v = vargaPosition(varga, lon, methods);
      const p = { sign: SIGN_ABBR[v.sign], degree: round(v.fraction * 30, 3), lord: SIGN_LORDS[v.sign], house: houseFrom(lagna.sign, v.sign) };
      if (varga === 'D60') Object.assign(p, shashtiamsaDeity(lon));
      entry.planets[name] = p;
    }
    out[varga] = entry;
  }
  return out;
}

// Vimshopaka bala (out of 20) per planet in each scheme. `signsD1` gives D1 signs for the
// compound relationships; a planet in its own (or exaltation/moolatrikona-free) sign scores 20.
export function computeVimshopaka(bodies, methods = {}) {
  const signsD1 = Object.fromEntries(Object.entries(bodies).map(([n, lon]) => [n, signOf(lon)]));
  const out = {};
  for (const name of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) {
    out[name] = {};
    for (const [scheme, weights] of Object.entries(VIMSHOPAKA_SCHEMES)) {
      let total = 0;
      for (const [varga, weight] of Object.entries(weights)) {
        const sign = vargaPosition(varga, bodies[name], methods).sign;
        const relation = relationToSignLord(name, sign, signsD1);
        total += weight * VIMSHOPAKA_POINTS[relation] / 20;
      }
      out[name][scheme] = round(total, 2);
    }
  }
  return out;
}

// Compact one-line-per-varga form: "La Sc | Su Ar5 Mo Cn9 ..." (sign + house from varga lagna)
export function compactVargas(vargas) {
  const abbr = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };
  const out = {};
  for (const [varga, v] of Object.entries(vargas)) {
    const planets = Object.entries(v.planets).map(([n, p]) => `${abbr[n] || n} ${p.sign}${p.house}${p.deity ? `(${p.deity},${p.nature[0]})` : ''}`).join(' ');
    out[varga] = `La ${v.lagna.sign}${v.lagna.deity ? `(${v.lagna.deity},${v.lagna.nature[0]})` : ''} | ${planets}`;
  }
  return out;
}
