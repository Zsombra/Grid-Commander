import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The recorded surface, against the BattleGrid that is running right now.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/surface-freshness.test.ts
 *
 * `tests/architecture/surface-freshness.test.ts` asserts the record *can* be
 * compared. This one compares it, and is the only check in the repository that
 * can discover a BattleGrid deployment.
 *
 * It exists because one already happened unnoticed: v3.0.0 → v5.0.0, tool count
 * unchanged at 110, nine conformance guards green throughout. The sibling
 * `oauth-metadata.test.ts` had already named this exact gap — "the same
 * relationship `probe_mcp_surface.py` has to the tool artifact" — and it was
 * built for the discovery document but never for the tool surface.
 *
 * A version mismatch does not mean anything is broken. It means nothing here
 * knows whether it is, which is the state this product treats as a finding
 * everywhere else.
 */

const KEY = process.env['BATTLEGRID_API_KEY'];
const live = KEY ? describe : describe.skip;

const MCP_URL = 'https://mcp.battlegrid.trade/mcp';
const REPROBE = 'BATTLEGRID_API_KEY=… python3 tools/probe_mcp_surface.py';

interface Surface {
  server?: { name?: string; version?: string };
  probed_at?: string;
  tool_count?: number;
}

/** `initialize`, answered either plainly or as an SSE frame. */
async function serverInfo(): Promise<{ name: string; version: string }> {
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${KEY as string}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'grid-commander-freshness', version: '1.0.0' },
      },
    }),
  });
  const raw = await response.text();
  const frame = raw.startsWith('event:')
    ? (raw.split('\n').find((l) => l.startsWith('data: ')) ?? '').slice('data: '.length)
    : raw;
  const info = (JSON.parse(frame) as { result?: { serverInfo?: Record<string, string> } }).result
    ?.serverInfo;
  return { name: info?.name ?? '', version: info?.version ?? '' };
}

live('the recorded surface still describes the platform', () => {
  it('was taken from the server that is running now', { timeout: 120_000 }, async () => {
    const recorded = JSON.parse(
      readFileSync('docs/battlegrid-mcp-surface.json', 'utf8'),
    ) as Surface;
    const now = await serverInfo();

    // eslint-disable-next-line no-console
    console.log(
      `  recorded ${recorded.server?.name ?? '(none)'} ${recorded.server?.version ?? '(none)'}` +
        ` · live ${now.name} ${now.version}`,
    );

    // Absent is not matching. A record with no version cannot be compared, and
    // reporting that as agreement is the failure this whole change is about —
    // so it fails here rather than passing quietly or skipping.
    expect(
      recorded.server?.version,
      `the record names no server version, so it cannot be compared — re-probe: ${REPROBE}`,
    ).toBeTruthy();

    expect(
      now.version,
      `the live server reported no version — recorded ${String(recorded.server?.version)}`,
    ).toBeTruthy();

    expect(
      recorded.server?.version,
      `BattleGrid has been redeployed: recorded ${String(recorded.server?.version)}, ` +
        `live ${now.version}. Nine conformance guards read this record. Re-probe: ${REPROBE}`,
    ).toBe(now.version);

    expect(recorded.server?.name).toBe(now.name);
  });

  it('does not let an agreeing tool count stand in for a version', { timeout: 120_000 }, async () => {
    /**
     * The trap, asserted rather than described. Across v3.0.0 → v5.0.0 the
     * count was 110 both times, so any check that treated it as evidence would
     * have passed through the deployment this file exists to catch.
     */
    const recorded = JSON.parse(
      readFileSync('docs/battlegrid-mcp-surface.json', 'utf8'),
    ) as Surface;
    const now = await serverInfo();
    const agreesOnCount = typeof recorded.tool_count === 'number';

    expect(agreesOnCount, 'the record has a tool count at all').toBe(true);
    // The version is what decides it, whatever the count says.
    expect(recorded.server?.version).toBe(now.version);
  });
});
