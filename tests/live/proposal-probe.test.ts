import { describe, expect, it } from 'vitest';
import { DescribeEditQuery } from '@/application/use-cases/describe-edit.query.js';
import { OpenProposalQuery } from '@/application/use-cases/open-proposal.query.js';
import { RecordProposalCommand } from '@/application/use-cases/record-proposal.command.js';
import { ResolveProposalCommand } from '@/application/use-cases/resolve-proposal.command.js';
import { UpdateAgentCommand } from '@/application/use-cases/update-agent.command.js';
import { DeclaredScopes } from '@/domain/connection/held-scopes.js';
import { McpAgentAdapter } from '@/infrastructure/battlegrid/agent-adapter.js';
import { McpBattleGridAdapter } from '@/infrastructure/battlegrid/mcp-adapter.js';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { editArguments } from '@/presentation/form.js';
import { SequentialRandom } from '../support/agent-fakes.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { acquireProbeAgent, releaseProbeAgent } from '../support/probe-agent.js';
import { FakeProposalStore } from '../support/proposal-fakes.js';

/**
 * The whole loop, against the real platform: a model proposes, a person agrees,
 * BattleGrid changes.
 *
 * Not in the default suite. Gated on a key **and** on `BATTLEGRID_LIVE_WRITES`,
 * because the last test creates an agent and edits it:
 *
 *     BATTLEGRID_API_KEY=… BATTLEGRID_LIVE_WRITES=1 \
 *       npx vitest run tests/live/proposal-probe.test.ts
 *
 * **Why it exists.** Every part of this change is a claim about a sequence, and
 * a sequence is the one thing fakes model rather than observe. The confirmation
 * is minted at open time and spent at agree time, against a config read in
 * between; the digest has to survive the split into `changes` and
 * `tradingConfigChanges`; the merge has to send twenty fields where the model
 * named one. Four things that are only jointly true, and this is the only place
 * they are all real at once.
 *
 * **What it touches.** Only its own throwaway. The read-only tests describe a
 * real agent and never write; the write test operates on the agent this file's
 * slot owns — deployed to nothing, capped at the platform's $10 minimums, and
 * archived in a `finally`.
 *
 * That throwaway is now **reused across runs rather than created per run**. This
 * file created one every time it ran, and `write-probe` did the same, and by
 * 2026-08-06 the operator's second account carried eight archived probe agents
 * on a roster of eleven — with no delete tool on the MCP surface to remove any
 * of them. `acquireProbeAgent` finds this slot's agent and reactivates it,
 * creating only when there is none, and refuses on two independent grounds to
 * select anything the operator actually runs.
 *
 * The operator's own agents are read and never written. Walking the loop on one
 * of them would mean editing a live trading agent to prove a test passes, and
 * a probe that needs to do that has chosen the wrong subject.
 */

const KEY = process.env['BATTLEGRID_API_KEY'];
const WRITES = process.env['BATTLEGRID_LIVE_WRITES'] === '1';
const live = KEY ? describe : describe.skip;
const liveWrite = KEY && WRITES ? describe : describe.skip;

const config = {
  clientId: '',
  mcpUrl: 'https://mcp.battlegrid.trade/mcp',
  authorizeUrl: 'https://mcp.battlegrid.trade/authorize',
  tokenUrl: 'https://mcp.battlegrid.trade/token',
  revokeUrl: 'https://mcp.battlegrid.trade/revoke',
  redirectUri: '',
};

const MINIMUMS = {
  minAllocationUsd: 10,
  balanceThresholdUsd: 10,
  maxConcurrentExposureUsd: 10,
  maxCumulativeDrawdownUsd: 10,
  maxDailyLossUsd: 10,
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
  const agents = new McpAgentAdapter(battlegrid);
  const proposals = new FakeProposalStore();
  return {
    audit,
    clock,
    confirmations,
    proposals,
    agents,
    strategies: new McpStrategyAdapter(battlegrid),
    /**
     * The store is faked and everything else is real. That is the right split:
     * the store is exercised against a real PostgreSQL in `tests/db/`, where
     * ownership and immutability are enforced by the database. What no test can
     * fake is BattleGrid, and this file is about BattleGrid.
     */
    record: new RecordProposalCommand(proposals, new SequentialRandom(), clock),
    open: new OpenProposalQuery(
      proposals,
      agents,
      new DescribeEditQuery(agents, confirmations, new SequentialRandom(), clock),
      clock,
    ),
    resolve: new ResolveProposalCommand(proposals),
    update: new UpdateAgentCommand(agents),
  };
}

