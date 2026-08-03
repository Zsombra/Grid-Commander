import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpExplorerAdapter } from '@/infrastructure/battlegrid/explorer-adapter.js';
import { ReadFieldQuery } from '@/application/use-cases/read-field.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * The field, read live through the product path — reads only.
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/field-probe.test.ts
 *
 * Proves the two entry points map against today's platform, and watches the
 * one behaviour the surface is built around: `entries` is sometimes shorter
 * than `stats.totalAgents`, and no limit widens it. Observed at 5 of 37
 * four runs running on 2026-08-03, then 37 of 37 an hour later from the
 * same request — so the probe **reports** which happened and asserts
 * neither. A run that prints "partial" is not a regression, and one that
 * prints "whole field" is not proof the gap is gone.
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

live('the field answers through the product path', () => {
  it('reads the field and this account’s place in it', { timeout: 300_000 }, async () => {
    const clock = new FakeClock();
    const battlegrid = new McpBattleGridAdapter({
      config,
      audit: new FakeAuditStore(clock),
      confirmations: new FakeConfirmationStore(clock),
      heldScopes: new DeclaredScopes(['mcp:read']),
      remedy: 'repair-the-key',
      fetch: globalThis.fetch,
    });
    const explorer = new McpExplorerAdapter(battlegrid);
    const view = await new ReadFieldQuery(explorer).execute({
      ...who,
      timeframe: 'ALL_TIME',
      sortBy: 'NET_PNL',
      limit: 100,
    });

    if (view.field.kind !== 'field') throw new Error(`field ${view.field.reason}`);
    const f = view.field.field;

    // eslint-disable-next-line no-console
    console.log(
      `  field: ${f.stats.totalAgents} agents · win rate ${String(f.stats.winRatePercent)}% · ` +
        `net ${String(f.stats.totalNetPnl?.toFixed(2))} over ${String(f.stats.winCount)}W/${String(f.stats.lossCount)}L`,
    );
    // The gap the surface exists to be honest about.
    // eslint-disable-next-line no-console
    console.log(
      `  shown: ${f.shown} of ${String(f.stats.totalAgents)}` +
        (f.stats.totalAgents !== null && f.shown < f.stats.totalAgents
          ? '  ← partial, and no limit widens it'
          : '  ← whole field returned'),
    );
    expect(f.stats.totalAgents, 'the platform should count a field').toBeGreaterThan(0);

    const top = f.agents[0];
    if (top) {
      // eslint-disable-next-line no-console
      console.log(
        `  #${String(top.rank)} ${top.agentName} (${String(top.modelDisplayName)}) — ` +
          `${String(top.totalNetPnl?.toFixed(2))} · ${String(top.winRatePercent)}% over ${String(top.tradeCount)} trades`,
      );
      // Every rate must arrive with its sample, or the page cannot show one.
      expect(top.tradeCount, 'a ranked agent carries its trade count').not.toBeNull();
    }

    for (const v of f.vendors) {
      // eslint-disable-next-line no-console
      console.log(
        `    ${v.provider.padEnd(12)} ${String(v.agentCount).padStart(3)} agents  ` +
          `${String(v.tradeCount).padStart(4)} trades  win ${String(v.winRatePercent)}  net ${String(v.totalNetPnl?.toFixed(2))}`,
      );
      // The property the mapper exists for: no trades means no rate, not 0.
      if (v.tradeCount === 0) expect(v.winRatePercent).toBeNull();
    }

    for (const a of f.ownAgents) {
      // eslint-disable-next-line no-console
      console.log(`  mine: ${a.agentName} rank ${String(a.rank)} · ${String(a.totalNetPnl?.toFixed(2))}`);
    }

    if (view.leaderboard.kind === 'leaderboard') {
      const own = view.leaderboard.leaderboard.own;
      // eslint-disable-next-line no-console
      console.log(
        own
          ? `  standing: rank ${String(own.rank)} · ${String(own.value)} · ${String(own.percentile)}th percentile`
          : '  standing: the platform places this account nowhere',
      );
    } else {
      // eslint-disable-next-line no-console
      console.log(`  standing unreadable: ${view.leaderboard.reason}`);
    }
  });
});
