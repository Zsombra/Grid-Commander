import { describe, expect, it } from 'vitest';
import { mapConditions } from '@/infrastructure/battlegrid/condition-mapper.js';
import {
  buildingBlocks,
  directionalCalls,
  hasUnrecognisedPart,
} from '@/domain/strategy/condition.js';

/**
 * The condition mapper, against every condition the account actually holds.
 *
 * `tests/strategy/conditions.test.ts` runs the mapper over Berlin's shape
 * copied into a fixture. This runs it over **all of them**, live — so a form
 * the platform adds tomorrow shows up here as an `unrecognised` count rather
 * than as a strategy page quietly missing a rule.
 *
 * That distinction is the whole reason this file exists. The layer is being
 * rolled out: eight platform strategies gained conditions across a single
 * deployment on 2026-08-04, going from zero to between two and nine each. A
 * fixture written today describes a grammar that is still moving.
 *
 * Read-only: `list_strategies` and `get_strategy`, nothing else.
 */

const KEY = process.env['BATTLEGRID_API_KEY'];
/**
 * Gated on its own variable, not on the key.
 *
 * This is a sweep: it reads every strategy on the account, one call each, and
 * takes about two minutes. Gated on the key alone it joined the ordinary
 * `vitest` gate and ran concurrently with the other live probes, starving them
 * — `column-grammar-probe` began answering `unreadable` on calls that succeed
 * in 1.1 seconds when asked on their own. A check that breaks its neighbours is
 * not free to run by default.
 *
 * `oauth-metadata.test.ts` set the precedent in the other direction: do not tie
 * a check to a variable whose meaning is not what the check needs. A key means
 * "authority is available", not "spend two minutes of it".
 *
 *     BATTLEGRID_API_KEY=bg_live_… BATTLEGRID_CONDITION_SWEEP=1 \
 *       npx vitest run tests/live/condition-probe.test.ts
 */
const SWEEP = process.env['BATTLEGRID_CONDITION_SWEEP'] === '1';
const live = KEY && SWEEP ? describe : describe.skip;

const MCP_URL = 'https://mcp.battlegrid.trade/mcp';

function session() {
  let sid: string | null = null;
  const headers = (): Record<string, string> => ({
    authorization: `Bearer ${KEY as string}`,
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    ...(sid ? { 'mcp-session-id': sid } : {}),
  });
  const parse = (raw: string): Record<string, unknown> => {
    const frame = raw.startsWith('event:')
      ? (raw.split('\n').find((l) => l.startsWith('data: ')) ?? '').slice('data: '.length)
      : raw;
    return JSON.parse(frame) as Record<string, unknown>;
  };
  const rpc = async (method: string, params: unknown): Promise<Record<string, unknown>> => {
    const r = await fetch(MCP_URL, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const got = r.headers.get('mcp-session-id');
    if (got) sid = got;
    return parse(await r.text());
  };
  return {
    async open() {
      await rpc('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'condition-probe', version: '1.0.0' },
      });
      await fetch(MCP_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      });
    },
    async call(name: string, args: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
      const res = (await rpc('tools/call', { name, arguments: args }))['result'] as
        | { structuredContent?: Record<string, unknown>; content?: { type: string; text: string }[] }
        | undefined;
      if (res?.structuredContent) return res.structuredContent;
      const text = res?.content?.find((c) => c.type === 'text')?.text ?? '{}';
      return JSON.parse(text) as Record<string, unknown>;
    },
  };
}

live('the mapper reads every condition the account holds', () => {
  it('maps them all with nothing unrecognised', { timeout: 600_000 }, async () => {
    const s = session();
    await s.open();

    const list = (await s.call('list_strategies'))['strategies'] as { id: string }[] | undefined;
    expect(Array.isArray(list), 'the strategy roster reads').toBe(true);

    let withConditions = 0;
    let total = 0;
    let calls = 0;
    let blocks = 0;
    const unmodelled: string[] = [];

    for (const row of list ?? []) {
      const detail = (await s.call('get_strategy', { strategyId: row.id }))['strategy'] as
        | Record<string, unknown>
        | undefined;
      const raw = detail?.['conditions'];
      if (!Array.isArray(raw) || raw.length === 0) continue;

      const mapped = mapConditions(raw);
      // Every condition the platform sent survives the mapping. A dropped one
      // would mean a key was missing, which would itself be a finding.
      expect(mapped.length, `${String(detail?.['name'])} kept every condition`).toBe(raw.length);

      withConditions += 1;
      total += mapped.length;
      calls += directionalCalls(mapped).length;
      blocks += buildingBlocks(mapped).length;
      for (const c of mapped) {
        if (hasUnrecognisedPart(c.definition)) {
          unmodelled.push(`${String(detail?.['name'])}/${c.conditionKey}`);
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `  ${withConditions} of ${(list ?? []).length} strategies carry conditions · ` +
        `${total} total · ${calls} decide direction · ${blocks} named blocks`,
    );

    expect(withConditions, 'at least one strategy carries conditions').toBeGreaterThan(0);
    // Building blocks are roughly half of what is out there, and the product's
    // whole claim is that it does not present them as directional calls.
    expect(calls + blocks).toBe(total);

    // The assertion this file is for. A new form is not a crash and not a
    // silent gap — it is a named failure pointing at the strategy to look at.
    expect(
      unmodelled,
      'conditions using a form this product does not model — extend condition-mapper.ts',
    ).toEqual([]);
  });
});
