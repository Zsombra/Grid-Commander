import { PerformButton } from '@/presentation/components/perform-button.js';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { ProposalDifference } from '@/presentation/components/proposal-difference.js';
import { OPERATIONS } from '@/ports/proposals.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';
import { agree, decline } from './actions.js';

/**
 * One proposal, described against the account as it is right now.
 *
 * This page is where the ceremony begins, not where it is bypassed. The
 * describe runs when it is opened — so the consequence, and the confirmation
 * bound to it, are formed from the values in force at the moment a person
 * reads them, not from a sentence computed when a model made the suggestion.
 *
 * Every branch that cannot be agreed to says *why*, and offers no control. A
 * disabled button still implies the change is available; silence implies the
 * product is broken.
 */
export default async function ProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const q = await searchParams;
  const raw = q['problem'];
  const problemValue = Array.isArray(raw) ? raw[0] : raw;
  // Rendered by the Shell on every branch: a refused agree redirects back
  // here, and the page it lands on may by then describe a different state —
  // resolved after a double submit, stale, gone. The refusal must not depend
  // on which branch answers.
  const problem = problemValue && problemValue.length > 0 ? problemValue : null;

  const result = await app.openProposal.execute({ ...user.authority, id });

  if (result.kind === 'not-found') {
    return (
      <Shell title="No such proposal" problem={problem}>
        <p className="text-base text-text-secondary">
          Nothing with this reference was recorded for your account.
        </p>
      </Shell>
    );
  }

  if (result.kind === 'unreadable') {
    return (
      <Shell title="This proposal could not be read" problem={problem}>
        <p className="text-base text-text-secondary">{result.reason}</p>
        <p className="text-sm text-text-secondary">
          This is not the same as it having been withdrawn.
        </p>
      </Shell>
    );
  }

  const label = OPERATIONS[result.proposal.operation].label;

  if (result.kind === 'resolved') {
    return (
      <Shell title={`Already ${result.proposal.status}`} problem={problem}>
        <p className="text-base text-text-primary">
          This proposal to {label} was {result.proposal.status}. It cannot be reopened.
        </p>
      </Shell>
    );
  }

  if (result.kind === 'stale') {
    return (
      <Shell title="This proposal went stale" problem={problem}>
        <p className="text-base text-text-primary">
          It was suggested too long ago to act on now, and nothing happened to your account.
          If it still makes sense, ask for it again.
        </p>
      </Shell>
    );
  }

  if (result.kind === 'not-possible') {
    return (
      <Shell title="This can no longer be done" problem={problem}>
        {/* No confirmation control at all — not a disabled one. */}
        <p className="text-base text-text-primary">{result.reason}</p>
      </Shell>
    );
  }

  if (result.kind === 'no-op') {
    return (
      <Shell title={`Proposed: ${label}`} problem={problem}>
        <p className="text-base text-text-primary">{result.reason}</p>
        <ProposalDifference dispositions={result.dispositions} />
      </Shell>
    );
  }

  return (
    <Shell title={`Proposed: ${label}`} problem={problem}>
      <section className="space-y-2">
        <h2 className="text-base font-medium text-text-primary">What agreeing would do</h2>
        {/* The product's own consequence sentence, unchanged, in the same
            consequence role the archive confirmation gives the same
            vocabulary. This page must not grow a second one. DT-0007. */}
        <p className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-4 text-base text-text-primary">
          {result.consequence}
        </p>
      </section>

      <ProposalDifference dispositions={result.dispositions} />

      <form action={agree} className="space-y-2">
        <input type="hidden" name="id" value={result.proposal.id} />
        <input type="hidden" name="agentId" value={result.proposal.target} />
        <input type="hidden" name="confirmationToken" value={result.confirmationToken} />
        <input
          type="hidden"
          name="changes"
          value={JSON.stringify(result.proposal.proposedValues['changes'] ?? {})}
        />
        <PerformButton pendingLabel="Making the change…">
          Agree and make this change
        </PerformButton>
      </form>

      <form action={decline}>
        <input type="hidden" name="id" value={result.proposal.id} />
        {/* Declining is an operation, not a footnote — it closes the proposal
            for good. A text link beneath the agree button read as the way out
            of the page rather than the other half of the decision.

            It keeps the secondary weight and gains the pending treatment for
            that weight (DT-0027). Promoting it to primary would say the page is
            neutral between agreeing and declining, which is a claim about a
            destructive choice; leaving it silent left the one perform submit in
            the product that never said it was working. */}
        <PerformButton weight="secondary" pendingLabel="Declining…">
          Decline — this closes the proposal permanently
        </PerformButton>
      </form>
    </Shell>
  );
}

function Shell({
  title,
  problem = null,
  children,
}: {
  title: string;
  problem?: string | null;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-medium">{title}</h1>
      <a href="/pending" className="text-sm underline">
        Back to proposals
      </a>
      <CarriedProblem problem={problem} />
      {children}
    </main>
  );
}
