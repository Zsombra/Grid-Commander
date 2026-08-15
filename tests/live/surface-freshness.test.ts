import { createHash } from 'node:crypto';
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
const REPROBE_VOCAB = 'BATTLEGRID_API_KEY=… python3 tools/probe_vocabulary.py';

interface Surface {
  server?: { name?: string; version?: string };
  probed_at?: string;
  tool_count?: number;
}

interface VocabularyArtifact {
  server?: { name?: string; version?: string };
  probed_at?: string;
  vocabulary?: Record<string, VocabularyPayload>;
}

interface VocabularyPayload {
  budgets?: Record<string, unknown>;
  timeframes?: unknown[];
  transforms?: Array<{ id?: string }>;
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

/** One JSON-RPC call, unwrapped to its `result` — plain or SSE-framed. */
async function rpc(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
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
  const parsed = JSON.parse(frame) as { result?: Record<string, unknown>; error?: unknown };
  if (parsed.result === undefined) {
    throw new Error(`${method} answered no result: ${JSON.stringify(parsed.error).slice(0, 200)}`);
  }
  return parsed.result;
}

/** One `tools/call`, unwrapped to its payload — plain or SSE-framed. */
async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
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
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });
  const raw = await response.text();
  const frame = raw.startsWith('event:')
    ? (raw.split('\n').find((l) => l.startsWith('data: ')) ?? '').slice('data: '.length)
    : raw;
  const result = (JSON.parse(frame) as { result?: Record<string, unknown> }).result ?? {};
  if ('structuredContent' in result) return result['structuredContent'];
  const blocks = (result['content'] ?? []) as Array<{ type?: string; text?: string }>;
  const text = blocks.find((b) => b.type === 'text')?.text;
  if (result['isError'] === true) throw new Error(`${name} answered an error: ${text ?? ''}`);
  if (text === undefined) throw new Error(`${name} answered no payload`);
  return JSON.parse(text);
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

live('the recorded vocabulary still describes the platform', () => {
  /**
   * The version gate above cannot see this class of change: a deployment that
   * moves budget numbers, retires a timeframe or adds a transform while
   * leaving the version string alone passes every version comparison green
   * (#92). So the three value classes the authoring contract turns on are
   * compared directly, per category, against `docs/battlegrid-vocabulary.json`.
   *
   * v17.2.0 demonstrated the sibling pattern live the day this gate was
   * written: a tool count that held at 114 while seventeen tools changed
   * underneath it.
   */
  const artifact = JSON.parse(
    readFileSync('docs/battlegrid-vocabulary.json', 'utf8'),
  ) as VocabularyArtifact;
  const categories = Object.keys(artifact.vocabulary ?? {});

  it('has categories to compare at all', () => {
    expect(categories.length, `the artifact records no categories — ${REPROBE_VOCAB}`)
      .toBeGreaterThan(0);
  });

  for (const category of categories) {
    it(`${category}: budgets, timeframes and transform ids match the live platform`, { timeout: 120_000 }, async () => {
      const recorded = (artifact.vocabulary ?? {})[category] as VocabularyPayload;
      const now = (await callTool('list_strategy_vocabulary', { category })) as VocabularyPayload;

      const ids = (v: VocabularyPayload): string[] =>
        (v.transforms ?? []).map((t) => t.id ?? '').sort();

      expect(
        now.budgets,
        `the ${category} budgets moved under the record — ${REPROBE_VOCAB}`,
      ).toEqual(recorded.budgets);
      expect(
        now.timeframes,
        `the enabled timeframes moved under the record — ${REPROBE_VOCAB}`,
      ).toEqual(recorded.timeframes);
      expect(
        ids(now),
        `the ${category} transform ids moved under the record — ${REPROBE_VOCAB}`,
      ).toEqual(ids(recorded));
    });
  }
});

/**
 * The platform's prose, against the platform that is running right now.
 *
 * The version gate above catches a deployment. The vocabulary gate catches
 * values moving under an unchanged version. Neither can see the third class:
 * **prose moving under an unchanged version** — and the prose is where
 * BattleGrid states the constraints no schema expresses (scope semantics,
 * copy-don't-construct, per-tool pagination, authoring deadlines), each of
 * which this project has already paid for at least once (#294).
 *
 * Digests rather than whole texts, so a failure names the surface that moved
 * instead of printing 25,000 characters at whoever ran it.
 */