type App = ReturnType<typeof wire>;

/**
 * An agent on the account that a proposal could actually be opened against.
 *
 * `agents[0]` is not it. The roster carries archived agents too, and the first
 * one on this account is a probe agent a previous session archived — so every
 * open here returned `not-possible: … is archived`, which is the product being
 * right about a subject the test had chosen badly.
 */
async function anEditableAgent(app: App, who: { userId: string; accessToken: string }) {
  const roster = await app.agents.listAgents(who);
  if (roster.kind !== 'agents') throw new Error(`no agents to read: ${roster.kind}`);
  const editable = roster.agents.find((a) => a.status === 'ACTIVE');
  if (!editable) throw new Error('no ACTIVE agent on this account to describe against');
  return editable;
}

live('a recorded proposal does nothing to the account', () => {
  const who = { userId: 'owner', accessToken: KEY as string };

  it('leaves the target exactly as it was', { timeout: 120_000 }, async () => {
    const app = wire();
    const agent = await anEditableAgent(app, who);
    const before = await app.agents.getAgent({ ...who, agentId: agent.id });

    // Everything an MCP tool can do. `RecordProposalCommand` is constructed
    // with a store, a clock and a source of ids — no BattleGrid port at all —
    // so this call has no way to reach the platform.
    const recorded = await app.record.execute({
      userId: who.userId,
      operation: 'edit',
      target: agent.id,
      values: { changes: { tradingConfig: { tradingMode: 'OFF' } } },
    });
    expect(recorded.kind).toBe('recorded');

    const after = await app.agents.getAgent({ ...who, agentId: agent.id });
    // eslint-disable-next-line no-console
    console.log(
      `  inert:   ${after.displayName} mode=${String(after.tradingConfig?.fields['tradingMode'])} ` +
        `r${after.revision} — unchanged`,
    );
    expect(after.revision, 'recording must not bump the revision').toBe(before.revision);
    expect(after.tradingConfig?.fields['tradingMode']).toBe(
      before.tradingConfig?.fields['tradingMode'],
    );
    expect(after.displayName).toBe(before.displayName);
  });
});

