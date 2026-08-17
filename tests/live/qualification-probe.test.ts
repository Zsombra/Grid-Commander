import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { McpMarketAdapter } from '@/infrastructure/battlegrid/market-adapter.js';
import { McpRadarAdapter } from '@/infrastructure/battlegrid/radar-adapter.js';
import { ReadQualificationQuery } from '@/application/use-cases/read-qualification.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * Coin qualification, read live through the product path — reads only.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/qualification-probe.test.ts
 *
 * `get_agent_coin_qualification` spends no LLM call and changes nothing, so the
 * key alone gates it — there is no mutation here for a second opt-in to guard.
 *
 * What it holds that the unit tests cannot: that the shape the mappers were
 * written against is the shape the platform is sending *today*. Every fixture
 * in `tests/agent/coin-qualification.test.ts` is a row from 2026-08-06, and the
 * whole reason this repository probes live is that BattleGrid has replaced
 * itself four times while its tool count sat at 110.
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

function world() {
  const clock = new FakeClock();
  const battlegrid = new McpBattleGridAdapter({
    config,
    audit: new FakeAuditStore(clock),
    confirmations: new FakeConfirmationStore(clock),
    heldScopes: new DeclaredScopes(['mcp:read']),
    remedy: 'repair-the-key',
    fetch: globalThis.fetch,
  });
  const agents = new McpAgentAdapter(battlegrid);
  return {
    agents,
    market: new McpMarketAdapter(battlegrid),
    query: new ReadQualificationQuery(agents, new McpRadarAdapter(battlegrid), new McpMarketAdapter(battlegrid)),
  };
}

live('screening a real agent against real coins', () => {
  it('answers with a measurement for every gate', { timeout: 300_000 }, async () => {
    const { agents, query } = world();
    const roster = await agents.listAgents(who);
    if (roster.kind !== 'agents') throw new Error(`roster ${roster.kind}`);
    const agent = roster.agents.find((a) => a.status === 'ACTIVE');
    if (!agent) throw new Error('no active agent to screen');

    const out = await query.execute({ ...who, agentId: agent.id });
    if (out.kind !== 'screened') throw new Error(out.reason);
    // eslint-disable-next-line no-console
    console.log(`  coins from ${out.source.kind}: ${out.source.coins.join(', ')}`);
    if (out.result.kind !== 'verdicts') throw new Error(`result ${out.result.kind}`);

    for (const v of out.result.verdicts) {
      const g = v.gates;
      // eslint-disable-next-line no-console
      console.log(
        `  ${v.coinTicker}: ${v.qualifies ? 'YES' : 'no'} ${v.firstFailReason ?? ''} | ` +
          `score ${g.aggregateScore.scorePercent}/${g.aggregateScore.minScorePercent} ${g.aggregateScore.verdict} | ` +
          `count ${g.requiredCount.count}/${g.requiredCount.min} ${g.requiredCount.verdict} | ` +
          `atr ${g.atrVolatility.atrPct}/${g.atrVolatility.minAtrPct} ${g.atrVolatility.verdict} | ` +
          `L:${v.long.qualifies} S:${v.short.qualifies}`,
      );
      expect(v.coinTicker).toBeTruthy();
      expect(v.strategyTimeframe).toBeTruthy();
      // Every gate says something. `UNSTATED` would mean the platform sent a
      // gate object with no verdict, which is what the mapper defaults to and
      // what this asserts has not happened.
      for (const gate of [g.aggregateScore, g.requiredCount, g.atrVolatility]) {
        expect(gate.verdict).not.toBe('UNSTATED');
      }
    }
  });

  it('sends only vocabulary the platform declares', { timeout: 120_000 }, async () => {
    /**
     * The ranking metric and interval are chosen from the tool's own schema.
     * If BattleGrid narrows either enum, the preference stops being on offer
     * and the product falls back to what is — never to a value it likes.
     */
    const { market } = world();
    const vocabulary = await market.rankingVocabulary(who);
    // eslint-disable-next-line no-console
    console.log(
      `  metrics: ${vocabulary.metrics.join(', ')} | intervals: ${vocabulary.intervals.join(', ')}`,
    );
    expect(vocabulary.metrics.length).toBeGreaterThan(0);
    expect(vocabulary.intervals.length).toBeGreaterThan(0);
  });

  it('refuses the whole screen when one ticker is unknown', { timeout: 120_000 }, async () => {
    /**
     * Established live 2026-08-06: `["BTC","NOTACOIN"]` answers
     * `{"code":"NOT_FOUND","message":"Coin 'NOTACOIN' not found"}` and returns
     * no verdicts at all — not eleven good ones and a gap. The product reports
     * that as unreadable rather than as coins the agent would not take, and
     * this holds the platform to the behaviour that reading depends on.
     */
    const { agents } = world();
    const roster = await agents.listAgents(who);
    if (roster.kind !== 'agents') throw new Error(`roster ${roster.kind}`);
    const agent = roster.agents.find((a) => a.status === 'ACTIVE');
    if (!agent) throw new Error('no active agent to screen');

    const out = await agents.readCoinQualification({
      ...who,
      agentId: agent.id,
      coinTickers: ['BTC', 'ZZNOTACOIN'],
    });
    // eslint-disable-next-line no-console
    console.log(`  one bad ticker → ${out.kind}${out.kind === 'unreadable' ? `: ${out.reason}` : ''}`);
    expect(out.kind).toBe('unreadable');
  });
});
