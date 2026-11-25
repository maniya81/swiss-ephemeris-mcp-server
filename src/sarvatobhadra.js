// Sarvatobhadra Chakra (SBC): 28-nakshatra 9x9 perimeter grid with Abhijit and 3-ray Vedha
import { GRAHAS, PLANET_ABBR, norm360 } from './constants.js';
import { MEAN_SPEED } from './dignity.js';
import { toArcsec, normalizeNakshatraName, NAKSHATRA_ABBR } from './nakshatra-houses.js';
import { invalid } from './errors.js';

export const SBC_NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu',
  'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
  'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Abhijit', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

export const SBC_NAKSHATRA_ABBR = [
  ...NAKSHATRA_ABBR.slice(0, 21),
  'Abh',
  ...NAKSHATRA_ABBR.slice(21),
];

// Abhijit spans 4th pada of Uttara Ashadha (276°40'00") + 1/15th of Shravana (280°53'20")
export const ABHIJIT_START_ARCSEC = 996000;
export const ABHIJIT_END_ARCSEC = 1011200;
const ARCSEC_NAK = 48000;

const NAK_TO_ABBR = new Map(SBC_NAKSHATRAS.map((n, i) => [n, SBC_NAKSHATRA_ABBR[i]]));

// 9x9 perimeter grid coordinates (row 0..8, col 0..8)
const GRID = new Map();
const setCell = (r, c, name) => GRID.set(`${r},${c}`, name);

['Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha']
  .forEach((n, i) => setCell(0, 1 + i, n));
['Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha']
  .forEach((n, i) => setCell(1 + i, 8, n));
['Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Abhijit', 'Shravana']
  .forEach((n, i) => setCell(8, 7 - i, n));
['Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati', 'Ashwini', 'Bharani']
  .forEach((n, i) => setCell(7 - i, 0, n));

const VEDHA_TABLE = new Map();
for (const [key, name] of GRID.entries()) {
  const [r, c] = key.split(',').map(Number);
  let vama;
  let sammukha;
  let dakshina;
  if (r === 0) {
    vama = GRID.get(`${8 - c},8`);
    sammukha = GRID.get(`8,${c}`);
    dakshina = GRID.get(`${c},0`);
  } else if (c === 8) {
    vama = GRID.get(`8,${r}`);
    sammukha = GRID.get(`${r},0`);
    dakshina = GRID.get(`0,${8 - r}`);
  } else if (r === 8) {
    vama = GRID.get(`${8 - c},0`);
    sammukha = GRID.get(`0,${c}`);
    dakshina = GRID.get(`${c},8`);
  } else {
    vama = GRID.get(`0,${r}`);
    sammukha = GRID.get(`${r},8`);
    dakshina = GRID.get(`8,${8 - r}`);
  }
  VEDHA_TABLE.set(name, { vama, sammukha, dakshina });
}

const DIRECTION_ABBR = { vama: 'V', sammukha: 'S', dakshina: 'D' };

/** Map a sidereal longitude (degrees) to its 28-nakshatra SBC placement. */
export function sbcNakshatraOf(lon) {
  const L = toArcsec(lon);
  if (L >= ABHIJIT_START_ARCSEC && L < ABHIJIT_END_ARCSEC) {
    return { index: 21, name: 'Abhijit', abbr: 'Abh', in_abhijit: true };
  }
  const idx27 = Math.floor(L / ARCSEC_NAK);
  const idx = idx27 <= 20 ? idx27 : idx27 + 1;
  return { index: idx, name: SBC_NAKSHATRAS[idx], abbr: SBC_NAKSHATRA_ABBR[idx], in_abhijit: false };
}

/** Normalize any of the 28 SBC nakshatra names (including "Abhijit"/"Abh"). */
export function normalizeSbcNakshatraName(input) {
  if (typeof input === 'string') {
    const key = input.trim().toLowerCase();
    if (key === 'abhijit' || key === 'abh') {
      return { index: 21, name: 'Abhijit', abbr: 'Abh' };
    }
  }
  const { index, name } = normalizeNakshatraName(input);
  const idx = index <= 20 ? index : index + 1;
  return { index: idx, name, abbr: SBC_NAKSHATRA_ABBR[idx] };
}

/** Return the 3 Vedha target nakshatras { vama, sammukha, dakshina } for an SBC nakshatra. */
export function sbcVedhaTargets(nakName) {
  const { name } = normalizeSbcNakshatraName(nakName);
  return { ...VEDHA_TABLE.get(name) };
}

