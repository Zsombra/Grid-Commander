import type { CreationAvailability } from '@/application/use-cases/list-agents.query.js';
import type { DeploymentSummaryResult } from '@/application/use-cases/read-deployments.query.js';
import type { AgentDeployment } from '@/domain/agent/deployment.js';
import { isRecognisedSection } from '@/domain/agent/deployment.js';
import type { RosterResult } from '@/ports/agents.js';
import { AgentActions } from './agent-actions.js';
import { BindingSummary } from './binding.js';
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
      <div role="alert" className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary">
        <p className="font-semibold">Your roster could not be loaded.</p>
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
            <div role="status" className="rounded-gc-2 border border-notice-border bg-notice-subtle p-3 text-sm text-text-primary">
              <p>Whether these agents are deployed could not be read: {deployments.reason}</p>
              {/* The rows below claim nothing either way, so the only thing a
                  reader can take from that silence is that the radar was
                  turned off. It was not. */}
              <WhyNotLoaded cause={deployments.cause} subject="their deployments are" />
            </div>
          )}
        <ul className="space-y-3">
          {roster.agents.map((agent) => (
            <li key={agent.id} className="rounded-gc-2 border border-border-default p-4">
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
                <h3 className="break-words font-medium">
                  <a href={`/agents/${agent.id}`} className="underline">
                    {agent.displayName}
                  </a>
                </h3>
                <span className="text-xs uppercase">{agent.status}</span>
              </div>
              {/* The binding as BattleGrid states it, through the same
                  component the agent's own page uses. This line hard-coded the
                  word "Bound" and never read `binding.state`. */}
              <p className="mt-1 text-sm">
                <BindingSummary binding={agent.binding} />
              </p>
              {/* Acting, or configured-and-waiting — the fact the ACTIVE badge
                  hides. Same words as the detail page, so the two surfaces
                  cannot disagree about what an agent is doing. */}
              {deployments.kind === 'summary' && (
                <>
                  <p className="mt-1 text-sm">
                    {(deployments.byAgent[agent.id] ?? []).length > 0
                      ? (deployments.byAgent[agent.id] ?? []).map(rosterStanding).join(' · ')
                      : 'Not deployed — scanning no market'}
                  </p>
                  {/* What the platform is letting happen, which the standing
                      above cannot say. Fifteen of twenty markets on this
                      account were "Scanning" and not qualifying at the same
                      time; the standing was true and the row was misleading. */}
                  {(deployments.byAgent[agent.id] ?? []).map((d) => {
                    const note = resolutionNote(d);
                    return note === null ? null : (
                      <p
                        key={`res-${d.coinTicker}-${d.timeframe}`}
                        className="mt-1 text-sm text-text-secondary"
                      >
                        {d.coinTicker} ({d.timeframe}): {note}
                      </p>
                    );
                  })}
                  {/* The other half of the same join: a market whose slots hold
                      nobody active. It rides on the agent's row because this is
                      the only place the product describes a policy at all. */}
                  {unscanned(deployments.byAgent[agent.id] ?? []).map((d) => (
                    <p key={`${d.coinTicker}-${d.timeframe}`} className="mt-1 text-sm">
                      No active agent holds the {d.coinTicker} deployment ({d.timeframe}) — that
                      market is deployed and unscanned.
                    </p>
                  ))}
                </>
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

/**
 * One deployment, in a row's worth of words.
 *
 * `slot-held-not-scanning` is the case this row used to render as "Scanning
 * SP500 (15m)": the radar names the slot whatever the agent's lifecycle, and
 * the row read the radar alone. It says what is true of the pair — the slot is
 * held, and nothing is being scanned through it — and stops there. *Why* an
 * agent is out of lifecycle is on its status badge two lines up; asserting
 * anything more about what BattleGrid does with an archived agent's slot would
 * be inventing platform behaviour.
 */
function rosterStanding(d: AgentDeployment): string {
  if (d.standing === 'holding-position') {
    return `Holding the position on ${d.coinTicker} (${d.timeframe})`;
  }
  if (d.standing === 'on-duty') return `Scanning ${d.coinTicker} (${d.timeframe})`;
  if (d.standing === 'slot-held-not-scanning') {
    return `Holds the ${d.coinTicker} slot (${d.timeframe}) and is not scanning it — this agent is not active`;
  }
  return `In the rotation for ${d.coinTicker} (${d.timeframe})`;
}

/**
 * What the platform is letting happen here, appended to the standing.
 *
 * A separate sentence from `rosterStanding` because it answers a separate
 * question. "Scanning HYPE (15m)" was true on 2026-08-13 for fifteen markets
 * that were also **not qualifying**, each with the platform's own reason — and
 * an operator reading the row had no way to know.
 *
 * Nothing here is translated. `AGGREGATE_BELOW_MIN` is shown as
 * `AGGREGATE_BELOW_MIN`, because two block values from twenty rows on one
 * account is not a vocabulary, and rendering an unseen token as a sentence of
 * ours would invent a meaning for a value whose range is unknown. The same rule
 * covers `section`: a state this product does not recognise is *named* as
 * unrecognised, never shown as scanning or idle.
 *
 * `null` yields nothing at all. A deployment the platform resolved nothing for
 * supports no statement in either direction — the same rule the occupancy line
 * follows for an agent whose lifecycle was never read.
 */
export function resolutionNote(d: AgentDeployment): string | null {
  const r = d.resolution;
  if (!r) return null;

  const parts: string[] = [];

  if (!isRecognisedSection(r.section) && r.section !== null) {
    // Declared by the platform and never observed here — `BLOCKED` is the one
    // in the record. Named rather than interpreted, which is what lets it
    // arrive honestly without having been modelled in advance.
    parts.push(`the platform reports a state this product does not recognise: ${r.section}`);
  }

  if (r.qualified === false) {
    parts.push(
      r.qualificationBlock
        ? `not qualifying — the platform gives ${r.qualificationBlock}`
        : 'not qualifying, and the platform did not say why',
    );
  }

  // Whether it is still running was decided in the read, against the injected
  // clock. This only words it — see `tests/architecture/boundaries.test.ts`.
  if (r.cooldownActive === true && r.cooldownUntil) {
    parts.push(`sitting out a cooldown until ${r.cooldownUntil.toISOString()}`);
  }

  if (r.regime) {
    parts.push(
      r.regimeConviction ? `regime ${r.regime} (${r.regimeConviction})` : `regime ${r.regime}`,
    );
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

/** The markets on this row that nothing active is deployed on. */
function unscanned(deployments: readonly AgentDeployment[]): readonly AgentDeployment[] {
  return deployments.filter((d) => d.occupancy === 'no-active-agent');
}

function CreateAffordance({ creation }: { creation: CreationAvailability }) {
  if (creation.kind === 'unknown') return null;

  if (creation.kind === 'at-capacity') {
    // Before the form, not after submission.
    return (
      <p role="status" className="rounded-gc-2 border border-notice-border bg-notice-subtle p-3 text-sm text-text-primary">
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
