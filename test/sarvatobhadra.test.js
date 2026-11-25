import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { server, ok, SKIP, SAGAR, estimateTokens } from './helpers.js';
import {
  SBC_NAKSHATRAS,
  SBC_NAKSHATRA_ABBR,
  sbcNakshatraOf,
  normalizeSbcNakshatraName,
  sbcVedhaTargets,
  computeSarvatobhadra,
  compactSarvatobhadra,
  computeTransitSarvatobhadra,
} from '../src/sarvatobhadra.js';

const srv = server();
after(() => srv && srv.stop());

// --- Pure unit tests (no swetest required) ---

test('SBC grid has 28 nakshatras with Abhijit and full 3-ray Vedha symmetry', () => {
  assert.equal(SBC_NAKSHATRAS.length, 28);
  assert.equal(SBC_NAKSHATRA_ABBR.length, 28);
  assert.equal(SBC_NAKSHATRAS[21], 'Abhijit');
  assert.equal(SBC_NAKSHATRA_ABBR[21], 'Abh');

  // Verified triads from Deepanshu Giri / Kala SBC
  assert.deepEqual(sbcVedhaTargets('Bharani'), {
    vama: 'Krittika',
    sammukha: 'Magha',
    dakshina: 'Anuradha',
  });
  assert.deepEqual(sbcVedhaTargets('Ashwini'), {
    vama: 'Rohini',
    sammukha: 'Purva Phalguni',
    dakshina: 'Jyeshtha',
  });

  // Symmetry across all 28 nakshatras
  for (const nak of SBC_NAKSHATRAS) {
    const t = sbcVedhaTargets(nak);
    assert.equal(sbcVedhaTargets(t.sammukha).sammukha, nak, `${nak} sammukha`);
    assert.equal(sbcVedhaTargets(t.vama).dakshina, nak, `${nak} vama->dakshina`);
    assert.equal(sbcVedhaTargets(t.dakshina).vama, nak, `${nak} dakshina->vama`);
  }
});

test('Abhijit exact arc-second boundaries (276°40\'00" to 280°53\'20")', () => {
  const before = sbcNakshatraOf(276 + 39 / 60 + 59 / 3600);
  const start = sbcNakshatraOf(276 + 40 / 60);
  const endInside = sbcNakshatraOf(280 + 53 / 60 + 19 / 3600);
  const after = sbcNakshatraOf(280 + 53 / 60 + 20 / 3600);

  assert.equal(before.name, 'Uttara Ashadha');
  assert.equal(before.in_abhijit, false);
  assert.equal(start.name, 'Abhijit');
  assert.equal(start.in_abhijit, true);
  assert.equal(endInside.name, 'Abhijit');
  assert.equal(endInside.in_abhijit, true);
  assert.equal(after.name, 'Shravana');
  assert.equal(after.in_abhijit, false);

  assert.equal(normalizeSbcNakshatraName('Abhijit').index, 21);
  assert.equal(normalizeSbcNakshatraName('abh').name, 'Abhijit');
});

test('SBC modes: "all" (3 rays) vs "speed" (direct/retrograde/fast, nodes, waxing/waning Moon)', () => {
  const grahas = {
    Sun: { lon: 15, speed: 0.98 }, // Bharani (direct -> sammukha)
    Moon: { lon: 45, speed: 13.2 }, // Rohini, 30° ahead of Sun -> waxing benefic
    Mars: { lon: 278, speed: 0.9 }, // Abhijit, fast (> 1.1 * 0.524) -> vama
    Mercury: { lon: 5, speed: -0.5 }, // Ashwini, retrograde -> dakshina
    Jupiter: { lon: 100, speed: 0.08 }, // Pushya, direct -> sammukha
    Venus: { lon: 130, speed: 1.0 }, // Magha, direct -> sammukha
    Saturn: { lon: 200, speed: -0.02 }, // Swati, retrograde -> dakshina
    Rahu: { lon: 70, speed: -0.05 }, // Ardra, always retrograde -> dakshina
    Ketu: { lon: 250, speed: -0.05 }, // Mula, always retrograde -> dakshina
  };

  const allMode = computeSarvatobhadra(grahas, 180, { mode: 'all', locate: 'Abhijit' });
  assert.equal(allMode.planets.Mars.nakshatra, 'Abhijit');
  assert.equal(allMode.planets.Mars.in_abhijit, true);
  assert.deepEqual(allMode.planets.Sun.active_directions, ['vama', 'sammukha', 'dakshina']);
  assert.equal(allMode.planets.Moon.nature, 'benefic');
  assert.equal(allMode.locate.nakshatra, 'Abhijit');

  const speedMode = computeSarvatobhadra(grahas, 180, { mode: 'speed' });
  assert.deepEqual(speedMode.planets.Sun.active_directions, ['sammukha']);
  assert.deepEqual(speedMode.planets.Mars.active_directions, ['vama']);
  assert.equal(speedMode.planets.Mars.motion, 'fast');
  assert.deepEqual(speedMode.planets.Mercury.active_directions, ['dakshina']);
  assert.equal(speedMode.planets.Mercury.motion, 'retrograde');
  assert.deepEqual(speedMode.planets.Rahu.active_directions, ['dakshina']);

  // Waning Moon (> 180° ahead of Sun) is malefic
  const waning = computeSarvatobhadra({ ...grahas, Moon: { lon: 250, speed: 13.2 } }, 180);
  assert.equal(waning.planets.Moon.nature, 'malefic');

  // Compact formatter & transit SBC
  const compact = compactSarvatobhadra(allMode);
  assert.ok(compact.planets.Mars.startsWith('Abh*-'));
  const tsbc = computeTransitSarvatobhadra(grahas, 180, grahas, { mode: 'all' });
  assert.ok('Lagna' in tsbc.hits_on_natal && 'Moon' in tsbc.hits_on_natal);
});

