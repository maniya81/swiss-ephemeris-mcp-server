// Planetary dignity, relationships, combustion, planetary war, motion and avasthas (BPHS)
import { SIGN_ABBR, SIGN_LORDS, SEVEN, norm360, signOf, houseFrom, round } from './constants.js';

// Deep exaltation points (sidereal longitude); debilitation is the opposite point
export const EXALTATION = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 };
// Moolatrikona ranges [sign, from°, to°] (BPHS)
export const MOOLATRIKONA = {
  Sun: [4, 0, 20], Moon: [1, 3, 30], Mars: [0, 0, 12], Mercury: [5, 15, 20],
  Jupiter: [8, 0, 10], Venus: [6, 0, 15], Saturn: [10, 0, 20],
};
export const OWN_SIGNS = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
// Natural (naisargika) relationships (BPHS); Rahu is treated like Saturn and Ketu like Mars
const NATURAL = {
  Sun: { friends: ['Moon', 'Mars', 'Jupiter'], enemies: ['Venus', 'Saturn'] },
  Moon: { friends: ['Sun', 'Mercury'], enemies: [] },
  Mars: { friends: ['Sun', 'Moon', 'Jupiter'], enemies: ['Mercury'] },
  Mercury: { friends: ['Sun', 'Venus'], enemies: ['Moon'] },
  Jupiter: { friends: ['Sun', 'Moon', 'Mars'], enemies: ['Mercury', 'Venus'] },
  Venus: { friends: ['Mercury', 'Saturn'], enemies: ['Sun', 'Moon'] },
  Saturn: { friends: ['Mercury', 'Venus'], enemies: ['Sun', 'Moon', 'Mars'] },
};
NATURAL.Rahu = NATURAL.Saturn;
NATURAL.Ketu = NATURAL.Mars;

export const DEFAULT_COMBUSTION = { Moon: 12, Mars: 17, Mercury: 14, Mercury_retrograde: 12, Jupiter: 11, Venus: 10, Venus_retrograde: 8, Saturn: 15 };
// Mean daily motion (degrees/day), for speed ratios
export const MEAN_SPEED = { Sun: 0.9856, Moon: 13.1764, Mars: 0.524, Mercury: 0.9856, Jupiter: 0.0831, Venus: 0.9856, Saturn: 0.0335, Rahu: -0.0529, Ketu: -0.0529 };
export const NATURAL_MALEFICS = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];

const RELATION_LABELS = { 2: 'adhimitra', 1: 'mitra', 0: 'sama', '-1': 'shatru', '-2': 'adhishatru' };
// Vimshopaka points out of 20 for each compound relationship (BPHS)
export const VIMSHOPAKA_POINTS = { own: 20, adhimitra: 18, mitra: 15, sama: 10, shatru: 7, adhishatru: 5 };

export function naturalRelation(planet, other) {
  if (planet === other) return 'self';
  const n = NATURAL[planet];
  if (n.friends.includes(other)) return 'friend';
  if (n.enemies.includes(other)) return 'enemy';
  return 'neutral';
}

// Temporary (tatkalika): friends occupy the 2nd, 3rd, 4th, 10th, 11th or 12th from the planet
export function temporaryRelation(planetSign, otherSign) {
  const h = houseFrom(planetSign, otherSign);
  return [2, 3, 4, 10, 11, 12].includes(h) ? 'friend' : 'enemy';
}

// Compound (panchadha) relationship of `planet` towards `other`, given D1 signs
export function compoundRelation(planet, other, signs) {
  if (planet === other) return 'own';
  const nat = { friend: 1, neutral: 0, enemy: -1 }[naturalRelation(planet, other)];
  const tmp = temporaryRelation(signs[planet], signs[other]) === 'friend' ? 1 : -1;
  return RELATION_LABELS[String(nat + tmp)];
}

