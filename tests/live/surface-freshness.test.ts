import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../support/canonical-json.js';

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
  instructions?: {
    sha256_normalised?: string;
    addressee_normalisation?: { pattern?: string; replacement?: string };
  };
  prompts?: Array<{ name?: string; body_sha256?: string }>;
  resources?: Array<{ name?: string; uri?: string; content_sha256?: string }>;
  authoring_vocabulary?: {
    categories?: Record<string, { sha256?: string }>;
  };
}

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

/** One JSON-RPC call, answered either plainly or as an SSE frame. */
async function rpc(method: string, params: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${KEY as string}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const raw = await response.text();
  const frame = raw.startsWith('event:')
    ? (raw.split('\n').find((l) => l.startsWith('data: ')) ?? '').slice('data: '.length)
    : raw;
  return (JSON.parse(frame) as { result?: Record<string, unknown> }).result ?? {};
}

async function serverInfo(): Promise<{ name: string; version: string; instructions: string }> {
  const result = await rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'grid-commander-freshness', version: '1.0.0' },
  });
  const info = result['serverInfo'] as Record<string, string> | undefined;
  return {
    name: info?.['name'] ?? '',
    version: info?.['version'] ?? '',
    instructions: typeof result['instructions'] === 'string' ? result['instructions'] : '',
  };
}

/** A read tool's payload, out of the MCP envelope it travels in. */
async function toolPayload(tool: string, args: unknown): Promise<Record<string, unknown>> {
  const result = await rpc('tools/call', { name: tool, arguments: args });
  const structured = result['structuredContent'];
  if (typeof structured === 'object' && structured !== null) {
    return structured as Record<string, unknown>;
  }
  const blocks = (result['content'] ?? []) as Array<{ type?: string; text?: string }>;
  const text = blocks.find((b) => b.type === 'text')?.text ?? '';
  return JSON.parse(text) as Record<string, unknown>;
}

/** Prompt body text, flattened the way the probe flattens it. */
function contentText(content: unknown): string {
  if (Array.isArray(content)) return content.map(contentText).join('\n');
  if (typeof content === 'object' && content !== null) {
    const c = content as Record<string, unknown>;
    if (typeof c['text'] === 'string') return c['text'];
    if (c['content'] !== undefined) return contentText(c['content']);
  }
  return '';
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

live('the recorded prose surfaces still match the platform', () => {
  /**
   * A version match does not prove the prose matches — and the prose is where
   * the platform states what no schema can: scope semantics, per-tool
   * pagination, authoring deadlines, the request budget. Each surface is
   * compared by digest, so this fails naming the surface that moved rather
   * than drowning the diff in 25KB of text.
   */
  const recorded = JSON.parse(readFileSync('docs/battlegrid-mcp-surface.json', 'utf8')) as Surface;

  it('the server instructions, addressee-normalised', { timeout: 120_000 }, async () => {
    const rule = recorded.instructions?.addressee_normalisation ?? {};
    expect(rule.pattern, `record carries no normalisation rule — re-probe: ${REPROBE}`).toBeTruthy();

    const now = await serverInfo();
    expect(now.instructions, 'the live server returned no instructions').toBeTruthy();

    // The record's own rule, applied to the live text. The greeting names
    // whichever account runs this guard; the digest must not care.
    const normalised = now.instructions.replace(
      new RegExp(rule.pattern ?? ''),
      rule.replacement ?? '',
    );
    expect(
      sha256(normalised),
      `the server instructions have changed under version ${String(recorded.server?.version)} — ` +
        `re-probe: ${REPROBE}`,
    ).toBe(recorded.instructions?.sha256_normalised);
  });

  it('every prompt body', { timeout: 120_000 }, async () => {
    const listed = ((await rpc('prompts/list', {}))['prompts'] ?? []) as Array<{ name: string }>;
    expect(
      listed.map((p) => p.name).sort(),
      `the prompt list itself moved — re-probe: ${REPROBE}`,
    ).toEqual((recorded.prompts ?? []).map((p) => String(p.name)).sort());

    for (const p of recorded.prompts ?? []) {
      const got = await rpc('prompts/get', { name: p.name, arguments: {} });
      const body = ((got['messages'] ?? []) as Array<{ content?: unknown }>)
        .map((m) => contentText(m.content))
        .join('\n');
      expect(
        sha256(body),
        `prompt \`${String(p.name)}\` has changed — re-probe: ${REPROBE}`,
      ).toBe(p.body_sha256);
    }
  });

  it('every resource', { timeout: 120_000 }, async () => {
    const listed = ((await rpc('resources/list', {}))['resources'] ?? []) as Array<{ uri: string }>;
    expect(
      listed.map((r) => r.uri).sort(),
      `the resource list itself moved — re-probe: ${REPROBE}`,
    ).toEqual((recorded.resources ?? []).map((r) => String(r.uri)).sort());

    for (const r of recorded.resources ?? []) {
      const got = await rpc('resources/read', { uri: r.uri });
      const content = ((got['contents'] ?? []) as unknown[]).map(contentText).join('\n');
      expect(
        sha256(content),
        `resource \`${String(r.uri)}\` has changed — re-probe: ${REPROBE}`,
      ).toBe(r.content_sha256);
    }
  });

  it('the authoring vocabulary, category by category', { timeout: 240_000 }, async () => {
    /**
     * A budget number, an enabled timeframe, a timeframe reference's
     * resolution, or a transform can all change under an unchanged server
     * version — the version comparison does not cover them, which is the
     * whole finding of `the-surface-map-is-two-majors-stale`. Digest per
     * category, so the failure names the category that moved.
     */
    const recordedCats = Object.keys(recorded.authoring_vocabulary?.categories ?? {}).sort();
    expect(recordedCats.length, `no vocabulary recorded — re-probe: ${REPROBE}`).toBeGreaterThan(0);

    const listed = await toolPayload('list_strategy_categories', {});
    const liveCats = ((listed['categories'] ?? []) as Array<{ category?: string }>)
      .map((c) => String(c.category))
      .sort();
    expect(liveCats, `the category list itself moved — re-probe: ${REPROBE}`).toEqual(recordedCats);

    for (const cat of recordedCats) {
      const payload = await toolPayload('list_strategy_vocabulary', { category: cat });
      expect(
        sha256(canonicalJson(payload)),
        `vocabulary \`${cat}\` has changed under version ` +
          `${String(recorded.server?.version)} — re-probe: ${REPROBE}`,
      ).toBe(recorded.authoring_vocabulary?.categories?.[cat]?.sha256);
    }
  });
});
