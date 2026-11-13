import { SIGNS, SIGN_ABBR, NAKSHATRAS, DASHA_ORDER, PLANET_ABBR, round } from './constants.js';
import { invalid } from './errors.js';

export const NAKSHATRA_ABBR = [
  'Ash', 'Bha', 'Kri', 'Roh', 'Mri', 'Ard', 'Pun', 'Pus', 'Asl',
  'Mag', 'PPh', 'UPh', 'Has', 'Chi', 'Swa', 'Vis', 'Anu', 'Jye',
  'Mul', 'PAs', 'UAs', 'Shr', 'Dha', 'Sha', 'PBh', 'UBh', 'Rev',
];

const ARCSEC_CIRCLE = 1296000;
const ARCSEC_SIGN = 108000;
const ARCSEC_NAK = 48000;
const ARCSEC_PADA = 12000;
const NTH_FROM_LIST = [3, 4, 5, 7, 8];

const SIGN_ALIASES = new Map();
SIGNS.forEach((name, i) => {
  SIGN_ALIASES.set(name.toLowerCase(), i);
  SIGN_ALIASES.set(SIGN_ABBR[i].toLowerCase(), i);
  SIGN_ALIASES.set(name.slice(0, 3).toLowerCase(), i);
});
// Extra common 3-letter variants
SIGN_ALIASES.set('ari', 0);
SIGN_ALIASES.set('tau', 1);
SIGN_ALIASES.set('gem', 2);
SIGN_ALIASES.set('can', 3);
SIGN_ALIASES.set('leo', 4);
SIGN_ALIASES.set('vir', 5);
SIGN_ALIASES.set('lib', 6);
SIGN_ALIASES.set('sco', 7);
SIGN_ALIASES.set('sag', 8);
SIGN_ALIASES.set('cap', 9);
SIGN_ALIASES.set('aqu', 10);
SIGN_ALIASES.set('pis', 11);

const NAKSHATRA_ALIASES = new Map();
NAKSHATRAS.forEach((name, i) => {
  NAKSHATRA_ALIASES.set(name.toLowerCase(), i);
  NAKSHATRA_ALIASES.set(name.toLowerCase().replace(/\s+/g, ''), i);
  NAKSHATRA_ALIASES.set(NAKSHATRA_ABBR[i].toLowerCase(), i);
});
for (const [alias, name] of [
  ['aswini', 'Ashwini'],
  ['ashvini', 'Ashwini'],
  ['asvini', 'Ashwini'],
  ['krithika', 'Krittika'],
  ['mrigasira', 'Mrigashira'],
  ['mrigashirsha', 'Mrigashira'],
  ['ardhra', 'Ardra'],
  ['aslesha', 'Ashlesha'],
  ['makha', 'Magha'],
  ['poorva phalguni', 'Purva Phalguni'],
  ['purva phalguni', 'Purva Phalguni'],
  ['uttara phalguni', 'Uttara Phalguni'],
  ['hastha', 'Hasta'],
  ['chithra', 'Chitra'],
  ['swathi', 'Swati'],
  ['visakha', 'Vishakha'],
  ['jyeshta', 'Jyeshtha'],
  ['moola', 'Mula'],
  ['poorva ashadha', 'Purva Ashadha'],
  ['purva ashadha', 'Purva Ashadha'],
  ['uttara ashadha', 'Uttara Ashadha'],
  ['sravana', 'Shravana'],
  ['dhanishtha', 'Dhanishta'],
  ['shatabhishak', 'Shatabhisha'],
  ['satabhishak', 'Shatabhisha'],
  ['satabhisha', 'Shatabhisha'],
  ['shatataraka', 'Shatabhisha'],
  ['purva bhadra', 'Purva Bhadrapada'],
  ['poorva bhadra', 'Purva Bhadrapada'],
  ['poorva bhadrapada', 'Purva Bhadrapada'],
  ['uttara bhadra', 'Uttara Bhadrapada'],
  ['revathi', 'Revati'],
]) {
  const idx = NAKSHATRAS.indexOf(name);
  NAKSHATRA_ALIASES.set(alias, idx);
  NAKSHATRA_ALIASES.set(alias.replace(/\s+/g, ''), idx);
}

