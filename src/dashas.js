// Other dasha systems: Yogini and Ashtottari (from the Moon), Chara (Jaimini; K.N. Rao and
// P.V.R. Narasimha Rao variants) and Narayana. Periods are built in years from birth, like the
// Vimshottari engine: { mahadashas: [{ start, end, ... }], sub(parent), label(p) }.
import { SIGN_LORDS, SIGN_ABBR, NAKSHATRA_SPAN, norm360, signOf, houseFrom } from './constants.js';
import { EXALTATION } from './dignity.js';
import { rashiDrishti } from './aspects.js';

const HORIZON_YEARS = 125;

// ---------------------------------------------------------------- Yogini
export const YOGINIS = [
  { name: 'Mangala', lord: 'Moon', years: 1 }, { name: 'Pingala', lord: 'Sun', years: 2 },
  { name: 'Dhanya', lord: 'Jupiter', years: 3 }, { name: 'Bhramari', lord: 'Mars', years: 4 },
  { name: 'Bhadrika', lord: 'Mercury', years: 5 }, { name: 'Ulka', lord: 'Saturn', years: 6 },
  { name: 'Siddha', lord: 'Venus', years: 7 }, { name: 'Sankata', lord: 'Rahu', years: 8 },
];

// First yogini: (nakshatra number + 3) mod 8, 1 = Mangala ... 0 = Sankata
export function yoginiStart(moonLon) {
  const nak = Math.floor(norm360(moonLon) / NAKSHATRA_SPAN);
  const fraction = (norm360(moonLon) - nak * NAKSHATRA_SPAN) / NAKSHATRA_SPAN;
  const index = (nak + 1 + 3 + 7) % 8;
  return { nakshatraIndex: nak, elapsedFraction: fraction, index, elapsedYears: fraction * YOGINIS[index].years };
}

export function yoginiRaw(start, horizon = HORIZON_YEARS) {
  const mahadashas = [];
  for (let i = 0, cursor = -start.elapsedYears; cursor < horizon; i++) {
    const y = YOGINIS[(start.index + i) % 8];
    mahadashas.push({ index: (start.index + i) % 8, name: y.name, lord: y.lord, start: cursor, end: cursor + y.years });
    cursor += y.years;
  }
  // Sub-periods start from the parent's yogini, each its share of 36 years
  const sub = (parent) => {
    const length = parent.end - parent.start;
    let c = parent.start;
    return Array.from({ length: 8 }, (_, i) => {
      const index = (parent.index + i) % 8;
      const part = (length * YOGINIS[index].years) / 36;
      const p = { index, name: YOGINIS[index].name, lord: YOGINIS[index].lord, start: c, end: c + part };
      c += part;
      return p;
    });
  };
  return { mahadashas, sub, label: (p) => p.name };
}

// ---------------------------------------------------------------- Ashtottari
// Lords in order with years, and the first nakshatra (0-based) of each lord's group: Sun from
// Ardra (4 stars), Moon from Magha (3), Mars from Hasta (4), Mercury from Anuradha (3), Saturn
// from Purva Ashadha (3, Abhijit included), Jupiter from Dhanishta (3), Rahu from Uttara
// Bhadrapada (4), Venus from Krittika (3)
export const ASHTOTTARI = [
  { lord: 'Sun', years: 6, fromNak: 5, stars: 4 }, { lord: 'Moon', years: 15, fromNak: 9, stars: 3 },
  { lord: 'Mars', years: 8, fromNak: 12, stars: 4 }, { lord: 'Mercury', years: 17, fromNak: 16, stars: 3 },
  { lord: 'Saturn', years: 10, fromNak: 19, stars: 3 }, { lord: 'Jupiter', years: 19, fromNak: 22, stars: 3 },
  { lord: 'Rahu', years: 12, fromNak: 25, stars: 4 }, { lord: 'Venus', years: 21, fromNak: 2, stars: 3 },
];

export function ashtottariStart(moonLon) {
  const lon = norm360(moonLon);
  for (let index = 0; index < 8; index++) {
    const g = ASHTOTTARI[index];
    const from = g.fromNak * NAKSHATRA_SPAN;
    const span = g.stars * NAKSHATRA_SPAN;
    const into = norm360(lon - from);
    if (into < span) return { index, elapsedFraction: into / span, elapsedYears: (into / span) * g.years };
  }
  return null;
}

