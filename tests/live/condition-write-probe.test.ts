import { describe, expect, it } from 'vitest';
import type { Strategy } from '@/domain/strategy/strategy.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { compileConditionsIntent, postStateDrift } from '@/domain/strategy/compiled-plan.js';
import { listedKeys, resolveConditionEdit } from '@/domain/strategy/condition-write.js';
import { DescribeConditionWriteQuery } from '@/application/use-cases/describe-condition-write.query.js';
import { CompilePlanCommand } from '@/application/use-cases/compile-plan.command.js';
import { ApplyPlanCommand, DescribeApplyQuery } from '@/application/use-cases/apply-plan.command.js';
import {
  DescribeArchiveStrategyQuery,
  ForkStrategyCommand,
  SetStrategyActiveCommand,
} from '@/application/use-cases/strategy-lifecycle.command.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { SequentialRandom } from '../support/agent-fakes.js';

/**
 * The condition write, against the real platform — in two halves, because they
 * need different permission.
 *
 * **The first half writes nothing at all.** `compile_strategy_plan` is
 * classified `read` by the server's own annotation and performs no write; it
 * answers with the post-state it *would* save. That is enough to establish
 * every fact this feature rests on:
 *
 *   1. an UPDATE carrying `conditions` has its list taken whole;
 *   2. an UPDATE that names neither `tagline` nor `sections` leaves both as the
 *      stored strategy has them (the 2026-08-06 finding, re-established on
 *      every run rather than trusted);
 *   3. what `conditions: []` means — the one case removing the *last* condition
 *      depends on, and the one nothing has observed.
 *
 * So it runs under a key alone, like every other read probe:
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/condition-write-probe.test.ts
 *
 * **The second half applies.** Fork → describe → confirm → apply → read back,
 * on a throwaway fork with zero bound agents, through the operator-authorized
 * slot shuffle, restoring the account in a `finally`. A credential is not
 * consent to mutate, so it needs the explicit opt-in as well:
 *
 *     BATTLEGRID_API_KEY=… BATTLEGRID_LIVE_WRITES=1 npx vitest run tests/live/condition-write-probe.test.ts
 *
 * It never runs against the operator's own agents or strategies. Every one of
 * their agents is in `FULL_EXECUTION`, and a strategy write reconfigures every
 * agent bound to it immediately.
 */

const KEY = process.env['BATTLEGRID_API_KEY'];
const WRITES = process.env['BATTLEGRID_LIVE_WRITES'] === '1';
const live = KEY ? describe : describe.skip;
const writes = KEY && WRITES ? describe : describe.skip;

const config = {
  clientId: '',
  mcpUrl: 'https://mcp.battlegrid.trade/mcp',
  authorizeUrl: 'https://mcp.battlegrid.trade/authorize',
  tokenUrl: 'https://mcp.battlegrid.trade/token',
  revokeUrl: 'https://mcp.battlegrid.trade/revoke',
  redirectUri: '',
};

const who = { userId: 'owner', accessToken: KEY as string };

function platform() {
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
  return { clock, audit, confirmations, strategies: new McpStrategyAdapter(battlegrid) };
}

/** A drafted condition that reads a column the strategy's own conditions read. */
const draftOver = (header: string, sectionKey: string | null) => ({
  conditionKey: 'GC_PROBE_DRAFT',
  name: 'Grid-Commander probe draft',
  verdict: 'UP' as const,
  definition: {
    kind: 'compare' as const,
    column: { sectionKey, header },
    op: 'gt' as const,
    value: 0,
  },
});

