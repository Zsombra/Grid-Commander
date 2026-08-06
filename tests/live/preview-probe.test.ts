import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { PreviewCompositionQuery } from '@/application/use-cases/preview-composition.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * The agent's-eye preview, live through the product path — reads only,
 * writes nothing, on a strategy the account already holds.
 *
 * Gated on `BATTLEGRID_API_KEY` like its siblings:
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/preview-probe.test.ts
 *
 * A failing run whose message reads `tools/call failed with 504` is the
 * platform's weather, reported honestly — not a regression in the mapping.
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

live('a composition previews as the agent reads it', () => {
  it('renders sections, cost, budget, and membership for a real strategy', { timeout: 300_000 }, async () => {
    const clock = new FakeClock();
    const battlegrid = new McpBattleGridAdapter({
      config,
      audit: new FakeAuditStore(clock),
      confirmations: new FakeConfirmationStore(clock),
      heldScopes: new DeclaredScopes(['mcp:read']),
      remedy: 'repair-the-key',
      fetch: globalThis.fetch,
    });
    const strategies = new McpStrategyAdapter(battlegrid);

    const listing = await strategies.listStrategies(who);
    if (listing.kind !== 'strategies') throw new Error('cannot read strategies');
    const subject = listing.strategies.find((s) => s.scope === 'SYSTEM' && s.isActive);
    if (!subject) throw new Error('no SYSTEM strategy visible');

    const result = await new PreviewCompositionQuery(strategies).execute({
      ...who,
      strategyId: subject.id,
      coinSelection: { mode: 'ranked', limit: 2 },
    });
    if (result.kind !== 'ready') throw new Error(`not ready: ${JSON.stringify(result)}`);
    // eslint-disable-next-line no-console
    console.log(
      `  subject: ${subject.name} | outcome ${result.outcome.kind}` +
        (result.outcome.kind === 'preview'
          ? ` | sections ${result.outcome.preview.sections.length} | counted as ${String(result.outcome.preview.tokenCountModel)} | gauges ${result.outcome.preview.budget.map((g) => `${g.name} ${g.used}/${g.cap}`).join(', ')}`
          : ` | ${result.outcome.reason.slice(0, 120)}`),
    );
    expect(result.outcome.kind).toBe('preview');
    if (result.outcome.kind !== 'preview') return;
    expect(result.outcome.preview.sections.length).toBeGreaterThan(0);
    expect(result.outcome.preview.sections[0]?.text.length).toBeGreaterThan(50);
    expect(result.outcome.preview.budget.length).toBeGreaterThan(0);

    const feeds = result.membership.filter((m) => m.inReport);
    // eslint-disable-next-line no-console
    console.log(`  membership: ${feeds.length}/${result.membership.length} in report`);
    expect(result.membership.length).toBeGreaterThan(50);
  });
});
