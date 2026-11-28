# Workspace Agent Rules

## Single Source of Truth for Skills
- Keep all repo skills under `.claude/skills/` (`.claude/skills/swiss-ephemeris-mcp/SKILL.md`, `.claude/skills/swiss-ephemeris-mcp/references/parameters.md`, and `.claude/skills/jhora-verification/SKILL.md`). Do not duplicate `SKILL.md` files into `.agents/skills/`; `.agents/skills.json` exposes `.claude/skills/` directly to Antigravity.

## Local MCP & Windows Shell Guardrails
- **Prefer `swissEphemerisLocal` over `swissEphemerisGCP`**: When working in this workspace, call tools on the local stdio MCP server (`swissEphemerisLocal`, backed by `index.js`) rather than the remote `swissEphemerisGCP` server so local blocks/tools (`sarvatobhadra`, `lagnamsaka`, `nakshatra_house_map`) are always in sync and immune to remote session drops. Do not write ad-hoc scratch scripts to call tools when `swissEphemerisLocal` is available.
- **When probing programmatically via `test/mcp-client.js`**:
  - Always unwrap the response wrapper: `const { result, error } = await srv.call(tool, args)`.
  - Always terminate with `srv.stop()` (there is no `srv.close()`).
  - Keep `MCP_SERVER_URL` unset so `startServer()` spawns local `index.js` rather than targeting a remote endpoint.
- **Windows PowerShell 5.1 commands**:
  - Use `;` (never `&&`) to chain commands in PowerShell 5.1.
  - Run multi-line Node scripts from a `.mjs` file rather than `node -e "..."` to avoid PowerShell stripping embedded double quotes.

## MCP Code ↔ Skill ↔ Test Synchronicity
Whenever modifying tool schemas, defaults, parameters, formatting, or worked examples across `index.js`, `src/`, `.claude/skills/swiss-ephemeris-mcp/`, or `test/`:

1. **Consumer-LLM MCP Audit First ("Use It Yourself as MCP")**
   - Treat `.claude/skills/swiss-ephemeris-mcp/SKILL.md` and `.claude/skills/swiss-ephemeris-mcp/references/parameters.md` as external prompt docs shipped to astrologers and their LLMs, who have **no source code access** and rely solely on MCP tool schemas plus the skill.
   - Before finishing any edit or skill review, read `.claude/skills/swiss-ephemeris-mcp/SKILL.md` and `.claude/skills/swiss-ephemeris-mcp/references/parameters.md` cold as a consumer LLM, inspect all `listTools()` schemas, and call every affected tool yourself via MCP to verify defaults, error messages, timezone behavior, parameter conflicts, and formatting.
   - When live tool behavior disagrees with `.claude/skills/swiss-ephemeris-mcp/SKILL.md` (or leaks confusing output/missing enums), fix the **root cause** in `index.js` / `src/` as well as updating the skill—never document around an unfixed bug.

2. **Schema & Reference Parity**
   - Keep every tool's `inputSchema` (names, enums, defaults, descriptions) in `index.js` synchronized with `.claude/skills/swiss-ephemeris-mcp/SKILL.md` and `.claude/skills/swiss-ephemeris-mcp/references/parameters.md`.
   - Use `Object.keys(AYANAMSAS)` for Vedic `ayanamsa` enums rather than hardcoded lists.
   - Ensure applicability rules remain explicit across all 10 tools (6 Vedic/KP + 4 Western Tropical): `output: "chain"` limits, `current_timezone` support, IST vs. explicit UTC offset behavior, Kalachakra `true_lahiri` defaults, and borderline shifted-call rules.

3. **Live MCP Probe Before Editing Docs**
   - Test tool schemas (`listTools()`) and outputs (`call()`) directly through `startServer()` in `test/mcp-client.js` (with `swetest` on `PATH` and `MCP_SERVER_URL` unset so calls hit the local `index.js` server rather than the remote URL).
   - Never hand-calculate, extrapolate, or guess example outputs or borderline counterfactuals in `.claude/skills/swiss-ephemeris-mcp/SKILL.md`; run the real/shifted MCP call first so every JSON snippet, coordinate, arc-second, and D-9/cusp note matches observed tool output.

4. **JHora Reference Guardrail**
   - Read `.claude/skills/jhora-verification/SKILL.md` before altering any dasha, Kalachakra, varga, aspect, ashtakavarga, Vimshopaka, Shadbala, or Bhavabala logic.

5. **Regression Tests & Full Verification**
   - Update or add tests in `test/*.test.js` whenever fixing a schema/output discrepancy or changing worked examples in `.claude/skills/swiss-ephemeris-mcp/SKILL.md`.
   - Run `npm test` after final edits and verify all tests pass with zero failures and zero skipped tests before finishing.