live('what the compiler does with a condition list, without writing', () => {
  it(
    'takes the submitted list whole and leaves the axes it was not given',
    { timeout: 300_000 },
    async (ctx) => {
      const { strategies } = platform();

      const listing = await strategies.listStrategies(who);
      if (listing.kind !== 'strategies') throw new Error('cannot read strategies');

      // A strategy this account owns that actually defines conditions. Nothing
      // here writes, so a bound one would be safe too — but the account's own
      // agents are in FULL_EXECUTION and a probe stays away from them on
      // principle, not on the strength of one annotation.
      let subject: { summary: Strategy; conditions: readonly Record<string, unknown>[] } | null =
        null;
      for (const candidate of listing.strategies.filter(
        (s) => s.scope === 'PRIVATE' && s.isActive && s.boundAgentCount === 0,
      )) {
        const read = await strategies.readStrategy({ ...who, strategyId: candidate.id });
        if (read.kind !== 'strategy' || read.conditionsAsGiven.length === 0) continue;
        subject = {
          summary: read.detail.summary,
          conditions: read.conditionsAsGiven as readonly Record<string, unknown>[],
        };
        break;
      }
      if (!subject) {
        // Account state, not a defect: no unbound owned strategy defines a
        // condition to compose against.
        ctx.skip();
        return;
      }

      const read = await strategies.readStrategy({ ...who, strategyId: subject.summary.id });
      if (read.kind !== 'strategy') throw new Error('cannot re-read the subject');
      const detail = read.detail;
      const unchanged = {
        tagline: detail.summary.tagline,
        sectionKeys: detail.sections.map((s) => s.sectionKey),
      };
      // eslint-disable-next-line no-console
      console.log(
        `  subject: ${detail.summary.name} ${detail.summary.id} r${detail.summary.revision} ` +
          `conditions=${read.conditionsAsGiven.length} [${listedKeys(read.conditionsAsGiven).join(', ')}] ` +
          `sections=${unchanged.sectionKeys.length} tagline=${String(unchanged.tagline)}`,
      );

      const compileWith = async (conditions: readonly Record<string, unknown>[], why: string) => {
        const result = await strategies.compilePlan({
          ...who,
          request: compileConditionsIntent({
            strategyId: detail.summary.id,
            expectedRevision: detail.summary.revision,
            intentSummary: `Grid-Commander probe: ${why}`,
            assumptions: ['Only the condition list changes'],
            conditions,
          }),
        });
        if (result.kind === 'rejected') {
          // eslint-disable-next-line no-console
          console.log(`  ${why}: REJECTED — ${result.reason}`);
          return null;
        }
        const post = (result.approvedPlan['postState'] ?? {}) as Record<string, unknown>;
        const back = Array.isArray(post['conditions'])
          ? (post['conditions'] as Record<string, unknown>[])
          : [];
        // eslint-disable-next-line no-console
        console.log(
          `  ${why}: postState conditions=${back.length} [${listedKeys(back).join(', ')}] ` +
            `tagline=${String(post['tagline'])} sections=${Array.isArray(post['sections']) ? post['sections'].length : 'absent'}`,
        );
        return result.approvedPlan;
      };

      // (1) The list resubmitted unchanged. Nothing moves, and the product's
      // own check is what reads the answer — so a platform that stopped
      // honouring the omission fails here rather than in front of an operator.
      const same = await compileWith([...subject.conditions], 'unchanged list');
      expect(same, 'the compiler must accept the strategy’s own condition list').not.toBeNull();
      if (same) {
        expect(
          postStateDrift(same, { conditionKeys: listedKeys(subject.conditions), ...unchanged }),
          'an UPDATE naming only conditions must leave tagline and sections as stored',
        ).toEqual([]);
      }

      // (2) One added. The draft reads a column this strategy's own conditions
      // read, so the compiler has something real to resolve it against.
      const columns = detail.conditions.flatMap((c) =>
        c.definition.kind === 'compare' || c.definition.kind === 'between'
          ? [c.definition.column]
          : [],
      );
      const column = columns[0];
      if (column) {
        const added = resolveConditionEdit(detail.conditions, subject.conditions, {
          kind: 'upsert',
          condition: draftOver(column.header, column.sectionKey),
        });
        if (added.kind === 'change') {
          const plan = await compileWith(
            added.change.conditions as Record<string, unknown>[],
            'one added',
          );
          if (plan) {
            expect(
              postStateDrift(plan, {
                conditionKeys: listedKeys(added.change.conditions),
                ...unchanged,
              }),
              'the compiler must save exactly the list it was given',
            ).toEqual([]);
          }
        }
      }

      // (3) One removed.
      const first = listedKeys(subject.conditions)[0];
      if (typeof first === 'string') {
        const removed = resolveConditionEdit(detail.conditions, subject.conditions, {
          kind: 'remove',
          conditionKey: first,
        });
        if (removed.kind === 'change') {
          const plan = await compileWith(
            removed.change.conditions as Record<string, unknown>[],
            `one removed (${first})`,
          );
          if (plan) {
            // A removal can legitimately be refused — another condition may
            // reference the one being dropped — so the refusal is recorded and
            // not asserted against. What is asserted is that a plan that *is*
            // produced saves the list that was submitted.
            expect(
              postStateDrift(plan, {
                conditionKeys: listedKeys(removed.change.conditions),
                ...unchanged,
              }),
            ).toEqual([]);
          }
        }
      }

      // (4) The empty list — the one case nothing has observed, and the one
      // removing the last condition depends on. Recorded either way: if the
      // post-state comes back carrying the stored conditions, `[]` means
      // "unspecified" rather than "none", and `postStateDrift` is what stands
      // between that and an operator agreeing to a removal that never happens.
      const emptied = await compileWith([], 'empty list');
      if (emptied) {
        const drift = postStateDrift(emptied, { conditionKeys: [], ...unchanged });
        // eslint-disable-next-line no-console
        console.log(
          drift.length === 0
            ? '  empty list: honoured — [] clears the condition list'
            : `  empty list: NOT honoured — ${drift.join(' ')}`,
        );
      }
    },
  );
});

