import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { server, ok, SKIP, SAGAR, estimateTokens } from './helpers.js';
import {
  NAKSHATRA_ABBR,
  toArcsec,
  parseLagnaInput,
  signNakshatraContents,
  computeNakshatraHouseMap,
} from '../src/nakshatra-houses.js';
import { NAKSHATRAS, SIGN_ABBR, SIGNS } from '../src/constants.js';

const GOLDEN = JSON.parse(readFileSync(new URL('./fixtures/nakshatra_house_golden.json', import.meta.url)));
const JH_TRAD = JSON.parse(readFileSync(new URL('./fixtures/jhora-data9-traditional.json', import.meta.url)));

const srv = server();
after(() => srv && srv.stop());

const compactCuspsString = (houses) => houses
  .map(h => `${h.house}:${NAKSHATRA_ABBR[NAKSHATRAS.indexOf(h.cusp_nakshatra)]}${h.cusp_pada}`)
  .join(' ');

const parseShortLon = (str) => {
  const m = str.match(/^(\w\w)\s+(\d+)°(\d+)'(\d+)"$/);
  assert.ok(m, `Could not parse short lon: ${str}`);
  return SIGN_ABBR.indexOf(m[1]) * 30 + Number(m[2]) + Number(m[3]) / 60 + Number(m[4]) / 3600;
};

const angularDiffArcsec = (aDeg, bDeg) => {
  let d = Math.abs(aDeg - bDeg) % 360;
  if (d > 180) d = 360 - d;
  return d * 3600;
};

// --- T5: Pure unit tests (no swetest required) ---

test('T5.1: exact nakshatra/pada edges and 360° wrap in computeNakshatraHouseMap', () => {
  const cases = [
    ['0°00\'00" Ar', 'Ashwini', 1],
    ['3°19\'59" Ar', 'Ashwini', 1],
    ['3°20\'00" Ar', 'Ashwini', 2],
    ['13°20\'00" Ar', 'Bharani', 1],
    ['26°40\'00" Ar', 'Krittika', 1],
    ['29°59\'59" Pi', 'Revati', 4],
  ];
  for (const [lagna, expectedNak, expectedPada] of cases) {
    const res = computeNakshatraHouseMap(lagna, { lagnaOnly: true });
    assert.equal(res.houses[0].cusp_nakshatra, expectedNak, lagna);
    assert.equal(res.houses[0].cusp_pada, expectedPada, lagna);
  }
  // 26°40'00" Ar -> Krittika spans house of Aries (1) and house of Taurus (2)
  const kri = computeNakshatraHouseMap('26°40\'00" Ar', { locate: 'Krittika', lagnaOnly: true });
  assert.deepEqual(kri.locate.houses, [1, 2]);
  assert.equal(kri.locate.on_cusp, true);
  assert.equal(kri.locate.cusp_pada, 1);

  // 360° wraps to 0° Aries Ashwini 1
  const wrap = computeNakshatraHouseMap(360, { lagnaOnly: true });
  assert.equal(wrap.lagna, 'Ar 0°00\'00"');
  assert.equal(wrap.houses[0].cusp_nakshatra, 'Ashwini');
  assert.equal(wrap.houses[0].cusp_pada, 1);
});

test('T5.2: lagna-only inputs ("Leo 11 10", "Cancer 5 0", "Capricorn 9°58\'", object form)', () => {
  const leo = computeNakshatraHouseMap('Leo 11 10', { lagnaOnly: true });
  assert.equal(leo.lagna_charan, 4);
  assert.equal(leo.houses[8].house, 9);
  assert.equal(leo.houses[8].cusp_nakshatra, 'Ashwini');
  assert.equal(leo.houses[8].cusp_pada, 4);

  const cn = computeNakshatraHouseMap('Cancer 5 0', { lagnaOnly: true });
  assert.equal(cn.houses[0].cusp_nakshatra, 'Pushya');
  assert.equal(cn.houses[0].cusp_pada, 1);
  assert.equal(cn.houses[1].cusp_nakshatra, 'Magha');
  assert.equal(cn.houses[1].cusp_pada, 2);
  assert.equal(cn.houses[2].cusp_nakshatra, 'Uttara Phalguni');
  assert.equal(cn.houses[2].cusp_pada, 3);
  assert.equal(cn.houses[9].cusp_nakshatra, 'Ashwini');
  assert.equal(cn.houses[9].cusp_pada, 2);

  const cp = computeNakshatraHouseMap("Capricorn 9°58'", { lagnaOnly: true });
  assert.equal(cp.houses[3].cusp_nakshatra, 'Ashwini');
  assert.equal(cp.houses[3].cusp_pada, 3);
  assert.equal(cp.borderline, true);
  assert.ok(cp.warnings.length > 0);
  assert.ok(cp.notes.includes('no planets') && cp.notes.includes('no birth-time window'));

  const obj = computeNakshatraHouseMap({ sign: 'Cancer', deg: 6, min: 23, sec: 15 }, { lagnaOnly: true });
  assert.equal(compactCuspsString(obj.houses), GOLDEN[0].compact);
  assert.ok(obj.notes);
});

test('T5.3: sign nakshatra contents for Aries, Taurus and Cancer', () => {
  assert.deepEqual(
    signNakshatraContents(0).map(n => n.summary),
    ['Ashwini 1-4', 'Bharani 1-4', 'Krittika 1']
  );
  assert.deepEqual(
    signNakshatraContents(1).map(n => n.summary),
    ['Krittika 2-4', 'Rohini 1-4', 'Mrigashira 1-2']
  );
  assert.deepEqual(
    signNakshatraContents(3).map(n => n.summary),
    ['Punarvasu 4', 'Pushya 1-4', 'Ashlesha 1-4']
  );
});

test('T5.4: all 108 lagna charan x sign cases preserve charan and vargottama rule', () => {
  for (let sign = 0; sign < 12; sign++) {
    for (let charan = 1; charan <= 9; charan++) {
      // Middle of the charan: ((charan - 1) * 12000 + 6000) arcsec
      const lon = sign * 30 + ((charan - 1) * 12000 + 6000) / 3600;
      const res = computeNakshatraHouseMap(lon, { lagnaOnly: true });
      assert.equal(res.lagna_charan, charan);
      for (const h of res.houses) {
        const signIdx = SIGNS.indexOf(h.sign);
        const expectedVarg =
          (signIdx % 3 === 0 && charan === 1) ||
          (signIdx % 3 === 1 && charan === 5) ||
          (signIdx % 3 === 2 && charan === 9);
        assert.equal(h.vargottama, expectedVarg, `sign ${sign} charan ${charan} house ${h.house}`);
      }
    }
  }
});

test('parseLagnaInput validation errors', () => {
  assert.throws(() => parseLagnaInput(''), { parameter: 'lagna' });
  assert.throws(() => parseLagnaInput('Atlantis 10°00\'00"'), { parameter: 'lagna' });
  assert.throws(() => parseLagnaInput('Ar 31°00\'00"'), { parameter: 'lagna' });
  assert.throws(() => parseLagnaInput({ sign: 'Aries', deg: 30 }), { parameter: 'lagna' });
});

// --- T1: Golden charts ---

test('T1: all 10 golden charts match nakshatra_house_golden.json via nakshatra_house_map and calculate_vedic_chart', { skip: SKIP }, async () => {
  for (const g of GOLDEN) {
    const args = {
      datetime: g.datetime,
      latitude: g.latitude,
      longitude: g.longitude,
      ayanamsa: g.settings.ayanamsa,
      position_type: g.settings.position_type,
      node_type: g.settings.node_type,
    };

    const { result: nh } = await ok(srv, 'nakshatra_house_map', args);
    assert.ok(angularDiffArcsec(parseShortLon(nh.lagna), parseShortLon(g.expected.lagna)) <= 15, `${g.id} lagna`);
    assert.equal(nh.lagna_nakshatra, g.expected.lagna_nakshatra, `${g.id} lagna_nakshatra`);
    assert.equal(nh.lagna_charan, g.expected.lagna_charan, `${g.id} lagna_charan`);
    assert.equal(nh.settings.node_type, 'mean', `${g.id} node_type echoed`);
    assert.equal(compactCuspsString(nh.houses), g.compact, `${g.id} compact`);

    for (let i = 0; i < 12; i++) {
      const got = nh.houses[i];
      const exp = g.expected.equal_house_cusps[String(i + 1)];
      assert.equal(got.house, i + 1);
      assert.equal(got.sign, exp.sign, `${g.id} H${i + 1} sign`);
      assert.equal(got.cusp, exp.cusp, `${g.id} H${i + 1} cusp`);
      assert.equal(got.cusp_nakshatra, exp.nakshatra, `${g.id} H${i + 1} nakshatra`);
      assert.equal(got.cusp_pada, exp.pada, `${g.id} H${i + 1} pada`);
      assert.equal(got.cusp_lord, exp.lord, `${g.id} H${i + 1} lord`);
      assert.equal(got.cusp_navamsa, exp.navamsa, `${g.id} H${i + 1} navamsa`);
    }

    // Also via calculate_vedic_chart in both output:"full" and output:"chain"
    const { result: vcFull } = await ok(srv, 'calculate_vedic_chart', {
      ...args,
      include: ['nakshatra_houses'],
      output: 'full',
      levels: 1,
    });
    assert.equal(compactCuspsString(vcFull.nakshatra_houses.houses), g.compact, `${g.id} vcFull compact`);
    assert.equal(vcFull.nakshatra_houses.lagna_charan, g.expected.lagna_charan);

    const { result: vcChain } = await ok(srv, 'calculate_vedic_chart', {
      ...args,
      include: ['nakshatra_houses'],
      output: 'chain',
      levels: 1,
    });
    const nhText = JSON.stringify(vcChain.nakshatra_houses);
    assert.ok(estimateTokens(nhText) < 1500, `${g.id} chain tokens ${estimateTokens(nhText)} >= 1500`);
    assert.equal(vcChain.nakshatra_houses.houses.length, 12);
    assert.equal(vcChain.nakshatra_houses.lagna_charan, g.expected.lagna_charan);
  }
});

// --- T2: locate: "Ashwini" ---

test('T2: locate Ashwini on all 10 golden charts plus chart7 nth_from 5th span and aliases', { skip: SKIP }, async () => {
  for (const g of GOLDEN) {
    const { result } = await ok(srv, 'nakshatra_house_map', {
      datetime: g.datetime,
      latitude: g.latitude,
      longitude: g.longitude,
      ayanamsa: g.settings.ayanamsa,
      position_type: g.settings.position_type,
      node_type: g.settings.node_type,
      locate: 'Ashwini',
    });

    const loc = result.locate;
    assert.equal(loc.nakshatra, 'Ashwini');
    assert.deepEqual(loc.houses, [g.expected.ashwini_house], `${g.id} ashwini_house`);
    assert.equal(loc.on_cusp, g.expected.ashwini_on_cusp, `${g.id} ashwini_on_cusp`);
    assert.equal(loc.cusp_pada, g.expected.ashwini_cusp_pada, `${g.id} ashwini_cusp_pada`);

    const expPlanets = g.expected.planets_in_ashwini;
    assert.equal(loc.planets.length, Object.keys(expPlanets).length, `${g.id} planet count`);
    for (const [pName, pExp] of Object.entries(expPlanets)) {
      const gotP = loc.planets.find(p => p.name === pName);
      assert.ok(gotP, `${g.id} missing ${pName} in Ashwini`);
      assert.equal(gotP.pos, pExp.pos, `${g.id} ${pName} pos`);
      assert.equal(gotP.pada, pExp.pada, `${g.id} ${pName} pada`);
      assert.equal(gotP.navamsa, pExp.navamsa, `${g.id} ${pName} navamsa`);
    }

    if (g.id === 'chart7') {
      const fifth = loc.nth_from['5'];
      assert.equal(fifth.house, 12);
      assert.equal(fifth.sign, 'Leo');
      assert.equal(fifth.from_dms, '0°00\'00"');
      assert.equal(fifth.to_dms, '13°20\'00"');
      assert.equal(fifth.planets.length, 1);
      assert.equal(fifth.planets[0].name, 'Mercury');
      assert.equal(fifth.planets[0].pos, 'Le 3°18\'48"');
      assert.equal(fifth.planets[0].nakshatra, 'Magha');
      assert.equal(fifth.planets[0].pada, 1);
      assert.equal(fifth.planets[0].navamsa, 'Aries');
    }
  }

  // Case-insensitive and alternate spellings in locate
  const c1 = GOLDEN[0];
  for (const [alias, canonical] of [
    ['aswini', 'Ashwini'],
    ['ASHVINI', 'Ashwini'],
    ['Purva Bhadra', 'Purva Bhadrapada'],
    ['Shatabhishak', 'Shatabhisha'],
  ]) {
    const { result } = await ok(srv, 'nakshatra_house_map', {
      datetime: c1.datetime,
      latitude: c1.latitude,
      longitude: c1.longitude,
      locate: alias,
    });
    assert.equal(result.locate.nakshatra, canonical);
  }
});

// --- T3: borderline birth times ---

test('T3: borderline charan_window, warning, and flip verification', { skip: SKIP }, async () => {
  const byId = Object.fromEntries(GOLDEN.map(g => [g.id, g]));
  const call = (g, dtOverride) => ok(srv, 'nakshatra_house_map', {
    datetime: dtOverride || g.datetime,
    latitude: g.latitude,
    longitude: g.longitude,
    ayanamsa: g.settings.ayanamsa,
    position_type: g.settings.position_type,
    node_type: g.settings.node_type,
  });

  // chart4_capricorn: 21:12:15 -> 21:24:52 (+6.0 s), borderline: true; re-run at 21:24:56
  const cap = (await call(byId.chart4_capricorn)).result;
  assert.equal(cap.borderline, true);
  assert.ok(cap.charan_window.from.startsWith('21:12:15'));
  assert.ok(cap.charan_window.to.startsWith('21:24:52'));
  assert.ok(Math.abs(cap.charan_window.seconds_after - 6.0) <= 1.0);
  assert.ok(cap.warnings.some(w => w.includes('All 12 cusps change pada')));
  const capFlip = (await call(byId.chart4_capricorn, '1971-06-23T21:24:56+05:30')).result;
  assert.equal(capFlip.lagna_charan, 4);
  assert.equal(capFlip.houses[0].cusp_nakshatra, 'Shravana');
  assert.equal(capFlip.houses[0].cusp_pada, 1);
  assert.equal(capFlip.houses[3].cusp_nakshatra, 'Ashwini');
  assert.equal(capFlip.houses[3].cusp_pada, 4);

  // chart9: 02:43:54 -> 02:58:08 (+7.3 to +7.9 s), borderline: true; re-run at 02:58:10
  const c9 = (await call(byId.chart9)).result;
  assert.equal(c9.borderline, true);
  assert.ok(c9.charan_window.from.startsWith('02:43:54'));
  assert.ok(c9.charan_window.to.startsWith('02:58:0'));
  assert.ok(c9.charan_window.seconds_after >= 7.0 && c9.charan_window.seconds_after <= 8.5);
  const c9Flip = (await call(byId.chart9, '1983-10-22T02:58:10+05:30')).result;
  assert.equal(c9Flip.lagna_charan, 5);
  assert.equal(c9Flip.houses[0].cusp_nakshatra, 'Purva Phalguni');
  assert.equal(c9Flip.houses[0].cusp_pada, 1);
  assert.equal(c9Flip.houses[8].cusp_nakshatra, 'Bharani');
  assert.equal(c9Flip.houses[8].cusp_pada, 1);

  // ds_doctor: 05:21:58.5 -> 05:31:23 (-1.5 s), borderline: true; re-run at 05:21:57
  const dsd = (await call(byId.ds_doctor)).result;
  assert.equal(dsd.borderline, true);
  assert.ok(dsd.charan_window.from.startsWith('05:21:58'));
  assert.ok(dsd.charan_window.to.startsWith('05:31:23'));
  assert.ok(Math.abs(dsd.charan_window.seconds_before - 1.5) <= 1.0);
  const dsdFlip = (await call(byId.ds_doctor, '1968-03-28T05:21:57+05:30')).result;
  assert.equal(dsdFlip.lagna_charan, 7);
  assert.equal(dsdFlip.houses[0].cusp_nakshatra, 'Purva Bhadrapada');
  assert.equal(dsdFlip.houses[0].cusp_pada, 1);
  assert.equal(dsdFlip.houses[2].cusp_nakshatra, 'Bharani');
  assert.equal(dsdFlip.houses[2].cusp_pada, 3);

  // chart1: 18:36:17 -> 18:51:15, borderline: false
  const c1 = (await call(byId.chart1)).result;
  assert.equal(c1.borderline, false);
  assert.ok(c1.charan_window.from.startsWith('18:36:17'));
  assert.ok(c1.charan_window.to.startsWith('18:51:15'));
});

// --- T4 & Snapshot invariance & T5.5 Node switch & Error shapes ---

test('T4: Placidus cusps must not leak into nakshatra_houses and existing houses/cusps remain unchanged', { skip: SKIP }, async () => {
  const c1 = GOLDEN[0];
  const { result: vc1 } = await ok(srv, 'calculate_vedic_chart', {
    datetime: c1.datetime,
    latitude: c1.latitude,
    longitude: c1.longitude,
    ayanamsa: c1.settings.ayanamsa,
    position_type: c1.settings.position_type,
    node_type: c1.settings.node_type,
    include: ['nakshatra_houses'],
    output: 'full',
  });
  // Placidus 10th is Ar 3°12'58" Ashwini 1; equal-house 10th is Ar 6°23'15" Ashwini 2
  assert.equal(vc1.houses['10'].sign, 'Aries');
  assert.equal(vc1.houses['10'].nakshatra, 'Ashwini');
  assert.equal(vc1.houses['10'].nakshatra_pada, 1);
  assert.equal(vc1.nakshatra_houses.houses[9].cusp_dms, '6°23\'15"');
  assert.equal(vc1.nakshatra_houses.houses[9].cusp_nakshatra, 'Ashwini');
  assert.equal(vc1.nakshatra_houses.houses[9].cusp_pada, 2);

  const c4t = GOLDEN[1];
  const { result: vc4 } = await ok(srv, 'calculate_vedic_chart', {
    datetime: c4t.datetime,
    latitude: c4t.latitude,
    longitude: c4t.longitude,
    ayanamsa: c4t.settings.ayanamsa,
    position_type: c4t.settings.position_type,
    node_type: c4t.settings.node_type,
    include: ['nakshatra_houses'],
    output: 'full',
  });
  // Placidus 12th is Pi 28°01'; equal-house 12th is Aries Ashwini 3
  assert.equal(vc4.houses['12'].sign, 'Pisces');
  assert.equal(vc4.nakshatra_houses.houses[11].sign, 'Aries');
  assert.equal(vc4.nakshatra_houses.houses[11].cusp_nakshatra, 'Ashwini');
  assert.equal(vc4.nakshatra_houses.houses[11].cusp_pada, 3);
});

test('Snapshot invariance: calculate_vedic_chart without nakshatra_houses is unchanged', { skip: SKIP }, async () => {
  const { result: full } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, include: 'all', output: 'full', as_of: '2026-10-11T12:00:00+05:30' });
  assert.equal(full.nakshatra_houses, undefined);
  assert.equal(full.lagna.sign, JH_TRAD.bodies.Lagna.rasi === 'Li' ? 'Libra' : JH_TRAD.bodies.Lagna.rasi);
  for (const [h, jhCusp] of Object.entries(JH_TRAD.placidus_cusps)) {
    const m = jhCusp.match(/^(\d+) (\w\w) (\d+)' ([\d.]+)"$/);
    const jhLon = SIGN_ABBR.indexOf(m[2]) * 30 + Number(m[1]) + Number(m[3]) / 60 + Number(m[4]) / 3600;
    const diff = (full.houses[h].longitude - jhLon) * 3600;
    assert.ok(Math.abs(diff - 12.61) <= 0.5, `Cusp ${h}`);
  }

  const { result: chain } = await ok(srv, 'calculate_vedic_chart', { ...SAGAR, output: 'chain', as_of: '2026-10-11T12:00:00+05:30' });
  assert.equal(chain.nakshatra_houses, undefined);
});

