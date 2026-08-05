import { describe, expect, it } from 'vitest';
import type { Strategy } from '@/domain/strategy/strategy.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { CompilePlanCommand } from '@/application/use-cases/compile-plan.command.js';
import { ApplyPlanCommand, DescribeApplyQuery } from '@/application/use-cases/apply-plan.command.js';
import {
  DescribeArchiveStrategyQuery,
  ForkStrategyCommand,
  SetStrategyActiveCommand,
} from '@/application/use-cases/strategy-lifecycle.command.js';
import { compileUpdateIntent } from '@/domain/strategy/compiled-plan.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { SequentialRandom } from '../support/agent-fakes.js';

/**
 * The last unproven write: `apply_strategy_plan`, end-to-end, live.
 *
 * Gated on `BATTLEGRID_API_KEY` like its siblings:
 *
 *     BATTLEGRID_API_KEY=bg_live_… BATTLEGRID_LIVE_WRITES=1 \
 *       npx vitest run tests/live/apply-probe.test.ts
 *
 * **Why it exists.** Fork, compile, archive, restore, and the agent writes
 * have all been walked live; apply never was — and it is the write with the
 * widest possible blast radius, since a plan lands on every agent bound to
 * the strategy. It is proven here on a fork with **zero bound agents**, so
 * the radius is exactly nothing.
 *
 * **The slot shuffle (operator-authorized 2026-07-31).** The account is at
 * its 25-active-strategy cap, so a fork cannot be created outright. The
 * probe frees a slot by archiving an unbound PRIVATE strategy of the
 * operator's, runs fork → compile → apply → verify on the throwaway,
 * archives the throwaway, and restores the operator's strategy — the exact
 * round-trip the operator described. Archive and restore are both
 * live-proven acts (restore-probe, same day). The account ends as found,
 * plus one archived throwaway fork, which is the residue every fork probe
 * leaves.
 */

const KEY = process.env['BATTLEGRID_API_KEY'];
// Gated with the other mutating probes. This one forks a strategy, compiles a
// plan and applies it — real writes — while naming no BattleGrid tool at all:
// it drives ForkStrategyCommand and ApplyPlanCommand instead. The first
// version of the live-writes guard matched tool *names* in the source and
// therefore missed this file entirely, which is how it ran unasked during CI
// on 2026-08-04. The guard now derives from Command references too.
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

live('a compiled plan can be applied, through the product path', () => {
  it(
    'frees a slot, forks, compiles, applies, verifies, and puts everything back',
    { timeout: 300_000 },
    async (ctx) => {
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

      // --- free the slot ----------------------------------------------------
      const parked = await archiveOf(slotHolder);
      expect(parked.kind).toBe('changed');

      let fork: Strategy | undefined;
      try {
        // --- the throwaway ---------------------------------------------------
        const forked = await new ForkStrategyCommand(strategies).execute({
          ...who,
          strategy: source,
        });
        if (forked.kind !== 'forked') throw new Error('fork refused with a slot free');
        fork = forked.strategy;
        // eslint-disable-next-line no-console
        console.log(`  fork: ${fork.name} ${fork.id} r${fork.revision}`);

        // --- compile: the platform's own dry run -----------------------------
        // The fork's own sections ride along unchanged: an empty list removes
        // every report column, and the strategy's conditions read those
        // columns — the platform rejects the amputation
        // (CONDITION_COLUMN_UNKNOWN, observed on the first run of this probe).
        const forkDetail = await strategies.readStrategy({ ...who, strategyId: fork.id });
        if (forkDetail.kind !== 'strategy') throw new Error('cannot read the fork back');
        const intent = compileUpdateIntent({
          strategyId: fork.id,
          expectedRevision: fork.revision,
          intentSummary: 'Apply-path probe: retag a throwaway fork',
          assumptions: ['Only the tagline changes'],
          tagline: 'probe-applied',
          sections: forkDetail.detail.sections.map((s) => ({
            kind: s.kind,
            sectionKey: s.sectionKey,
          })),
        });
        const compiled = await new CompilePlanCommand(strategies).execute({
          ...who,
          request: intent,
        });
        // eslint-disable-next-line no-console
        console.log(
          `  compile: ${compiled.kind}${compiled.kind === 'rejected' ? ` — ${compiled.reason}` : ''}`,
        );
        expect(compiled.kind).toBe('review');
        if (compiled.kind !== 'review') return;
        // eslint-disable-next-line no-console
        console.log(
          `  review: viable=${String(compiled.review.viable)} boundAgents=${String(compiled.review.boundAgentCount)} summary=${String(compiled.review.summary).slice(0, 120)}`,
        );
        expect(compiled.review.viable, 'the platform must call the plan viable').toBe(true);

        // --- describe: mints against the platform's own consequence ----------
        const proposed = await new DescribeApplyQuery(
          confirmations,
          new SequentialRandom(),
          clock,
        ).execute({
          userId: who.userId,
          battlegridSubject: null,
          accessToken: who.accessToken,
          strategyId: fork.id,
          plan: compiled.review.plan,
          currentIntent: intent,
          currentRevision: fork.revision,
        });
        if (proposed.kind !== 'proposal') {
          throw new Error(`apply refused locally: ${proposed.reason}`);
        }
        // eslint-disable-next-line no-console
        console.log(`  propose: ${proposed.proposal.consequence.split('\n')[0]}`);

        // --- apply: the write that had never run -----------------------------
        const applied = await new ApplyPlanCommand(strategies).execute({
          ...who,
          strategyId: fork.id,
          plan: compiled.review.plan,
          confirmationToken: proposed.proposal.confirmationToken,
        });
        // eslint-disable-next-line no-console
        console.log(`  apply: landed, keys [${Object.keys(applied.applied).join(', ')}]`);

        // --- what the platform holds, not what it said -----------------------
        const after = await freshOf(fork.id);
        // eslint-disable-next-line no-console
        console.log(
          `  read-back: tagline="${String(after.tagline)}" r${after.revision} (was r${fork.revision})`,
        );
        expect(after.tagline).toBe('probe-applied');
        expect(after.revision).toBeGreaterThan(fork.revision);
        fork = after;
      } finally {
        // The throwaway is parked; the operator's strategy comes back on.
        if (fork) {
          const current = await freshOf(fork.id);
          if (current.isActive) {
            const cleaned = await archiveOf(current);
            // eslint-disable-next-line no-console
            console.log(`  cleanup: fork archived (${cleaned.kind})`);
          }
        }
        const parkedNow = await freshOf(slotHolder.id);
        if (!parkedNow.isActive) {
          const back = await setActive.execute({ ...who, strategy: parkedNow, active: true });
          // eslint-disable-next-line no-console
          console.log(`  slot: ${slotHolder.name} restored (${back.kind})`);
          expect(back.kind).toBe('changed');
        }
        // eslint-disable-next-line no-console
        console.log(`  audit: ${audit.entries.map((e) => `${e.tool}=${e.outcome}`).join(' ')}`);
      }
    },
  );
});
