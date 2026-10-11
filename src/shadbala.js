// Shadbala (six-fold planetary strength), Ishta/Kashta phala and Bhavabala (BPHS / B.V. Raman)
import { SEVEN, SIGN_LORDS, WEEKDAY_LORDS, norm360, signOf, round } from './constants.js';
import { EXALTATION, MOOLATRIKONA, OWN_SIGNS, compoundRelation } from './dignity.js';
import { vargaPosition } from './vargas.js';
import { drishtiVirupas } from './aspects.js';

export const NAISARGIKA = { Sun: 60, Moon: 51.43, Venus: 42.86, Jupiter: 34.29, Mercury: 25.71, Mars: 17.14, Saturn: 8.57 };
export const REQUIRED_RUPAS = { Sun: 5, Moon: 6, Mars: 5, Mercury: 7, Jupiter: 6.5, Venus: 5.5, Saturn: 5 };
// Saptavargaja points (BPHS)
const SAPTAVARGA_POINTS = { moolatrikona: 45, own: 30, adhimitra: 22.5, mitra: 15, sama: 7.5, shatru: 3.75, adhishatru: 1.875 };
const SAPTAVARGAS = ['D1', 'D2', 'D3', 'D7', 'D9', 'D12', 'D30'];
const MALE = ['Sun', 'Mars', 'Jupiter'];
const NEUTER = ['Mercury', 'Saturn'];
// B.V. Raman's ahargana epoch (civil day number of 10 Jul 1951): years of 360 days and months of
// 30 days counted from it give the abda and masa lords
const RAMAN_EPOCH_DAY = 2433838;
const HORA_ORDER = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];

const angDist = (a, b) => {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
};

// Mean sidereal longitudes for cheshta bala from B.V. Raman's tables ("Graha and Bhava Balas"):
// positions at the 1900 Ujjain epoch, mean daily motions and his corrections per year since 1900.
// For Mercury and Venus the value is their seeghrochcha.
const RAMAN_MEAN = {
  Sun: [257.4568, 0.9856, 0, 0],
  Mars: [270.22, 0.524, 0, 0],
  Mercury: [164, 4.0923, 6.67, -0.00133],
  Jupiter: [220.04, 0.0831, -3.3, -0.0067],
  Venus: [328.51, 1.60215, -5, -0.0001],
  Saturn: [236.74, 0.033439, 5, 0.001],
};
function ramanMeanLongitudes(jdUt, year) {
  // Days since 1 Jan 1900, 0h Ujjain mean time (longitude 76° E)
  const days = jdUt + 76 / 360 - 2415020.5;
  return Object.fromEntries(Object.entries(RAMAN_MEAN).map(([p, [epoch, speed, c0, c1]]) => [p, norm360(epoch + days * speed + c0 + c1 * (year - 1900))]));
}

// The Moon as a benefic for drik and bhava drishti bala: 'ashtami' = from the 8th tithi of the
// bright half to the 8th tithi of the dark half (Phaladeepika, B.V. Raman); 'waxing' = bright half
export const moonIsBenefic = (elongation, rule = 'ashtami') => (rule === 'waxing' ? elongation < 180 : elongation >= 84 && elongation < 264);

// Benefics for drik bala: Jupiter, Venus, the Moon by `moonRule`, and Mercury when alone or with
// more benefics than malefics (a tie goes to the nearest planet), as in P.V.R. Narasimha Rao's rules.
// Method 'jh' also makes a combust Mercury (with the Sun) a malefic, as Jagannatha Hora does.
export function drikBenefics(sidereal, moonRule = 'ashtami', { method = 'jh', mercuryRetrograde = false } = {}) {
  const elongation = norm360(sidereal.Moon - sidereal.Sun);
  const benefics = new Set(['Jupiter', 'Venus']);
  if (moonIsBenefic(elongation, moonRule)) benefics.add('Moon');
  if (method === 'jh' && angDist(sidereal.Mercury, sidereal.Sun) <= (mercuryRetrograde ? 12 : 14)) return benefics;
  const mercurySign = signOf(sidereal.Mercury);
  const others = SEVEN.filter(p => p !== 'Mercury' && signOf(sidereal[p]) === mercurySign);
  const good = others.filter(p => benefics.has(p)).length;
  const bad = others.length - good;
  if (good > bad || others.length === 0) benefics.add('Mercury');
  else if (good === bad) {
    const nearest = others.reduce((x, y) => (angDist(sidereal[x], sidereal.Mercury) <= angDist(sidereal[y], sidereal.Mercury) ? x : y));
    if (benefics.has(nearest)) benefics.add('Mercury');
  }
  return benefics;
}

