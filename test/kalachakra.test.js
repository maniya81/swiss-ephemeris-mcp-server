// Kalachakra features on Sagar's chart, checked against Jagannatha Hora's True Lahiri / SM Singh periods
// (fixtures/jhora-sagar.json): summary, running chains, gati, sensitivity and the birth-time sweep
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { server, ok, SKIP, JH, SAGAR_KC, midpoint } from './helpers.js';

const srv = server();
after(() => srv && srv.stop());

const rows = JH.kalachakra.rows;
const parents = (row) => (row.drill_down || row.path || []).map(step => step.slice(0, 2));
const dehas = rows.filter(r => r.drill_down && r.drill_down.length === 5);

test('Summary matches Jagannatha Hora: Apasavya, Paramayush 83, Deha Ta, Jiva Ge, True Lahiri, SM Singh, True nodes', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_kalachakra_dasha', { datetime: SAGAR_KC.datetime });
  assert.match(JH.kalachakra.header, /Apasavya, Paramayush 83 yr, Deha Ta, Jiva Ge/);
  assert.equal(result.direction, 'Apasavya');
  assert.equal(result.paramayush, 83);
  assert.match(String(result.deha), /^Ta|Taurus/);
  assert.match(String(result.jiva), /^Ge|Gemini/);
  assert.match(result.settings.ayanamsa, /True Lahiri/);
  assert.match(result.settings.method, /^SM Singh/);
  assert.equal(result.settings.nodes, 'true');
  assert.equal(result.settings.rohini_4th_pada, 'Leo navamsa');
});

test('Running chains to deha are JH\'s periods across all 54 verified deha periods', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_kalachakra_dasha', {
    datetime: SAGAR_KC.datetime,
    as_of: dehas.map(midpoint),
    output: 'chain',
    levels: 6,
  });
  dehas.forEach((row, i) => {
    assert.equal(result.chains[i].chain, [...parents(row), row.sign].join('-'), `as of ${midpoint(row)}`);
  });
});

test('Simhavalokana where JH\'s mahadashas jump from Ar to Sg', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_kalachakra_dasha', { datetime: SAGAR_KC.datetime });
  const jh = rows.filter(r => !r.path?.length && !r.drill_down).map(r => r.sign);
  assert.deepEqual(result.mahadashas.slice(0, jh.length).map(m => m.sign_abbr), jh);
  assert.deepEqual(result.mahadashas.filter(m => m.gati === 'Simhavalokana').map(m => m.sign_abbr), ['Sg']);
});

test('Birth-time sensitivity predicts the shift for a birth one second later', { skip: SKIP }, async () => {
  const a = (await ok(srv, 'calculate_kalachakra_dasha', { datetime: SAGAR_KC.datetime })).result;
  const b = (await ok(srv, 'calculate_kalachakra_dasha', { datetime: SAGAR_KC.datetime.replace(':01+', ':02+') })).result;
  const perSecond = a.birth_time_sensitivity.kalachakra_days_per_birth_second;
  // The figure uses the mean year; in true solar years the shift also follows the Sun's speed
  // on the date (up to about 3.4% either way)
  for (const i of [1, 2, 6]) {
    const shiftDays = (Date.parse(b.mahadashas[i].start) - Date.parse(a.mahadashas[i].start)) / 86400000;
    assert.ok(shiftDays < 0 && Math.abs(-shiftDays / perSecond - 1) < 0.04, `${a.mahadashas[i].sign_abbr}: ${shiftDays} days vs ${perSecond}`);
  }
});

test('Birth-time sweep with JH\'s periods as events contains the recorded birth time', { skip: SKIP }, async () => {
  const picks = [];
  for (let depth = 1; depth <= 5; depth++) {
    picks.push(rows.find(r => parents(r).length === depth));
  }
  const tests = picks.map((row, i) => ({ id: `jh${i}`, as_of: midpoint(row), system: 'kalachakra', level: parents(row).length + 1, expect: [row.sign] }));
  const args = { datetime: SAGAR_KC.datetime, as_of: tests.map(t => t.as_of), levels: 6, birth_time_sweep: { from_seconds: -20, to_seconds: 20, step_seconds: 0.5 }, event_tests: tests };
  const { result, size } = await ok(srv, 'calculate_kalachakra_dasha', args);
  const windows = result.event_tests.intersection;
  assert.ok(windows.length >= 1);
  assert.ok(windows.some(w => w.grid_from_s <= 0 && w.grid_to_s >= 0), JSON.stringify(windows));
  assert.ok(size < 80000, `sweep ${size} chars`);
  const flips = (await ok(srv, 'calculate_kalachakra_dasha', { ...args, sweep_output: 'flips' })).result;
  assert.deepEqual(flips.event_tests.intersection, windows);
});