live('the recorded prose still describes the platform', () => {
  const RECAPTURE = 'BATTLEGRID_API_KEY=… python3 tools/capture_mcp_dump.py build_log/dump';

  interface Entry {
    name?: string;
    uri?: string;
    result?: { messages?: { content?: { text?: string } }[]; contents?: { text?: string }[] };
    failure?: unknown;
  }
  interface Capabilities {
    instructions?: string;
    promptBodies?: Entry[];
    resourceContents?: Entry[];
  }

  const cap = JSON.parse(
    readFileSync('docs/battlegrid-mcp-capabilities.json', 'utf8'),
  ) as Capabilities;

  /**
   * The instructions with the addressee removed.
   *
   * BattleGrid greets the connected account by name — "You are connected to
   * BattleGrid as Fibonacci —" — so the raw text differs per operator and a
   * digest over it would fail for everyone who did not take the record. That
   * would make this gate a report on whose key is in the environment, which is
   * not a fact about the platform. The greeting is the only account-derived
   * span in the text (verified 2026-08-15 at v19.1.0: one occurrence).
   */
  const normalise = (text: string): string =>
    text.replace(/(connected to BattleGrid as ).*?( —)/u, '$1<account>$2');

  const digest = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

  /**
   * Every text a prompt or resource result carries, concatenated.
   *
   * Takes the `result` rather than the entry so the same function reads a
   * recorded body and a live response — the comparison is only honest if both
   * sides are flattened by one implementation.
   */
  const textOf = (result: Entry['result'] | undefined): string =>
    [
      ...(result?.messages ?? []).map((m) => m.content?.text ?? ''),
      ...(result?.contents ?? []).map((c) => c.text ?? ''),
    ].join('');

  it('the greeting is normalised away, and nothing else is', () => {
    /**
     * The normalisation, held to its own terms. A rule that erased more than
     * the greeting would hide exactly the drift this gate exists to catch.
     *
     * The fixtures carry **a second em-dash on the greeting line**, which is
     * what makes this discriminating rather than decorative: the real
     * instructions hold 82 of them, so a greedy `.*` would swallow everything
     * up to the last one on that line and silently erase real contract text.
     * With one em-dash per fixture, greedy and lazy are indistinguishable and
     * this case would pass for both.
     */
    const line = (who: string, rule: string): string =>
      `You are connected to BattleGrid as ${who} — a platform — the only one.\nRule: ${rule}`;
    const mine = line('Fibonacci', 'copy, do not construct.');
    const theirs = line('Archimedes', 'copy, do not construct.');
    const edited = line('Fibonacci', 'construct freely.');

    // Two accounts, same platform: the greeting alone must not separate them.
    expect(digest(normalise(mine))).toBe(digest(normalise(theirs)));
    // A real edit still separates them.
    expect(digest(normalise(mine))).not.toBe(digest(normalise(edited)));
    // And the text after the greeting survives intact — the assertion an
    // over-greedy variant fails.
    expect(normalise(mine)).toContain('a platform — the only one.');
    expect(normalise(mine)).not.toContain('Fibonacci');
  });

  it('the instructions have not moved', { timeout: 120_000 }, async () => {
    const now = await rpc('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'grid-commander-freshness', version: '1.0.0' },
    });
    const liveText = String(now['instructions'] ?? '');
    expect(liveText, 'the live server sent no instructions').toBeTruthy();
    expect(cap.instructions, `no instructions recorded — ${RECAPTURE}`).toBeTruthy();
    expect(
      digest(normalise(liveText)),
      `the server instructions moved under the record — ${RECAPTURE}`,
    ).toBe(digest(normalise(cap.instructions ?? '')));
  });

  for (const entry of cap.promptBodies ?? []) {
    it(`prompt ${String(entry.name)} has not moved`, { timeout: 120_000 }, async () => {
      if (entry.failure !== undefined) {
        // A recorded refusal has no baseline to compare against — but it must
        // not exempt the surface forever. If the platform has started
        // answering, the record is stale in the one direction a digest
        // comparison can never see, so the fetch is retried and a body that
        // now arrives is the finding.
        const retried = await rpc('prompts/get', { name: entry.name, arguments: {} }).catch(
          () => null,
        );
        expect(
          retried === null || textOf(retried as Entry['result']).length === 0,
          `${String(entry.name)} is recorded as refused but the platform answers it now — ${RECAPTURE}`,
        ).toBe(true);
        return;
      }
      const now = await rpc('prompts/get', { name: entry.name, arguments: {} });
      const liveText = textOf(now as Entry['result']);
      expect(
        digest(liveText),
        `the ${String(entry.name)} prompt body moved under the record — ${RECAPTURE}`,
      ).toBe(digest(textOf(entry.result)));
    });
  }

  for (const entry of cap.resourceContents ?? []) {
    it(`resource ${String(entry.uri)} has not moved`, { timeout: 120_000 }, async () => {
      if (entry.failure !== undefined) {
        // Same rule as the prompts above: a refusal must not become a
        // permanent exemption.
        const retried = await rpc('resources/read', { uri: entry.uri }).catch(() => null);
        expect(
          retried === null || textOf(retried as Entry['result']).length === 0,
          `${String(entry.uri)} is recorded as refused but the platform answers it now — ${RECAPTURE}`,
        ).toBe(true);
        return;
      }
      const now = await rpc('resources/read', { uri: entry.uri });
      const liveText = textOf(now as Entry['result']);
      expect(
        digest(liveText),
        `the ${String(entry.uri)} resource content moved under the record — ${RECAPTURE}`,
      ).toBe(digest(textOf(entry.result)));
    });
  }
});