test('T5.5: chart9 Rahu switches between Rohini 4 (true) and Mrigashira 1 (mean)', { skip: SKIP }, async () => {
  const c9 = GOLDEN.find(g => g.id === 'chart9');
  const base = { datetime: c9.datetime, latitude: c9.latitude, longitude: c9.longitude, ayanamsa: 'traditional_lahiri', position_type: 'true' };

  const { result: t } = await ok(srv, 'nakshatra_house_map', { ...base, node_type: 'true' });
  const rahuT = t.planets.find(p => p.name === 'Rahu');
  assert.equal(t.settings.node_type, 'true');
  assert.equal(rahuT.nakshatra, 'Rohini');
  assert.equal(rahuT.pada, 4);
  assert.ok(rahuT.pos.startsWith('Ta 23°15\'') || rahuT.pos.startsWith('Ta 23°16\''));

  const { result: m } = await ok(srv, 'nakshatra_house_map', { ...base, node_type: 'mean' });
  const rahuM = m.planets.find(p => p.name === 'Rahu');
  assert.equal(m.settings.node_type, 'mean');
  assert.equal(rahuM.nakshatra, 'Mrigashira');
  assert.equal(rahuM.pada, 1);
  assert.equal(rahuM.pos, 'Ta 24°40\'02"');
});

test('Error responses use {"error":{"reason":...,"parameter":...}} shape', { skip: SKIP }, async () => {
  const badLagna = await srv.call('nakshatra_house_map', { lagna: 'NotASign 10 0' });
  assert.equal(badLagna.parameter, 'lagna');
  assert.ok(badLagna.error.length > 5);

  const badLocate = await srv.call('nakshatra_house_map', { lagna: 'Cn 6°23\'15"', locate: 'NoSuchNakshatra' });
  assert.equal(badLocate.parameter, 'locate');
  assert.ok(badLocate.error.length > 5);

  const both = await srv.call('nakshatra_house_map', {
    datetime: '1965-01-12T18:50:00+05:30',
    latitude: 18.9667,
    longitude: 72.8333,
    lagna: 'Cn 6°23\'15"',
  });
  assert.equal(both.parameter, 'lagna');
  assert.ok(both.error.length > 5);

  const badVcLocate = await srv.call('calculate_vedic_chart', { ...SAGAR, locate: 'FakeNak' });
  assert.equal(badVcLocate.parameter, 'locate');
});

