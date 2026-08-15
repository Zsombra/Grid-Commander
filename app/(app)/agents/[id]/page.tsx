import { acting } from '@/presentation/session.js';
import { AgentActions } from '@/presentation/components/agent-actions.js';
import { BindingInheritance, BindingSummary } from '@/presentation/components/binding.js';
import { MoneySummary } from '@/presentation/components/money-summary.js';
import { FeasibilityPanel } from '@/presentation/components/feasibility.js';
import { RadarPauseNote } from '@/presentation/components/radar-pause.js';
import { AgentRecord } from '@/presentation/components/record.js';
import { Stoppages } from '@/presentation/components/stoppages.js';
import { Exposure } from '@/presentation/components/exposure.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { NotConnected } from '@/presentation/require-connection.js';

/**
 * One agent: what it is, what it inherits, and what may be done to it.
 *
 * The inherited configuration is shown as inherited and is not editable here —
 * the platform does not permit it, and presenting a field the platform will
 * refuse is worse than not offering it.
 */
/**
 * The agent itself.
 *
 * It read a `?problem=` once, when the rename form lived here and its refusals
 * redirected back with one. The form moved to `/agents/[id]/edit` and took the
 * redirect with it (`6959707`), and nothing has minted `/agents/[id]?problem=`
 * since — so the branch rendered a parameter no route produces. It was also the
 * one place in the product that dressed a refusal in the *consequence* role
 * rather than danger, which is how a treatment drifts unnoticed: nobody had
 * seen it since the move. Removed rather than restyled, because deciding how an
 * unreachable branch should look is deciding how nothing should look.
 */