export function ashtottariRaw(start, horizon = HORIZON_YEARS) {
  const mahadashas = [];
  for (let i = 0, cursor = -start.elapsedYears; cursor < horizon; i++) {
    const index = (start.index + i) % 8;
    mahadashas.push({ index, lord: ASHTOTTARI[index].lord, start: cursor, end: cursor + ASHTOTTARI[index].years });
    cursor += ASHTOTTARI[index].years;
  }
  const sub = (parent) => {
    const length = parent.end - parent.start;
    let c = parent.start;
    return Array.from({ length: 8 }, (_, i) => {
      const index = (parent.index + i) % 8;
      const part = (length * ASHTOTTARI[index].years) / 108;
      const p = { index, lord: ASHTOTTARI[index].lord, start: c, end: c + part };
      c += part;
      return p;
    });
  };
  return { mahadashas, sub, label: (p) => p.lord };
}

// ---------------------------------------------------------------- Jaimini helpers
// chart: { signs: { Sun: 0-11, ..., Rahu, Ketu }, degrees: { Sun: 0-30, ... }, lagna: 0-11, rahuExaltation }
const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const MOVABLE = [0, 3, 6, 9];
const FIXED = [1, 4, 7, 10];
const ODD_FOOTED = new Set([0, 1, 2, 6, 7, 8]); // Ar Ta Ge Li Sc Sg (savya); the rest are even-footed
const CO_LORDS = { 7: ['Mars', 'Ketu'], 10: ['Saturn', 'Rahu'] };
const modalityRank = (s) => (MOVABLE.includes(s) ? 1 : FIXED.includes(s) ? 2 : 3); // dual strongest
const isOdd = (s) => s % 2 === 0; // Aries (0) is an odd sign

function exaltedIn(planet, sign, rahuExaltation) {
  if (planet === 'Rahu') return sign === (rahuExaltation === 'Ge' ? 2 : 1);
  if (planet === 'Ketu') return sign === (rahuExaltation === 'Ge' ? 8 : 7);
  return signOf(EXALTATION[planet]) === sign;
}
const debilitatedIn = (planet, sign, rahuExaltation) => exaltedIn(planet, (sign + 6) % 12, rahuExaltation);

const planetsIn = (chart, sign) => PLANETS.filter(p => chart.signs[p] === sign);
// Planets aspecting a sign by Jaimini rashi drishti (or in it)
const aspectingPlanets = (chart, sign) => PLANETS.filter(p => rashiDrishti(chart.signs[p]).includes(sign));
// Jupiter, Mercury and the sign's lord conjoining or aspecting a sign
const jmlCount = (chart, sign, lord) => ['Mercury', 'Jupiter', lord].reduce((n, p) => n + (chart.signs[p] === sign ? 1 : 0) + (aspectingPlanets(chart, sign).includes(p) ? 1 : 0), 0);

// Stronger co-lord of Scorpio (Mars/Ketu) or Aquarius (Saturn/Rahu)
function strongerCoLord(chart, sign, duration = null) {
  const [a, b] = CO_LORDS[sign];
  const sa = chart.signs[a];
  const sb = chart.signs[b];
  if (sa === sign && sb !== sign) return b;
  if (sb === sign && sa !== sign) return a;
  // Rule 1: joined by more planets
  const ca = planetsIn(chart, sa).length - 1;
  const cb = planetsIn(chart, sb).length - 1;
  if (ca !== cb) return ca > cb ? a : b;
  // Rule 2: more of Jupiter, Mercury and the dispositor conjoining or aspecting
  const ja = jmlCount(chart, sa, SIGN_LORDS[sa]);
  const jb = jmlCount(chart, sb, SIGN_LORDS[sb]);
  if (ja !== jb) return ja > jb ? a : b;
  // Rule 3: exalted
  const ea = exaltedIn(a, sa, chart.rahuExaltation);
  const eb = exaltedIn(b, sb, chart.rahuExaltation);
  if (ea !== eb) return ea ? a : b;
  // Rule 4: dual > fixed > movable sign
  if (modalityRank(sa) !== modalityRank(sb)) return modalityRank(sa) > modalityRank(sb) ? a : b;
  // Rule 5: (in dashas) the one giving the longer Narayana dasha, then the more advanced in its sign
  if (duration) {
    const da = duration(sa);
    const db = duration(sb);
    if (da !== db) return da > db ? a : b;
  }
  return chart.degrees[a] > chart.degrees[b] ? a : b;
}

export function signLord(chart, sign, duration = null) {
  return CO_LORDS[sign] ? strongerCoLord(chart, sign, duration) : SIGN_LORDS[sign];
}

