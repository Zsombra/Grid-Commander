import { describe, expect, it } from 'vitest';
import type { Strategy } from '@/domain/strategy/strategy.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import {
  DescribeArchiveStrategyQuery,
  ForkStrategyCommand,
  SetStrategyActiveCommand,
} from '@/application/use-cases/strategy-lifecycle.command.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { SequentialRandom } from '../support/agent-fakes.js';

/**
 * Restore, against the real platform, through the product's own commands.
 *
 * Gated on `BATTLEGRID_API_KEY` like its siblings:
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/restore-probe.test.ts
 *
 * **Why it exists.** `restore-has-never-been-walked` (P2): the restore page
 * had rendered its refusal branches live but `restore_strategy` had never
 * been called by this product, and one structural question decided whether
 * the flow was reachable at all — **does `list_strategies` return archived
 * strategies?** The restore server action looks the strategy up in the
 * listing before calling anything; if archived strategies are absent from
 * the list, restore is a page nothing can reach with a working button.
 *
 * **What it touches.** A fork of a SYSTEM strategy — created, archived,
 * restored, and archived again. It exists only inside this test; the finally
 * re-archives whatever state the walk left.
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

live('restore walks end-to-end through the product commands', () => {
  it(
    'forks, archives, restores, and answers whether the roster lists the archived',
    { timeout: 240_000 },
    async () => {
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

      const listing = await strategies.listStrategies(who);
      if (listing.kind !== 'strategies') {
        throw new Error(`cannot read strategies: ${JSON.stringify(listing)}`);
      }
      const source = listing.strategies.find((s) => s.scope === 'SYSTEM');
      expect(source, 'need a SYSTEM strategy to fork').toBeDefined();
      if (!source) return;

      /**
       * A subject to archive and bring back, acquired the least invasive way
       * available. A fork is cleanest — a throwaway that outlives nothing.
       * At the 25-strategy cap (the account's state 2026-07-31) a fork is
       * refused, so the walk falls back to the operator's own strategies,
       * ending each exactly as found: an already-archived PRIVATE one is
       * restored (the act under test) and re-archived; failing that, an
       * active PRIVATE one with nothing bound is archived, restored, and
       * left active.
       */
      let fork: Strategy | undefined;
      let endActive = false;
      const forked = await new ForkStrategyCommand(strategies)
        .execute({ ...who, strategy: source })
        .catch((err: unknown) => {
          if (err instanceof Error && /limit/i.test(err.message)) return null;
          throw err;
        });
      if (forked && forked.kind === 'forked') {
        fork = forked.strategy;
        // eslint-disable-next-line no-console
        console.log(`  fork: ${fork.name} ${fork.id} r${fork.revision}`);
      } else {
        const parked = listing.strategies.find((s) => s.scope === 'PRIVATE' && !s.isActive);
        const unbound = listing.strategies.find(
          (s) => s.scope === 'PRIVATE' && s.isActive && s.boundAgentCount === 0,
        );
        fork = parked ?? unbound;
        endActive = !parked && !!unbound;
        // eslint-disable-next-line no-console
        console.log(
          `  at the strategy cap; subject: ${fork ? `${fork.name} ${fork.id} r${fork.revision} active=${String(fork.isActive)}` : 'none available'}`,
        );
        expect(
          fork,
          'the cap is reached and no PRIVATE strategy is safely walkable — account state, not a defect',
        ).toBeDefined();
        if (!fork) return;
      }
      if (!fork) return;

      try {
        if (fork.isActive) {
          // --- archive it, the product way (describe mints, perform spends) ---
          const proposal = await describeArchive.execute({ ...who, strategy: fork });
          if (proposal.kind !== 'proposal') throw new Error(`no archive proposal: ${proposal.reason}`);
          const archived = await setActive.execute({
            ...who,
            strategy: fork,
            active: false,
            confirmationToken: proposal.proposal.confirmationToken,
          });
          // eslint-disable-next-line no-console
          console.log(`  archive: ${archived.kind}`);
          expect(archived.kind).toBe('changed');
          if (archived.kind !== 'changed') return;
          fork = archived.strategy;
          expect(fork.isActive, 'archived means inactive').toBe(false);
        }

        /**
         * THE question this walk exists to answer: does the roster still
         * carry the archived strategy? The restore action looks it up there
         * before calling anything — absent means restore is unreachable.
         * (A subject that was *found* archived answers it by having been in
         * the listing at all.)
         */
        const after = await strategies.listStrategies(who);
        if (after.kind !== 'strategies') throw new Error('cannot re-read strategies');
        const subjectId = fork.id;
        const listed = after.strategies.find((s) => s.id === subjectId);
        // eslint-disable-next-line no-console
        console.log(
          `  roster while archived: ${listed ? `listed (isActive=${String(listed.isActive)})` : 'ABSENT — restore unreachable from the roster'}`,
        );
        expect(
          listed,
          'list_strategies must return the archived strategy or the restore flow is unreachable',
        ).toBeDefined();
        if (listed) fork = listed;

        // --- restore, the product way (write, no confirmation required) -----
        const restored = await setActive.execute({ ...who, strategy: fork, active: true });
        // eslint-disable-next-line no-console
        console.log(
          `  restore: ${restored.kind}${restored.kind === 'refused' ? ` — ${restored.reason}` : ''}`,
        );
        expect(restored.kind, 'restore_strategy had never been called before this').toBe('changed');
        if (restored.kind !== 'changed') return;
        fork = restored.strategy;
        expect(fork.isActive, 'restored means active again').toBe(true);

        // What the platform holds, not what it said.
        const readBack = await strategies.readStrategy({ ...who, strategyId: fork.id });
        if (readBack.kind !== 'strategy') throw new Error('cannot read the restored fork back');
        // eslint-disable-next-line no-console
        console.log(
          `  read-back: r${readBack.detail.summary.revision} active=${String(readBack.detail.summary.isActive)}`,
        );
        expect(readBack.detail.summary.isActive).toBe(true);
        fork = readBack.detail.summary;
      } finally {
        // The account ends as it was found: a fork or a parked subject is
        // archived; a subject that was active stays active.
        const current = await strategies.readStrategy({ ...who, strategyId: fork.id });
        const parting = current.kind === 'strategy' ? current.detail.summary : fork;
        if (parting.isActive && !endActive) {
          const proposal = await describeArchive.execute({ ...who, strategy: parting });
          if (proposal.kind === 'proposal') {
            const cleanup = await setActive.execute({
              ...who,
              strategy: parting,
              active: false,
              confirmationToken: proposal.proposal.confirmationToken,
            });
            // eslint-disable-next-line no-console
            console.log(`  cleanup archive: ${cleanup.kind}`);
          }
        }
        // eslint-disable-next-line no-console
        console.log(`  audit: ${audit.entries.map((e) => `${e.tool}=${e.outcome}`).join(' ')}`);
      }
    },
  );
});