live('opening a proposal describes it against the account as it is now', () => {
  const who = { userId: 'owner', accessToken: KEY as string };

  it('names the member that would move, against the live value', { timeout: 120_000 }, async () => {
    const app = wire();
    const agent = await anEditableAgent(app, who);
    const held = String(agent.tradingConfig?.fields['tradingMode']);
    const other = held === 'OFF' ? 'APPROVAL_REQUIRED' : 'OFF';

    const recorded = await app.record.execute({
      userId: who.userId,
      operation: 'edit',
      target: agent.id,
      values: { changes: { tradingConfig: { tradingMode: other } } },
    });
    if (recorded.kind !== 'recorded') throw new Error('unreachable');

    const opened = await app.open.execute({ ...who, id: recorded.proposalId });
    // eslint-disable-next-line no-console
    console.log(`  kind:    ${opened.kind}${'reason' in opened ? ' — ' + opened.reason : ''}`);
    expect(opened.kind).toBe('ready');
    if (opened.kind !== 'ready') throw new Error('unreachable');
    // eslint-disable-next-line no-console
    console.log(`  open:    ${opened.consequence}`);
    // eslint-disable-next-line no-console
    console.log(`  differs: ${opened.dispositions.map((d) => `${d.key}=${d.kind}`).join(' ')}`);

    // Against the value BattleGrid holds this second, and named by member —
    // not by the object it lives in, which could only ever read "will change".
    expect(opened.dispositions).toEqual([
      {
        key: 'tradingConfig.tradingMode',
        kind: 'will-change',
        proposed: other,
        current: held,
      },
    ]);
    // A confirmation exists and is deliberately not spent. Nothing is written
    // here: this test proves the whole path up to the button.
    expect(opened.confirmationToken).toBeTruthy();
  });

  it('offers nothing to agree to when the account already holds it', { timeout: 120_000 }, async () => {
    const app = wire();
    const agent = await anEditableAgent(app, who);
    const held = String(agent.tradingConfig?.fields['tradingMode']);

    const recorded = await app.record.execute({
      userId: who.userId,
      operation: 'edit',
      target: agent.id,
      values: { changes: { tradingConfig: { tradingMode: held } } },
    });
    if (recorded.kind !== 'recorded') throw new Error('unreachable');

    const opened = await app.open.execute({ ...who, id: recorded.proposalId });
    // eslint-disable-next-line no-console
    console.log(`  already: ${opened.kind} — proposed ${held}, held ${held}`);
    // `describeEdit` returns a sentence for any `tradingConfig` present, so this
    // is exactly the case that arrived as a ready proposal with a token.
    expect(opened.kind, 'a proposal that changes nothing offers no confirmation').toBe('no-op');
    if (opened.kind !== 'no-op') throw new Error('unreachable');
    expect(opened.dispositions).toEqual([
      { key: 'tradingConfig.tradingMode', kind: 'already-true', proposed: held },
    ]);
  });

  it('says so when the target is gone', { timeout: 120_000 }, async () => {
    const app = wire();
    const recorded = await app.record.execute({
      userId: who.userId,
      operation: 'edit',
      target: '00000000-0000-4000-8000-000000000000',
      values: { changes: { displayName: 'Whatever' } },
    });
    if (recorded.kind !== 'recorded') throw new Error('unreachable');

    const opened = await app.open.execute({ ...who, id: recorded.proposalId });
    // eslint-disable-next-line no-console
    console.log(`  missing: ${opened.kind}`);
    expect(opened.kind, 'and offers no confirmation for a change that cannot happen').toBe(
      'not-possible',
    );
  });
});

