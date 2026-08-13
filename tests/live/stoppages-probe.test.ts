import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { ReadStoppagesQuery } from '@/application/use-cases/read-stoppages.query.js';
import { isStanding } from '@/domain/agent/blocks.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * What keeps stopping the operator's real agents — reads only.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/stoppages-probe.test.ts
 *
 * The fold is only worth anything if the platform really does repeat itself,
 * and it does: 371 blocks across five agents on 2026-08-06, with single reasons
 * accounting for 98, 80 and 79 of them. This probe holds that shape — a run
 * where every agent's blocks turned out to be one-offs would mean the summary
 * is answering a question nobody has.
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

live('the block history folds into conditions', () => {
  it('summarises every agent on the account', { timeout: 300_000 }, async () => {
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
    const roster = await agents.listAgents(who);
    if (roster.kind !== 'agents') throw new Error(`roster ${roster.kind}`);

    const query = new ReadStoppagesQuery(agents);
    let sawStanding = false;
    let sawRefusal = false;

    for (const agent of roster.agents) {
      const out = await query.execute({ ...who, agentId: agent.id });
      if (out.kind !== 'summary') {
        // eslint-disable-next-line no-console
        console.log(`  ${agent.displayName}: ${out.kind}`);
        continue;
      }
      const { reasons, readCount, total, refused, windowEndsAt } = out.summary;
      // eslint-disable-next-line no-console
      console.log(
        `  ${agent.displayName}: ${readCount} read of ${total ?? '?'}` +
          (refused === null
            ? ' (served whole)'
            : ` — ${refused.windows} window(s) refused, up to ${refused.rows} blocks unseen` +
              `, window ends ${windowEndsAt?.slice(0, 16) ?? '?'}`),
      );
      if (refused !== null) {
        sawRefusal = true;
        // A summary assembled around a hole must be able to say where its
        // window ends, or the count reads as current when it is not.
        expect(refused.windows).toBeGreaterThan(0);
        expect(windowEndsAt).not.toBeNull();
      }
      for (const r of reasons) {
        if (isStanding(r)) sawStanding = true;
        // eslint-disable-next-line no-console
        console.log(
          `      ${String(r.count).padStart(3)}× ${r.reasonCode.padEnd(34)}` +
            ` ${r.firstAt?.slice(0, 16)} → ${r.lastAt?.slice(0, 16)}` +
            ` ${JSON.stringify(r.detail)}`,
        );
        expect(r.reasonCode).toBeTruthy();
        expect(r.count).toBeGreaterThan(0);
        // The window is real: a fold that reported a last-seen older than its
        // first-seen would mean the comparison was reading array order.
        if (r.firstAt && r.lastAt) expect(r.firstAt <= r.lastAt).toBe(true);
      }
      // Never more folded than were read.
      expect(reasons.reduce((n, r) => n + r.count, 0)).toBe(readCount);
    }

    /**
     * The premise of the whole change. If nothing on the account repeats, a
     * summary by reason is a more expensive way to render a list, and this
     * should fail rather than pass quietly.
     */
    expect(sawStanding, 'at least one reason recurs — otherwise the fold answers nothing').toBe(
      true,
    );

    /**
     * Not an assertion, on purpose. The refusals are the platform's (#100) and
     * the day they stop this must not turn red — a probe that fails when the
     * thing it works around is fixed is a probe that pins the bug in place.
     */
    if (!sawRefusal) {
      // eslint-disable-next-line no-console
      console.log('  (no agent needed the refusal fallback — #100 may be fixed)');
    }
  });
});
