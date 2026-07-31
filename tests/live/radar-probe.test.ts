import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { McpRadarAdapter } from '@/infrastructure/battlegrid/radar-adapter.js';
import {
  DescribeDeployQuery,
  PerformDeployCommand,
} from '@/application/use-cases/deploy-agent.command.js';
import { confirmationTarget } from '@/domain/capability/confirmation.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { RevisionConflictError } from '@/domain/errors.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { SequentialRandom } from '../support/agent-fakes.js';

/**
 * The radar writes, against the real platform, through the product's own path.
 *
 * Not in the default suite — gated on `BATTLEGRID_API_KEY` exactly like
 * `write-probe.test.ts`. Run deliberately:
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/radar-probe.test.ts
 *
 * **Why it exists.** `deploy-and-undeploy-are-offered` composed
 * `upsert_radar_deployment` around one recorded unknown: what
 * `expectedRevision` a *create* presents. The declaration requires the field
 * and says nothing about the value. The answer, established 2026-07-31 with
 * these probes, is that there is no such value: the schema demands
 * `expectedRevision > 0` (an exclusive minimum the recorded artifact cannot
 * carry), and a coin with no policy answers every positive value with
 * `CONFLICT … actualRevision: null`. **This surface can replace a deployment;
 * it cannot create a first one.** The product's describe refuses unoccupied
 * coins with that reason, and the first probe holds the platform to the
 * behavior the refusal is built on — if BattleGrid ever starts accepting
 * creates, this test fails and the restriction should be lifted.
 *
 * **What it touches.** The first test attempts a create the platform refuses,
 * so it changes nothing. The second replaces an occupied coin's deployment
 * with itself — same agent, same timeframe, same enabled — through the
 * product's describe → confirm → perform path; the only observable change is
 * the policy's revision advancing, which is what proves the write landed.
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

function wire() {
  const clock = new FakeClock();
  const audit = new FakeAuditStore(clock);
  const confirmations = new FakeConfirmationStore(clock);
  const battlegrid = new McpBattleGridAdapter({
    config,
    audit,
    confirmations,
    heldScopes: new DeclaredScopes(['mcp:read']),
    remedy: 'repair-the-key',
    fetch: globalThis.fetch,
  });
  return { audit, confirmations, clock, battlegrid, radar: new McpRadarAdapter(battlegrid) };
}

const who = { userId: 'owner', accessToken: KEY as string };

/**
 * A crypto coin the platform knows and no policy occupies. Restricted to
 * entries whose `id` equals their `ticker` so the probe never has to guess
 * which of the two `coinId` means — TRADFI coins carry `id: "xyz_aapl"`,
 * `ticker: "AAPL"`, and the radar's own policies show the two equal.
 */
async function unoccupiedCoin(
  battlegrid: McpBattleGridAdapter,
  radar: McpRadarAdapter,
): Promise<string | null> {
  const read = await radar.listDeployments(who);
  if (read.kind !== 'deployments') throw new Error(`radar unreadable: ${read.reason}`);
  const occupied = new Set(read.deployments.map((d) => d.coinTicker));

  const meta = await battlegrid.callTool({ ...who, tool: 'get_coin_metadata', args: {} });
  const coins = (meta.content as Record<string, unknown>)['coins'];
  if (!Array.isArray(coins)) return null;
  for (const entry of coins) {
    const c = (entry ?? {}) as Record<string, unknown>;
    const id = c['id'];
    if (typeof id !== 'string' || id.length === 0) continue;
    if (c['ticker'] !== id) continue;
    if (!occupied.has(id)) return id;
  }
  return null;
}

