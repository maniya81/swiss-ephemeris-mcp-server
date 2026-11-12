// Minimal stdio/HTTP MCP client for tests: starts the server once or connects to HTTP MCP endpoint
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const DEFAULT_MCP_URL = 'https://swiss-ephemeris-mcp-372282693829.us-central1.run.app/mcp';

export function startServer(env = {}) {
  const hasLocalSwetest = spawnSync('swetest', ['-h'], { stdio: 'ignore' }).error === undefined;
  const remoteUrl = process.env.MCP_SERVER_URL || (!hasLocalSwetest ? DEFAULT_MCP_URL : null);

  if (remoteUrl) {
    const transport = new StreamableHTTPClientTransport(new URL(remoteUrl));
    const client = new Client({ name: 'test', version: '1' }, { capabilities: {} });
    const ready = client.connect(transport);
    return {
      ready,
      async call(name, args) {
        await ready;
        try {
          const message = await client.callTool({ name, arguments: args });
          const text = message.content?.[0]?.text ?? '';
          if (message.isError) {
            let error = text;
            let parameter = null;
            try {
              const parsed = JSON.parse(text).error;
              error = parsed.reason;
              parameter = parsed.parameter;
            } catch {}
            return { error, parameter, text };
          }
          return { result: JSON.parse(text), text, size: text.length };
        } catch (e) {
          return { error: e.message };
        }
      },
      listTools: async () => {
        await ready;
        return (await client.listTools()).tools;
      },
      stop: () => client.close(),
    };
  }

  const child = spawn('node', ['index.js'], { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'ignore'] });
  let buffer = '';
  let nextId = 1;
  const pending = new Map();
  child.stdout.on('data', (data) => {
    buffer += data;
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      const resolve = pending.get(message.id);
      if (resolve) {
        pending.delete(message.id);
        resolve(message);
      }
    }
  });
  const request = (method, params) => new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  const ready = request('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } })
    .then((init) => {
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
      return init;
    });

  return {
    ready,
    // Calls a tool; resolves to { result, error, text, size }
    async call(name, args) {
      await ready;
      const message = await request('tools/call', { name, arguments: args });
      if (message.error) return { error: message.error.message };
      const text = message.result.content[0].text;
      if (message.result.isError) {
        const parsed = JSON.parse(text).error;
        return { error: parsed.reason, parameter: parsed.parameter, text };
      }
      return { result: JSON.parse(text), text, size: text.length };
    },
    listTools: async () => (await request('tools/list', {})).result.tools,
    stop: () => child.kill(),
  };
}