liveWrite('a person agrees, and BattleGrid changes', () => {
  const who = { userId: 'owner', accessToken: KEY as string };

  it(
    'walks propose → open → agree, and stops the agent',
    { timeout: 240_000 },
    async (ctx) => {
      const app = wire();

      // --- a throwaway agent, or nothing --------------------------------------
      const listing = await app.strategies.listStrategies(who);
      if (listing.kind !== 'strategies') throw new Error('cannot read strategies');
      const strategy = listing.strategies.find((s) => s.scope === 'SYSTEM');
      expect(strategy, 'need a SYSTEM strategy to bind to').toBeDefined();
      if (!strategy) return;

      const acquired = await acquireProbeAgent({
        agents: app.agents,
        who,
        slot: 'proposal',
        strategyId: strategy.id,
        // Created OFF, always. A throwaway that could trade is one the next run's
        // selection would refuse to recognise, and one this probe would have no
        // business archiving in a `finally`.
        money: { tradingMode: 'OFF', ...MINIMUMS },
      });

      if (acquired.kind === 'unavailable') {
        /**
         * A state of the account, not a defect here — and a skip that names it
         * rather than a pass that hides it.
         *
         * Observed 2026-08-05: `create_intelligence_agent` answered
         * `INTERNAL_ERROR: Internal server error` for both accounts, for every
         * SYSTEM strategy, and for the minimal payload with no `tradingConfig`
         * at all. The surface record matched the running server, so no schema
         * had moved; the tool was simply down. See the backlog item
         * `battlegrid-is-returning-internal-errors`. An unreadable roster and a
         * full slot allowance arrive the same way.
         *
         * The write is not walked against one of the operator's own agents
         * instead. Every one of them is in `FULL_EXECUTION`, and editing a live
         * trading agent to make a test pass is not a trade this probe gets to
         * make on their behalf — which is also the rule the selection enforces
         * rather than merely states.
         */
        // eslint-disable-next-line no-console
        console.log(`  SKIPPED: no throwaway agent — ${acquired.reason}`);
        ctx.skip();
        return;
      }

      const agent = acquired.agent;
      // eslint-disable-next-line no-console
      console.log(`  agent:   ${acquired.kind} ${agent.displayName} ${agent.id} r${agent.revision}`);

      try {
        /**
         * Arm it — setup, not the thing under test.
         *
         * The loop below proves that a person agreeing *stops* an agent, so the
         * subject has to start able to run. A throwaway rests in OFF, because
         * that is the state selection insists on before it will reuse anything,
         * so this run puts it into `APPROVAL_REQUIRED` first — a mode that still
         * cannot place a trade without a person approving it, on an agent
         * deployed to nothing.
         *
         * Through the product's own propose-then-apply path rather than around
         * it: the confirmation is bound to the values described, so an arming
         * step that composed its own token would be exercising a door the
         * product does not have.
         */
        const arming = { tradingConfig: { tradingMode: 'APPROVAL_REQUIRED' } };
        const armProposal = await new DescribeEditQuery(
          app.agents,
          app.confirmations,
          new SequentialRandom(),
          app.clock,
        ).execute({ ...who, agentId: agent.id, changes: arming });
        if (armProposal.kind !== 'proposal') {
          throw new Error(`could not arm the throwaway: ${armProposal.kind}`);
        }
        const armArguments = editArguments(arming);
        const armed = await app.update.execute({
          ...who,
          agentId: agent.id,
          changes: armArguments.changes,
          ...(armArguments.tradingConfigChanges
            ? { tradingConfigChanges: armArguments.tradingConfigChanges }
            : {}),
          confirmationToken: armProposal.proposal.confirmationToken,
        });
        // eslint-disable-next-line no-console
        console.log(`  armed:   ${armed.kind}`);
        expect(armed.kind, 'the subject has to be able to run before it is stopped').toBe(
          'updated',
        );
        if (armed.kind !== 'updated') throw new Error('unreachable');

        const recorded = await app.record.execute({
          userId: who.userId,
          operation: 'edit',
          target: agent.id,
          values: { changes: { tradingConfig: { tradingMode: 'OFF' } } },
        });
        if (recorded.kind !== 'recorded') throw new Error('unreachable');
        // eslint-disable-next-line no-console
        console.log(`  propose: ${recorded.proposalId} → ${recorded.reviewAt}`);

        // Recorded and unopened: the agent must be exactly as it was. Compared
        // against the revision the *arming* left, not the one acquisition
        // returned — a teardown or an assertion that assumes nothing moved has
        // no business running after a step whose point was that something did.
        const untouched = await app.agents.getAgent({ ...who, agentId: agent.id });
        expect(untouched.tradingConfig?.fields['tradingMode']).toBe('APPROVAL_REQUIRED');
        expect(untouched.revision).toBe(armed.agent.revision);

        // Opening runs the describe now, against the agent read now. This is
        // where the confirmation comes from.
        const opened = await app.open.execute({ ...who, id: recorded.proposalId });
        expect(opened.kind).toBe('ready');
        if (opened.kind !== 'ready') throw new Error('unreachable');
        // eslint-disable-next-line no-console
        console.log(`  open:    ${opened.consequence}`);
        expect(opened.dispositions).toEqual([
          {
            key: 'tradingConfig.tradingMode',
            kind: 'will-change',
            proposed: 'OFF',
            current: 'APPROVAL_REQUIRED',
          },
        ]);

        // Composed exactly as the page composes it: the config leaves `changes`
        // and travels as the merged argument, or the platform takes the one
        // proposed field as the whole configuration and resets the rest.
        const proposedChanges = (opened.proposal.proposedValues['changes'] ?? {}) as Record<
          string,
          unknown
        >;
        const { changes, tradingConfigChanges } = editArguments(proposedChanges);

        const performed = await app.update.execute({
          ...who,
          agentId: agent.id,
          changes,
          ...(tradingConfigChanges ? { tradingConfigChanges } : {}),
          confirmationToken: opened.confirmationToken,
        });
        // eslint-disable-next-line no-console
        console.log(`  agree:   ${performed.kind}`);
        if (performed.kind !== 'updated') {
          // eslint-disable-next-line no-console
          console.log(
            '  why:',
            performed.kind === 'invalid'
              ? performed.issues.map((i) => `${i.field}: ${i.reason}`).join(' | ')
              : performed.kind === 'rejected'
                ? performed.rejected.map((r) => `${r.field}: ${r.reason}`).join(' | ')
                : performed.reason,
          );
        }
        expect(
          performed.kind,
          'a confirmation minted at open time must be spendable at agree time',
        ).toBe('updated');

        // Only now is the proposal closed. Closing first would record a person
        // agreeing to a change the account never saw.
        const closed = await app.resolve.execute({
          userId: who.userId,
          id: recorded.proposalId,
          status: 'agreed',
        });
        expect(closed.closed).toBe(true);

        const after = await app.agents.getAgent({ ...who, agentId: agent.id });
        const fields = after.tradingConfig?.fields ?? {};
        // eslint-disable-next-line no-console
        console.log(
          `  after:   mode=${String(fields['tradingMode'])} ` +
            `dailyLoss=${String(fields['maxDailyLossUsd'])} ` +
            `fields=${Object.keys(fields).length} r${after.revision}`,
        );

        expect(fields['tradingMode'], 'the agent is stopped').toBe('OFF');
        // The merge, observed rather than asserted about a fake: the model named
        // one field and the caps it did not name are still there.
        expect(fields['maxDailyLossUsd'], 'stopping it must not clear its caps').toBe(10);
        expect(fields['maxCumulativeDrawdownUsd']).toBe(10);
        expect(Object.keys(fields).length).toBeGreaterThan(19);

        const written = app.audit.entries.filter((e) => e.tool === 'update_intelligence_agent');
        // eslint-disable-next-line no-console
        console.log(`  audit:   ${written.map((e) => `${e.tool}=${e.outcome}`).join(' ')}`);
        expect(written.length, 'the write is recorded').toBe(1);
        expect(written[0]?.outcome).toBe('succeeded');

        // Replaying the agreement must fail. A token that survived its use
        // would make the agreement a standing authorization rather than a
        // single decision.
        const replayed = await app.update
          .execute({
            ...who,
            agentId: agent.id,
            changes,
            ...(tradingConfigChanges ? { tradingConfigChanges } : {}),
            confirmationToken: opened.confirmationToken,
          })
          .then(
            (r) => `returned ${r.kind}`,
            (e: unknown) => `threw ${e instanceof Error ? e.constructor.name : 'unknown'}`,
          );
        // eslint-disable-next-line no-console
        console.log(`  replay:  ${replayed}`);
        expect(replayed, 'an agreement is spent once').not.toBe('returned updated');
      } finally {
        /**
         * The probe's agent occupies a slot on a real account. It gives it back
         * whether or not any of the above held — and archiving is also what
         * hands it to the next run, which finds it exactly here.
         *
         * The loop above ends with the agent in OFF, so what is left behind
         * satisfies both halves of the selection. A run that fails partway
         * through the arming leaves it in `APPROVAL_REQUIRED`, the next run's
         * selection refuses it, and a fresh throwaway is created — one more
         * agent on the account, which is the old behaviour rather than a new
         * hazard, and only after a failure rather than on every run.
         */
        const released = await releaseProbeAgent({
          agents: app.agents,
          confirmations: app.confirmations,
          clock: app.clock,
          who,
          agentId: agent.id,
          confirmationToken: 'probe-archive',
        });
        // eslint-disable-next-line no-console
        console.log(
          `  cleanup: ${released.kind === 'archived' ? 'archived' : `not archived: ${released.reason}`}`,
        );
      }
    },
  );
});
