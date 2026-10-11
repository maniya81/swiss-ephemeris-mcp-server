// Shared test setup: one server per test file, skipped when swetest is not installed
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { startServer } from './mcp-client.js';

export const HAVE_SWETEST = spawnSync('swetest', ['-h'], { stdio: 'ignore' }).error === undefined;
export const SKIP = HAVE_SWETEST ? false : 'swetest is not on PATH (set PATH and SE_EPHE_PATH to a Swiss Ephemeris build)';

// The only reference chart: Sagar, checked against Jagannatha Hora (fixtures/jhora-sagar.json)
export const JH = JSON.parse(readFileSync(new URL('./fixtures/jhora-sagar.json', import.meta.url)));
export const SAGAR = { datetime: JH.birth.datetime, latitude: JH.birth.latitude, longitude: JH.birth.longitude };

export function server() {
  return HAVE_SWETEST ? startServer() : null;
}

// Calls a tool and fails the test with the server's reason on an error
export async function ok(srv, name, args) {
  const r = await srv.call(name, args);
  if (r.error) throw new Error(`${name} failed: ${r.error} (parameter ${r.parameter})`);
  return r;
}

// Rough token count, calibrated against the cl100k tokenizer on compact chart output
// (about 2.27 characters per token); 2.2 keeps it on the safe side
export const estimateTokens = (text) => Math.ceil(text.length / 2.2);

// Midpoint of a JH period, as an ISO time in the birth offset
export const midpoint = (row) => new Date((Date.parse(row.start) + Date.parse(row.end)) / 2 + 5.5 * 3600000).toISOString().replace('Z', '+05:30').replace(/\.\d{3}/, '');