function planetNature(planet, sunLon, moonLon) {
  if (planet === 'Jupiter' || planet === 'Venus' || planet === 'Mercury') return 'benefic';
  if (planet === 'Moon') return norm360(moonLon - sunLon) < 180 ? 'benefic' : 'malefic';
  return 'malefic';
}

function planetMotion(planet, speed) {
  if (planet === 'Rahu' || planet === 'Ketu') return 'retrograde';
  if (planet === 'Sun' || planet === 'Moon') return 'direct';
  if (speed < 0) return 'retrograde';
  if (speed > MEAN_SPEED[planet] * 1.1) return 'fast';
  return 'direct';
}

function activeDirections(planet, speed, mode) {
  const motion = planetMotion(planet, speed);
  if (mode === 'all') return { motion, directions: ['vama', 'sammukha', 'dakshina'] };
  if (planet === 'Rahu' || planet === 'Ketu' || motion === 'retrograde') {
    return { motion, directions: ['dakshina'] };
  }
  if (motion === 'fast') return { motion, directions: ['vama'] };
  return { motion, directions: ['sammukha'] };
}

function buildCastEntries(grahas, mode) {
  const sunLon = grahas.Sun.lon;
  const moonLon = grahas.Moon.lon;
  const planets = {};
  const casts = [];

  for (const name of GRAHAS) {
    const g = grahas[name];
    const nak = sbcNakshatraOf(g.lon);
    const nature = planetNature(name, sunLon, moonLon);
    const { motion, directions } = activeDirections(name, g.speed ?? 0, mode);
    const vedha = VEDHA_TABLE.get(nak.name);
    const active_vedha = Object.fromEntries(directions.map(d => [d, vedha[d]]));

    planets[name] = {
      nakshatra: nak.name,
      abbr: nak.abbr,
      in_abhijit: nak.in_abhijit,
      nature,
      motion,
      active_directions: directions,
      vedha: { ...vedha },
      active_vedha,
    };

    for (const d of directions) {
      casts.push({
        from: name,
        from_nakshatra: nak.name,
        target_nakshatra: vedha[d],
        direction: d,
        nature,
      });
    }
  }

  return { planets, casts };
}

function collectIncomingByNak(casts) {
  const byNak = {};
  for (const c of casts) {
    if (!byNak[c.target_nakshatra]) byNak[c.target_nakshatra] = [];
    byNak[c.target_nakshatra].push({
      from: c.from,
      from_nakshatra: c.from_nakshatra,
      direction: c.direction,
      nature: c.nature,
    });
  }
  return byNak;
}

/**
 * Compute natal Sarvatobhadra Chakra placements and Vedha relationships.
 * @param {object} grahas - Natal grahas map ({ Sun: { lon, speed }, ... })
 * @param {number} lagnaLon - Natal Lagna sidereal longitude
 * @param {object} [options]
 * @param {'all'|'speed'} [options.mode='all'] - 'all' (Deepanshu Giri 3-ray default) or 'speed'
 * @param {string} [options.locate] - Optional nakshatra name to inspect
 */
export function computeSarvatobhadra(grahas, lagnaLon, options = {}) {
  const mode = options.mode || 'all';
  if (mode !== 'all' && mode !== 'speed') {
    throw invalid('sbc_mode', 'sbc_mode must be "all" or "speed"');
  }

  const lagnaNak = sbcNakshatraOf(lagnaLon);
  const { planets, casts } = buildCastEntries(grahas, mode);
  const vedha_by_nakshatra = collectIncomingByNak(casts);

  const vedha_on_natal = {
    Lagna: (vedha_by_nakshatra[lagnaNak.name] || []).map(v => ({ ...v })),
    Moon: (vedha_by_nakshatra[planets.Moon.nakshatra] || []).filter(v => v.from !== 'Moon'),
  };
  for (const name of GRAHAS) {
    if (name === 'Moon') continue;
    const hits = (vedha_by_nakshatra[planets[name].nakshatra] || []).filter(v => v.from !== name);
    if (hits.length) vedha_on_natal[name] = hits;
  }

  const out = {
    mode,
    lagna_nakshatra: lagnaNak.name,
    moon_nakshatra: planets.Moon.nakshatra,
    planets,
    vedha_by_nakshatra,
    vedha_on_natal,
  };

  if (options.locate !== undefined) {
    const loc = normalizeSbcNakshatraName(options.locate);
    out.locate = {
      nakshatra: loc.name,
      vedha_targets: sbcVedhaTargets(loc.name),
      incoming_vedha: (vedha_by_nakshatra[loc.name] || []).map(v => ({ ...v })),
    };
  }

  return out;
}

