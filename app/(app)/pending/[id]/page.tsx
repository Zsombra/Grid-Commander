import { redirect } from 'next/navigation';
import { acting, requestApp } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { ProposalDifference } from '@/presentation/components/proposal-difference.js';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '@/presentation/components/control.js';
import { editArguments } from '@/presentation/form.js';
import { OPERATIONS } from '@/ports/proposals.js';

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
        {/* The product's own consequence sentence, unchanged. This page must
            not grow a second vocabulary for the same write. */}
        <p className="text-base text-text-primary">{result.consequence}</p>
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
        <button type="submit" className={BUTTON_PRIMARY}>
          Agree and make this change
        </button>
      </form>

      <form action={decline}>
        <input type="hidden" name="id" value={result.proposal.id} />
        {/* Declining is an operation, not a footnote — it closes the proposal
            for good. A text link beneath the agree button read as the way out
            of the page rather than the other half of the decision. */}
        <button type="submit" className={BUTTON_SECONDARY}>
          Decline — this closes the proposal permanently
        </button>
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
      {problem ? (
        <p role="alert" className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary">
          <span className="font-semibold">Refused: </span>
          {problem}
        </p>
      ) : null}
      {children}
    </main>
  );
}

const text = (form: FormData, key: string): string => {
  const v = form.get(key);
  return typeof v === 'string' ? v : '';
};

async function agree(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const id = text(formData, 'id');
  let changes: Record<string, unknown> = {};
  try {
    changes = JSON.parse(text(formData, 'changes')) as Record<string, unknown>;
  } catch {
    redirect(`/pending/${id}?problem=${encodeURIComponent('the proposed values were unreadable')}`);
  }

  // The ordinary perform, with the ordinary confirmation. Nothing about this
  // path is special because a model suggested it — including the split, which
  // is the difference between merging a proposed limit onto the agent's config
  // and replacing all twenty with the one that was proposed.
  const { changes: rest, tradingConfigChanges } = editArguments(changes);

  const result = await app.updateAgent.execute({
    ...user.authority,
    agentId: text(formData, 'agentId'),
    changes: rest,
    ...(tradingConfigChanges ? { tradingConfigChanges } : {}),
    confirmationToken: text(formData, 'confirmationToken'),
  });

  if (result.kind !== 'updated') {
    const reason =
      result.kind === 'rejected'
        ? result.rejected.map((r) => `${r.field}: ${r.reason}`).join(' · ')
        : result.kind === 'invalid'
          ? result.issues.map((i) => `${i.field}: ${i.reason}`).join(' · ')
          : result.reason;
    redirect(`/pending/${id}?problem=${encodeURIComponent(reason)}`);
  }

  // Closed only after the write succeeded. Closing first would leave a
  // proposal marked agreed against a change that never happened.
  const closed = await app.resolveProposal.execute({
    userId: user.authority.userId,
    id,
    status: 'agreed',
  });
  if (!closed.closed) {
    // The change happened and the proposal was already resolved — a double
    // submit, most likely. Said rather than swallowed: the account moved, and
    // an operator seeing a silent redirect would not know it had.
    redirect(
      `/pending?problem=${encodeURIComponent(
        'The change was made, but this proposal had already been closed. Check the activity log.',
      )}`,
    );
  }
  redirect('/pending');
}

async function decline(formData: FormData) {
  'use server';
  const { user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');
  const app = await requestApp();
  const closed = await app.resolveProposal.execute({
    userId: user.authority.userId,
    id: text(formData, 'id'),
    status: 'declined',
  });
  // Nothing was written to the account either way, so a proposal that was
  // already resolved is not an error worth interrupting anyone over — but it
  // is not silence either.
  redirect(closed.closed ? '/pending' : '/pending?note=already-resolved');
}
