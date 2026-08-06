import type { CreationAvailability } from '@/application/use-cases/list-agents.query.js';
import type { DeploymentSummaryResult } from '@/application/use-cases/read-deployments.query.js';
import type { RosterResult } from '@/ports/agents.js';
import { AgentActions } from './agent-actions.js';
import { WhyNotLoaded } from './why-not-loaded.js';

/**
 * The roster, in its three states.
 *
 * The three are rendered separately and deliberately. An account with no agents
 * and an account whose roster failed to load look identical if you branch on
 * `length === 0`, and telling the second user they have no agents is how someone
 * recreates work they already own — or concludes something deleted it.
 */
export function AgentRoster({
  roster,
  creation,
  deployments,
}: {
  roster: RosterResult;
  creation: CreationAvailability;
  deployments: DeploymentSummaryResult;
}) {
  if (roster.kind === 'unreadable') {
    return (
      <div role="alert" className="rounded border p-4 text-sm">
        <p className="font-medium">Your roster could not be loaded.</p>
        <p className="mt-1">{roster.reason}</p>
        <WhyNotLoaded cause={roster.cause} subject="your agents are" />
        {/*
          States its own condition rather than pointing at the sentence above.
          It used to read "until it can", whose antecedent was "could not reach
          BattleGrid" — and the moment that clause started varying, the pronoun
          referred to nothing. Caught by reading the rendered page, not the diff.
        */}
        <p className="mt-2">
          Nothing can be created or changed until Grid-Commander can read your
          account again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CreateAffordance creation={creation} />

      {roster.kind === 'empty' ? (
        <p className="text-sm">
          This BattleGrid account has no agents yet. Creating one starts by
          choosing the strategy it will read and reason with.
        </p>
      ) : (
        <>
          {/* One notice for the list, and then no row claims either way — a
              radar hiccup must not relabel a scanning agent as idle. */}
          {deployments.kind === 'unreadable' && (
            <div role="status" className="text-sm">
              <p>Whether these agents are deployed could not be read: {deployments.reason}</p>
              {/* The rows below claim nothing either way, so the only thing a
                  reader can take from that silence is that the radar was
                  turned off. It was not. */}
              <WhyNotLoaded cause={deployments.cause} subject="their deployments are" />
            </div>
          )}
        <ul className="space-y-3">
          {roster.agents.map((agent) => (
            <li key={agent.id} className="rounded border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                {/**
                 * The name is the link to the agent, and it was not one.
                 *
                 * The row offered six sub-pages and never `/agents/[id]` — the
                 * page holding the binding, the brain, the money summary and the
                 * rename form. The only live route to it was the cancel on
                 * `archive`, so opening your own agent meant starting to retire
                 * it. Here rather than in `AgentActions` because a person looks
                 * for the thing itself under its name, not in a list of verbs.
                 */}
                <h3 className="font-medium">
                  <a href={`/agents/${agent.id}`} className="underline">
                    {agent.displayName}
                  </a>
                </h3>
                <span className="text-xs uppercase">{agent.status}</span>
              </div>
              <p className="mt-1 text-sm">
                Bound to <span className="font-medium">{agent.binding.strategyName}</span>{' '}
                at revision {agent.binding.strategyRevision}
              </p>
              {/* Acting, or configured-and-waiting — the fact the ACTIVE badge
                  hides. Same words as the detail page, so the two surfaces
                  cannot disagree about what an agent is doing. */}
              {deployments.kind === 'summary' && (
                <p className="mt-1 text-sm">
                  {(deployments.byAgent[agent.id] ?? []).length > 0
                    ? (deployments.byAgent[agent.id] ?? [])
                        .map((d) =>
                          d.standing === 'holding-position'
                            ? `Holding the position on ${d.coinTicker} (${d.timeframe})`
                            : d.standing === 'on-duty'
                              ? `Scanning ${d.coinTicker} (${d.timeframe})`
                              : `In the rotation for ${d.coinTicker} (${d.timeframe})`,
                        )
                        .join(' · ')
                    : 'Not deployed — scanning no market'}
                </p>
              )}
              <AgentActions agent={agent} />
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  );
}

function CreateAffordance({ creation }: { creation: CreationAvailability }) {
  if (creation.kind === 'unknown') return null;

  if (creation.kind === 'at-capacity') {
    // Before the form, not after submission.
    return (
      <p role="status" className="rounded border p-3 text-sm">
        {creation.explanation}
      </p>
    );
  }

  return (
    <p className="text-sm">
      <a href="/agents/new" className="underline">
        Create an agent
      </a>{' '}
      — {creation.remaining} slot{creation.remaining === 1 ? '' : 's'} remaining.
    </p>
  );
}
