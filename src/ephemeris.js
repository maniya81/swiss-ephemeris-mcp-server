// Thin wrapper around the swetest command-line program
import { execSync } from 'node:child_process';
import { GRAHAS, DAY_MS, norm360 } from './constants.js';

const BODY_CODES = { Sun: '0', Moon: '1', Mercury: '2', Venus: '3', Mars: '4', Jupiter: '5', Saturn: '6' };
// swetest prints at most 36525 lines per call
const MAX_LINES = 36000;

export function createEphemeris(ephePath = process.env.SE_EPHE_PATH || '/app/vendor/swisseph') {
  const run = (args) => execSync(`SE_EPHE_PATH=${ephePath} swetest ${args}`, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  const two = (n) => String(n).padStart(2, '0');
  // Date arguments for an instant, keeping fractional seconds
  const timeArgs = (date) => {
    const ms = date.getUTCMilliseconds();
    const time = `${two(date.getUTCHours())}:${two(date.getUTCMinutes())}:${two(date.getUTCSeconds())}${ms ? `.${String(ms).padStart(3, '0')}` : ''}`;
    return `-b${two(date.getUTCDate())}.${two(date.getUTCMonth() + 1)}.${date.getUTCFullYear()} -ut${time}`;
  };

  // Rows of comma-separated numbers after an optional name column
  const rows = (output) => output.split('\n')
    .map(line => line.split(',').map(part => part.trim()))
    .filter(parts => parts.length >= 2 && parts[1] !== '' && !isNaN(parseFloat(parts[1])));

  const flags = ({ siderealFlag = '', positionFlag = '' } = {}) => `${siderealFlag}${positionFlag}`;

  return {
    run,
    timeArgs,

    // The nine grahas at one instant: longitude, latitude, speed, declination, magnitude
    grahas(date, settings = {}) {
      const nodeCode = settings.nodeType === 'mean' ? 'm' : 't';
      const output = run(`${timeArgs(date)} ${flags(settings)} -p0123456${nodeCode} -fPlbsd= -g, -head`);
      const result = {};
      for (const [name, lon, lat, speed, decl, mag] of rows(output)) {
        const key = name.endsWith('Node') ? 'Rahu' : name;
        result[key] = { lon: parseFloat(lon), lat: parseFloat(lat), speed: parseFloat(speed), decl: parseFloat(decl), mag: parseFloat(mag) };
      }
      const rahu = result.Rahu;
      result.Ketu = { lon: norm360(rahu.lon + 180), lat: -rahu.lat, speed: rahu.speed, decl: -rahu.decl, mag: 0 };
      for (const g of GRAHAS) if (!result[g]) throw new Error(`swetest did not return ${g}`);
      return result;
    },

    // Placidus (or other) cusps, ascendant, MC and ARMC at one instant
    houses(date, latitude, longitude, settings = {}, system = 'P') {
      const output = run(`${timeArgs(date)} ${flags(settings)} -p -house${longitude},${latitude},${system} -fPl -g, -head`);
      return parseHouses(rows(output));
    },

    // Cusps for `count` birth times `stepSeconds` apart, starting at `from`
    housesSeries(from, count, stepSeconds, latitude, longitude, settings = {}, system = 'P') {
      const result = [];
      const perCall = 1500;
      for (let s = 0; s < count; s += perCall) {
        const n = Math.min(perCall, count - s);
        const start = new Date(from.getTime() + s * stepSeconds * 1000);
        const output = run(`${timeArgs(start)} ${flags(settings)} -p -house${longitude},${latitude},${system} -fPl -g, -head -n${n} -s${stepSeconds / 86400}`);
        // Each step prints house 1..12 then Ascendant, MC, ARMC, Vertex and extra points
        let current = [];
        for (const row of rows(output)) {
          if (/^house\s+1$/.test(row[0]) && current.length) {
            result.push(parseHouses(current));
            current = [];
          }
          current.push(row);
        }
        if (current.length) result.push(parseHouses(current));
      }
      if (result.length !== count) throw new Error('Failed to compute house series from swetest');
      return result;
    },

    // Longitude and speed of one body at `count` instants `stepDays` apart (chunked)
    series(body, from, count, stepDays, settings = {}) {
      const code = body === 'Rahu' || body === 'Ketu' ? (settings.nodeType === 'mean' ? 'm' : 't') : BODY_CODES[body];
      const out = [];
      for (let s = 0; s < count; s += MAX_LINES) {
        const n = Math.min(MAX_LINES, count - s);
        const start = new Date(from.getTime() + s * stepDays * DAY_MS);
        const output = run(`${timeArgs(start)} ${flags(settings)} -p${code} -fls -g, -head -n${n} -s${stepDays}`);
        for (const line of output.trim().split('\n')) {
          const [lon, speed] = line.split(',').map(parseFloat);
          if (!isNaN(lon)) out.push({ lon: body === 'Ketu' ? norm360(lon + 180) : lon, speed });
        }
      }
      if (out.length !== count) throw new Error(`Failed to compute the ${body} series from swetest`);
      return out;
    },

    // Longitude of one body at a single instant
    longitude(body, date, settings = {}) {
      return this.series(body, date, 1, 1, settings)[0];
    },

    // Sunrise and sunset around a date at a place. `hindu` uses the disc centre without refraction.
    // Returns the sunrise on or before `date` and the following sunset and sunrise (ms).
    sunTimes(date, latitude, longitude, { hindu = false } = {}) {
      const start = new Date(date.getTime() - 1.5 * DAY_MS);
      const output = run(`${timeArgs(start)} -p0 -rise${hindu ? ' -hindu' : ''} -geopos${longitude},${latitude},0 -n4`);
      const parse = (d, t) => {
        const [day, month, year] = d.split('.').map(Number);
        const [h, m, s] = t.split(':').map(Number);
        return Date.UTC(year, month - 1, day, h, m, 0) + s * 1000;
      };
      const rises = [];
      const sets = [];
      for (const line of output.split('\n')) {
        const match = line.match(/rise\s+(\d+\.\d+\.\d+)\s+(\d+:\d+:[\d.]+)/);
        if (match) rises.push(parse(match[1], match[2]));
        const setMatch = line.match(/set\s+(\d+\.\d+\.\d+)\s+(\d+:\d+:[\d.]+)/);
        if (setMatch) sets.push(parse(setMatch[1], setMatch[2]));
      }
      const t = date.getTime();
      const sunrise = rises.filter(r => r <= t).pop();
      const nextSunrise = rises.find(r => r > t);
      const sunset = sets.filter(x => x > sunrise).shift();
      const previousSunset = sets.filter(x => x <= sunrise).pop();
      if (sunrise === undefined || nextSunrise === undefined || sunset === undefined) {
        throw new Error('Could not find sunrise and sunset for this place and date (polar day or night?)');
      }
      return { sunrise, sunset, nextSunrise, previousSunset };
    },
  };
}

function parseHouses(rowsForStep) {
  const cusps = {};
  let asc = null;
  let mc = null;
  let armc = null;
  for (const [name, lon] of rowsForStep) {
    const house = name.match(/^house\s+(\d+)$/);
    if (house) cusps[parseInt(house[1])] = parseFloat(lon);
    else if (name === 'Ascendant') asc = parseFloat(lon);
    else if (name === 'MC') mc = parseFloat(lon);
    else if (name === 'ARMC') armc = parseFloat(lon);
  }
  return { cusps, asc, mc, armc };
}