// Relationship of a planet to the lord of a sign (own sign counts as 'own')
export function relationToSignLord(planet, sign, signs) {
  if ((OWN_SIGNS[planet] || []).includes(sign)) return 'own';
  const lord = SIGN_LORDS[sign];
  if (lord === planet) return 'own';
  return compoundRelation(planet, lord, signs);
}

const exaltedSign = (planet, rahuExaltation) => {
  if (planet === 'Rahu') return rahuExaltation === 'Ge' ? 2 : 1;
  if (planet === 'Ketu') return rahuExaltation === 'Ge' ? 8 : 7;
  return signOf(EXALTATION[planet]);
};

const angularDistance = (a, b) => {
  const d = Math.abs(norm360(a) - norm360(b)) % 360;
  return d > 180 ? 360 - d : d;
};

// Dignity block for every graha. `grahas` maps name -> { lon, lat, speed, mag }
export function computeDignity(grahas, lagnaLon, options = {}) {
  const rahuExaltation = options.rahu_exaltation || 'Ta';
  const combustion = { ...DEFAULT_COMBUSTION, ...(options.combustion_limits || {}) };
  const moolatrikona = { ...MOOLATRIKONA, ...(options.moolatrikona || {}) };
  const warWinner = options.war_winner || 'latitude';
  const stationaryRatio = options.stationary_ratio ?? 0.1;
  const names = Object.keys(grahas);
  const signs = Object.fromEntries(names.map(n => [n, signOf(grahas[n].lon)]));
  const lagnaSign = signOf(lagnaLon);
  const moonSign = signs.Moon;
  const sun = grahas.Sun;

  // Planetary war: Mars, Mercury, Jupiter, Venus, Saturn within 1° of longitude
  const warriors = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const wars = {};
  for (let i = 0; i < warriors.length; i++) {
    for (let j = i + 1; j < warriors.length; j++) {
      const a = warriors[i];
      const b = warriors[j];
      const orb = angularDistance(grahas[a].lon, grahas[b].lon);
      if (orb > 1) continue;
      // Latitude rule: the planet further north wins; brightness rule: the brighter (lower magnitude) wins
      const winner = warWinner === 'brightness'
        ? (grahas[a].mag <= grahas[b].mag ? a : b)
        : (grahas[a].lat >= grahas[b].lat ? a : b);
      for (const [p, q] of [[a, b], [b, a]]) {
        (wars[p] = wars[p] || []).push({ opponent: q, orb_deg: round(orb, 4), winner, won: winner === p });
      }
    }
  }

  const result = {};
  for (const name of names) {
    const g = grahas[name];
    const sign = signs[name];
    const degree = norm360(g.lon) % 30;
    const isNode = name === 'Rahu' || name === 'Ketu';
    const out = {};

    const exSign = exaltedSign(name, rahuExaltation);
    out.exalted = sign === exSign;
    out.debilitated = sign === (exSign + 6) % 12;
    if (!isNode) {
      out.from_deep_exaltation_deg = round(angularDistance(g.lon, EXALTATION[name]), 3);
      out.from_deep_debilitation_deg = round(angularDistance(g.lon, EXALTATION[name] + 180), 3);
    }
    const mt = moolatrikona[name];
    out.moolatrikona = Boolean(mt && sign === mt[0] && degree >= mt[1] && degree < mt[2]);
    out.own_sign = (OWN_SIGNS[name] || []).includes(sign);
    const lord = SIGN_LORDS[sign];
    out.sign_lord = lord;
    if (lord !== name) {
      out.relation_to_sign_lord = {
        natural: naturalRelation(name, lord),
        temporary: temporaryRelation(sign, signs[lord]),
        compound: compoundRelation(name, lord, signs),
      };
    }
    out.status = out.exalted ? 'exalted' : out.debilitated ? 'debilitated' : out.moolatrikona ? 'moolatrikona'
      : out.own_sign ? 'own sign' : `${out.relation_to_sign_lord ? out.relation_to_sign_lord.compound : 'own'} sign`;

    // Combustion: within the limit of the Sun's longitude
    if (name !== 'Sun' && !isNode) {
      const retro = g.speed < 0;
      const limit = (retro && combustion[`${name}_retrograde`]) || combustion[name];
      const orb = angularDistance(g.lon, sun.lon);
      out.combust = orb <= limit;
      out.combust_orb_deg = round(orb, 3);
      out.combust_limit_deg = limit;
    }

    if (wars[name]) out.graha_yuddha = wars[name];
    else if (warriors.includes(name)) out.graha_yuddha = null;

    out.retrograde = isNode ? true : g.speed < 0;
    out.speed_deg_per_day = round(g.speed, 4);
    out.speed_ratio = round(g.speed / MEAN_SPEED[name], 3);
    out.stationary = !isNode && name !== 'Sun' && name !== 'Moon' && Math.abs(g.speed / MEAN_SPEED[name]) < stationaryRatio;

    // Baladi: 6° bands; odd signs Bala->Mrita, even signs reversed
    const baladi = ['Bala', 'Kumara', 'Yuva', 'Vriddha', 'Mrita'];
    const band = Math.min(4, Math.floor(degree / 6));
    out.baladi = sign % 2 === 0 ? baladi[band] : baladi[4 - band];
    // Jagradadi: own/exalted = Jagrat; friendly or neutral sign = Swapna; enemy or debilitated = Sushupti
    const rel = out.relation_to_sign_lord ? out.relation_to_sign_lord.compound : 'own';
    out.jagradadi = out.exalted || out.own_sign || out.moolatrikona ? 'Jagrat'
      : out.debilitated || rel === 'shatru' || rel === 'adhishatru' ? 'Sushupti' : 'Swapna';
    // Deeptadi (BPHS): exalted Deepta, own Swastha, great friend Mudita, friend Shanta, neutral
    // Deena, enemy Dukhita, great enemy Khala; combust Kopa; with a natural malefic Vikala
    const deeptadi = [];
    if (out.exalted) deeptadi.push('Deepta');
    else if (out.own_sign || out.moolatrikona) deeptadi.push('Swastha');
    else deeptadi.push({ adhimitra: 'Mudita', mitra: 'Shanta', sama: 'Deena', shatru: 'Dukhita', adhishatru: 'Khala', own: 'Swastha' }[rel]);
    if (out.combust) deeptadi.push('Kopa');
    if (names.some(o => o !== name && NATURAL_MALEFICS.includes(o) && signs[o] === sign && !(isNode && (o === 'Rahu' || o === 'Ketu')))) deeptadi.push('Vikala');
    out.deeptadi = deeptadi;

    // Houses ruled, counted from the lagna and from the Moon
    if (!isNode) {
      out.lordships = {
        from_lagna: OWN_SIGNS[name].map(s => houseFrom(lagnaSign, s)).sort((a, b) => a - b),
        from_moon: OWN_SIGNS[name].map(s => houseFrom(moonSign, s)).sort((a, b) => a - b),
      };
    }
    result[name] = out;
  }
  return result;
}

// One-line summary per graha for compact output: status and the flags that change readings
// (avasthas and lordships are in the full output)
export function compactDignity(name, d) {
  const flags = [d.status.replace(' sign', '')];
  const isNode = name === 'Rahu' || name === 'Ketu';
  if (d.combust) flags.push(`combust ${d.combust_orb_deg}/${d.combust_limit_deg}°`);
  if (!isNode && d.retrograde) flags.push('R');
  if (d.stationary) flags.push('stationary');
  if (d.graha_yuddha) flags.push(...d.graha_yuddha.map(w => `war ${w.won ? 'won vs' : 'lost to'} ${w.opponent}`));
  return flags.join(', ');
}

export { SIGN_ABBR, SEVEN };
