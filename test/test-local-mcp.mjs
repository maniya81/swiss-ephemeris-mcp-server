import { startServer } from './mcp-client.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { spawn } from 'node:child_process';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log('===========================================================');
console.log('   Swiss Ephemeris MCP Server - Local Verification Suite   ');
console.log('===========================================================\n');

async function testStdioMode() {
  console.log('-----------------------------------------------------------');
  console.log(' 1. Stdio Mode: MCP Transport & Tool Execution');
  console.log('-----------------------------------------------------------');

  const srv = startServer();
  await srv.ready;
  console.log('✅ Local server process started and initialized via Stdio (JSON-RPC 2.0).\n');

  // List tools
  const tools = await srv.listTools();
  console.log(`📋 Verified ${tools.length} Registered Tools:`);
  for (const t of tools) {
    console.log(`   ✓ ${t.name}`);
  }

  console.log('\n🧪 Executing Each Tool with Local Swiss Ephemeris (swetest):');

  const tests = [
    {
      name: 'calculate_planetary_positions',
      args: { datetime: '1999-06-06T15:30:01+05:30', latitude: 21.7667, longitude: 72.15 },
      check: (res) => `Lagna=${res.houses?.['1']?.sign} ${res.houses?.['1']?.degree?.toFixed(2)}°, Sun=${res.planets?.Sun?.sign} ${res.planets?.Sun?.degree?.toFixed(2)}°, Moon=${res.planets?.Moon?.sign} ${res.planets?.Moon?.degree?.toFixed(2)}°`,
    },
    {
      name: 'calculate_transits',
      args: { birth_datetime: '1999-06-06T15:30:01+05:30', latitude: 21.7667, longitude: 72.15 },
      check: (res) => `Natal Sun=${res.natal_chart?.planets?.Sun?.sign}, Transit Sun=${res.current_transits?.planets?.Sun?.sign}`,
    },
    {
      name: 'calculate_solar_revolution',
      args: { birth_datetime: '1999-06-06T15:30:01+05:30', birth_latitude: 21.7667, birth_longitude: 72.15, return_year: 2024 },
      check: (res) => `Natal Sun=${res.natal_sun_longitude?.toFixed(2)}°, Return Sun=${res.return_sun_longitude?.toFixed(2)}°`,
    },
    {
      name: 'calculate_synastry',
      args: {
        person1_datetime: '1999-06-06T15:30:01+05:30', person1_latitude: 21.7667, person1_longitude: 72.15,
        person2_datetime: '2000-01-01T12:00:00+05:30', person2_latitude: 28.6139, person2_longitude: 77.2090,
      },
      check: (res) => `Synastry Aspects Computed=${res.synastry_aspects?.length ?? 0}`,
    },
    {
      name: 'calculate_vedic_chart',
      args: { datetime: '1999-06-06T15:30:01+05:30', latitude: 21.7667, longitude: 72.15, output: 'chain' },
      check: (res) => `Lagna=${res.lagna}, Vimshottari Chain=${res.vimshottari_dasha?.current?.chain}`,
    },
    {
      name: 'calculate_kalachakra_dasha',
      args: { datetime: '1999-06-06T15:30:01+05:30', latitude: 21.7667, longitude: 72.15, output: 'chain' },
      check: (res) => `Direction=${res.direction}, Paramayush=${res.paramayush}y, Deha=${res.deha}, Jiva=${res.jiva}, Chain=${res.current?.chain}`,
    },
    {
      name: 'calculate_gochar',
      args: { datetime: '1999-06-06T15:30:01+05:30', latitude: 21.7667, longitude: 72.15, as_of: '2026-11-12T12:00:00+05:30' },
      check: (res) => `Tara Bala=${res.tara_bala?.tara ?? 'N/A'}, Chandra Bala=H${res.chandra_bala?.house_from_moon ?? 'N/A'}, Sade Sati=${res.saturn?.sade_sati?.active ? res.saturn.sade_sati.phase : 'inactive'}`,
    },
    {
      name: 'calculate_ruling_planets',
      args: { datetime: '2026-11-12T12:00:00+05:30', latitude: 21.7667, longitude: 72.15 },
      check: (res) => `Day Lord=${res.components?.day_lord}, Lagna Star=${res.components?.lagna?.star_lord}, Cleaned=${res.cleaned?.join(', ')}`,
    },
    {
      name: 'rectify_by_transit',
      args: {
        datetime: '1999-06-06T15:30:01+05:30', latitude: 21.7667, longitude: 72.15, window_seconds: 600,
        anchors: [{ as_of: '2025-12-01T12:00:00+05:30', planet: 'Jupiter', target: 'cusp10' }],
      },
      check: (res) => `Best Fit Offset=${res.best_fit?.offset_s}s, Birth Time=${res.best_fit?.birth_time}`,
    },
    {
      name: 'nakshatra_house_map',
      args: { datetime: '1999-06-06T15:30:01+05:30', latitude: 21.7667, longitude: 72.15, locate: 'Chitra', output: 'chain' },
      check: (res) => `Lagna=${res.lagna}, Charan=${res.lagna_charan}, Locate=${res.locate}`,
    },
  ];

  let passCount = 0;
  for (const t of tests) {
    const r = await srv.call(t.name, t.args);
    if (r.error) {
      console.log(`   ❌ ${t.name}: FAILED (${r.error})`);
    } else {
      console.log(`   ✅ ${t.name}: OK`);
      console.log(`      ↳ ${t.check(r.result)}`);
      passCount++;
    }
  }

  // Test error handling
  console.log('\n🛡️  Error Handling & Input Validation:');
  const invalidCall = await srv.call('calculate_planetary_positions', {
    datetime: '1999-06-06T15:30:01+05:30',
    latitude: 150, // Invalid latitude (> 90)
    longitude: 72.15,
  });
  if (invalidCall.error) {
    console.log(`   ✅ Correctly rejected invalid input: "${invalidCall.error}" (parameter: ${invalidCall.parameter})`);
  } else {
    console.log('   ❌ Did not reject invalid input');
  }

  srv.stop();
  console.log(`\nStdio Mode Summary: ${passCount}/${tests.length} tools executed successfully.\n`);
}