writes('a condition can be saved, through the product path', () => {
  it(
    'frees a slot, forks, describes, applies, reads back, and puts everything back',
    { timeout: 600_000 },
    async (ctx) => {
      const { clock, audit, confirmations, strategies } = platform();
      const random = new SequentialRandom();
      const describeArchive = new DescribeArchiveStrategyQuery(confirmations, random, clock);
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
      const slotHolder = listing.strategies.find(
        (s) => s.scope === 'PRIVATE' && s.isActive && s.boundAgentCount === 0,
      );
      // A platform strategy that actually defines conditions — the fork has to
      // carry some, or this proves nothing about a list.
      let source: Strategy | undefined;
      for (const candidate of listing.strategies.filter((s) => s.scope === 'SYSTEM')) {
        const read = await strategies.readStrategy({ ...who, strategyId: candidate.id });
        if (read.kind === 'strategy' && read.conditionsAsGiven.length > 0) {
          source = read.detail.summary;
          break;
        }
      }
      if (!source || !slotHolder) {
        ctx.skip();
        return;
      }
      // eslint-disable-next-line no-console
      console.log(`  slot: parking ${slotHolder.name} ${slotHolder.id} (0 bound)`);
      const parked = await archiveOf(slotHolder);
      expect(parked.kind).toBe('changed');

      let fork: Strategy | undefined;
      try {
        const forked = await new ForkStrategyCommand(strategies).execute({ ...who, strategy: source });
        if (forked.kind !== 'forked') throw new Error('fork refused with a slot free');
        fork = forked.strategy;
        // eslint-disable-next-line no-console
        console.log(`  fork: ${fork.name} ${fork.id} r${fork.revision}`);

        const before = await strategies.readStrategy({ ...who, strategyId: fork.id });
        if (before.kind !== 'strategy') throw new Error('cannot read the fork back');
        const columns = before.detail.conditions.flatMap((c) =>
          c.definition.kind === 'compare' || c.definition.kind === 'between'
            ? [c.definition.column]
            : [],
        );
        const column = columns[0];
        if (!column) {
          // The fork's conditions read no column directly — nothing to compose
          // a clause against without inventing a header.
          ctx.skip();
          return;
        }
        // eslint-disable-next-line no-console
        console.log(
          `  before: conditions=${before.conditionsAsGiven.length} [${listedKeys(before.conditionsAsGiven).join(', ')}]`,
        );

        const describeWrite = new DescribeConditionWriteQuery(
          strategies,
          new CompilePlanCommand(strategies),
          new DescribeApplyQuery(confirmations, random, clock),
        );
        const described = await describeWrite.execute({
          ...who,
          battlegridSubject: null,
          strategyId: fork.id,
          edit: { kind: 'compose', condition: draftOver(column.header, column.sectionKey) },
        });
        // eslint-disable-next-line no-console
        console.log(`  describe: ${described.kind}`);
        if (described.kind === 'drift') {
          // The finding this whole design rests on, contradicted. Loud, and not
          // worked around: a plan that would save something else is exactly
          // what must never reach an apply.
          throw new Error(`post-state drift: ${described.reasons.join(' ')}`);
        }
        if (described.kind !== 'proposal') {
          throw new Error(`no proposal: ${JSON.stringify(described).slice(0, 300)}`);
        }
        // eslint-disable-next-line no-console
        console.log(`  consequence: ${described.proposal.consequence.replace(/\n+/g, ' | ')}`);
        expect(described.proposal.listKeys).toContain('GC_PROBE_DRAFT');

        await new ApplyPlanCommand(strategies).execute({
          ...who,
          strategyId: fork.id,
          plan: described.proposal.plan,
          confirmationToken: described.proposal.confirmationToken,
        });

        const after = await strategies.readStrategy({ ...who, strategyId: fork.id });
        if (after.kind !== 'strategy') throw new Error('cannot read the fork after applying');
        // eslint-disable-next-line no-console
        console.log(
          `  after: r${after.detail.summary.revision} conditions=${after.conditionsAsGiven.length} ` +
            `[${listedKeys(after.conditionsAsGiven).join(', ')}] tagline=${String(after.detail.summary.tagline)}`,
        );
        // The proof is the re-read, never the apply's own payload.
        expect(listedKeys(after.conditionsAsGiven)).toContain('GC_PROBE_DRAFT');
        expect(after.detail.summary.revision).toBeGreaterThan(fork.revision);
        // And nothing this write never named has moved.
        expect(after.detail.summary.tagline).toBe(before.detail.summary.tagline);
        expect(after.detail.sections.map((s) => s.sectionKey).sort()).toEqual(
          before.detail.sections.map((s) => s.sectionKey).sort(),
        );

        // --- and removed again, which is the other half of the write ---------
        const removal = await describeWrite.execute({
          ...who,
          battlegridSubject: null,
          strategyId: fork.id,
          edit: { kind: 'remove', conditionKey: 'GC_PROBE_DRAFT' },
        });
        if (removal.kind !== 'proposal') {
          // eslint-disable-next-line no-console
          console.log(`  remove: ${removal.kind} — ${JSON.stringify(removal).slice(0, 200)}`);
        } else {
          await new ApplyPlanCommand(strategies).execute({
            ...who,
            strategyId: fork.id,
            plan: removal.proposal.plan,
            confirmationToken: removal.proposal.confirmationToken,
          });
          const gone = await strategies.readStrategy({ ...who, strategyId: fork.id });
          if (gone.kind !== 'strategy') throw new Error('cannot read the fork after removing');
          // eslint-disable-next-line no-console
          console.log(
            `  remove: r${gone.detail.summary.revision} conditions=${gone.conditionsAsGiven.length} ` +
              `[${listedKeys(gone.conditionsAsGiven).join(', ')}]`,
          );
          expect(listedKeys(gone.conditionsAsGiven)).not.toContain('GC_PROBE_DRAFT');
        }
        fork = await freshOf(fork.id);
      } finally {
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
