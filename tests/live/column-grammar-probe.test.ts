import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { CheckColumnQuery } from '@/application/use-cases/check-column.query.js';
import { ReadMetricIndexQuery } from '@/application/use-cases/read-metric-index.query.js';
import { ReadMetricQuery } from '@/application/use-cases/read-metric.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * The metric vocabulary and the column contract, live — reads only.
 *
 * Gated on `BATTLEGRID_API_KEY` like its siblings:
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/column-grammar-probe.test.ts
 *
 * The last case is the one this change exists for: an illegal column must
 * come back as the platform's structured lesson — path, received value,
 * allowed domain — surviving the whole product path intact.
 *
 * Every case here passed live on 2026-08-01 — repeatedly — but that day's
 * platform also served intermittent gateway 504s (the same instability as
 * its three-hour outage that morning), so a failing run whose message reads
 * `tools/call failed with 504` is the platform's weather, reported honestly
 * by the product, not a regression in the mapping.
 */

const KEY = process.env['BATTLEGRID_API_KEY'];
const live = KEY ? describe : describe.skip;

const config = {
  clientId: '',
  mcpUrl: 'https://mcp.battlegrid.trade/mcp',
  authorizeUrl: 'https://mcp.battlegrid.trade/authorize',
  tokenUrl: 'https://mcp.battlegrid.trade/token',
  revokeUrl: 'https://mcp.battlegrid.trade/revoke',
  redirectUri: '',
};

const who = { userId: 'owner', accessToken: KEY as string };

function wire() {
  const clock = new FakeClock();
  const battlegrid = new McpBattleGridAdapter({
    config,
    audit: new FakeAuditStore(clock),
    confirmations: new FakeConfirmationStore(clock),
    heldScopes: new DeclaredScopes(['mcp:read']),
    remedy: 'repair-the-key',
    fetch: globalThis.fetch,
  });
  return new McpStrategyAdapter(battlegrid);
}

live('the column grammar answers through the product path', () => {
  it('the metric index lists dozens of metrics across families', { timeout: 300_000 }, async () => {
    const result = await new ReadMetricIndexQuery(wire()).execute(who);
    expect(result.kind).toBe('index');
    if (result.kind !== 'index') return;
    const total = result.families.reduce((n, f) => n + f.metrics.length, 0);
    expect(total).toBeGreaterThan(50);
    expect(result.families.length).toBeGreaterThan(3);
  });

  it('a metric card carries transforms with formulas', { timeout: 300_000 }, async () => {
    const result = await new ReadMetricQuery(wire()).execute({ ...who, metric: 'RSI14' });
    // Say what actually came back — 'unreadable' with its reason and a bare
    // kind mismatch are different investigations.
    if (result.kind !== 'metric') throw new Error(`not a card: ${JSON.stringify(result)}`);
    expect(result.hints.transforms.length).toBeGreaterThan(2);
    expect(result.hints.transforms.some((t) => t.formula)).toBe(true);
  });

  it('a valid column compiles; an illegal one teaches', { timeout: 300_000 }, async () => {
    const strategies = wire();
    const good = await new CheckColumnQuery(strategies).execute({
      ...who,
      column: { metric: 'RSI14', transformId: 'value', timeframe: { rel: 'anchor' } },
    });
    expect(good.kind).toBe('contract');
    if (good.kind === 'contract') {
      expect(good.contract.formula).toBeTruthy();
      expect(good.contract.outputs.length).toBeGreaterThan(0);
    }

    const bad = await new CheckColumnQuery(strategies).execute({
      ...who,
      column: {
        metric: 'RSI14',
        transformId: 'spread',
        timeframe: { rel: 'anchor' },
        inputs: ['CLOSE'],
      },
    });
    expect(bad.kind).toBe('refused');
    if (bad.kind !== 'refused') return;
    // The structured lesson, intact: where, what arrived, what is legal.
    expect(bad.refusal.path.length).toBeGreaterThan(0);
    expect(bad.refusal.received).toContain('CLOSE');
    expect(bad.refusal.allowedValues.length).toBeGreaterThan(0);
  });
});
