// Shared test setup: one server per test file, skipped when swetest is not installed
import { spawnSync } from 'node:child_process';
import { startServer } from './mcp-client.js';

export const HAVE_SWETEST = spawnSync('swetest', ['-h'], { stdio: 'ignore' }).error === undefined;
export const SKIP = HAVE_SWETEST ? false : 'swetest is not on PATH (set PATH and SE_EPHE_PATH to a Swiss Ephemeris build)';

// The chart of the acceptance tests: 16 Aug 1979, Botad
export const VARSHA = { latitude: 22.1667, longitude: 71.6667 };
export const B0 = '1979-08-16T05:25:00+05:30';
export const B5 = '1979-08-16T05:25:05+05:30';

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
