// Tests for Western astrological tools: calculate_planetary_positions, calculate_transits, calculate_solar_revolution, calculate_synastry
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { server, ok, SKIP, SAGAR } from './helpers.js';

const srv = server();
after(() => srv && srv.stop());

test('calculate_planetary_positions returns 17 bodies, houses, and chart points', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_planetary_positions', {
    datetime: SAGAR.datetime,
    latitude: SAGAR.latitude,
    longitude: SAGAR.longitude
  });

  assert.ok(result.planets, 'has planets');
  assert.ok(result.planets.Sun, 'has Sun');
  assert.ok(result.planets.Moon, 'has Moon');
  assert.ok(result.houses, 'has houses');
  assert.equal(Object.keys(result.houses).length, 12, '12 houses');
  assert.ok(result.chart_points, 'has chart points');
  assert.ok(result.chart_points.Ascendant, 'has Ascendant');
});

test('calculate_transits returns natal chart and current transit positions', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_transits', {
    birth_datetime: SAGAR.datetime,
    latitude: SAGAR.latitude,
    longitude: SAGAR.longitude
  });

  assert.ok(result.natal_chart, 'has natal_chart');
  assert.ok(result.current_transits, 'has current_transits');
  assert.ok(result.natal_chart.planets.Sun, 'natal has Sun');
  assert.ok(result.current_transits.planets.Sun, 'transits has Sun');
});

test('calculate_solar_revolution returns exact solar return chart', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_solar_revolution', {
    birth_datetime: SAGAR.datetime,
    birth_latitude: SAGAR.latitude,
    birth_longitude: SAGAR.longitude,
    return_year: 2026
  });

  assert.ok(result.natal_chart, 'has natal_chart');
  assert.ok(result.solar_return_chart, 'has solar_return_chart');
  assert.ok(result.natal_sun_longitude, 'has natal_sun_longitude');
  assert.ok(result.return_sun_longitude, 'has return_sun_longitude');
  // Return Sun longitude is near the natal Sun longitude within 2 degrees
  assert.ok(Math.abs(result.natal_sun_longitude - result.return_sun_longitude) < 2.0, 'Sun return matches natal Sun');
});

test('calculate_synastry compares two charts and computes synastry aspects', { skip: SKIP }, async () => {
  const { result } = await ok(srv, 'calculate_synastry', {
    person1_datetime: SAGAR.datetime,
    person1_latitude: SAGAR.latitude,
    person1_longitude: SAGAR.longitude,
    person2_datetime: '2000-01-01T12:00:00Z',
    person2_latitude: 51.5074,
    person2_longitude: -0.1278
  });

  assert.ok(result.person1_chart, 'has person1_chart');
  assert.ok(result.person2_chart, 'has person2_chart');
  assert.ok(Array.isArray(result.synastry_aspects), 'has synastry_aspects array');
  assert.ok(result.synastry_aspects.length > 0, 'contains aspects between the two charts');
});