/** Convert sidereal longitude in degrees to integer arc-seconds in [0, 1296000). */
export function toArcsec(lon) {
  return ((Math.round(lon * 3600) % ARCSEC_CIRCLE) + ARCSEC_CIRCLE) % ARCSEC_CIRCLE;
}

/** Format an integer arc-second offset within a sign (0..108000) as D°MM'SS". */
export function formatArcsecDms(arcsec, padDeg = false) {
  const d = Math.floor(arcsec / 3600);
  const m = Math.floor((arcsec % 3600) / 60);
  const s = arcsec % 60;
  const degStr = padDeg ? String(d).padStart(2, '0') : String(d);
  return `${degStr}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
}

/** Format a small arc-second margin as M'SS". */
export function formatMinSec(arcsec) {
  const m = Math.floor(arcsec / 60);
  const s = arcsec % 60;
  return `${m}'${String(s).padStart(2, '0')}"`;
}

/** Decode integer arc-seconds L into all nakshatra-pada, charan and navamsa attributes. */
export function decodeArcsec(L) {
  const signIndex = Math.floor(L / ARCSEC_SIGN);
  const inSignArcsec = L % ARCSEC_SIGN;
  const nakshatraIndex = Math.floor(L / ARCSEC_NAK);
  const pada = Math.floor((L % ARCSEC_NAK) / ARCSEC_PADA) + 1;
  const charan = Math.floor(inSignArcsec / ARCSEC_PADA) + 1;
  const navamsaIndex = Math.floor(L / ARCSEC_PADA) % 12;
  const navamsaDegArcsec = (L % ARCSEC_PADA) * 9;
  const lord = DASHA_ORDER[nakshatraIndex % 9];
  const offsetInPada = L % ARCSEC_PADA;
  const marginArcsec = Math.min(offsetInPada, ARCSEC_PADA - offsetInPada);
  return {
    L,
    signIndex,
    sign: SIGNS[signIndex],
    signAbbr: SIGN_ABBR[signIndex],
    inSignArcsec,
    dms: formatArcsecDms(inSignArcsec),
    pos: `${SIGN_ABBR[signIndex]} ${formatArcsecDms(inSignArcsec)}`,
    nakshatraIndex,
    nakshatra: NAKSHATRAS[nakshatraIndex],
    nakshatraAbbr: NAKSHATRA_ABBR[nakshatraIndex],
    pada,
    charan,
    navamsaIndex,
    navamsa: SIGNS[navamsaIndex],
    navamsaAbbr: SIGN_ABBR[navamsaIndex],
    navamsaDegArcsec,
    navamsaDms: formatArcsecDms(navamsaDegArcsec),
    lord,
    marginArcsec,
  };
}