// Stronger of two signs (Jaimini): more planets; more of Jupiter, Mercury and the lord with it;
// an exalted planet; lord in a sign of different oddity; dual > fixed > movable; the lord
// further advanced in its sign
export function strongerSign(chart, r1, r2) {
  const n1 = planetsIn(chart, r1).length;
  const n2 = planetsIn(chart, r2).length;
  if (n1 !== n2) return n1 > n2 ? r1 : r2;
  const j1 = jmlCount(chart, r1, SIGN_LORDS[r1]);
  const j2 = jmlCount(chart, r2, SIGN_LORDS[r2]);
  if (j1 !== j2) return j1 > j2 ? r1 : r2;
  const x1 = planetsIn(chart, r1).some(p => exaltedIn(p, r1, chart.rahuExaltation));
  const x2 = planetsIn(chart, r2).some(p => exaltedIn(p, r2, chart.rahuExaltation));
  if (x1 !== x2) return x1 ? r1 : r2;
  const odd1 = isOdd(r1) !== isOdd(chart.signs[SIGN_LORDS[r1]]);
  const odd2 = isOdd(r2) !== isOdd(chart.signs[SIGN_LORDS[r2]]);
  if (odd1 !== odd2) return odd1 ? r1 : r2;
  if (modalityRank(r1) !== modalityRank(r2)) return modalityRank(r1) > modalityRank(r2) ? r1 : r2;
  const l1 = signLord(chart, r1);
  const l2 = signLord(chart, r2);
  return chart.degrees[l1] > chart.degrees[l2] ? r1 : r2;
}

// Dasha years of a sign: count from the sign to its lord (forward for odd-footed signs,
// backward for even-footed ones) minus one; 12 when the lord is in the sign. `exaltation`
// adds a year for an exalted lord and takes one for a debilitated lord.
function signYears(chart, sign, { exaltation, duration = null }) {
  const [a, b] = CO_LORDS[sign] || [];
  if (a && chart.signs[a] === sign && chart.signs[b] === sign) return 12;
  const lord = signLord(chart, sign, duration);
  const at = chart.signs[lord];
  let years = ODD_FOOTED.has(sign) ? (at - sign + 12) % 12 : (sign - at + 12) % 12;
  if (years === 0) years = 12;
  if (exaltation) {
    if (exaltedIn(lord, at, chart.rahuExaltation)) years += 1;
    else if (debilitatedIn(lord, at, chart.rahuExaltation)) years -= 1;
  }
  return years;
}

// Twelve signs from `start`: movable signs step by one, fixed signs by five (every 6th sign),
// dual signs through the kendras first
function modalProgression(start, forward) {
  const dir = forward ? 1 : -1;
  if (MOVABLE.includes(start)) return Array.from({ length: 12 }, (_, i) => (start + dir * i + 120) % 12);
  if (FIXED.includes(start)) return Array.from({ length: 12 }, (_, i) => (start + dir * 5 * i + 120) % 12);
  const out = [];
  for (let g = 0; g < 3; g++) for (let i = 0; i < 4; i++) out.push((start + dir * (4 * g + 3 * i) + 120) % 12);
  return out;
}

// Narayana mahadasha order: movable signs consecutive, fixed signs every 6th sign, dual signs
// by trines (1st, 9th, 5th going forward) in groups a kendra apart
function narayanaProgression(start, forward) {
  const dir = forward ? 1 : -1;
  if (MOVABLE.includes(start)) return Array.from({ length: 12 }, (_, i) => (start + dir * i + 120) % 12);
  if (FIXED.includes(start)) return Array.from({ length: 12 }, (_, i) => (start + dir * 5 * i + 120) % 12);
  const out = [];
  for (let g = 0; g < 4; g++) for (let i = 0; i < 3; i++) out.push((start + dir * (3 * g - 4 * i) + 120) % 12);
  return out;
}

// Sign-based dasha from MD signs with years; with two cycles the second gives 12 - years
function signDashaRaw(order, yearsOf, subOrder, cycles = 2, horizon = HORIZON_YEARS) {
  const mahadashas = [];
  let cursor = 0;
  for (let cycle = 0; cycle < cycles && cursor < horizon; cycle++) {
    for (const sign of order) {
      const y = cycle === 0 ? yearsOf(sign) : Math.max(0, 12 - yearsOf(sign));
      if (y > 0) mahadashas.push({ sign, cycle: cycle + 1, start: cursor, end: cursor + y });
      cursor += y;
      if (cursor >= horizon) break;
    }
  }
  const sub = (parent) => {
    const part = (parent.end - parent.start) / 12;
    return subOrder(parent.sign).map((sign, i) => ({ sign, start: parent.start + i * part, end: parent.start + (i + 1) * part }));
  };
  return { mahadashas, sub, label: (p) => SIGN_ABBR[p.sign] };
}