live('a first deployment cannot be created through this surface', () => {
  it(
    'the platform refuses every expectedRevision for a coin with no policy',
    { timeout: 120_000 },
    async (ctx) => {
      const { battlegrid, radar, confirmations, clock } = wire();

      const coin = await unoccupiedCoin(battlegrid, radar);
      if (!coin) {
        // Account state, not a defect: every coin carries a policy today.
        ctx.skip();
        return;
      }

      // The coin genuinely holds nothing — the read the refusal reasons from.
      const held = await battlegrid.callTool({
        ...who,
        tool: 'get_radar_deployment',
        args: { coinId: coin },
      });
      // eslint-disable-next-line no-console
      console.log(`  ${coin}: policy = ${JSON.stringify((held.content as Record<string, unknown>)['policy'])}`);
      expect((held.content as Record<string, unknown>)['policy']).toBeNull();

      // A real agent id — a fabricated one is refused by input validation
      // before the revision check, which would prove the wrong thing.
      const roster = await new McpAgentAdapter(battlegrid).listAgents(who);
      if (roster.kind !== 'agents') throw new Error('cannot read the roster');
      const agent = roster.agents.find((a) => a.status === 'ACTIVE');
      expect(agent, 'need an ACTIVE agent to name in the slot').toBeDefined();
      if (!agent) return;

      // Revision 1 — the value an existing policy would carry — conflicts,
      // because there is nothing to conflict with except absence itself.
      await confirmations.issue({
        token: 'probe-create',
        userId: who.userId,
        tool: 'upsert_radar_deployment',
        target: confirmationTarget.agentDeploy(agent.id, coin),
        consequence: `Probe: attempt a first deployment on ${coin}.`,
        expiresAt: new Date(clock.now().getTime() + 300_000),
        consumedAt: null,
      });
      await expect(
        radar.upsertDeployment({
          ...who,
          coinId: coin,
          timeframe: '15m',
          enabled: false,
          agentId: agent.id,
          expectedRevision: 1,
          confirmation: {
            token: 'probe-create',
            target: confirmationTarget.agentDeploy(agent.id, coin),
          },
        }),
      ).rejects.toBeInstanceOf(RevisionConflictError);
      // eslint-disable-next-line no-console
      console.log('  create at expectedRevision 1: refused (CONFLICT, actualRevision null)');

      // And it changed nothing.
      const after = await radar.listDeployments(who);
      if (after.kind !== 'deployments') throw new Error(`radar unreadable: ${after.reason}`);
      expect(after.deployments.find((d) => d.coinTicker === coin)).toBeUndefined();
    },
  );
});

/**
 * The whole product path, on the one thing it can live-touch harmlessly: an
 * occupied coin, redeployed to the agent already standing there. Same slot,
 * same timeframe, same enabled — the platform's revision is the only thing
 * that moves, and its moving is the proof the write went through the full
 * describe → confirm → perform sequence.
 *
 * `delete_radar_deployment` is deliberately NOT walked: the only deployments
 * that exist are the operator's real ones, and a delete cannot be undone —
 * this surface cannot create. Its composition is held by
 * `payload-conformance` and the command tests instead.
 */
live('deploy walks end-to-end through the product commands', () => {
  it(
    'replaces an occupied coin with itself and the revision advances',
    { timeout: 120_000 },
    async (ctx) => {
      const { radar, confirmations, clock } = wire();

      const read = await radar.listDeployments(who);
      if (read.kind !== 'deployments') throw new Error(`radar unreadable: ${read.reason}`);
      const target = read.deployments.find((d) => d.enabled && d.slotAgentIds.length === 1);
      if (!target) {
        ctx.skip();
        return;
      }
      const agentId = target.slotAgentIds[0] as string;
      // eslint-disable-next-line no-console
      console.log(
        `  target: ${target.coinTicker} r${target.revision} tf=${target.timeframe} agent=${agentId}`,
      );

      const describe_ = new DescribeDeployQuery(radar, confirmations, new SequentialRandom(), clock);
      const proposed = await describe_.execute({
        ...who,
        agentId,
        agentName: agentId,
        coinId: target.coinTicker,
        timeframe: target.timeframe,
      });
      expect(proposed.kind, 'an occupied coin must yield a proposal').toBe('proposal');
      if (proposed.kind !== 'proposal') return;
      // eslint-disable-next-line no-console
      console.log(`  propose: ${proposed.proposal.consequence}`);
      // The consequence names the replacement, and the revision is the read's.
      expect(proposed.proposal.consequence).toContain(agentId);
      expect(proposed.proposal.expectedRevision).toBe(target.revision);

      const deployed = await new PerformDeployCommand(radar).execute({
        ...who,
        agentId,
        coinId: target.coinTicker,
        timeframe: target.timeframe,
        expectedRevision: proposed.proposal.expectedRevision,
        confirmationToken: proposed.proposal.confirmationToken,
      });
      // eslint-disable-next-line no-console
      console.log(
        `  deploy: ${deployed.kind}${deployed.kind === 'deployed' ? ` — revision ${deployed.revision}` : ` — ${(deployed as { reason?: string }).reason ?? ''}`}`,
      );
      expect(deployed.kind).toBe('deployed');
      if (deployed.kind !== 'deployed') return;
      expect(deployed.revision).toBeGreaterThan(target.revision);

      // What the platform holds, not what it said: the same agent stands
      // there, still enabled, at the advanced revision.
      const after = await radar.listDeployments(who);
      if (after.kind !== 'deployments') throw new Error(`radar unreadable: ${after.reason}`);
      const standing = after.deployments.find((d) => d.coinTicker === target.coinTicker);
      // eslint-disable-next-line no-console
      console.log(
        `  read-back: r${String(standing?.revision)} enabled=${String(standing?.enabled)} slots=[${String(standing?.slotAgentIds.join(', '))}]`,
      );
      expect(standing?.slotAgentIds).toEqual([agentId]);
      expect(standing?.enabled).toBe(true);
      expect(standing?.revision).toBe(deployed.revision);
    },
  );
});