/**
 * Compute transit-to-natal Sarvatobhadra Chakra Vedha hits.
 */
export function computeTransitSarvatobhadra(natalGrahas, natalLagnaLon, transitGrahas, options = {}) {
  const mode = options.mode || 'all';
  if (mode !== 'all' && mode !== 'speed') {
    throw invalid('sbc_mode', 'sbc_mode must be "all" or "speed"');
  }

  const natalPoints = {
    Lagna: sbcNakshatraOf(natalLagnaLon).name,
    ...Object.fromEntries(GRAHAS.map(g => [g, sbcNakshatraOf(natalGrahas[g].lon).name])),
  };

  const { planets: transitPlanets, casts } = buildCastEntries(transitGrahas, mode);
  const byNak = collectIncomingByNak(casts);

  const hits_on_natal = {
    Lagna: (byNak[natalPoints.Lagna] || []).map(v => ({ ...v })),
    Moon: (byNak[natalPoints.Moon] || []).map(v => ({ ...v })),
  };
  for (const g of GRAHAS) {
    if (g === 'Moon') continue;
    const hits = byNak[natalPoints[g]] || [];
    if (hits.length) hits_on_natal[g] = hits.map(v => ({ ...v }));
  }

  return {
    mode,
    transit_planets: transitPlanets,
    hits_on_natal,
  };
}

const fmtHit = (v) => `${PLANET_ABBR[v.from]}${v.nature === 'benefic' ? '+' : '-'}(${DIRECTION_ABBR[v.direction]})`;
const fmtTarget = (dir, nak) => `${DIRECTION_ABBR[dir]}:${NAK_TO_ABBR.get(nak)}`;

/** Compact single-line-per-item representation of natal SBC for output: "chain". */
export function compactSarvatobhadra(sbc) {
  const planets = Object.fromEntries(
    Object.entries(sbc.planets).map(([name, p]) => {
      const rays = p.active_directions.map(d => fmtTarget(d, p.active_vedha[d])).join(',');
      return [name, `${p.abbr}${p.in_abhijit ? '*' : ''}${p.nature === 'benefic' ? '+' : '-'} -> ${rays}`];
    }),
  );
  const vedha_on_natal = Object.fromEntries(
    Object.entries(sbc.vedha_on_natal).map(([target, hits]) => [
      target,
      hits.length ? hits.map(fmtHit).join(' ') : 'none',
    ]),
  );
  const out = {
    mode: sbc.mode,
    lagna_nakshatra: NAK_TO_ABBR.get(sbc.lagna_nakshatra),
    moon_nakshatra: NAK_TO_ABBR.get(sbc.moon_nakshatra),
    planets,
    vedha_on_natal,
    legend: '+/- = benefic/malefic, * = Abhijit, V/S/D = Vama/Sammukha/Dakshina',
  };
  if (sbc.locate) {
    const t = sbc.locate.vedha_targets;
    out.locate = `${sbc.locate.nakshatra} (${NAK_TO_ABBR.get(sbc.locate.nakshatra)}): targets V:${NAK_TO_ABBR.get(t.vama)}, S:${NAK_TO_ABBR.get(t.sammukha)}, D:${NAK_TO_ABBR.get(t.dakshina)}; incoming: ${sbc.locate.incoming_vedha.length ? sbc.locate.incoming_vedha.map(fmtHit).join(' ') : 'none'}`;
  }
  return out;
}

/** Compact representation of transit-to-natal SBC for output: "chain". */
export function compactTransitSarvatobhadra(tsbc) {
  const hits_on_natal = Object.fromEntries(
    Object.entries(tsbc.hits_on_natal).map(([target, hits]) => [
      target,
      hits.length ? hits.map(fmtHit).join(' ') : 'none',
    ]),
  );
  return {
    mode: tsbc.mode,
    hits_on_natal,
    legend: '+/- = benefic/malefic, V/S/D = Vama/Sammukha/Dakshina',
  };
}
