import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { CreateAgentCommand } from '@/application/use-cases/create-agent.command.js';
import { UpdateAgentCommand } from '@/application/use-cases/update-agent.command.js';
import { DescribeEditQuery } from '@/application/use-cases/describe-edit.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { SequentialRandom } from '../support/agent-fakes.js';

/**
 * One write, against the real platform, through the product's own path.
 *
 * Not in the default suite — `vitest.config.ts` includes `tests/**` but this
 * file guards on `BATTLEGRID_API_KEY`, so `npm test` skips it and CI can never
 * reach it. Run deliberately:
 *
 *     BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/write-probe.test.ts
 *
 * **Why it exists.** Every read in this product returned an empty object for its
 * entire life, through four production gates and 561 tests, because the one
 * seam nothing modelled was the one that was wrong. Then the surface map found
 * that `archive_strategy` and `restore_strategy` had never sent
 * `expectedRevision` and could not have succeeded. Both were invisible to every
 * fake, and both were found the moment something real was called.
 *
 * The write path shares that exposure and nothing has retired it. Argument
 * shapes are now checked against declared schemas, but declared is not
 * observed, and this project has already been burned by exactly that gap.
 *
 * **What it touches.** A fork of a SYSTEM strategy — an object that did not
 * exist before this test and does not outlive it. It never touches an existing
 * strategy, never touches an agent, and never calls a wager tool. The sequence
 * is fork → compile (which writes nothing) → archive the fork.
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
    // The personal path: the operator declares what the key carries, exactly as
    // a personal deployment does.
    heldScopes: new DeclaredScopes(['mcp:read']),
    remedy: 'repair-the-key',
    fetch: globalThis.fetch,
  });
  return { audit, confirmations, clock, strategies: new McpStrategyAdapter(battlegrid) };
}

live('a write reaches the real platform', () => {
  const who = { userId: 'owner', accessToken: KEY as string };

  it(
    'forks, compiles, and archives — the whole write path, on a throwaway object',
    { timeout: 120_000 },
    async () => {
      const { strategies, confirmations, clock, audit } = wire();

      // --- pick a target that harms nothing ---------------------------------
      const listing = await strategies.listStrategies(who);
      expect(listing.kind, 'the read path is a precondition for the write path').toBe('strategies');
      if (listing.kind !== 'strategies') return;

      const source = listing.strategies.find((s) => s.scope === 'SYSTEM' && s.boundAgentCount === 0);
      expect(source, 'need a SYSTEM strategy with nothing bound to it').toBeDefined();
      if (!source) return;
      // eslint-disable-next-line no-console
      console.log(`  source: ${source.name} (SYSTEM, r${source.revision}, ${source.boundAgentCount} bound)`);

      // --- 1. fork: creates a new private strategy --------------------------
      const fork = await strategies.forkStrategy({
        ...who,
        strategyId: source.id,
        sourceRevision: source.revision,
      });
      // eslint-disable-next-line no-console
      console.log(`  forked: ${fork.name} ${fork.id} r${fork.revision} scope=${fork.scope}`);

      expect(fork.id, 'a fork must be a different object').not.toBe(source.id);
      expect(fork.scope, 'a fork belongs to the user, not the platform').not.toBe('SYSTEM');
      expect(fork.revision).toBeGreaterThan(0);

      try {
        // --- 2. compile: effect-free, and the one tool returning a plan -----
        const compiled = await strategies.compilePlan({
          ...who,
          request: {
            operation: 'UPDATE',
            strategyId: fork.id,
            expectedRevision: fork.revision,
            intentSummary: 'Write-path probe: retag a throwaway fork',
            assumptions: ['Only the tagline changes'],
            coinSelection: { mode: 'ranked', limit: 9 },
            tagline: 'probe',
          },
        });
        // eslint-disable-next-line no-console
        console.log(`  compile: ${compiled.kind}${compiled.kind === 'rejected' ? ' — ' + compiled.reason : ''}`);

        expect(
          compiled.kind,
          'compile is classified read-only and must not need a confirmation',
        ).toBe('compiled');
        if (compiled.kind === 'compiled') {
          expect(compiled.planToken, 'a plan token is what binds apply to this plan').toBeTruthy();
          expect(compiled.approvedPlan).toBeTypeOf('object');
        }
      } finally {
        // --- 3. archive: destructive, and the fork stops existing -----------
        // In a finally block on purpose: a fork left behind by a failed probe is
        // litter on someone's real account.
        const token = 'probe-confirmation';
        await confirmations.issue({
          token,
          userId: who.userId,
          tool: 'archive_strategy',
          target: fork.id,
          consequence: `Archives the throwaway fork "${fork.name}".`,
          expiresAt: new Date(clock.now().getTime() + 300_000),
          consumedAt: null,
        });

        const archived = await strategies.setActive({
          ...who,
          strategyId: fork.id,
          expectedRevision: fork.revision,
          active: false,
          confirmationToken: token,
        });
        // eslint-disable-next-line no-console
        console.log(`  archive: ${archived.kind}`);

        expect(archived.kind, 'archive_strategy could not succeed before this session').toBe(
          'changed',
        );

        // The guard sequence ran for real: every mutating call is recorded, and
        // the record is written before the call rather than after it.
        const mutations = audit.entries.filter((e) => e.tool !== 'list_strategies');
        // eslint-disable-next-line no-console
        console.log(`  audit: ${mutations.map((e) => `${e.tool}=${e.outcome}`).join(' ')}`);
        expect(mutations.every((e) => e.outcome === 'succeeded')).toBe(true);
      }
    },
  );
});

/**
 * The agent write path, on an agent that cannot trade.
 *
 * `create_intelligence_agent` had never run against the real platform, and it
 * is the call this session made the largest change to: it used to send
 * `tradingConfig: null`, meaning every agent it made traded under limits the
 * product neither set nor could name.
 *
 * **What makes this safe is `tradingMode: OFF`**, not care. An agent in OFF
 * reasons and never places a trade, so the caps below are belt-and-braces on
 * something that already cannot spend. They are set to the platform's own
 * minimums anyway, because a probe that ships loose limits teaches the wrong
 * habit even when they are unreachable.
 *
 * The agent is archived in a `finally`. It occupies the operator's last slot
 * for the length of this test and gives it back.
 */
