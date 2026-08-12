import { describe, expect, it } from 'vitest';
import type { Strategy } from '@/domain/strategy/strategy.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import {
  DescribeRetuneQuery,
  RetuneRuleCommand,
} from '@/application/use-cases/retune-rule.command.js';
import {
  DescribeArchiveStrategyQuery,
  ForkStrategyCommand,
  SetStrategyActiveCommand,
} from '@/application/use-cases/strategy-lifecycle.command.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { SequentialRandom } from '../support/agent-fakes.js';

/**
 * The scorecard write, walked live — on a fork with zero bound agents, so
 * the blast radius is exactly nothing.
 *
 * Gated on `BATTLEGRID_API_KEY` like its siblings:
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/retune-probe.test.ts
 *
 * The slot shuffle the operator authorized (2026-07-31, reused by the apply
 * probe): park an unbound PRIVATE strategy, fork a SYSTEM one, retune one
 * rule on the throwaway through describe→confirm→perform, read the change
 * back, then archive the throwaway and restore the parked strategy. The
 * account ends as found, plus one archived fork — the residue every fork
 * probe leaves.
 *
 * Written on a day of intermittent gateway 504s: a failure reading
 * `tools/call failed with 504` is the platform's weather, reported honestly,
 * not a regression in this path.
 */

const KEY = process.env['BATTLEGRID_API_KEY'];
// Mutating probes need more than a credential.
//
// Gated on the key alone, `npm test` with one exported ran four of these
// concurrently against the operator's real account — forking, archiving and
// creating agents at the same time, tripping each other's optimistic
// concurrency. Observed 2026-08-04. `oauth-metadata.test.ts` had already
// established the principle in the other direction: do not tie a check to a
// variable whose meaning is not what the check needs.
//
//     BATTLEGRID_API_KEY=… BATTLEGRID_LIVE_WRITES=1 npx vitest run <this file>
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

const who = { userId: 'owner', accessToken: KEY as string };

live('a signal rule can be retuned, through the product path', () => {
  it(
    'frees a slot, forks, retunes one rule, verifies, and puts everything back',
    { timeout: 600_000 },
    async (ctx) => {
      const clock = new FakeClock();
      const confirmations = new FakeConfirmationStore(clock);
      const battlegrid = new McpBattleGridAdapter({
        config,
        audit: new FakeAuditStore(clock),
        confirmations,
        heldScopes: new DeclaredScopes(['mcp:read']),
        remedy: 'repair-the-key',
        fetch: globalThis.fetch,
      });
      const strategies = new McpStrategyAdapter(battlegrid);
      const describeArchive = new DescribeArchiveStrategyQuery(
        confirmations,
        new SequentialRandom(),
        clock,
      );
      const setActive = new SetStrategyActiveCommand(strategies);

      const archiveOf = async (subject: Strategy) => {
        const proposal = await describeArchive.execute({ ...who, strategy: subject });
        if (proposal.kind !== 'proposal') throw new Error(`no archive proposal: ${proposal.reason}`);
        return setActive.execute({
          ...who,
          strategy: subject,
          active: false,
          confirmationToken: proposal.proposal.confirmationToken,
        });
      };
      const freshOf = async (id: string): Promise<Strategy> => {
        const read = await strategies.readStrategy({ ...who, strategyId: id });
        if (read.kind !== 'strategy') throw new Error(`cannot re-read ${id}`);
        return read.detail.summary;
      };

      const listing = await strategies.listStrategies(who);
      if (listing.kind !== 'strategies') throw new Error('cannot read strategies');
      const source = listing.strategies.find((s) => s.scope === 'SYSTEM');
      const slotHolder = listing.strategies.find(
        (s) => s.scope === 'PRIVATE' && s.isActive && s.boundAgentCount === 0,
      );
      if (!source || !slotHolder) {
        // Account state, not a defect: nothing safely archivable to free a slot.
        ctx.skip();
        return;
      }
      // eslint-disable-next-line no-console
      console.log(`  slot: parking ${slotHolder.name} ${slotHolder.id} (0 bound)`);

      const parked = await archiveOf(slotHolder);
      expect(parked.kind).toBe('changed');

      let fork: Strategy | undefined;
      try {
        const forked = await new ForkStrategyCommand(strategies).execute({
          ...who,
          strategy: source,
          sourceRevision: source.revision,
        });
        if (forked.kind !== 'forked') throw new Error('fork refused with a slot free');
        fork = forked.strategy;
        // eslint-disable-next-line no-console
        console.log(`  fork: ${fork.name} ${fork.id} r${fork.revision}`);

        // --- pick a rule the fork actually carries ---------------------------
        const detail = await strategies.readStrategy({ ...who, strategyId: fork.id });
        if (detail.kind !== 'strategy') throw new Error('cannot read the fork back');
        const rule = detail.detail.signalRules.find((r) => r.allocation < 3);
        if (!rule) throw new Error('the fork carries no rule with room to raise');
        // eslint-disable-next-line no-console
        console.log(
          `  rule: ${rule.signalId} allocation ${rule.allocation}${rule.required ? ', required' : ''}`,
        );

        // --- describe: blast radius zero, token minted -----------------------
        const intent = {
          allocation: rule.allocation + 1,
          required: rule.required,
          ruleParams: undefined,
        };
        const described = await new DescribeRetuneQuery(
          strategies,
          confirmations,
          new SequentialRandom(),
          clock,
        ).execute({ ...who, strategyId: fork.id, signalId: rule.signalId, intent });
        if (described.kind !== 'proposal') {
          throw new Error(`describe refused: ${JSON.stringify(described)}`);
        }
        // eslint-disable-next-line no-console
        console.log(`  describe: ${described.proposal.consequence}`);
        expect(described.proposal.boundAgentCount).toBe(0);

        // --- the write -------------------------------------------------------
        const retuned = await new RetuneRuleCommand(strategies).execute({
          ...who,
          strategyId: fork.id,
          signalId: rule.signalId,
          expectedRevision: described.proposal.expectedRevision,
          intent,
          confirmationToken: described.proposal.confirmationToken,
        });
        // eslint-disable-next-line no-console
        console.log(`  retune: ${JSON.stringify(retuned)}`);
        expect(retuned.kind).toBe('retuned');

        // --- what the platform holds, not what it said -----------------------
        const after = await strategies.readStrategy({ ...who, strategyId: fork.id });
        if (after.kind !== 'strategy') throw new Error('cannot re-read the fork');
        const changed = after.detail.signalRules.find((r) => r.signalId === rule.signalId);
        // eslint-disable-next-line no-console
        console.log(
          `  read-back: ${rule.signalId} allocation ${String(changed?.allocation)} r${after.detail.summary.revision} (was r${detail.detail.summary.revision})`,
        );
        expect(changed?.allocation).toBe(rule.allocation + 1);
        expect(after.detail.summary.revision).toBeGreaterThan(detail.detail.summary.revision);
        fork = after.detail.summary;
      } finally {
        if (fork) {
          const parkFork = await archiveOf(await freshOf(fork.id));
          // eslint-disable-next-line no-console
          console.log(`  cleanup: fork parked (${parkFork.kind})`);
        }
        const restored = await setActive.execute({
          ...who,
          strategy: await freshOf(slotHolder.id),
          active: true,
        });
        // eslint-disable-next-line no-console
        console.log(`  cleanup: ${slotHolder.name} restored (${restored.kind})`);
        expect(restored.kind).toBe('changed');
      }
    },
  );
});
