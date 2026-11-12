// Shared test setup: one server per test file, skipped when swetest is not installed and no remote MCP URL
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { startServer, DEFAULT_MCP_URL } from './mcp-client.js';

export const LOCAL_SWETEST = spawnSync('swetest', ['-h'], { stdio: 'ignore' }).error === undefined;
export const HAVE_SWETEST = Boolean(process.env.MCP_SERVER_URL) || LOCAL_SWETEST || Boolean(DEFAULT_MCP_URL);
export const SKIP = HAVE_SWETEST ? false : 'swetest is not on PATH (set PATH and SE_EPHE_PATH to a Swiss Ephemeris build, or set MCP_SERVER_URL)';

// Parse JHora Kalachakra text export into [{ parents: ['Ta Dhan3', ...], drill_down: [...], sign, pada, start, end }]
export function parseKalachakraText(text, timezone = '+05:30') {
  const LEVELS = { MD: 1, AD: 2, PD: 3, SD: 4, PAD: 5, DD: 6 };
  const time = (d, t) => { const [h, m, s] = t.split(':'); return `${d}T${h.padStart(2, '0')}:${m}:${s}${timezone}`; };
  const rows = [];
  let path = [];
  let inMahaList = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('Kalachakra Dasa')) { path = []; inMahaList = false; continue; }
    if (/^Maha Dasas:/.test(line)) { inMahaList = true; path = []; continue; }
    const head = line.match(/^(\w\w) \((\w+)\) (MD|AD|PD|SD|PAD|DD): (\S+) \(([\d:]+)\) - (\S+) \(([\d:]+)\)/);
    if (head) {
      const [, sign, pada, level, d1, t1, d2, t2] = head;
      path = path.slice(0, LEVELS[level] - 1);
      const parents = [...path];
      rows.push({ parents, ...(parents.length ? { drill_down: parents } : {}), sign, pada, start: time(d1, t1), end: time(d2, t2) });
      path.push(`${sign} ${pada}`);
      inMahaList = false;
      continue;
    }
    const item = line.match(/^(\w\w) \((\w+)\): (\S+) \(([\d:]+)\) - (\S+) \(([\d:]+)\)/);
    if (item) {
      const [, sign, pada, d1, t1, d2, t2] = item;
      const parents = inMahaList ? [] : [...path];
      rows.push({ parents, ...(parents.length ? { drill_down: parents } : {}), sign, pada, start: time(d1, t1), end: time(d2, t2) });
    }
  }
  const seen = new Set();
  return rows.filter((r) => { const k = JSON.stringify(r); return seen.has(k) ? false : (seen.add(k), true); });
}

// Reference chart: Data 9 (Sagar, 1999-06-06 15:30:01 IST, Bhavnagar, True Lahiri / Chitrapaksha, SM Singh, True nodes)
export const D9 = JSON.parse(readFileSync(new URL('./fixtures/jhora-data9.json', import.meta.url)));
export const D9_KC_TEXT = readFileSync(new URL('./fixtures/jhora-data9-kalachakra.txt', import.meta.url), 'utf8');
export const JH = {
  ...D9,
  kalachakra: {
    datetime: D9.birth.datetime,
    header: `Kalachakra Dasa (${D9.kalachakra_summary})`,
    rows: parseKalachakraText(D9_KC_TEXT, D9.birth.timezone),
  },
};
export const SAGAR = { datetime: D9.birth.datetime, latitude: D9.birth.latitude, longitude: D9.birth.longitude };
export const SAGAR_KC = SAGAR;

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