live('an agent can be created with limits the product can state', () => {
  const who = { userId: 'owner', accessToken: KEY as string };

  it(
    'creates, reads back, and archives — with trading off',
    { timeout: 180_000 },
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
      const agents = new McpAgentAdapter(battlegrid);
      const strategies = new McpStrategyAdapter(battlegrid);

      /**
       * Any SYSTEM strategy. Binding does not modify the thing bound to.
       *
       * This asked for `boundAgentCount === 0`, copied from the fork probe
       * above — where it matters, because that one *archives* what it picks and
       * must not archive something in use. Creating an agent writes to the
       * agent, never to the strategy, so the criterion bought nothing here.
       *
       * It also could not hold for long. `boundAgentCount` counts agents across
       * every player, not this account — Berlin carries five, Dunkirk four — and
       * an archived agent still counts. Two runs of this probe were enough to
       * consume the last two strategies that satisfied it, after which the test
       * failed on its own precondition rather than on anything it was testing.
       */
      const listing = await strategies.listStrategies(who);
      if (listing.kind !== 'strategies') throw new Error('cannot read strategies');
      const target = listing.strategies.find((s) => s.scope === 'SYSTEM');
      expect(target, 'need a SYSTEM strategy to bind to').toBeDefined();
      if (!target) return;

      // Unique per run, same reason as the create name below.
      const renamed = `GC probe renamed ${Date.now()}`;

      const created = await new CreateAgentCommand(agents).execute({
        ...who,
        /**
         * Unique per run, and that is not tidiness.
         *
         * This was a fixed string. The second run collided with the agent the
         * first run had archived, and BattleGrid answered
         * `INTERNAL_ERROR: Internal server error` — a 500, not a refusal. It
         * looked exactly like the platform being unwell, and it was diagnosed
         * as that for half an hour, because the probe was the thing that had
         * changed and nothing said so.
         *
         * An archived agent still holds its name. Established directly: the
         * same payload with a fresh name succeeds against the same strategy.
         */
        displayName: `Grid-Commander probe (off) ${Date.now()}`,
        brain: { kind: 'preset', preset: 'ROMMEL' },
        strategyId: target.id,
        money: {
          tradingMode: 'OFF',
          // The platform's own minimums. `minimumAllocationUsd` and
          // `minimumTradingEquityUsd` are both 10; going lower is rejected.
          minAllocationUsd: 10,
          balanceThresholdUsd: 10,
          maxConcurrentExposureUsd: 10,
          maxCumulativeDrawdownUsd: 10,
          maxDailyLossUsd: 10,
        },
      });

      // eslint-disable-next-line no-console
      console.log(`  create: ${created.kind}`);
      if (created.kind === 'invalid') {
        // eslint-disable-next-line no-console
        console.log('  issues:', created.issues.map((i) => `${i.field}: ${i.reason}`).join(' | '));
      }
      if (created.kind === 'no-catalog') {
        // eslint-disable-next-line no-console
        console.log('  reason:', created.reason);
      }
      expect(created.kind).toBe('created');
      if (created.kind !== 'created') return;

      const agent = created.agent;
      // eslint-disable-next-line no-console
      console.log(`  agent:  ${agent.displayName} ${agent.id} r${agent.revision} ${agent.status}`);

      try {
        // Read it back through the product, not from the create response — the
        // create response is what the platform *said*; this is what it *holds*.
        const readBack = await agents.getAgent({ ...who, agentId: agent.id });
        const config = readBack.tradingConfig?.fields;
        // eslint-disable-next-line no-console
        console.log(
          `  stored: mode=${String(config?.['tradingMode'])} ` +
            `dailyLoss=${String(config?.['maxDailyLossUsd'])} ` +
            `leverage=${String(config?.['maxLeverage'])}`,
        );

        // The whole point of the change: the limits are the ones we named.
        expect(config?.['tradingMode'], 'this agent must not be able to trade').toBe('OFF');
        expect(config?.['maxDailyLossUsd']).toBe(10);
        expect(config?.['maxConcurrentExposureUsd']).toBe(10);
        // And the defaults the platform supplied came through too.
        expect(config?.['maxLeverage']).toBe(1);

        /**
         * The edit is **not** proven here, and cannot be yet.
         *
         * `update_intelligence_agent` carries `destructiveHint: true`, so the
         * product's own guard demands a confirmation bound to the agent — and
         * `AgentsPort.updateAgent` has no `confirmationToken` parameter at all.
         * `rebindAgent` and `setLifecycle` both have one; update is the omission.
         * So no caller can satisfy the guard, and the edit path is blocked a
         * second time, independently of the 23-vs-20 defect fixed alongside this.
         *
         * Running it here produced:
         *
         *     ConfirmationRequiredError: "update_intelligence_agent" is
         *     destructive and needs confirmation: no confirmation was supplied
         *
         * Issuing a confirmation to ourselves from inside the probe would make
         * it pass and would mean nothing — a confirmation the product grants
         * itself is not a confirmation. The real fix is a propose/confirm step
         * like the one rebind already has. See
         * `update-cannot-carry-a-confirmation`.
         */
        expect(
          Object.keys(config ?? {}).length,
          'the read is wider than the write — the defect this session fixed',
        ).toBeGreaterThan(20);

        /**
         * Rename it — the path that could never succeed, for three reasons.
         *
         * The guard demands a confirmation because BattleGrid marks
         * `update_intelligence_agent` destructive, and until now no caller could
         * supply one. `DescribeEditQuery` mints it here, alongside the sentence
         * naming what changes — the same object a page would render before
         * asking. Nothing self-issues.
         */
        const proposed = await new DescribeEditQuery(
          agents,
          confirmations,
          new SequentialRandom(),
          clock,
        ).execute({ ...who, agentId: agent.id, changes: { displayName: renamed } });

        expect(proposed.kind, 'the proposal is what mints the confirmation').toBe('proposal');
        if (proposed.kind !== 'proposal') return;
        // eslint-disable-next-line no-console
        console.log(`  propose: ${proposed.proposal.consequence}`);

        const edited = await new UpdateAgentCommand(agents).execute({
          ...who,
          agentId: agent.id,
          changes: { displayName: renamed },
          confirmationToken: proposed.proposal.confirmationToken,
        });
        // eslint-disable-next-line no-console
        console.log(`  rename:  ${edited.kind}`);
        expect(edited.kind, 'update_intelligence_agent could not succeed before this').toBe(
          'updated',
        );

        const afterRename = await agents.getAgent({ ...who, agentId: agent.id });
        // eslint-disable-next-line no-console
        console.log(`  renamed: ${afterRename.displayName} r${afterRename.revision}`);
        expect(afterRename.displayName).toBe(renamed);
        // The rename must not have disturbed the money limits.
        expect(afterRename.tradingConfig?.fields['tradingMode']).toBe('OFF');
        expect(afterRename.tradingConfig?.fields['maxDailyLossUsd']).toBe(10);
      } finally {
        const token = 'probe-archive-agent';
        await confirmations.issue({
          token,
          userId: who.userId,
          tool: 'archive_intelligence_agent',
          target: agent.id,
          consequence: `Archives the probe agent "${agent.displayName}".`,
          expiresAt: new Date(clock.now().getTime() + 300_000),
          consumedAt: null,
        });

        /**
         * Re-read the revision. It moved.
         *
         * This archived at `agent.revision` — the value captured at create,
         * before the rename bumped it. The platform refused with a revision
         * conflict and the probe left a live agent on the operator's account,
         * which is precisely what a `finally` exists to prevent.
         *
         * The guard was right and the cleanup was wrong: optimistic concurrency
         * did its job, and a teardown that assumes nothing changed has no
         * business running after a test whose whole point is that something did.
         */
        const current = await agents.getAgent({ ...who, agentId: agent.id });

        const archived = await agents.setLifecycle({
          ...who,
          agentId: agent.id,
          expectedRevision: current.revision,
          to: 'ARCHIVED',
          confirmationToken: token,
        });
        // eslint-disable-next-line no-console
        console.log(`  archive: ${archived.status}`);
        // eslint-disable-next-line no-console
        console.log(`  audit: ${audit.entries.map((e) => `${e.tool}=${e.outcome}`).join(' ')}`);
        expect(archived.status).toBe('ARCHIVED');
      }
    },
  );
});