/** Parse a lagna degree input (string like "Cn 6°23'15\"", "Leo 11 10", or object {sign, deg, min, sec}). */
export function parseLagnaInput(lagna) {
  if (lagna && typeof lagna === 'object' && !Array.isArray(lagna)) {
    const signKey = String(lagna.sign ?? '').trim().toLowerCase();
    const signIndex = SIGN_ALIASES.get(signKey);
    if (signIndex === undefined) {
      throw invalid('lagna', `Unknown sign "${lagna.sign}" in lagna object`);
    }
    const degVal = lagna.deg ?? lagna.degree;
    const minVal = lagna.min ?? lagna.minute ?? 0;
    const secVal = lagna.sec ?? lagna.second ?? 0;
    if (typeof degVal !== 'number' || !Number.isFinite(degVal) || degVal < 0 || degVal >= 30) {
      throw invalid('lagna', 'lagna.deg must be a number in [0, 30)');
    }
    if (typeof minVal !== 'number' || !Number.isFinite(minVal) || minVal < 0 || minVal >= 60) {
      throw invalid('lagna', 'lagna.min must be a number in [0, 60)');
    }
    if (typeof secVal !== 'number' || !Number.isFinite(secVal) || secVal < 0 || secVal >= 60) {
      throw invalid('lagna', 'lagna.sec must be a number in [0, 60)');
    }
    return signIndex * 30 + degVal + minVal / 60 + secVal / 3600;
  }

  if (typeof lagna !== 'string' || !lagna.trim()) {
    throw invalid('lagna', 'lagna must be a string like "Cn 6°23\'15\\"" or {"sign":"Cancer","deg":6,"min":23,"sec":15}');
  }

  const raw = lagna.trim();
  // Accept sign at the beginning or end, with DMS symbols (° ' " ′ ″) or whitespace-separated numbers
  const matchStart = raw.match(/^([A-Za-z]+)\s+(.+)$/);
  const matchEnd = raw.match(/^(.+?)\s+([A-Za-z]+)$/);

  let signIndex;
  let numStr;
  if (matchStart && SIGN_ALIASES.has(matchStart[1].toLowerCase())) {
    signIndex = SIGN_ALIASES.get(matchStart[1].toLowerCase());
    numStr = matchStart[2];
  } else if (matchEnd && SIGN_ALIASES.has(matchEnd[2].toLowerCase())) {
    signIndex = SIGN_ALIASES.get(matchEnd[2].toLowerCase());
    numStr = matchEnd[1];
  } else {
    throw invalid('lagna', `Could not parse sign in lagna "${lagna}". Use e.g. "Cn 6°23'15\\"" or "Cancer 6 23 15"`);
  }

  const cleaned = numStr
    .replace(/[°'′"″:]/g, ' ')
    .trim();
  const parts = cleaned ? cleaned.split(/\s+/) : [];
  if (parts.length < 1 || parts.length > 3 || parts.some(p => !/^\d+(?:\.\d+)?$/.test(p))) {
    throw invalid('lagna', `Could not parse degrees/minutes/seconds in lagna "${lagna}"`);
  }
  const deg = Number(parts[0]);
  const min = parts[1] !== undefined ? Number(parts[1]) : 0;
  const sec = parts[2] !== undefined ? Number(parts[2]) : 0;
  if (deg < 0 || deg >= 30 || min < 0 || min >= 60 || sec < 0 || sec >= 60) {
    throw invalid('lagna', `Lagna degree out of range in "${lagna}" (need 0 <= deg < 30, 0 <= min < 60, 0 <= sec < 60)`);
  }
  return signIndex * 30 + deg + min / 60 + sec / 3600;
}

/** Normalize a nakshatra name (including common spellings) to { index, name }. */
export function normalizeNakshatraName(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw invalid('locate', 'locate must be one of the 27 nakshatra names, e.g. "Ashwini"');
  }
  const key = input.trim().toLowerCase().replace(/\s+/g, ' ');
  let index = NAKSHATRA_ALIASES.get(key);
  if (index === undefined) index = NAKSHATRA_ALIASES.get(key.replace(/\s+/g, ''));
  if (index === undefined) {
    throw invalid('locate', `Unknown nakshatra "${input}" for locate. Use one of: ${NAKSHATRAS.join(', ')}`);
  }
  return { index, name: NAKSHATRAS[index] };
}

/** Return the nakshatra/pada spans inside a zodiac sign (0..11), grouped by nakshatra. */
export function signNakshatraContents(signIndex) {
  const groups = [];
  const startGlobalPada = 9 * signIndex;
  for (let k = 0; k < 9; k++) {
    const gPada = startGlobalPada + k;
    const nakIdx = Math.floor(gPada / 4);
    const pada = (gPada % 4) + 1;
    const fromArcsec = k * ARCSEC_PADA;
    const toArcsec = (k + 1) * ARCSEC_PADA;
    const last = groups[groups.length - 1];
    if (last && last.nakIndex === nakIdx) {
      last.padas.push(pada);
      last.to_arcsec = toArcsec;
      last.to_dms = formatArcsecDms(toArcsec);
    } else {
      groups.push({
        nakIndex: nakIdx,
        name: NAKSHATRAS[nakIdx],
        lord: DASHA_ORDER[nakIdx % 9],
        padas: [pada],
        from_arcsec: fromArcsec,
        to_arcsec: toArcsec,
        from_dms: formatArcsecDms(fromArcsec),
        to_dms: formatArcsecDms(toArcsec),
      });
    }
  }
  return groups.map(({ nakIndex: _n, from_arcsec, to_arcsec, ...g }) => ({
    ...g,
    from_arcsec,
    to_arcsec,
    summary: g.padas.length === 1
      ? `${g.name} ${g.padas[0]}`
      : `${g.name} ${g.padas[0]}-${g.padas[g.padas.length - 1]}`,
  }));
}

/** Segments (1 or 2 signs) covered by nakshatra `nakIndex` (0..26). */
function nakshatraSignSegments(nakIndex) {
  const startL = nakIndex * ARCSEC_NAK;
  const endL = startL + ARCSEC_NAK;
  const s0 = Math.floor(startL / ARCSEC_SIGN);
  const s1 = Math.floor((endL - 1) / ARCSEC_SIGN);
  if (s0 === s1) {
    return [{
      signIndex: s0,
      fromArcsec: startL - s0 * ARCSEC_SIGN,
      toArcsec: endL - s0 * ARCSEC_SIGN,
      padas: [1, 2, 3, 4],
    }];
  }
  const split = s1 * ARCSEC_SIGN;
  const padasFirst = Math.round((split - startL) / ARCSEC_PADA);
  const allPadas = [1, 2, 3, 4];
  return [
    {
      signIndex: s0,
      fromArcsec: startL - s0 * ARCSEC_SIGN,
      toArcsec: ARCSEC_SIGN,
      padas: allPadas.slice(0, padasFirst),
    },
    {
      signIndex: s1,
      fromArcsec: 0,
      toArcsec: endL - s1 * ARCSEC_SIGN,
      padas: allPadas.slice(padasFirst),
    },
  ];
}

function nakshatrasInSpan(signIndex, fromArcsec, toArcsec) {
  return signNakshatraContents(signIndex)
    .filter(g => g.to_arcsec > fromArcsec && g.from_arcsec < toArcsec)
    .map((g) => {
      const lo = Math.max(g.from_arcsec, fromArcsec);
      const hi = Math.min(g.to_arcsec, toArcsec);
      const kStart = Math.round((lo - g.from_arcsec) / ARCSEC_PADA);
      const kEnd = Math.round((hi - g.from_arcsec) / ARCSEC_PADA);
      const padas = g.padas.slice(kStart, kEnd);
      return {
        name: g.name,
        lord: g.lord,
        padas,
        from_dms: formatArcsecDms(lo),
        to_dms: formatArcsecDms(hi),
      };
    });
}

/**
 * Pure function (no ephemeris calls) implementing Deepanshu Giri's nakshatra-pada house map.
 * Takes a sidereal lagna longitude (degrees) or lagna string/object, plus optional planets.
 */
export function computeNakshatraHouseMap(lagnaInput, options = {}) {
  const lagnaLon = typeof lagnaInput === 'number' ? lagnaInput : parseLagnaInput(lagnaInput);
  if (typeof lagnaLon !== 'number' || !Number.isFinite(lagnaLon)) {
    throw invalid('lagna', 'lagna longitude must be a finite number');
  }

  const lagnaInfo = decodeArcsec(toArcsec(lagnaLon));
  const lagnaSign = lagnaInfo.signIndex;
  const inSignArcsec = lagnaInfo.inSignArcsec;
  const lagnaCharan = lagnaInfo.charan;

  // Decode planets (optional)
  const decodedPlanets = [];
  if (options.planets) {
    for (const [name, p] of Object.entries(options.planets)) {
      const lon = typeof p === 'number' ? p : (p.longitude ?? p.lon);
      if (typeof lon !== 'number' || !Number.isFinite(lon)) continue;
      const speed = typeof p === 'object' && typeof p.speed === 'number' ? p.speed : null;
      const isNode = name === 'Rahu' || name === 'Ketu';
      const retrograde = typeof p === 'object' && typeof p.retrograde === 'boolean'
        ? p.retrograde
        : (isNode ? true : (speed !== null ? speed < 0 : false));
      const d = decodeArcsec(toArcsec(lon));
      const house = ((d.signIndex - lagnaSign + 12) % 12) + 1;
      const marginHours = speed !== null && Math.abs(speed) > 0
        ? round(d.marginArcsec / (Math.abs(speed) * 150), 2)
        : null;
      decodedPlanets.push({
        name,
        ...d,
        house,
        retrograde,
        marginHours,
        borderline: marginHours !== null ? marginHours < 0.25 : false,
      });
    }
  }

  const houses = [];
  const vargottamaCusps = [];

  for (let h = 1; h <= 12; h++) {
    const signIdx = (lagnaSign + h - 1) % 12;
    const Lc = signIdx * ARCSEC_SIGN + inSignArcsec;
    const cusp = decodeArcsec(Lc);

    // Sanity check (Giri rule): every cusp carries the lagna's charan number (1..9)
    if (cusp.charan !== lagnaCharan) {
      throw new Error(`Charan invariant violated on house ${h}: expected ${lagnaCharan}, got ${cusp.charan}`);
    }

    const vargottama = cusp.navamsaIndex === signIdx;
    const expectedVargottama = (signIdx % 3 === 0 && lagnaCharan === 1)
      || (signIdx % 3 === 1 && lagnaCharan === 5)
      || (signIdx % 3 === 2 && lagnaCharan === 9);
    if (vargottama !== expectedVargottama) {
      throw new Error(`Vargottama invariant violated on house ${h}`);
    }
    if (vargottama) {
      vargottamaCusps.push({ house: h, sign: cusp.sign, nakshatra: cusp.nakshatra, pada: cusp.pada });
    }

    const signContents = signNakshatraContents(signIdx).map(({ from_arcsec: _f, to_arcsec: _t, ...rest }) => rest);
    const housePlanets = decodedPlanets
      .filter(p => p.house === h)
      .map(p => ({
        name: p.name,
        pos: p.pos,
        dms: p.dms,
        nakshatra: p.nakshatra,
        pada: p.pada,
        lord: p.lord,
        navamsa: p.navamsa,
        retrograde: p.retrograde,
        margin_arcsec: p.marginArcsec,
        margin_hours: p.marginHours,
        borderline: p.borderline,
      }));

    houses.push({
      house: h,
      sign: cusp.sign,
      sign_abbr: cusp.signAbbr,
      cusp_longitude: round(Lc / 3600, 6),
      cusp_dms: cusp.dms,
      cusp: `${formatArcsecDms(inSignArcsec, true)} ${cusp.sign}`,
      cusp_nakshatra: cusp.nakshatra,
      cusp_pada: cusp.pada,
      cusp_lord: cusp.lord,
      cusp_navamsa: cusp.navamsa,
      cusp_navamsa_abbr: cusp.navamsaAbbr,
      cusp_navamsa_deg: round(cusp.navamsaDegArcsec / 3600, 4),
      cusp_navamsa_dms: cusp.navamsaDms,
      vargottama,
      nakshatras: signContents,
      planets: housePlanets,
    });
  }

  // Edge safety & warnings
  const warnings = [];
  const charanWindow = options.charanWindow || null;
  let borderline = false;

  if (charanWindow) {
    const { seconds_before: sb, seconds_after: sa } = charanWindow;
    if (sb < 30 || sa < 30) {
      borderline = true;
      if (sa < 30) {
        warnings.push(`All 12 cusps change pada if the birth time is ${sa} s later.`);
      }
      if (sb < 30) {
        warnings.push(`All 12 cusps change pada if the birth time is ${sb} s earlier.`);
      }
    }
  } else {
    // Lagna-only mode: warn when the lagna is within 5 arc-minutes (300") of a pada edge
    if (lagnaInfo.marginArcsec <= 300) {
      borderline = true;
      warnings.push(
        `Lagna is ${formatMinSec(lagnaInfo.marginArcsec)} (${lagnaInfo.marginArcsec}") from the nearest pada edge; all 12 cusps change pada across this boundary.`
      );
    }
  }

  const planetsSummary = options.planets
    ? decodedPlanets.map(p => ({
      name: p.name,
      pos: p.pos,
      dms: p.dms,
      house: p.house,
      nakshatra: p.nakshatra,
      pada: p.pada,
      lord: p.lord,
      navamsa: p.navamsa,
      retrograde: p.retrograde,
      margin_arcsec: p.marginArcsec,
      margin_hours: p.marginHours,
      borderline: p.borderline,
    }))
    : null;

  if (planetsSummary) {
    for (const p of planetsSummary) {
      if (p.borderline) {
        warnings.push(`${p.name} is ${p.margin_arcsec}" (${p.margin_hours} h) from a nakshatra pada edge.`);
      }
    }
  }

  let locateResult;
  if (options.locate !== undefined && options.locate !== null) {
    const target = normalizeNakshatraName(options.locate);
    const segments = nakshatraSignSegments(target.index).map((seg) => {
      const houseNum = ((seg.signIndex - lagnaSign + 12) % 12) + 1;
      const hObj = houses[houseNum - 1];
      const onCuspHere = hObj.cusp_nakshatra === target.name;
      const planetsHere = decodedPlanets
        .filter(p => p.nakshatraIndex === target.index && p.signIndex === seg.signIndex)
        .map(p => ({
          name: p.name,
          pos: p.pos,
          dms: p.dms,
          nakshatra: p.nakshatra,
          pada: p.pada,
          navamsa: p.navamsa,
          retrograde: p.retrograde,
          house: houseNum,
        }));
      return {
        house: houseNum,
        sign: SIGNS[seg.signIndex],
        padas: seg.padas,
        from_dms: formatArcsecDms(seg.fromArcsec),
        to_dms: formatArcsecDms(seg.toArcsec),
        on_cusp: onCuspHere,
        cusp_pada: onCuspHere ? hObj.cusp_pada : null,
        planets: planetsHere,
      };
    });

    const houseNumbers = segments.map(s => s.house);
    const cuspSeg = segments.find(s => s.on_cusp) || null;
    const locatePlanets = segments.flatMap(s => s.planets);

    const nthFrom = {};
    for (const nth of NTH_FROM_LIST) {
      const spans = nakshatraSignSegments(target.index).map((seg) => {
        const targetSign = (seg.signIndex + nth - 1) % 12;
        const targetHouse = ((targetSign - lagnaSign + 12) % 12) + 1;
        const hObj = houses[targetHouse - 1];
        const cuspInSpan = inSignArcsec >= seg.fromArcsec && inSignArcsec < seg.toArcsec;
        const spanPlanets = decodedPlanets
          .filter(p => p.signIndex === targetSign && p.inSignArcsec >= seg.fromArcsec && p.inSignArcsec < seg.toArcsec)
          .map(p => ({
            name: p.name,
            pos: p.pos,
            dms: p.dms,
            nakshatra: p.nakshatra,
            pada: p.pada,
            navamsa: p.navamsa,
            retrograde: p.retrograde,
            house: targetHouse,
          }));
        return {
          house: targetHouse,
          sign: SIGNS[targetSign],
          from_dms: formatArcsecDms(seg.fromArcsec),
          to_dms: formatArcsecDms(seg.toArcsec),
          nakshatras: nakshatrasInSpan(targetSign, seg.fromArcsec, seg.toArcsec),
          on_cusp: cuspInSpan,
          cusp_pada: cuspInSpan ? hObj.cusp_pada : null,
          cusp_nakshatra: cuspInSpan ? hObj.cusp_nakshatra : null,
          planets: spanPlanets,
        };
      });
      if (spans.length === 1) {
        nthFrom[nth] = { nth, ...spans[0] };
      } else {
        nthFrom[nth] = {
          nth,
          houses: spans.map(s => s.house),
          signs: spans.map(s => s.sign),
          on_cusp: spans.some(s => s.on_cusp),
          planets: spans.flatMap(s => s.planets),
          spans,
        };
      }
    }

    locateResult = {
      nakshatra: target.name,
      lord: DASHA_ORDER[target.index % 9],
      house: houseNumbers.length === 1 ? houseNumbers[0] : houseNumbers,
      houses: houseNumbers,
      on_cusp: Boolean(cuspSeg),
      cusp_pada: cuspSeg ? cuspSeg.cusp_pada : null,
      cusp_house: cuspSeg ? cuspSeg.house : null,
      cusp_in: segments.map(s => ({
        house: s.house,
        sign: s.sign,
        cusp_nakshatra: houses[s.house - 1].cusp_nakshatra,
        cusp_pada: houses[s.house - 1].cusp_pada,
      })),
      segments,
      planets: locatePlanets,
      nth_from: nthFrom,
    };
  }

  const out = {
    lagna: lagnaInfo.pos,
    lagna_nakshatra: `${lagnaInfo.nakshatra} ${lagnaInfo.pada}`,
    lagna_charan: lagnaCharan,
    margin_arcsec: lagnaInfo.marginArcsec,
    charan_window: charanWindow,
    borderline,
    warnings,
    vargottama_cusps: vargottamaCusps,
    houses,
    ...(planetsSummary !== null ? { planets: planetsSummary } : {}),
    ...(locateResult ? { locate: locateResult } : {}),
    ...(options.lagnaOnly ? {
      notes: 'Lagna-only input: there are no planets and no birth-time window (charan_window). Only equal-house cusp nakshatras, sign nakshatra contents, and lagna margin to the nearest pada edge are computed.',
    } : {}),
    ...(options.settings ? { settings: options.settings } : {}),
  };

  return out;
}

/** Compact ("chain") representation of a nakshatra_houses map (well under 1,500 tokens). */
export function compactNakshatraHouses(full) {
  const s = full.settings || {};
  const ayan = s.ayanamsa_name || s.ayanamsa || 'Traditional Lahiri';
  const node = s.node_type || s.nodes || 'true';
  const pos = s.position_type || s.positions || 'true';
  const basis = `equal houses from lagna, cusp = middle, sidereal ${ayan}, ${pos} positions, ${node} node`;

  let marginStr = `${full.margin_arcsec}" (${formatMinSec(full.margin_arcsec)})`;
  if (full.charan_window) {
    marginStr = `${full.margin_arcsec}" (+${full.charan_window.seconds_after} s / -${full.charan_window.seconds_before} s)`;
  }

  const houses = full.houses.map((h) => {
    const nakList = h.nakshatras.map(n => (
      n.padas.length === 1 ? `${n.name} ${n.padas[0]}` : `${n.name} ${n.padas[0]}-${n.padas[n.padas.length - 1]}`
    )).join(', ');
    const planetStr = h.planets.length
      ? ' ' + h.planets.map((p) => {
        const abbr = PLANET_ABBR[p.name] || p.name;
        const r = p.retrograde && p.name !== 'Rahu' && p.name !== 'Ketu' ? ' R' : '';
        return `${abbr}${r} ${p.nakshatra} ${p.pada}`;
      }).join(', ')
      : '';
    const lordAbbr = PLANET_ABBR[h.cusp_lord] || h.cusp_lord;
    return `${h.house} ${h.sign_abbr} cusp ${h.cusp_dms} ${h.cusp_nakshatra} ${h.cusp_pada} (${lordAbbr}, D9 ${h.cusp_navamsa_abbr}) | ${nakList} |${planetStr}`;
  });

  const out = {
    basis,
    lagna: `${full.lagna} ${full.lagna_nakshatra}`,
    lagna_charan: full.lagna_charan,
    margin: marginStr,
    borderline: full.borderline,
    ...(full.warnings.length ? { warnings: full.warnings } : {}),
    houses,
    vargottama_cusps: full.vargottama_cusps.map(v => `${v.house} ${SIGN_ABBR[SIGNS.indexOf(v.sign)]} ${v.nakshatra} ${v.pada}`),
  };

  if (full.locate) {
    const loc = full.locate;
    const houseDesc = loc.houses.length === 1 ? `house ${loc.houses[0]}` : `houses ${loc.houses.join(' & ')}`;
    const cuspDesc = loc.on_cusp
      ? `on cusp (pada ${loc.cusp_pada})`
      : `not on cusp (cusp in ${loc.cusp_in.map(c => `H${c.house} ${c.cusp_nakshatra} ${c.cusp_pada}`).join(', ')})`;
    const plDesc = loc.planets.length
      ? `planets: ${loc.planets.map(p => `${PLANET_ABBR[p.name] || p.name}${p.retrograde && p.name !== 'Rahu' && p.name !== 'Ketu' ? ' R' : ''} ${p.pos} P${p.pada} (D9 ${p.navamsa})`).join(', ')}`
      : 'no planets';
    const nthHits = Object.values(loc.nth_from)
      .filter(n => n.on_cusp || n.planets.length)
      .map((n) => {
        const hs = n.houses ? n.houses.join('/') : n.house;
        const pls = n.planets.map(p => `${PLANET_ABBR[p.name] || p.name} ${p.pos} ${p.nakshatra} ${p.pada} (D9 ${p.navamsa})`).join(', ');
        return `${n.nth}th H${hs}${n.on_cusp ? ' [cusp]' : ''}${pls ? `: ${pls}` : ''}`;
      });
    out.locate = `${loc.nakshatra}: ${houseDesc}, ${cuspDesc}, ${plDesc}${nthHits.length ? `; nth_from: ${nthHits.join('; ')}` : ''}`;
  }

  if (full.notes) out.notes = full.notes;
  return out;
}

/**
 * Find the birth-time window [from, to] in local birth clock where the lagna keeps the same
 * charan (pada), stepping out in 60 s increments and bisecting to < 0.05 s.
 */
export function computeCharanWindow(eph, date, datetimeStr, latitude, longitude, sweepSettings) {
  const t0 = date.getTime();
  const match = datetimeStr.match(/([+-])(\d{2}):?(\d{2})$/);
  const offsetMinutes = match
    ? (match[1] === '-' ? -1 : 1) * (parseInt(match[2], 10) * 60 + parseInt(match[3], 10))
    : 0;

  const padaOfLon = (lon) => Math.floor(toArcsec(lon) / ARCSEC_PADA);
  const ascAt = (dtSec) => eph.houses(new Date(Math.round(t0 + dtSec * 1000)), latitude, longitude, sweepSettings).asc;

  // Coarse 60 s grid covering ±60 minutes (121 points in 1 swetest call) covers almost every lagna pada
  const halfSteps = 60;
  const series = eph.housesSeries(
    new Date(t0 - halfSteps * 60000),
    2 * halfSteps + 1,
    60,
    latitude,
    longitude,
    sweepSettings
  );
  const basePada = padaOfLon(series[halfSteps].asc);
  const sameAt = (dtSec) => padaOfLon(ascAt(dtSec)) === basePada;

  const findEdge = (dir) => {
    let k = halfSteps;
    while (k + dir >= 0 && k + dir < series.length && padaOfLon(series[k + dir].asc) === basePada) {
      k += dir;
    }
    let prev = (k - halfSteps) * 60;
    let cur = prev + dir * 60;
    // Step out 60 s further if a pada spans more than 60 min (high latitudes / slow signs)
    if (k + dir < 0 || k + dir >= series.length) {
      let guard = 0;
      while (sameAt(cur) && guard < 180) {
        prev = cur;
        cur += dir * 60;
        guard++;
      }
    }
    let lo = prev;
    let hi = cur;
    while (Math.abs(hi - lo) >= 0.05) {
      const mid = (lo + hi) / 2;
      if (sameAt(mid)) lo = mid;
      else hi = mid;
    }
    return lo;
  };

  const beforeOffset = findEdge(-1); // negative
  const afterOffset = findEdge(1);   // positive

  const fmtLocalClock = (dtSec) => {
    const ms = Math.round((t0 + dtSec * 1000 + offsetMinutes * 60000) / 100) * 100;
    const d = new Date(ms);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const secTotal = d.getUTCSeconds() + d.getUTCMilliseconds() / 1000;
    const secStr = secTotal.toFixed(1).padStart(4, '0');
    return `${hh}:${mm}:${secStr}`;
  };

  return {
    from: fmtLocalClock(beforeOffset),
    to: fmtLocalClock(afterOffset),
    seconds_before: round(-beforeOffset, 1),
    seconds_after: round(afterOffset, 1),
  };
}