export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { roster } = await app.listAgents.execute(user.authority);

  if (roster.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Could not load this agent</h1>
        <p role="alert" className="text-sm">{roster.reason}</p>
        {/* The roster is the read that would have said the agent is there, so
            nothing here can claim it is — only that failing to read it is not
            evidence it went away. */}
        <WhyNotLoaded cause={roster.cause} subject="this agent is" />
      </main>
    );
  }

  const agent = roster.kind === 'agents' ? roster.agents.find((a) => a.id === id) : undefined;
  if (!agent) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such agent</h1>
        <p className="text-sm">
          <a href="/agents" className="underline">Back to your agents</a>
        </p>
      </main>
    );
  }

  const [radar, stoppages, exposure] = await Promise.all([
    /**
     * The agent goes to the radar read, not just its id: the radar reports a
     * slot the same way whether the agent in it is active or archived, so
     * standing cannot be computed without the lifecycle. The rest of the
     * roster goes too — it is what answers whether anyone *else* in those
     * slots is still active, which is what makes "deployed and unscanned"
     * sayable about a market.
     */
    app.readDeployments.execute({
      ...user.authority,
      agent,
      roster: roster.kind === 'agents' ? roster.agents : [],
    }),
    app.readStoppages.execute({ ...user.authority, agentId: agent.id }),
    app.readExposure.execute({ ...user.authority, agentId: agent.id }),
  ]);

  /**
   * What BattleGrid said about this agent's tradeable coins on the way here.
   *
   * Not a read — no tool answers this. `update_intelligence_agent` returns a
   * feasibility advisory beside the agent, and an edit is the only thing that
   * produces one, so what this collects is the reply the apply action set down
   * a redirect ago. Absent, tampered, about another agent, or older than its
   * window all arrive here as `null` (#291).
   */
  const feasibility = app.readFeasibilityReply.execute({ agentId: agent.id });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-medium">{agent.displayName}</h1>
        <p className="text-sm">{agent.status}</p>
      </div>

      {/**
       * How it has done, from the block the roster payload already carried and
       * this product discarded on every load. Null means the record was absent,
       * which the component never sees — an agent that has played nothing
       * reports a record full of zeroes and says so in its own words.
       */}
      {agent.performance && <AgentRecord performance={agent.performance} />}

      {/**
       * What it can build a trade on, when an edit just told us.
       *
       * High on the page and directly under the record, because it is the
       * answer to the question the operator was holding when they pressed
       * apply — and because it expires: two minutes from the write, it stops
       * rendering, so burying it would mean burying it past its own life.
       *
       * Nothing renders on any ordinary visit. That is the design, not a gap:
       * the platform answers this on a write and never on a read, and a page
       * that showed a remembered answer would be stating something about live
       * volatility from an unknown moment.
       */}
      {feasibility && <FeasibilityPanel reply={feasibility} />}

      {/**
       * Money at stake right now, above everything retrospective. Every other
       * surface here looks backwards; an agent can be holding a leveraged
       * position with a moved stop and nothing said so.
       */}
      <Exposure exposure={exposure.exposure} fills={exposure.fills} agentId={agent.id} />

      {/**
       * What keeps stopping it, before anything about how it is configured.
       *
       * An agent blocked ninety-eight times by one reason over a week is not a
       * configuration question — it is the answer to every other question on
       * this page, and it belonged above them. The three states are rendered
       * distinctly for the usual reason: a history that could not be read must
       * never dress up as an agent nothing has stopped.
       */}
      {stoppages.kind === 'summary' ? (
        <Stoppages summary={stoppages.summary} />
      ) : stoppages.kind === 'none' ? (
        <p className="text-sm">Nothing has stopped this agent.</p>
      ) : (
        <p role="status" className="text-sm">
          What has been stopping this agent could not be read: {stoppages.reason}
        </p>
      )}

      {/**
       * The binding, as BattleGrid states it.
       *
       * The heading read "Inherited from its strategy" over a paragraph saying
       * this agent's context, rules, prose and timeframe "come from there" —
       * asserted for every binding, including one the platform reports as
       * ORPHANED, whose strategy cannot be read at all. The inheritance
       * sentence now belongs to the bound case, which is the only case it is
       * true of.
       */}
      <section className="space-y-1">
        <h2 className="font-medium">Its strategy binding</h2>
        <p className="text-sm">
          <BindingSummary binding={agent.binding} />
        </p>
        <p className="text-sm">
          <BindingInheritance binding={agent.binding} />
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="font-medium">Owned by the agent</h2>
        <p className="text-sm">
          {/*
            The platform's human name for the brain, when it reports one —
            observed "GLM-5.2" on an agent this line used to describe as the
            bare word CUSTOM. The read-back flattens the request's two-branch
            brain union into one field, so that word cannot say whether the
            brain is a preset or a named model, and this line claims neither:
            it states the name the platform reports, and falls back to exactly
            what it said before when the platform reports none — never an
            invented name. See
            `preset-custom-in-the-preset-branch-is-unestablished`.
          */}
          Brain:{' '}
          {agent.modelDisplayName ??
            (agent.brain.kind === 'preset'
              ? agent.brain.preset
              : agent.brain.kind === 'custom'
              ? agent.brain.modelId
              : 'Not configured')}
        </p>
        <p className="text-sm">
          {/*
            "configured" used to mean `tradingConfig != null` — that an object
            came back, not that limits were set. The live agent carries a full
            twenty-field config in which two of three caps are zero, which
            BattleGrid reads as no cap, and this line called it configured.
          */}
          Money limits: <MoneySummary agent={agent} />
        </p>
      </section>

      {/**
       * Whether this agent is doing anything, from the radar — the fact its
       * lifecycle status hides. ACTIVE means configured; only a radar
       * deployment means scanning. The operator's account proved it: two
       * ACTIVE agents, zero positions, absent from every slot, and nothing on
       * this page said so. Three states, rendered distinctly — an unreadable
       * radar must never dress up as "not deployed".
       *
       * The lifecycle join arrived after the second account proved the
       * converse: `SP500@15m` holding only `Volatilis[ARCHIVED]` rendered here
       * as "On duty: scanning SP500 on the 15m radar." The standing now comes
       * from the pair, so this branch renders what it is given rather than
       * re-deriving anything from the radar.
       */}
      <section className="space-y-1">
        <h2 className="font-medium">Deployment</h2>
        {radar.kind === 'deployed' ? (
          <>
            {/**
             * Whether anything is scanning at all, above the rows rather than
             * inside them.
             *
             * The platform reports the pause once for the fleet and carries no
             * per-deployment pause field, so a row cannot know it — and every
             * row below says "on duty: scanning" regardless. Rewriting each
             * row's standing from this flag would make the row say something
             * BattleGrid did not say about it, which is what `A Resolution
             * State The Product Does Not Recognise Is Named, Never
             * Interpreted` forbids. So the fact sits here and qualifies them.
             */}
            <RadarPauseNote pause={radar.pause} />
            <ul className="space-y-1 text-sm">
              {radar.deployments.map((d) => (
                <li key={`${d.coinTicker}-${d.timeframe}`}>
                  {d.standing === 'holding-position'
                    ? `Holding the position on ${d.coinTicker} (${d.timeframe} radar).`
                    : d.standing === 'on-duty'
                      ? `On duty: scanning ${d.coinTicker} on the ${d.timeframe} radar.`
                      : d.standing === 'slot-held-not-scanning'
                        ? `Holds the ${d.coinTicker} slot (${d.timeframe} radar) and is not scanning it: this agent is not active.`
                        : `In the rotation for ${d.coinTicker} (${d.timeframe} radar), not on duty right now.`}{' '}
                  {/* The market's own state, beside the agent's. The radar
                      reports the slot as occupied either way, so a policy
                      holding nobody active reads as covered unless it is
                      said. */}
                  {d.occupancy === 'no-active-agent' ? (
                    <>
                      No active agent holds this deployment, so {d.coinTicker} is deployed and
                      unscanned.{' '}
                    </>
                  ) : null}
                  <a
                    href={`/agents/${agent.id}/undeploy/${encodeURIComponent(d.coinTicker)}`}
                    className="underline"
                  >
                    Undeploy
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-sm">
              <a href={`/agents/${agent.id}/deploy`} className="underline">
                Deploy to another market
              </a>
            </p>
          </>
        ) : radar.kind === 'not-deployed' ? (
          <p className="text-sm">
            Not deployed on the radar. This agent is configured, but it is not
            scanning any market.{' '}
            <a href={`/agents/${agent.id}/deploy`} className="underline">
              Deploy it to a market
            </a>
            .
          </p>
        ) : (
          <p role="status" className="text-sm">
            Whether this agent is deployed could not be read: {radar.reason}
          </p>
        )}
      </section>

      {/**
       * The rename form was here, and it self-issued its own confirmation —
       * `describeEdit` then `updateAgent` in one request, with the consequence
       * computed, stored for the audit and read by nobody. Its doc comment said
       * "Nothing here issues a token to itself" directly above the code that
       * did.
       *
       * Renaming now happens on `/agents/[id]/edit`, alongside the money
       * limits, in two requests with a person between them. One rename surface
       * rather than two, and this page goes back to being about reading an
       * agent. `only-mcp-control`'s corridor guard benefits too: with no bound
       * form left, this stops being a mutation route.
       */}
      <AgentActions agent={agent} />
    </main>
  );
}