// --- MCP integration tests ---

test('MCP calculate_vedic_chart with include:["sarvatobhadra"] (full, chain, speed, Abhijit locate)', { skip: SKIP }, async () => {
  const { result: full } = await ok(srv, 'calculate_vedic_chart', {
    ...SAGAR,
    include: ['sarvatobhadra'],
    locate: 'Bharani',
  });
  assert.equal(full.sarvatobhadra.mode, 'all');
  assert.equal(full.sarvatobhadra.lagna_nakshatra, 'Chitra');
  assert.equal(full.sarvatobhadra.planets.Saturn.nakshatra, 'Bharani');
  assert.deepEqual(full.sarvatobhadra.locate.vedha_targets, {
    vama: 'Krittika',
    sammukha: 'Magha',
    dakshina: 'Anuradha',
  });
  assert.ok(full.nakshatra_houses, 'locate:"Bharani" also includes nakshatra_houses');

  const { result: chain } = await ok(srv, 'calculate_vedic_chart', {
    ...SAGAR,
    include: ['sarvatobhadra'],
    output: 'chain',
    levels: 1,
    locate: 'Abhijit',
  });
  assert.equal(chain.nakshatra_houses, undefined, 'locate:"Abhijit" with sarvatobhadra skips 27-nakshatra nakshatra_houses');
  assert.match(chain.sarvatobhadra.locate, /^Abhijit \(Abh\):/);
  assert.ok(estimateTokens(JSON.stringify(chain.sarvatobhadra)) < 400);

  const { result: speed } = await ok(srv, 'calculate_vedic_chart', {
    ...SAGAR,
    sbc_mode: 'speed',
    output: 'chain',
    levels: 1,
  });
  assert.equal(speed.sarvatobhadra.mode, 'speed');
});

test('MCP calculate_gochar with include_sbc:true (full & chain)', { skip: SKIP }, async () => {
  const { result: full } = await ok(srv, 'calculate_gochar', {
    ...SAGAR,
    as_of: '2026-11-12T12:00:00+05:30',
    include_sbc: true,
  });
  assert.equal(full.sarvatobhadra.mode, 'all');
  assert.ok('Lagna' in full.sarvatobhadra.hits_on_natal);
  assert.ok('Moon' in full.sarvatobhadra.hits_on_natal);

  const { result: chain } = await ok(srv, 'calculate_gochar', {
    ...SAGAR,
    as_of: '2026-11-12T12:00:00+05:30',
    include_sbc: true,
    output: 'chain',
  });
  assert.equal(chain.sarvatobhadra.mode, 'all');
  assert.equal(typeof chain.sarvatobhadra.hits_on_natal.Moon, 'string');
});

test('MCP nakshatra_house_map with include_sbc:true (birth data & lagna-only)', { skip: SKIP }, async () => {
  const { result: birthRes } = await ok(srv, 'nakshatra_house_map', {
    ...SAGAR,
    include_sbc: true,
    locate: 'Bharani',
    output: 'chain',
  });
  assert.equal(birthRes.sarvatobhadra.mode, 'all');
  assert.match(birthRes.sarvatobhadra.locate, /^Bharani \(Bha\):/);

  const { result: lagnaRes } = await ok(srv, 'nakshatra_house_map', {
    lagna: 'Cn 6°23\'15"',
    include_sbc: true,
    locate: 'Ashwini',
    output: 'chain',
  });
  assert.equal(lagnaRes.sarvatobhadra.lagna_nakshatra, 'Pushya');
  assert.deepEqual(lagnaRes.sarvatobhadra.locate.vedha_targets, {
    vama: 'Rohini',
    sammukha: 'Purva Phalguni',
    dakshina: 'Jyeshtha',
  });
});
