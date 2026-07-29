import type { CreationAvailability } from '@/application/use-cases/list-agents.query.js';
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
}: {
  roster: RosterResult;
  creation: CreationAvailability;
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
        <ul className="space-y-3">
          {roster.agents.map((agent) => (
            <li key={agent.id} className="rounded border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">{agent.displayName}</h3>
                <span className="text-xs uppercase">{agent.status}</span>
              </div>
              <p className="mt-1 text-sm">
                Bound to <span className="font-medium">{agent.binding.strategyName}</span>{' '}
                at revision {agent.binding.strategyRevision}
              </p>
              <AgentActions agent={agent} />
            </li>
          ))}
        </ul>
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
