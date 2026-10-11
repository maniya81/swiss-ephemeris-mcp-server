// Kalachakra features on Sagar's chart, checked against Jagannatha Hora's periods
// (fixtures/jhora-sagar.json): summary, running chains, gati, sensitivity and the birth-time sweep
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { server, ok, SKIP, JH, SAGAR, midpoint } from './helpers.js';

const srv = server();
after(() => srv && srv.stop());

const rows = JH.kalachakra.rows;
const parents = (row) => (row.drill_down || row.path).map(step => step.slice(0, 2));
const deha = (first) => rows.filter(r => r.drill_down && r.drill_down.length === 5 && r.drill_down[0] === first);

test('Summary matches Jagannatha Hora: Apasavya, Paramayush 83, Deha Ta, Jiva Ge', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_kalachakra_dasha', { datetime: SAGAR.datetime });
  assert.match(JH.kalachakra.header, /Apasavya, Paramayush 83 yr, Deha Ta, Jiva Ge/);
  assert.equal(result.direction, 'Apasavya');
  assert.equal(result.paramayush, 83);
  assert.match(String(result.deha), /^Ta|Taurus/);
  assert.match(String(result.jiva), /^Ge|Gemini/);
});

test('Running chains to deha are JH\'s periods', { skip: SKIP }, async () => {
  for (const row of [...deha('Ta Dhan3'), ...deha('Sg Sata4')]) {
    const { result } = await ok(srv, 'calculate_kalachakra_dasha', { datetime: SAGAR.datetime, as_of: midpoint(row), output: 'chain', levels: 6 });
    assert.equal(result.current.chain, [...parents(row), row.sign].join('-'), `as of ${midpoint(row)}`);
  }
});

test('Simhavalokana where JH\'s mahadashas jump from Ar to Sg', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_kalachakra_dasha', { datetime: SAGAR.datetime });
  const jh = rows.filter(r => !r.path?.length && !r.drill_down).map(r => r.sign);
  assert.deepEqual(result.mahadashas.slice(0, jh.length).map(m => m.sign_abbr), jh);
  assert.deepEqual(result.mahadashas.filter(m => m.gati === 'Simhavalokana').map(m => m.sign_abbr), ['Sg']);
});

test('Birth-time sensitivity predicts the shift for a birth one second later', { skip: SKIP }, async () => {
  const a = (await ok(srv, 'calculate_kalachakra_dasha', { datetime: SAGAR.datetime })).result;
  const b = (await ok(srv, 'calculate_kalachakra_dasha', { datetime: SAGAR.datetime.replace(':00+', ':01+') })).result;
  const perSecond = a.birth_time_sensitivity.kalachakra_days_per_birth_second;
  // The figure uses the mean year; in true solar years the shift also follows the Sun's speed
  // on the date (up to about 3.4% either way)
  for (const i of [1, 2, 6]) {
    const shiftDays = (Date.parse(b.mahadashas[i].start) - Date.parse(a.mahadashas[i].start)) / 86400000;
    assert.ok(shiftDays < 0 && Math.abs(-shiftDays / perSecond - 1) < 0.04, `${a.mahadashas[i].sign_abbr}: ${shiftDays} days vs ${perSecond}`);
  }
});

test('Birth-time sweep with JH\'s periods as events contains the recorded birth time', { skip: SKIP }, async () => {
  // One JH period at each level from antardasha to deha, in both deep paths
  const picks = [];
  for (const first of ['Ta', 'Sg']) {
    for (let depth = 1; depth <= 5; depth++) picks.push(rows.find(r => parents(r).length === depth && parents(r)[0] === first));
  }
  const tests = picks.map((row, i) => ({ id: `jh${i}`, as_of: midpoint(row), system: 'kalachakra', level: parents(row).length + 1, expect: [row.sign] }));
  const args = { datetime: SAGAR.datetime, as_of: tests.map(t => t.as_of), levels: 6, birth_time_sweep: { from_seconds: -20, to_seconds: 20, step_seconds: 0.5 }, event_tests: tests };
  const { result, size } = await ok(srv, 'calculate_kalachakra_dasha', args);
  const windows = result.event_tests.intersection;
  assert.equal(windows.length, 1);
  assert.ok(windows[0].grid_from_s <= 0 && windows[0].grid_to_s >= 0, JSON.stringify(windows[0]));
  assert.ok(size < 87000, `sweep output ${size} chars`);
  // The pre-1.1.0 rule (sub-periods compared with the Moon's pada) breaks inside Sg Sata4 > Sc PSha4
  const natal = (await ok(srv, 'calculate_kalachakra_dasha', { ...args, subperiod_direction: 'natal' })).result;
  assert.ok(!natal.event_tests.intersection.some(w => w.grid_from_s <= 0 && w.grid_to_s >= 0));
});
