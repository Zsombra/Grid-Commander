import { describe, expect, it } from 'vitest';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { UpdateAgentCommand } from '@/application/use-cases/update-agent.command.js';
import { DescribeEditQuery } from '@/application/use-cases/describe-edit.query.js';
import { ReadThoughtLogQuery } from '@/application/use-cases/read-thought-log.query.js';
import { ReadBudgetQuery } from '@/application/use-cases/read-budget.query.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { editArguments } from '@/presentation/form.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { SequentialRandom } from '../support/agent-fakes.js';
import { acquireProbeAgent, probeAgentName, releaseProbeAgent } from '../support/probe-agent.js';

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
  return { audit, confirmations, clock, battlegrid, strategies: new McpStrategyAdapter(battlegrid) };
}

live('a write reaches the real platform', () => {
  const who = { userId: 'owner', accessToken: KEY as string };

  it(
    'forks, compiles, and archives — the whole write path, on a throwaway object',
    { timeout: 120_000 },
    async (ctx) => {
      const { strategies, confirmations, clock, audit } = wire();

      // --- pick a target that harms nothing ---------------------------------
      const listing = await strategies.listStrategies(who);
      expect(listing.kind, 'the read path is a precondition for the write path').toBe('strategies');
      if (listing.kind !== 'strategies') return;

      const source = listing.strategies.find((s) => s.scope === 'SYSTEM' && s.boundAgentCount === 0);
      if (!source) {
        // An account state, not a defect: on 2026-07-31 every SYSTEM strategy
        // visible to the key had agents bound. The sequence needs a source
        // that harms nothing; without one it must not run, and a skip says so
        // where a silent pass would claim coverage that did not happen.
        ctx.skip();
        return;
      }
      // eslint-disable-next-line no-console
      console.log(`  source: ${source.name} (SYSTEM, r${source.revision}, ${source.boundAgentCount} bound)`);

      // --- 1. fork: creates a new private strategy --------------------------
      // A refusal is a result now, not a throw — and one refusal is known
      // live: INTERNAL_ERROR when `<name> (fork)` is already taken
      // (forking-a-name-that-exists-is-a-500). The source selection above
      // cannot see names, so a refused fork ends the walk loudly rather than
      // pretending coverage.
      const forked = await strategies.forkStrategy({
        ...who,
        strategyId: source.id,
        sourceRevision: source.revision,
      });
      expect(forked.kind, 'the platform declined the fork; the walk cannot continue').toBe('forked');
      if (forked.kind !== 'forked') return;
      const fork = forked.strategy;
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
          confirmation: { token, target: fork.id },
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
 * **The subject is reused, not minted.** This created one per run, and the runs
 * added up: eight archived probe agents on the operator's second account by
 * 2026-08-06, on a roster of eleven, with no delete tool anywhere on the MCP
 * surface to remove them. `acquireProbeAgent` finds the one this slot left
 * behind and reactivates it, and only creates when there is genuinely none —
 * refusing, on two independent grounds, ever to select an agent the operator
 * actually runs. See `tests/support/probe-agent.ts`.
 *
 * The agent is archived in a `finally`. It occupies the operator's last slot
 * for the length of this test and gives it back — which is also what leaves it
 * in the state the next run expects to find it in.
 */
live('an agent can be created with limits the product can state', () => {
  const who = { userId: 'owner', accessToken: KEY as string };

  it(
    'creates or reuses, reads back, and archives — with trading off',
    { timeout: 180_000 },
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

      /**
       * Unique per run, and still carrying the slot prefix.
       *
       * Unique because an archived agent keeps its name: a fixed one collided
       * with the agent an earlier run had archived and BattleGrid answered
       * `INTERNAL_ERROR: Internal server error` — a 500, not a refusal, which
       * looked exactly like the platform being unwell and was diagnosed as that
       * for half an hour. Prefixed because the *next* run has to recognise what
       * this one renamed; `probeAgentName` puts the note before the stamp for
       * exactly that reason.
       */
      const renamed = probeAgentName('write', 'renamed');

      const acquired = await acquireProbeAgent({
        agents,
        who,
        slot: 'write',
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
      console.log(`  subject: ${acquired.kind}`);
      if (acquired.kind === 'unavailable') {
        /**
         * A state of the account, not a defect here — and a skip that names it
         * rather than a pass that hides it. The roster being unreadable, the
         * slots being full, and `create_intelligence_agent` answering
         * `INTERNAL_ERROR` (observed 2026-08-05, both accounts) all arrive here.
         */
        // eslint-disable-next-line no-console
        console.log(`  SKIPPED: ${acquired.reason}`);
        ctx.skip();
        return;
      }

      const agent = acquired.agent;
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

        /**
         * The limits are the ones we named — on a create, because this run set
         * them, and on a reuse, because the run that created this agent set the
         * same six and nothing since has touched them. Only `maxDailyTrades`
         * moves below, which is why it was chosen: it is not a money cap.
         *
         * The mode is asserted here as well as inside the selection. Selection
         * refusing anything but OFF is what makes reuse safe; this is what
         * makes the *platform's* agreement with that observable.
         */
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

        /**
         * Now change a trading limit — the path `applyEdit` governs.
         *
         * The rename above proves the confirmation plumbing and nothing else:
         * it never touches `tradingConfig`, so it cannot exercise the 23-vs-20
         * projection. This does. The read carries `strategyTimeframe`,
         * `regimeAutoDerive` and `regimeTimeframe`; the write declares
         * `additionalProperties: false` and rejects all three. Sending the read
         * back verbatim — which is what this product did — is refused outright.
         *
         * `maxDailyTrades` is chosen deliberately: it is not a money cap, so
         * even a half-applied change leaves an agent that still cannot trade.
         *
         * **One intent, described and then applied** — not two that name the
         * same agent and nothing else. This step used to describe an empty
         * `tradingConfig` and submit `maxDailyTrades: 7`. The confirmation is
         * bound to a digest of the described intent, so the two formed
         * different targets — driven against the fakes, `agent:a1#82b404fa…`
         * against `agent:a1#f2e6d896…` — and the token the describe minted
         * could not be consumed by the apply. `enforce()` refused before a
         * request was built, so the assertion below could never hold. The guard
         * was right and the pair was wrong: an agreement bound to its values is
         * what stops one about $25 authorising $25,000. It predates the
         * narrowing of the target from the bare agent id to a digest of the
         * intent, and nothing had run the probe since.
         *
         * `editArguments` performs the split, because `tradingConfig` cannot
         * travel inside `changes` — the platform replaces it wholesale, so a
         * partial send resets what it omits. Using the product's own split
         * rather than composing the two halves here is the point: this walks
         * the shape `/agents/[id]/edit` and `/pending/[id]` compose, and a
         * second hand-rolled composition is exactly how the describe and the
         * apply drifted apart. `edit-binding.test.ts` drives this same pair
         * against the fakes, so the repair is provable without a live run.
         */
        const limitIntent = { tradingConfig: { maxDailyTrades: 7 } };

        const proposedEdit = await new DescribeEditQuery(
          agents,
          confirmations,
          new SequentialRandom(),
          clock,
        ).execute({ ...who, agentId: agent.id, changes: limitIntent });
        if (proposedEdit.kind !== 'proposal') throw new Error('no proposal for the config edit');
        // eslint-disable-next-line no-console
        console.log(`  propose: ${proposedEdit.proposal.consequence}`);

        const limitArguments = editArguments(limitIntent);
        const limits = await new UpdateAgentCommand(agents).execute({
          ...who,
          agentId: agent.id,
          changes: limitArguments.changes,
          ...(limitArguments.tradingConfigChanges
            ? { tradingConfigChanges: limitArguments.tradingConfigChanges }
            : {}),
          confirmationToken: proposedEdit.proposal.confirmationToken,
        });
        // eslint-disable-next-line no-console
        console.log(`  limits:  ${limits.kind}`);
        if (limits.kind === 'invalid') {
          // eslint-disable-next-line no-console
          console.log('  issues:', limits.issues.map((i) => `${i.field}: ${i.reason}`).join(' | '));
        }
        expect(limits.kind, 'the 23-key write was rejected before this change').toBe('updated');

        const afterLimits = await agents.getAgent({ ...who, agentId: agent.id });
        const changed = afterLimits.tradingConfig?.fields;
        // eslint-disable-next-line no-console
        console.log(
          `  limited: maxDailyTrades=${String(changed?.['maxDailyTrades'])} ` +
            `mode=${String(changed?.['tradingMode'])} ` +
            `dailyLoss=${String(changed?.['maxDailyLossUsd'])}`,
        );

        expect(changed?.['maxDailyTrades']).toBe(7);
        // All-or-nothing: an edit must not reset what it did not touch.
        expect(changed?.['tradingMode'], 'the edit must not have re-enabled trading').toBe('OFF');
        expect(changed?.['maxDailyLossUsd']).toBe(10);
        expect(changed?.['maxConcurrentExposureUsd']).toBe(10);
      } finally {
        /**
         * Archived, which is both the cleanup and the handover.
         *
         * It gives the slot back whether or not anything above held, and it
         * leaves the agent in the state `acquireProbeAgent` expects to find next
         * run — archived and still OFF. `releaseProbeAgent` re-reads the
         * revision rather than trusting the one captured before the rename: that
         * assumption once made the platform refuse with a revision conflict and
         * left a live agent on the operator's account, which is precisely what a
         * `finally` exists to prevent.
         */
        const released = await releaseProbeAgent({
          agents,
          confirmations,
          clock,
          who,
          agentId: agent.id,
          confirmationToken: 'probe-archive-agent',
        });
        // eslint-disable-next-line no-console
        console.log(
          `  archive: ${released.kind === 'archived' ? released.agent.status : released.reason}`,
        );
        // eslint-disable-next-line no-console
        console.log(`  audit: ${audit.entries.map((e) => `${e.tool}=${e.outcome}`).join(' ')}`);
        expect(released.kind).toBe('archived');
      }
    },
  );
});

/**
 * Reading an agent's reasoning, against the real platform.
 *
 * A read, so it touches nothing. It is here rather than in the default suite
 * for the same reason as everything else in this file: the fakes agree with the
 * mappers and both have been wrong about BattleGrid before.
 *
 * The account carried 340 thought-log entries while the product could not show
 * one. This is the assertion that it can.
 */
live('an agent can be read thinking', () => {
  const who = { userId: 'owner', accessToken: KEY as string };

  it('reads real decisions, including the ones the agent declined', { timeout: 120_000 }, async (ctx) => {
    const { battlegrid } = wire();
    const agents = new McpAgentAdapter(battlegrid);
    const read = new ReadThoughtLogQuery(agents);

    const roster = await agents.listAgents(who);
    expect(roster.kind).toBe('agents');
    if (roster.kind !== 'agents') return;
    const target = roster.agents.find((a) => a.status === 'ACTIVE') ?? roster.agents[0];
    if (!target) return;

    const log = await read.execute({ ...who, agentId: target.id, limit: 20 });
    // eslint-disable-next-line no-console
    console.log(`  thinking: ${log.kind}${log.kind === 'decisions' ? ` ${log.decisions.length} of ${log.total}` : ''}`);
    if (log.kind === 'none') {
      // Written when the operator's account had hundreds of entries; the key
      // in use on 2026-07-31 reaches an account whose agents have decided
      // nothing yet. Nothing to read is not a failed read.
      ctx.skip();
      return;
    }
    expect(log.kind, 'a non-empty log must arrive as decisions').toBe('decisions');
    if (log.kind !== 'decisions') return;

    for (const d of log.decisions.slice(0, 3)) {
      const bar =
        d.bar.kind === 'no-bar' ? 'no bar' : `${d.bar.kind} by ${d.bar.by}`;
      // eslint-disable-next-line no-console
      console.log(
        `    ${d.entry.snapshot?.coinTicker ?? '—'} ${d.outcome} · ${bar} · ${d.entry.reasoning.length} chars`,
      );
    }

    /**
     * Prose on every entry the agent got to write one for.
     *
     * This asserted *every* entry carried reasoning and failed against real
     * data: `ERROR` entries have none, because the agent failed before writing
     * anything. Two of fifty. The assumption was mine, and the platform
     * corrected it.
     */
    const wrote = log.decisions.filter((d) => d.entry.reasoning.trim().length > 0);
    const silent = log.decisions.filter((d) => d.entry.reasoning.trim().length === 0);
    expect(wrote.length, 'the reasoning is the point').toBeGreaterThan(0);
    for (const d of silent) {
      expect(d.entry.outcome, 'only a failed cycle writes nothing').toBe('ERROR');
    }
    expect(log.total, 'the server reports more than one page holds').toBeGreaterThan(
      log.decisions.length,
    );

    // Confidence and threshold arrive as floats, not the *Percent ints.
    const measured = log.decisions.filter((d) => d.bar.kind !== 'no-bar');
    expect(measured.length, 'decisions are measured against a threshold').toBeGreaterThan(0);
    for (const d of measured) {
      expect(d.entry.confidence).toBeLessThanOrEqual(1);
      expect(d.entry.threshold).toBeLessThanOrEqual(1);
    }

    // The whole point: an outcome we have never seen must still arrive named.
    for (const d of log.decisions) expect(d.outcome.length).toBeGreaterThan(0);
  });
});

/**
 * What would stop an agent, against the real platform.
 *
 * A read. The assertion that matters is negative: a gauge the platform reports
 * as unconfigured must not arrive carrying a `remaining` number. BattleGrid
 * sends `0` there, and on the account this was built against the two
 * unconfigured gauges were drawdown and daily loss — the two that govern how
 * much can be lost. "0 remaining" would read as about to halt and mean nothing
 * will ever halt it.
 */
live('how close an agent is to its ceilings', () => {
  const who = { userId: 'owner', accessToken: KEY as string };

  it('reads real limits, and never invents headroom', { timeout: 120_000 }, async () => {
    const { battlegrid } = wire();
    const agents = new McpAgentAdapter(battlegrid);

    const roster = await agents.listAgents(who);
    expect(roster.kind).toBe('agents');
    if (roster.kind !== 'agents') return;
    const target = roster.agents.find((a) => a.status === 'ACTIVE') ?? roster.agents[0];
    if (!target) return;

    const res = await new ReadBudgetQuery(agents).execute({ ...who, agentId: target.id });
    // eslint-disable-next-line no-console
    console.log(`  limits: ${res.kind}`);
    expect(res.kind).toBe('budget');
    if (res.kind !== 'budget') return;

    for (const l of res.limits) {
      // eslint-disable-next-line no-console
      console.log(
        `    ${l.label.padEnd(18)} ${l.binds ? `${l.gauge.used} of ${l.gauge.ceiling}, ${l.gauge.remaining} left` : `${l.gauge.used} used · no limit set`}`,
      );
    }
    if (res.unbounded.length) {
      // eslint-disable-next-line no-console
      console.log(`    unbounded: ${res.unbounded.join(', ')}`);
    }

    expect(res.limits.length, 'the platform reports four gauges').toBeGreaterThan(0);

    for (const l of res.limits) {
      if (l.binds) {
        expect(l.gauge.ceiling, `${l.name} binds, so it has a ceiling`).not.toBeNull();
        expect(l.gauge.remaining, `${l.name} binds, so it has headroom`).not.toBeNull();
        // used + remaining = ceiling, which is how we know `fill` is an amount.
        expect((l.gauge.used ?? 0) + (l.gauge.remaining ?? 0)).toBeCloseTo(l.gauge.ceiling ?? 0, 5);
      } else {
        // The defect, asserted against the live server rather than a fixture.
        expect(l.gauge.remaining, `${l.name} has no ceiling and must report no headroom`).toBeNull();
        expect(l.gauge.ceiling).toBeNull();
      }
    }

    // Binding limits first.
    const order = res.limits.map((l) => l.binds);
    expect([...order].sort((a, b) => Number(b) - Number(a))).toEqual(order);
  });
});