// Declination from a sayana longitude with an obliquity of 24° (the classical kranti)
const kranti = (sayana) => Math.asin(Math.sin(24 * Math.PI / 180) * Math.sin(sayana * Math.PI / 180)) * 180 / Math.PI;

/*
 * chart: {
 *   sidereal: { Sun: lon, ... }  (D1, for sthana/drik)
 *   tropical: { Sun: lon, ... }  (for ayana and the Sun's cheshta)
 *   lat:      { Mars: ..., ... } (for planetary war)
 *   lagna, mc: sidereal ascendant and 10th cusp
 *   birthMs, jd (UT), year: instant; sun: { sunrise, sunset, nextSunrise, previousSunset } (ms)
 *   timezoneHours: offset for the civil day (ahargana)
 *   warWinner: 'latitude' | 'brightness', mags
 *   moonRule: 'ashtami' | 'waxing' (the Moon as a benefic in drik and bhava drishti bala)
 *   method: 'jh' (default) | 'raman'; speeds: { Mercury: deg/day }
 * }
 */
export function computeShadbala(chart) {
  const { sidereal, tropical, lagna, mc } = chart;
  // 'jh' (default): Jagannatha Hora; 'raman': B.V. Raman as used by AstroSage
  const method = chart.method || 'jh';
  const jh = method === 'jh';
  const signs = Object.fromEntries(SEVEN.map(p => [p, signOf(sidereal[p])]));
  const lagnaSign = signOf(lagna);
  const elongation = norm360(sidereal.Moon - sidereal.Sun);
  const waxing = elongation < 180;
  const pakshaBenefic = (elongation > 180 ? 360 - elongation : elongation) / 3;
  const drikBen = drikBenefics(sidereal, chart.moonRule, { method, mercuryRetrograde: (chart.speeds || {}).Mercury < 0 });
  // Paksha bala benefics. jh: Jupiter, Venus and Mercury as in drik bala; the Moon's paksha bala
  // is the benefic value doubled. raman: Jupiter, Venus, Mercury and the waxing Moon.
  const benefics = jh
    ? new Set(['Jupiter', 'Venus', ...(drikBen.has('Mercury') ? ['Mercury'] : [])])
    : new Set(['Jupiter', 'Venus', 'Mercury', ...(waxing ? ['Moon'] : [])]);
  // Saptavargaja hora: jh uses Jagannatha Hora's D-2 (parivritti, even signs reversed)
  const vargaMethods = jh ? { D2: 'pvr' } : {};

  const out = {};
  for (const p of SEVEN) {
    const lon = sidereal[p];
    const sign = signs[p];
    const deg = norm360(lon) - sign * 30;
    const sthana = {};
    // Uchcha: distance from the deep debilitation point / 3
    sthana.uchcha = angDist(lon, EXALTATION[p] + 180) / 3;
    // Saptavargaja: dignity in D1, D2, D3, D7, D9, D12, D30
    sthana.saptavargaja = SAPTAVARGAS.reduce((sum, v) => {
      const vs = vargaPosition(v, lon, vargaMethods).sign;
      const mt = MOOLATRIKONA[p];
      let key;
      if (v === 'D1' && mt && sign === mt[0] && deg >= mt[1] && deg < mt[2]) key = 'moolatrikona';
      else if (OWN_SIGNS[p].includes(vs)) key = 'own';
      else key = compoundRelation(p, SIGN_LORDS[vs], signs);
      return sum + SAPTAVARGA_POINTS[key];
    }, 0);
    // Ojayugma: Moon and Venus in even signs/navamsas, the others in odd ones: 15 each
    const wantsEven = p === 'Moon' || p === 'Venus';
    const navSign = vargaPosition('D9', lon).sign;
    sthana.ojayugma = ((sign % 2 === 1) === wantsEven ? 15 : 0) + ((navSign % 2 === 1) === wantsEven ? 15 : 0);
    // Kendradi: kendra 60, panaphara 30, apoklima 15 (houses from the lagna sign)
    const house = ((sign - lagnaSign + 12) % 12) + 1;
    sthana.kendradi = [1, 4, 7, 10].includes(house) ? 60 : [2, 5, 8, 11].includes(house) ? 30 : 15;
    // Drekkana: male planets in the 1st, neuter in the 2nd, female in the 3rd decanate: 15
    const dec = Math.min(2, Math.floor(deg / 10));
    sthana.drekkana = (MALE.includes(p) && dec === 0) || (NEUTER.includes(p) && dec === 1) || (!MALE.includes(p) && !NEUTER.includes(p) && dec === 2) ? 15 : 0;

    // Dig: strongest point Sun/Mars 10th cusp, Jupiter/Mercury lagna, Moon/Venus 4th, Saturn 7th
    const strongest = { Sun: mc, Mars: mc, Jupiter: lagna, Mercury: lagna, Moon: mc + 180, Venus: mc + 180, Saturn: lagna + 180 }[p];
    const dig = angDist(lon, strongest + 180) / 3;

    out[p] = { sthana, dig, kala: {}, cheshta: 0, naisargika: NAISARGIKA[p], drik: 0 };
  }

  // ---- Kala bala
  const { sunrise, sunset, nextSunrise, previousSunset } = chart.sun;
  const t = chart.birthMs;
  const isDay = t >= sunrise && t < sunset;
  // Nathonnatha: distance from local midnight (midpoints of the night) in hours, 0-12
  const prevMidnight = (previousSunset + sunrise) / 2;
  const nextMidnight = (sunset + nextSunrise) / 2;
  const fromMidnight = Math.min(Math.abs(t - prevMidnight), Math.abs(nextMidnight - t)) / 3600000;
  const dayStrength = Math.min(60, Math.max(0, (fromMidnight / 12) * 60));
  // Tribhaga lords: day thirds Mercury, Sun, Saturn; night thirds Moon, Venus, Mars
  const tribhagaLord = isDay
    ? ['Mercury', 'Sun', 'Saturn'][Math.min(2, Math.floor(((t - sunrise) / (sunset - sunrise)) * 3))]
    : ['Moon', 'Venus', 'Mars'][Math.min(2, Math.floor(((t - sunset) / (nextSunrise - sunset)) * 3))];
  // Vara: weekday of the day that began at the last sunrise; Hora: equal hours from sunrise
  const civilDay = Math.floor((sunrise + chart.timezoneHours * 3600000) / 86400000) + 2440588; // civil day number
  const weekday = (civilDay + 1) % 7; // 0 = Sunday
  const varaLord = WEEKDAY_LORDS[weekday];
  const horaIndex = Math.floor((t - sunrise) / 3600000);
  const horaLord = HORA_ORDER[(HORA_ORDER.indexOf(varaLord) + horaIndex) % 7];
  // Abda and masa lords: weekday lords of the first day of the current 360-day year and 30-day
  // month of B.V. Raman's ahargana
  const ahargana = civilDay - RAMAN_EPOCH_DAY;
  const weekdayLord = (day) => WEEKDAY_LORDS[(((day + 1) % 7) + 7) % 7];
  const abdaLord = weekdayLord(RAMAN_EPOCH_DAY + Math.floor(ahargana / 360) * 360 + 1);
  const masaLord = weekdayLord(RAMAN_EPOCH_DAY + Math.floor(ahargana / 30) * 30 + 1);

  for (const p of SEVEN) {
    const k = out[p].kala;
    k.nathonnatha = p === 'Mercury' ? 60 : ['Sun', 'Jupiter', 'Venus'].includes(p) ? dayStrength : 60 - dayStrength;
    k.paksha = jh && p === 'Moon' ? 2 * pakshaBenefic : benefics.has(p) ? pakshaBenefic : 60 - pakshaBenefic;
    k.tribhaga = p === 'Jupiter' || p === tribhagaLord ? 60 : 0;
    k.abda = p === abdaLord ? 15 : 0;
    k.masa = p === masaLord ? 30 : 0;
    k.vara = p === varaLord ? 45 : 0;
    k.hora = p === horaLord ? 60 : 0;
    // Ayana: declination (from the sayana longitude, obliquity 24°) favours north for Sun, Mars,
    // Jupiter and Venus, south for Moon and Saturn, either for Mercury; the Sun's is doubled
    const d = kranti(tropical[p]);
    const signed = p === 'Mercury' ? Math.abs(d) : ['Moon', 'Saturn'].includes(p) ? -d : d;
    k.ayana = ((24 + signed) / 48) * 60 * (p === 'Sun' ? 2 : 1);
    k.yuddha = 0;
  }

  // ---- Cheshta bala (B.V. Raman): cheshta kendra = seeghrochcha - (mean + true)/2, taken on
  // 0-360° longitudes as in his worked method, folded to 0-180°, divided by 3. The Sun's kendra
  // is its sayana longitude + 90° (jh: the mean Sun's, as Jagannatha Hora); the Moon's is its
  // elongation from the Sun.
  const fold = (x) => { const d = norm360(x); return d > 180 ? 360 - d : d; };
  const mean = ramanMeanLongitudes(chart.jd, chart.year);
  const T = (chart.jd - 2451545) / 36525;
  const meanSunSayana = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  for (const p of SEVEN) {
    if (p === 'Sun') { out[p].cheshta = fold((jh ? meanSunSayana : tropical.Sun) + 90) / 3; continue; }
    if (p === 'Moon') { out[p].cheshta = fold(elongation) / 3; continue; }
    const inner = p === 'Mercury' || p === 'Venus';
    const madhya = inner ? mean.Sun : mean[p];
    const seeghra = inner ? mean[p] : mean.Sun;
    out[p].cheshta = fold(seeghra - (madhya + norm360(sidereal[p])) / 2) / 3;
  }

  // ---- Drik bala: (benefic aspect virupas - malefic aspect virupas) / 4. jh: special aspects
  // rise to full strength at the exact aspect; raman: BPHS add-ons, not capped
  const drishti = (q, angle) => drishtiVirupas(q, angle, jh ? { rule: 'jh' } : { rule: 'bphs', cap: false });
  for (const p of SEVEN) {
    let sum = 0;
    for (const q of SEVEN) {
      if (q === p) continue;
      const v = drishti(q, sidereal[p] - sidereal[q]);
      sum += drikBen.has(q) ? v : -v;
    }
    out[p].drik = sum / 4;
  }

  // ---- Yuddha bala: in a planetary war the winner gains, and the loser loses, the difference
  // of their sthana + dig + kala totals
  const warriors = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const partial = (p) => Object.values(out[p].sthana).reduce((a, b) => a + b, 0) + out[p].dig + Object.values(out[p].kala).reduce((a, b) => a + b, 0);
  for (let i = 0; i < warriors.length; i++) {
    for (let j = i + 1; j < warriors.length; j++) {
      const a = warriors[i];
      const b = warriors[j];
      if (angDist(sidereal[a], sidereal[b]) > 1) continue;
      const winner = chart.warWinner === 'brightness' ? (chart.mags[a] <= chart.mags[b] ? a : b) : (chart.lat[a] >= chart.lat[b] ? a : b);
      const loser = winner === a ? b : a;
      const diff = Math.abs(partial(a) - partial(b));
      out[winner].kala.yuddha += diff;
      out[loser].kala.yuddha -= diff;
    }
  }

  // ---- Totals
  const result = {};
  for (const p of SEVEN) {
    const o = out[p];
    const sthana = Object.values(o.sthana).reduce((a, b) => a + b, 0);
    const kala = Object.values(o.kala).reduce((a, b) => a + b, 0);
    // jh: the Sun's and Moon's cheshta bala is already in their doubled ayana and paksha bala, so
    // it is shown but not added again
    const countedCheshta = jh && (p === 'Sun' || p === 'Moon') ? 0 : o.cheshta;
    const total = sthana + o.dig + kala + countedCheshta + o.naisargika + o.drik;
    const rupas = total / 60;
    result[p] = {
      sthana: { total: round(sthana, 2), ...Object.fromEntries(Object.entries(o.sthana).map(([k, v]) => [k, round(v, 2)])) },
      dig: round(o.dig, 2),
      kala: { total: round(kala, 2), ...Object.fromEntries(Object.entries(o.kala).map(([k, v]) => [k, round(v, 2)])) },
      cheshta: round(o.cheshta, 2),
      ...(countedCheshta !== o.cheshta ? { cheshta_in_total: false } : {}),
      naisargika: o.naisargika,
      drik: round(o.drik, 2),
      total_virupas: round(total, 2),
      rupas: round(rupas, 2),
      required_rupas: REQUIRED_RUPAS[p],
      ratio: round(rupas / REQUIRED_RUPAS[p], 2),
      meets_requirement: rupas >= REQUIRED_RUPAS[p],
      // Ishta and Kashta phala from uchcha and cheshta bala
      ishta_phala: round(Math.sqrt(o.sthana.uchcha * o.cheshta), 2),
      kashta_phala: round(Math.sqrt((60 - o.sthana.uchcha) * (60 - o.cheshta)), 2),
    };
  }
  const ranked = [...SEVEN].sort((a, b) => result[b].ratio - result[a].ratio);
  ranked.forEach((p, i) => { result[p].rank = i + 1; });
  return {
    planets: result,
    lords: { abda: abdaLord, masa: masaLord, vara: varaLord, hora: horaLord, tribhaga: tribhagaLord, birth_in: isDay ? 'day' : 'night', ahargana },
    drik_benefics: [...drikBen],
    method,
    _virupas: Object.fromEntries(SEVEN.map(p => [p, result[p].total_virupas])),
  };
}