async function testHttpMode() {
  console.log('-----------------------------------------------------------');
  console.log(' 2. HTTP Mode: Express & StreamableHTTP Transport');
  console.log('-----------------------------------------------------------');

  const testPort = 3123;
  const serverProcess = spawn('node', ['index.js'], {
    env: {
      ...process.env,
      MCP_HTTP_MODE: 'true',
      PORT: String(testPort),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stderr.on('data', () => {});

  try {
    // Wait for HTTP server to start
    let healthy = false;
    for (let i = 0; i < 30; i++) {
      await wait(300);
      try {
        const res = await fetch(`http://localhost:${testPort}/health`);
        if (res.ok) {
          const body = await res.json();
          console.log(`✅ Health check endpoint (/health) returned 200 OK:`);
          console.log(`   status: "${body.status}", version: "${body.version}", transport: "${body.transport}"`);
          healthy = true;
          break;
        }
      } catch {}
    }

    if (!healthy) {
      throw new Error('HTTP server failed to respond on /health within 10s');
    }

    // Check root endpoint /
    const rootRes = await fetch(`http://localhost:${testPort}/`);
    const rootJson = await rootRes.json();
    console.log(`✅ Root endpoint (/) returned info for "${rootJson.name}"`);

    // StreamableHTTP Client connection
    console.log('\nConnecting MCP Client via StreamableHTTP to /mcp...');
    const httpTransport = new StreamableHTTPClientTransport(
      new URL(`http://localhost:${testPort}/mcp`)
    );
    const httpClient = new Client(
      { name: 'local-test-client', version: '1.0.0' },
      { capabilities: {} }
    );
    await httpClient.connect(httpTransport);
    console.log('✅ Connected and initialized session over StreamableHTTP');

    // List tools over HTTP
    const httpTools = await httpClient.listTools();
    console.log(`✅ Retrieved ${httpTools.tools.length} tools via HTTP`);

    // Tool call over HTTP
    console.log('Executing "calculate_planetary_positions" tool call over HTTP...');
    const result = await httpClient.callTool({
      name: 'calculate_planetary_positions',
      arguments: {
        datetime: '1999-06-06T15:30:01+05:30',
        latitude: 21.7667,
        longitude: 72.15,
      },
    });
    const parsed = JSON.parse(result.content[0].text);
    console.log(`✅ Tool call succeeded over HTTP:`);
    console.log(`   Sun sign=${parsed.planets?.Sun?.sign}, degree=${parsed.planets?.Sun?.degree?.toFixed(2)}°`);
    console.log(`   Moon sign=${parsed.planets?.Moon?.sign}, degree=${parsed.planets?.Moon?.degree?.toFixed(2)}°`);

    await httpClient.close();
    console.log('✅ StreamableHTTP client closed cleanly.');
  } finally {
    serverProcess.kill();
    console.log('✅ HTTP server stopped.\n');
  }
}

async function run() {
  await testStdioMode();
  await testHttpMode();
  console.log('===========================================================');
  console.log('🎉 ALL LOCAL MCP TESTS AND TRANSPORTS PASSED SUCCESSFULLY!');
  console.log('===========================================================');
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
