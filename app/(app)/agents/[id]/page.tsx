import { acting } from '@/presentation/session.js';
import { AgentActions } from '@/presentation/components/agent-actions.js';
import { MoneySummary } from '@/presentation/components/money-summary.js';
import { AgentRecord } from '@/presentation/components/record.js';
import { NotConnected } from '@/presentation/require-connection.js';

/**
 * One agent: what it is, what it inherits, and what may be done to it.
 *
 * The inherited configuration is shown as inherited and is not editable here —
 * the platform does not permit it, and presenting a field the platform will
 * refuse is worse than not offering it.
 */
export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ problem?: string }>;
}) {
  const { problem } = await searchParams;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { roster } = await app.listAgents.execute(user.authority);

  if (roster.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Could not load this agent</h1>
        <p role="alert" className="text-sm">{roster.reason}</p>
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

  const radar = await app.readDeployments.execute({ ...user.authority, agentId: agent.id });

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

      <section className="space-y-1">
        <h2 className="font-medium">Inherited from its strategy</h2>
        <p className="text-sm">
          {agent.binding.strategyName} at revision {agent.binding.strategyRevision}. Its
          context sources, signal rules, prose and timeframe come from there and are
          changed by editing that strategy, or by rebinding — which replaces all of
          them.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="font-medium">Owned by the agent</h2>
        <p className="text-sm">
          Brain:{' '}
          {agent.brain.kind === 'preset'
            ? agent.brain.preset
            : agent.brain.kind === 'custom'
            ? agent.brain.modelId
            : 'Not configured'}
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
       */}
      <section className="space-y-1">
        <h2 className="font-medium">Deployment</h2>
        {radar.kind === 'deployed' ? (
          <>
            <ul className="space-y-1 text-sm">
              {radar.deployments.map((d) => (
                <li key={`${d.coinTicker}-${d.timeframe}`}>
                  {d.standing === 'holding-position'
                    ? `Holding the position on ${d.coinTicker} (${d.timeframe} radar).`
                    : d.standing === 'on-duty'
                      ? `On duty: scanning ${d.coinTicker} on the ${d.timeframe} radar.`
                      : `In the rotation for ${d.coinTicker} (${d.timeframe} radar), not on duty right now.`}{' '}
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

      {problem ? (
        <p role="alert" className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-3 text-sm text-text-primary">
          {problem}
        </p>
      ) : null}

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
