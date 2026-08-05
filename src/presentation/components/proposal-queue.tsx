import type { Proposal } from '@/domain/proposal/proposal.js';
import { OPERATIONS, STALE_AFTER_HOURS } from '@/domain/proposal/proposal.js';
import type { ProposalsResult } from '@/application/use-cases/read-proposals.query.js';

/**
 * What a model has suggested for you.
 *
 * A proposal that exists and is not visible is a change waiting to happen that
 * nobody knows about, so this surface is the whole reason recording is allowed
 * at all. Three groups, kept apart: what can still be acted on, what went stale
 * unread, and what was already decided.
 *
 * Stale is shown rather than deleted. "A model suggested stopping this agent
 * three days ago and nobody looked" is exactly the thing an operator should be
 * able to find out.
 */

const when = (d: Date): string => d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

/**
 * Only an actionable row links.
 *
 * A stale or resolved proposal has nothing to open — opening one would run a
 * describe and mint a confirmation for a change nobody can agree to. A link
 * that leads to a dead end still implies the change is available, so there
 * isn't one.
 */
function Row({ proposal, actionable }: { proposal: Proposal; actionable: boolean }) {
  const shape = OPERATIONS[proposal.operation];
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border-default p-3">
      <span className="text-sm text-text-primary">
        {actionable ? (
          <a href={`/pending/${proposal.id}`} className="underline">
            {shape.label}
          </a>
        ) : (
          shape.label
        )}{' '}
        — {shape.targets} {proposal.target}
      </span>
      <span className="text-xs text-text-secondary">
        {when(proposal.recordedAt)}
        {proposal.status === 'open' ? '' : ` · ${proposal.status}`}
      </span>
    </li>
  );
}

export function ProposalQueue({ result }: { result: ProposalsResult }) {
  if (result.kind === 'unreadable') {
    // Never "nothing is waiting". A failed read reported as an empty queue is
    // the lie this product refuses everywhere else.
    return (
      <section className="space-y-2">
        <h2 className="text-base font-medium text-text-primary">Proposals could not be read</h2>
        <p className="text-base text-text-secondary">{result.reason}</p>
        <p className="text-sm text-text-secondary">
          This is not the same as having none. Something may be waiting.
        </p>
      </section>
    );
  }

  if (result.kind === 'empty') {
    return (
      <section className="space-y-2">
        <h2 className="text-base font-medium text-text-primary">Nothing has been proposed</h2>
        <p className="text-base text-text-secondary">
          A model connected to Grid-Commander can suggest changes here. None has.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-base font-medium text-text-primary">Waiting for you</h2>
        {result.actionable.length === 0 ? (
          <p className="text-base text-text-secondary">Nothing is waiting for a decision.</p>
        ) : (
          <ul className="rounded-gc-2 border border-border-default">
            {result.actionable.map((p) => (
              <Row key={p.id} proposal={p} actionable />
            ))}
          </ul>
        )}
      </section>

      {result.stale.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-medium text-text-primary">Went stale unread</h2>
          <p className="text-sm text-text-secondary">
            Suggested more than {STALE_AFTER_HOURS} hours ago and never opened. Kept as history —
            these can no longer be agreed to, and nothing happened to the account.
          </p>
          <ul className="rounded-gc-2 border border-border-default">
            {result.stale.map((p) => (
              <Row key={p.id} proposal={p} actionable={false} />
            ))}
          </ul>
        </section>
      )}

      {result.resolved.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-medium text-text-primary">Already decided</h2>
          <ul className="rounded-gc-2 border border-border-default">
            {result.resolved.map((p) => (
              <Row key={p.id} proposal={p} actionable={false} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
