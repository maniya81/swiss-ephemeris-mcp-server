import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const rawUrl = process.env.MCP_REMOTE_URL || process.env.MCP_URL || 'https://swiss-ephemeris-mcp-372282693829.us-central1.run.app';
const BASE_URL = rawUrl.replace(/\/mcp\/?$/, '').replace(/\/$/, '');
const MCP_URL = `${BASE_URL}/mcp`;

async function smokeTest() {
  console.log('===========================================================');
  console.log('   Smoke Testing Deployed Cloud Run MCP Service');
  console.log('   Target: ' + BASE_URL);
  console.log('===========================================================\n');

  // Step 1: Health Check
  console.log('1. Checking HTTP /health endpoint...');
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    console.log(`   HTTP Status: ${healthRes.status} ${healthRes.statusText}`);
    const healthJson = await healthRes.json();
    console.log('   Response:', JSON.stringify(healthJson, null, 2));
  } catch (err) {
    console.error('❌ /health check failed:', err.message);
  }

  // Step 2: Root Endpoint
  console.log('\n2. Checking HTTP / endpoint...');
  try {
    const rootRes = await fetch(`${BASE_URL}/`);
    console.log(`   HTTP Status: ${rootRes.status} ${rootRes.statusText}`);
    const rootJson = await rootRes.json();
    console.log('   Response:', JSON.stringify(rootJson, null, 2));
  } catch (err) {
    console.error('❌ / check failed:', err.message);
  }

  // Step 3: MCP Protocol Connection
  console.log('\n3. Connecting via MCP StreamableHTTP to /mcp...');
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const client = new Client(
    { name: 'smoke-test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log('   ✅ Successfully connected and initialized MCP session!');

    // Step 4: List Tools
    console.log('\n4. Listing registered tools...');
    const toolsResult = await client.listTools();
    console.log(`   ✅ Found ${toolsResult.tools.length} registered tools:`);
    for (const tool of toolsResult.tools) {
      console.log(`      • ${tool.name}: ${tool.description.substring(0, 60)}...`);
    }

    // Step 5: Test Tool 1 - calculate_planetary_positions
    console.log('\n5. Executing Tool: calculate_planetary_positions...');
    const posRes = await client.callTool({
      name: 'calculate_planetary_positions',
      arguments: {
        datetime: '1999-06-06T15:30:01+05:30',
        latitude: 21.7667,
        longitude: 72.15,
      },
    });
    const posData = JSON.parse(posRes.content[0].text);
    console.log('   ✅ Planetary Positions calculated successfully:');
    console.log(`      Ascendant (Lagna): ${posData.houses?.['1']?.sign} ${posData.houses?.['1']?.degree?.toFixed(2)}°`);
    console.log(`      Sun: ${posData.planets?.Sun?.sign} ${posData.planets?.Sun?.degree?.toFixed(2)}°`);
    console.log(`      Moon: ${posData.planets?.Moon?.sign} ${posData.planets?.Moon?.degree?.toFixed(2)}°`);

    // Step 6: Test Tool 2 - calculate_vedic_chart
    console.log('\n6. Executing Tool: calculate_vedic_chart...');
    const vedicRes = await client.callTool({
      name: 'calculate_vedic_chart',
      arguments: {
        datetime: '1999-06-06T15:30:01+05:30',
        latitude: 21.7667,
        longitude: 72.15,
        output: 'chain',
      },
    });
    const vedicData = JSON.parse(vedicRes.content[0].text);
    console.log('   ✅ Vedic Chart calculated successfully:');
    console.log(`      Lagna: ${vedicData.lagna}`);
    console.log(`      Current Vimshottari: ${vedicData.vimshottari_dasha?.current?.chain}`);

    // Step 7: Test Tool 3 - calculate_kalachakra_dasha
    console.log('\n7. Executing Tool: calculate_kalachakra_dasha...');
    const kcdRes = await client.callTool({
      name: 'calculate_kalachakra_dasha',
      arguments: {
        datetime: '1999-06-06T15:30:01+05:30',
        latitude: 21.7667,
        longitude: 72.15,
      },
    });
    const kcdData = JSON.parse(kcdRes.content[0].text);
    console.log('   ✅ Kalachakra Dasha calculated successfully:');
    console.log(`      Direction: ${kcdData.direction}, Paramayush: ${kcdData.paramayush}y, Deha: ${kcdData.deha}, Jiva: ${kcdData.jiva}`);

    await client.close();
    console.log('\n===========================================================');
    console.log('🎉 ALL CLOUD RUN DEPLOYMENT SMOKE TESTS PASSED!');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ MCP Tool call or connection failed:', err);
    process.exit(1);
  }
}

smokeTest();

