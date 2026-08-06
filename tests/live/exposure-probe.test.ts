import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { McpPositionsAdapter } from '@/infrastructure/battlegrid/positions-adapter.js';
import { ReadExposureQuery } from '@/application/use-cases/read-exposure.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * What the account is holding, read live — reads only.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/exposure-probe.test.ts
 *
 * **This probe cannot demand an open position, and must not.** Positions open
 * and close on their own: the HYPE position this feature was built against was
 * open at 17:10 and closed by 19:10 the same evening. A probe asserting
 * `holding` would pass or fail on market timing rather than on the product.
 *
 * So it asserts the two things that are true whatever the market is doing —
 * that the read answers with a named state, and that any position it does
 * return is internally coherent — and it **prints which branch it saw**, so a
 * run during an open position is worth more than one during a flat account
 * without either being a failure.
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

live('what the account has at stake', () => {
  it('answers for every agent, and adds up when it holds something', { timeout: 300_000 }, async () => {
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
    const positions = new McpPositionsAdapter(battlegrid);
    const query = new ReadExposureQuery(positions, agents);

    const roster = await agents.listAgents(who);
    if (roster.kind !== 'agents') throw new Error(`roster ${roster.kind}`);

    let sawHolding = false;
    for (const agent of roster.agents.filter((a) => a.status === 'ACTIVE')) {
      const out = await query.execute({ ...who, agentId: agent.id });
      const fills = out.fills;
      // eslint-disable-next-line no-console
      console.log(
        `  ${agent.displayName}: ${out.exposure.kind}` +
          (fills ? ` · fills ${fills.executed} executed / ${fills.failed} failed of ${fills.decided}` : ' · no fill record'),
      );

      if (out.exposure.kind === 'holding') {
        sawHolding = true;
        for (const held of out.exposure.positions) {
          const p = held.position;
          // eslint-disable-next-line no-console
          console.log(
            `      ${p.coinTicker} ${p.direction} · entry ${p.entryFillPrice} mark ${p.markPrice}` +
              ` · ${p.currentNotionalUsd} notional ${p.marginedUsd} margined` +
              ` · unrealized ${p.unrealizedPnlUsd} (${p.roePct}%)` +
              ` · stop now ${p.effectiveStopLoss} target now ${p.effectiveTakeProfit}`,
          );
          /**
           * The drift, printed rather than asserted — position management may
           * simply not have acted yet on a position opened a minute ago, and a
           * probe demanding movement would be demanding market timing again.
           * What a run *with* movement is worth is the evidence itself.
           */
          const stop = held.asDecided?.stop;
          // eslint-disable-next-line no-console
          console.log(
            stop === undefined
              ? '        decided stop unknown — no matching entry decision was read'
              : stop.kind === 'moved'
                ? `        decided stop ${stop.decided} → ${stop.effective} · protects ${stop.protects ?? 'a side this product does not read'}`
                : `        stop is as decided (${stop.kind})`,
          );

          // Attribution is what the whole filter depends on.
          expect(p.agentId).toBe(agent.id);
          expect(p.coinTicker).toBeTruthy();
          /**
           * The distinction the mapper exists to hold: a position the platform
           * priced has a result, one it could not has none. What must never
           * happen is a mark price with no result, or a result with no mark —
           * either would mean a null had been filled in from somewhere.
           */
          expect(p.markPrice === null).toBe(p.unrealizedPnlUsd === null);
          /**
           * A drift can only be reported against a decision that was found,
           * and only for a position that carries the link. Anything else would
           * mean a decided value had come from somewhere other than the join.
           */
          if (held.asDecided !== null) expect(p.decisionId).toBeTruthy();
        }
      }

      if (fills) {
        // The counts are the platform's and must partition the entries it
        // decided; a sum that overshoots would mean one was being double-read.
        expect(fills.failed + fills.executed).toBeLessThanOrEqual(fills.decided);
        expect(fills.dominant).toBe(fills.failed >= fills.executed && fills.failed > 0);
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      sawHolding
        ? '\n  saw an open position — the holding branch was exercised'
        : '\n  account is flat right now — the holding branch was not exercised this run',
    );
  });
});
