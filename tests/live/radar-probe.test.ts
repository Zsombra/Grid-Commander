import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpRadarAdapter } from '@/infrastructure/battlegrid/radar-adapter.js';
import {
  DescribeDeployQuery,
  PerformDeployCommand,
} from '@/application/use-cases/deploy-agent.command.js';
import { confirmationTarget } from '@/domain/capability/confirmation.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { SequentialRandom } from '../support/agent-fakes.js';

/**
 * The radar writes, against the real platform, through the product's own path.
 *
 * Not in the default suite — gated on `BATTLEGRID_API_KEY` exactly like
 * `write-probe.test.ts`. Run deliberately:
 *
 *     BATTLEGRID_API_KEY=bg_live_… BATTLEGRID_LIVE_WRITES=1 npx vitest run tests/live/radar-probe.test.ts
 *
 * **Why it exists.** The first probe confirms `expectedRevision: null`
 * succeeds as the platform's first-deploy signal — established live
 * 2026-08-08 (v14). It uses the slot-shuffle pattern: undeploy a coin, then
 * first-deploy it back, so the radar ends as it started.
 *
 * The second probe replaces an occupied coin's deployment with itself — same
 * agent, same timeframe, same enabled — through the product's describe →
 * confirm → perform path; the only observable change is the policy's revision
 * advancing, which is what proves the write went through the full sequence.
 */

const KEY = process.env['BATTLEGRID_API_KEY'];
// Gated with the other mutating probes — the slot-shuffle undeploys and
// redeploys a real coin, and the replace test advances a revision. Neither
// should happen during an ordinary `npm test` that merely happened to have a
// key in the environment.
const WRITES = process.env['BATTLEGRID_LIVE_WRITES'] === '1';
const live = KEY && WRITES ? describe : describe.skip;

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

live('first deployment via expectedRevision: null (slot-shuffle)', () => {
  it(
    'undeploy a coin, first-deploy it back with null revision, verify it lands',
    { timeout: 180_000 },
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
      const coin = target.coinTicker;
      const savedRevision = target.revision;
      const savedTimeframe = target.timeframe;
      // eslint-disable-next-line no-console
      console.log(`  slot-shuffle target: ${coin} r${savedRevision} agent=${agentId}`);

      // Step 1: undeploy the coin to free a slot
      await confirmations.issue({
        token: 'probe-undeploy',
        userId: who.userId,
        tool: 'delete_radar_deployment',
        target: confirmationTarget.agentUndeploy(agentId, coin),
        consequence: `Probe: undeploy ${coin} for slot-shuffle.`,
        expiresAt: new Date(clock.now().getTime() + 300_000),
        consumedAt: null,
      });
      const deleted = await radar.deleteDeployment({
        ...who,
        coinId: coin,
        expectedRevision: savedRevision,
        confirmation: {
          token: 'probe-undeploy',
          target: confirmationTarget.agentUndeploy(agentId, coin),
        },
      });
      // eslint-disable-next-line no-console
      console.log(`  undeployed ${coin}`);

      /*
       * From this line the operator's coin is off the radar, so **everything
       * that can throw belongs inside the try** and the restore belongs in a
       * `finally` rather than a `catch`.
       *
       * `expect(deleted.deleted).toBe(true)` used to sit here, between the
       * delete and the try. That was the hole #306 held this probe back for:
       * the delete had already happened, so a failing assertion — or any throw
       * in that window — left a real deployment gone with nothing to put it
       * back. It is now the first statement inside the try.
       *
       * `restored` flips only after the re-deploy is confirmed, so a read-back
       * assertion that fails *after* a successful re-deploy correctly does not
       * restore twice.
       */
      let restored = false;
      try {
        expect(deleted.deleted).toBe(true);
        await confirmations.issue({
          token: 'probe-first-deploy',
          userId: who.userId,
          tool: 'upsert_radar_deployment',
          target: confirmationTarget.agentDeploy(agentId, coin),
          consequence: `Probe: first-deploy ${coin} back.`,
          expiresAt: new Date(clock.now().getTime() + 300_000),
          consumedAt: null,
        });
        const result = await radar.upsertDeployment({
          ...who,
          coinId: coin,
          timeframe: savedTimeframe,
          enabled: true,
          agentId,
          expectedRevision: null,
          confirmation: {
            token: 'probe-first-deploy',
            target: confirmationTarget.agentDeploy(agentId, coin),
          },
        });
        restored = true;
        // eslint-disable-next-line no-console
        console.log(`  first-deploy ${coin}: revision ${result.revision}`);
        expect(result.revision).toBeGreaterThan(0);

        // Verify it landed
        const after = await radar.listDeployments(who);
        if (after.kind !== 'deployments') throw new Error(`radar unreadable: ${after.reason}`);
        const standing = after.deployments.find((d) => d.coinTicker === coin);
        expect(standing).toBeDefined();
        expect(standing?.slotAgentIds).toEqual([agentId]);
        // eslint-disable-next-line no-console
        console.log(`  read-back: r${String(standing?.revision)} slots=[${String(standing?.slotAgentIds.join(', '))}]`);
      } finally {
        if (!restored) {
          /*
           * Restore, but check the live state first rather than assuming the
           * coin is gone. `deleted.deleted === false` reaches here too, and in
           * that case the deployment is still standing — a first-deploy at
           * `expectedRevision: null` over a live one is a different request
           * than the one this probe means to make.
           *
           * Every failure in here is logged and swallowed **on purpose**: this
           * runs while an exception is already propagating, and a throw from a
           * `finally` replaces it. The original failure is the more
           * informative one, and a restore that could not run must be shouted
           * about rather than substituted for it.
           */
          try {
            const now = await radar.listDeployments(who);
            const stillThere =
              now.kind === 'deployments' && now.deployments.some((d) => d.coinTicker === coin);
            if (stillThere) {
              // eslint-disable-next-line no-console
              console.error(`  ${coin} is still deployed — nothing to restore`);
            } else {
              // eslint-disable-next-line no-console
              console.error(`  restoring ${coin} — the probe left the radar with a hole`);
              await confirmations.issue({
                token: 'probe-restore',
                userId: who.userId,
                tool: 'upsert_radar_deployment',
                target: confirmationTarget.agentDeploy(agentId, coin),
                consequence: `Probe: restore ${coin} after a failed slot-shuffle.`,
                expiresAt: new Date(clock.now().getTime() + 300_000),
                consumedAt: null,
              });
              await radar.upsertDeployment({
                ...who,
                coinId: coin,
                timeframe: savedTimeframe,
                enabled: true,
                agentId,
                expectedRevision: null,
                confirmation: {
                  token: 'probe-restore',
                  target: confirmationTarget.agentDeploy(agentId, coin),
                },
              });
              // eslint-disable-next-line no-console
              console.error(`  restored ${coin}`);
            }
          } catch (restoreErr) {
            // eslint-disable-next-line no-console
            console.error(
              `  RESTORE FAILED for ${coin} — the operator's radar is short a ` +
                `deployment and needs manual repair: ${String(restoreErr)}`,
            );
          }
        }
      }
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
 * `delete_radar_deployment` is walked by the slot-shuffle above, not here.
 * This test replaces in place — same agent, same timeframe — so it never
 * needs to delete. The delete composition is held by `payload-conformance`
 * and the command tests.
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