// ---------------------------------------------------------------- Chara
export function charaRaw(chart, variant = 'kn_rao') {
  const ninth = (chart.lagna + 8) % 12;
  const forward = ODD_FOOTED.has(ninth);
  const order = Array.from({ length: 12 }, (_, i) => (chart.lagna + (forward ? i : -i) + 12) % 12);
  if (variant === 'pvn_rao') {
    const yearsOf = (s) => signYears(chart, s, { exaltation: false });
    // Antardashas from the stronger of the dasha sign and its 7th, modal progression,
    // forward from an odd sign
    const subOrder = (s) => {
      const seed = strongerSign(chart, s, (s + 6) % 12);
      return modalProgression(seed, isOdd(seed));
    };
    return { ...signDashaRaw(order, yearsOf, subOrder), direction: forward ? 'zodiacal' : 'anti-zodiacal' };
  }
  // K.N. Rao: one cycle; exalted lord +1 year, debilitated -1; antardashas from the next sign,
  // ending with the dasha sign
  const yearsOf = (s) => signYears(chart, s, { exaltation: true });
  const forwardAd = new Set([0, 4, 5, 6, 10, 11]);
  const subOrder = (s) => Array.from({ length: 12 }, (_, i) => (s + (forwardAd.has(s) ? 1 + i : -1 - i) + 120) % 12);
  return { ...signDashaRaw(order, yearsOf, subOrder, 1), direction: forward ? 'zodiacal' : 'anti-zodiacal' };
}

// ---------------------------------------------------------------- Narayana
// Starts from the stronger of the lagna and the 7th. Direction: odd sign forward; Saturn in the
// starting sign forces consecutive forward signs, Ketu in it reverses the direction.
export function narayanaRaw(chart) {
  const seed = strongerSign(chart, chart.lagna, (chart.lagna + 6) % 12);
  let order;
  let rule;
  if (chart.signs.Ketu === seed) {
    order = narayanaProgression(seed, !isOdd(seed));
    rule = 'Ketu in the first dasha sign reverses the direction';
  } else if (chart.signs.Saturn === seed) {
    order = Array.from({ length: 12 }, (_, i) => (seed + i) % 12);
    rule = 'Saturn in the first dasha sign: consecutive signs, zodiacal';
  } else {
    order = narayanaProgression(seed, isOdd(seed));
    rule = `${MOVABLE.includes(seed) ? 'movable: consecutive signs' : FIXED.includes(seed) ? 'fixed: every 6th sign' : 'dual: trines in kendra groups'}, ${isOdd(seed) ? 'zodiacal (odd sign)' : 'anti-zodiacal (even sign)'}`;
  }
  // Durations use the stronger co-lord by the plain rules; the antardasha seed also uses the
  // longer-dasha rule for co-lords
  const duration = (s) => signYears(chart, s, { exaltation: true });
  const yearsOf = duration;
  // Antardashas: from the stronger of the signs holding the lords of the dasha sign and its 7th;
  // forward from an odd sign, Saturn there forces forward, Ketu in the dasha sign reverses
  const subOrder = (s) => {
    const l1 = signLord(chart, s, duration);
    const l7 = signLord(chart, (s + 6) % 12, duration);
    const start = strongerSign(chart, chart.signs[l1], chart.signs[l7]);
    let dir = isOdd(start) ? 1 : -1;
    if (chart.signs.Saturn === start) dir = 1;
    if (chart.signs.Ketu === s) dir = -dir;
    return Array.from({ length: 12 }, (_, i) => (start + dir * i + 120) % 12);
  };
  return { ...signDashaRaw(order, yearsOf, subOrder), seed, rule };
}

// ---------------------------------------------------------------- Ashtottari applicability
// BPHS: Rahu in a kendra or trikona from the lagna lord, but not in the lagna. Also reported:
// the paksha rule (Krishna paksha by day or Shukla paksha by night).
export function ashtottariApplicability(chart, { shukla, dayBirth }) {
  const lagnaLord = signLord(chart, chart.lagna);
  const fromLord = houseFrom(chart.signs[lagnaLord], chart.signs.Rahu);
  const rahuRule = [1, 4, 5, 7, 9, 10].includes(fromLord) && chart.signs.Rahu !== chart.lagna;
  const pakshaRule = (shukla && !dayBirth) || (!shukla && dayBirth);
  return {
    applicable: rahuRule,
    rahu_rule: { passed: rahuRule, rahu_house_from_lagna_lord: fromLord, lagna_lord: lagnaLord, rahu_in_lagna: chart.signs.Rahu === chart.lagna },
    paksha_rule: { passed: pakshaRule, paksha: shukla ? 'shukla' : 'krishna', birth: dayBirth ? 'day' : 'night' },
  };
}
