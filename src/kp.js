// KP (Krishnamurti Paddhati): sign/star/sub lords, four-level significators and ruling planets
import { SIGN_LORDS, NAKSHATRA_SPAN, DASHA_ORDER, DASHA_YEARS, GRAHAS, PLANET_ABBR, norm360, signOf } from './constants.js';

// Sub lord: the star divided in proportion to the Vimshottari years, from the star lord on
function subOf(startLord, length, offset) {
  const start = DASHA_ORDER.indexOf(startLord);
  let cursor = 0;
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(start + i) % 9];
    const part = (length * DASHA_YEARS[lord]) / 120;
    if (offset < cursor + part || i === 8) return { lord, length: part, offset: offset - cursor };
    cursor += part;
  }
  return null;
}

export function kpLords(lon) {
  const l = norm360(lon);
  const star = Math.floor(l / NAKSHATRA_SPAN);
  const starLord = DASHA_ORDER[star % 9];
  const sub = subOf(starLord, NAKSHATRA_SPAN, l - star * NAKSHATRA_SPAN);
  return { sign_lord: SIGN_LORDS[signOf(l)], star_lord: starLord, sub_lord: sub.lord, sub_sub_lord: subOf(sub.lord, sub.length, sub.offset).lord };
}

// KP house: the Placidus cusp interval the longitude falls in
export function kpHouse(cusps, lon) {
  for (let h = 1; h <= 12; h++) {
    const start = cusps[h];
    const span = norm360(cusps[h === 12 ? 1 : h + 1] - start);
    if (norm360(lon - start) < span) return h;
  }
  return null;
}

const NODES = ['Rahu', 'Ketu'];

// Four-level significators. Levels, strongest first: A houses occupied by the planet's star
// lord, B the house it occupies, C houses owned by its star lord, D houses it owns. Rahu and
// Ketu own no house; as agents they take their sign lord's houses at C/D.
export function kpSignificators(longitudes, cusps) {
  const occupies = Object.fromEntries(GRAHAS.map(p => [p, kpHouse(cusps, longitudes[p])]));
  const owns = Object.fromEntries(GRAHAS.map(p => [p, []]));
  for (let h = 1; h <= 12; h++) owns[SIGN_LORDS[signOf(cusps[h])]].push(h);
  const agentOf = (p) => (NODES.includes(p) ? SIGN_LORDS[signOf(longitudes[p])] : p);
  const ownership = (p) => owns[agentOf(p)];
  const starLord = Object.fromEntries(GRAHAS.map(p => [p, kpLords(longitudes[p]).star_lord]));

  const planets = {};
  for (const p of GRAHAS) {
    const s = starLord[p];
    planets[p] = {
      star_lord: s,
      A_star_lord_occupies: [occupies[s]],
      B_occupies: [occupies[p]],
      C_star_lord_owns: ownership(s),
      D_owns: ownership(p),
      ...(NODES.includes(p) ? { agent_of: agentOf(p) } : {}),
      ...(NODES.includes(s) ? { in_node_star: s, node_agent_of: agentOf(s) } : {}),
    };
    planets[p].houses = [...new Set([occupies[s], occupies[p], ...ownership(s), ...ownership(p)])].sort((a, b) => a - b);
  }

  const cuspSig = {};
  for (let h = 1; h <= 12; h++) {
    const occupants = GRAHAS.filter(p => occupies[p] === h);
    const owner = SIGN_LORDS[signOf(cusps[h])];
    // Nodes in the owner's sign act for the owner and rank just above it
    const ownerAgents = [...NODES.filter(n => agentOf(n) === owner), owner];
    const A = GRAHAS.filter(p => occupants.includes(starLord[p]));
    const B = occupants;
    const C = GRAHAS.filter(p => ownerAgents.includes(starLord[p]));
    const D = ownerAgents;
    const ordered = [];
    for (const p of [...A, ...B, ...C, ...D]) if (!ordered.includes(p)) ordered.push(p);
    cuspSig[h] = { A_in_star_of_occupants: A, B_occupants: B, C_in_star_of_owner: C, D_owner: D, ordered };
  }
  return { planets, cusps: cuspSig, in_node_stars: GRAHAS.filter(p => NODES.includes(starLord[p])) };
}

export function compactSignificators(sig) {
  const ab = (list) => list.map(p => PLANET_ABBR[p]).join(',') || '-';
  return {
    planets: Object.fromEntries(Object.entries(sig.planets).map(([p, x]) => [p, `A ${x.A_star_lord_occupies.join(',')} B ${x.B_occupies.join(',')} C ${x.C_star_lord_owns.join(',') || '-'} D ${x.D_owns.join(',') || '-'}${x.in_node_star ? ` (in ${x.in_node_star} star)` : ''}`])),
    cusps: Object.fromEntries(Object.entries(sig.cusps).map(([h, x]) => [h, `${ab(x.A_in_star_of_occupants)} | ${ab(x.B_occupants)} | ${ab(x.C_in_star_of_owner)} | ${ab(x.D_owner)}`])),
    legend: 'planets: A houses occupied by the star lord, B occupied, C owned by the star lord, D owned. cusps: A in the star of occupants | B occupants | C in the star of the owner | D owner (strongest first)',
  };
}

// Ruling planets at a moment: the day lord, the Moon's and the lagna's sign, star and sub lords.
// Order of strength: lagna star, lagna sign, Moon star, Moon sign, day lord, then the lagna and
// Moon sub lords. Rahu/Ketu join (just above the planet they represent) when their sign lord is
// a ruling planet or they share a sign with one. Retrograde planets are dropped from the cleaned set.
export function rulingPlanets({ grahas, asc, dayLord, keepRetrograde = false }) {
  const moon = kpLords(grahas.Moon.lon);
  const lagna = kpLords(asc);
  const components = {
    day_lord: dayLord,
    moon: { sign_lord: moon.sign_lord, star_lord: moon.star_lord, sub_lord: moon.sub_lord },
    lagna: { sign_lord: lagna.sign_lord, star_lord: lagna.star_lord, sub_lord: lagna.sub_lord },
  };
  const order = [lagna.star_lord, lagna.sign_lord, moon.star_lord, moon.sign_lord, dayLord, lagna.sub_lord, moon.sub_lord];
  const set = [];
  for (const p of order) if (!set.includes(p)) set.push(p);
  const nodesAdded = [];
  for (const node of NODES) {
    if (set.includes(node)) continue;
    const signLord = SIGN_LORDS[signOf(grahas[node].lon)];
    const conjoined = set.filter(p => !NODES.includes(p) && signOf(grahas[p].lon) === signOf(grahas[node].lon));
    const represents = set.includes(signLord) ? signLord : conjoined[0];
    if (!represents) continue;
    set.splice(set.indexOf(represents), 0, node);
    nodesAdded.push({ node, represents, reason: represents === signLord ? 'in the sign of a ruling planet' : 'conjoined with a ruling planet' });
  }
  const excluded = keepRetrograde ? [] : set.filter(p => !NODES.includes(p) && grahas[p].speed < 0).map(p => ({ planet: p, reason: 'retrograde' }));
  const cleaned = set.filter(p => !excluded.some(e => e.planet === p));
  return { components, ruling_planets: set, nodes_added: nodesAdded, excluded, cleaned };
}