// Bhavabala: bhavadhipati (the lord's shadbala) + bhava dig bala + bhava drishti bala, with
// equal bhavas whose middles are the lagna degree + 30° per house
export function computeBhavabala({ sidereal, lagna, moonRule, method = 'jh', speeds = {} }, shadbalaVirupas) {
  const benefics = drikBenefics(sidereal, moonRule, { method, mercuryRetrograde: speeds.Mercury < 0 });
  const rule = method === 'jh' ? { rule: 'jh' } : { rule: 'bphs', cap: false };
  const out = {};
  for (let h = 1; h <= 12; h++) {
    const mid = norm360(lagna + (h - 1) * 30);
    const sign = signOf(mid);
    const deg = mid - sign * 30;
    const lord = SIGN_LORDS[sign];
    // Strongest house by sign type: human signs 1st, water signs 4th, Scorpio 7th, quadrupeds 10th
    let strongest;
    if ([2, 5, 6, 10].includes(sign) || (sign === 8 && deg < 15)) strongest = 1;
    else if ([3, 11].includes(sign) || (sign === 9 && deg >= 15)) strongest = 4;
    else if (sign === 7) strongest = 7;
    else strongest = 10;
    let distance = Math.abs(h - strongest);
    if (distance > 6) distance = 12 - distance;
    const dig = 60 - distance * 10;
    // Drishti: benefic aspects add and malefic ones subtract a quarter of their virupas;
    // Jupiter's and Mercury's aspects count in full
    let drishti = 0;
    for (const p of SEVEN) {
      const v = drishtiVirupas(p, mid - sidereal[p], rule);
      const weight = p === 'Jupiter' || p === 'Mercury' ? 1 : 0.25;
      drishti += (benefics.has(p) ? 1 : -1) * v * weight;
    }
    const total = shadbalaVirupas[lord] + dig + drishti;
    out[h] = { bhava_madhya: round(mid, 3), lord, bhavadhipati: round(shadbalaVirupas[lord], 2), dig, drishti: round(drishti, 2), total_virupas: round(total, 2), rupas: round(total / 60, 2) };
  }
  const ranked = Object.keys(out).sort((a, b) => out[b].total_virupas - out[a].total_virupas);
  ranked.forEach((h, i) => { out[h].rank = i + 1; });
  return out;
}

export function compactShadbala(s) {
  return Object.entries(s.planets).map(([p, x]) => `${p.slice(0, 2)} ${x.rupas} ${x.ratio}x #${x.rank}`).join(', ');
}

export function compactBhavabala(b) {
  return Object.entries(b).map(([h, x]) => `H${h} ${x.rupas} #${x.rank}`).join(', ');
}
