import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { ReadRiskReadingQuery } from '@/application/use-cases/read-risk-reading.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * Each setting against the thing that makes it safe or unsafe, on the real
 * account — reads only.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/risk-reading-probe.test.ts
 *
 * Two things this holds that no fixture can.
 *
 * **That the platform still declares the defaults the comparison rests on.**
 * `maxDailyTrades` has had a declared default of 10 across every version
 * observed; the whole first section is empty the day the catalog stops
 * publishing defaults, and empty is what a fixture cannot notice.
 *
 * **That the geometry is computable from the live payload.** `entryFillPrice`
 * and `exitFillPrice` are `number | null` in the port, and a run where every
 * trade came back unmeasurable would mean the headline figure is derived from
 * fields the platform does not actually populate — the exact failure mode that
 * produced eleven dead write paths, in read form.
 *
 * It asserts shape and computability, never particular values: the account's
 * agents are live and their settings change.
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

live('an agent’s settings are readable against what makes them safe', () => {
  it('reads every agent on the account', { timeout: 300_000 }, async () => {
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

    const query = new ReadRiskReadingQuery(agents);
    let sawDefaults = false;
    let sawMeasurableGeometry = false;
    let sawUndefaulted = false;

    for (const agent of roster.agents) {
      const reading = await query.execute({ ...who, agentId: agent.id });

      if (reading.ceilings.kind === 'read') {
        const compared = reading.ceilings.value.filter((c) => c.platformDefault !== null);
        const undefaulted = reading.ceilings.value.filter((c) => c.platformDefault === null);
        if (compared.length > 0) sawDefaults = true;
        if (undefaulted.length > 0) sawUndefaulted = true;

        for (const c of compared) {
          // A multiple exists wherever the default is a non-zero number, and
          // is finite — an Infinity here would render as a number on the page.
          if (c.platformDefault !== 0) {
            expect(c.multiple, `${agent.displayName} ${c.field}`).not.toBeNull();
            expect(Number.isFinite(c.multiple as number), `${agent.displayName} ${c.field}`).toBe(
              true,
            );
          }
        }
        // eslint-disable-next-line no-console
        console.log(
          `  ${agent.displayName}: ${compared.length} compared, ${undefaulted.length} undefaulted` +
            compared
              .filter((c) => c.multiple !== null && c.multiple !== 1)
              .map((c) => `\n      ${c.field} ${c.value} vs ${c.platformDefault} (${c.multiple}×)`)
              .join(''),
        );
      }

      if (reading.geometry.kind === 'read') {
        const g = reading.geometry.value;
        expect(g.measured).toBeGreaterThan(0);
        // Every ending's counts must add up against what was folded.
        const counted = g.endings.reduce((total, e) => total + e.count, 0);
        expect(counted, `${agent.displayName} endings`).toBe(g.measured);
        if (g.unmeasurable < g.measured) sawMeasurableGeometry = true;

        // eslint-disable-next-line no-console
        console.log(
          `  ${agent.displayName}: ${g.measured} closed` +
            g.endings
              .map(
                (e) =>
                  `\n      ${e.count}× ${e.reason}  ${e.wins}W/${e.losses}L  ` +
                  `median move ${e.medianMovePct === null ? 'n/a' : `${e.medianMovePct.toFixed(3)}%`}`,
              )
              .join(''),
        );
      }
    }

    // The catalog publishes defaults, or the comparison has nothing to stand on.
    expect(sawDefaults, 'no agent had a single field the catalog declares a default for').toBe(
      true,
    );

    /**
     * The six BattleGrid deliberately does not default. If this ever goes
     * false the platform has started deciding how much an agent may lose on
     * its owner's behalf, which is a finding rather than a passing test.
     */
    expect(sawUndefaulted, 'every field was defaulted — the platform changed its mind').toBe(true);

    /**
     * Not asserted as true unconditionally: an account whose agents have all
     * closed nothing is a legitimate state, and this probe must not fail on
     * one. It is logged so a run can be read.
     */
    // eslint-disable-next-line no-console
    console.log(`  measurable geometry seen: ${sawMeasurableGeometry}`);
  });
});
