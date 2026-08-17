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

  /**
   * The other half of the same call: the platform resolving the strategy's own
   * conditions against the same live coins.
   *
   * Its own test because it needs a different subject. `preview_strategy_report`
   * resolves only the conditions it is given, so a strategy defining none proves
   * nothing about this path — and twelve of thirty-seven strategies carried
   * conditions on 2026-08-04, so one has to be looked for rather than assumed.
   *
   * The console line is deliberately raw. The output schema declares a
   * per-ticker `verdict` field that no capture this repo holds has ever shown,
   * so the ticker keys are printed rather than modelled: the next run with a key
   * settles `preview-per-ticker-verdict-is-unobserved` by reading this line.
   */
  it('resolves the conditions of a strategy that has them', { timeout: 300_000 }, async () => {
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

    let subject: { id: string; name: string; count: number } | null = null;
    for (const row of listing.strategies) {
      const read = await strategies.readStrategy({ ...who, strategyId: row.id });
      if (read.kind !== 'strategy') continue;
      if (read.detail.conditions.length === 0) continue;
      subject = { id: row.id, name: row.name, count: read.detail.conditions.length };
      break;
    }
    if (!subject) throw new Error('no visible strategy defines conditions');

    const result = await new PreviewCompositionQuery(strategies).execute({
      ...who,
      strategyId: subject.id,
      coinSelection: { mode: 'explicit', tickers: ['BTC', 'ETH'] },
    });
    if (result.kind !== 'ready') throw new Error(`not ready: ${JSON.stringify(result)}`);
    if (result.outcome.kind !== 'preview') {
      // A refusal is the platform's answer and belongs in the failure message
      // verbatim — this is the call that would tell us sending `conditions`
      // widens the draft past what the tool accepts.
      throw new Error(`refused with conditions sent: ${result.outcome.reason}`);
    }

    const rows = result.outcome.preview.conditionOutcomes;
    // eslint-disable-next-line no-console
    console.log(
      `  subject: ${subject.name} | ${subject.count} conditions defined | ` +
        `${rows.length} ticker row(s): ` +
        rows
          .map(
            (r) =>
              `${r.ticker} → ${r.outcomes
                .map(
                  (o) =>
                    `${o.conditionKey}=${o.outcome}${o.provisional ? '(provisional)' : ''}` +
                    (o.counts
                      ? `[${o.counts.trueCount}/${o.counts.total}, ${o.counts.unresolvedCount} unresolved]`
                      : '') +
                    `{${o.evidence.length} evidence}`,
                )
                .join(', ')}`,
          )
          .join(' | '),
    );

    expect(result.conditionsDefined).toBeGreaterThan(0);
    expect(rows.length, 'the platform resolved the conditions it was sent').toBeGreaterThan(0);
    expect(rows.every((r) => r.ticker.length > 0)).toBe(true);
  });
});
