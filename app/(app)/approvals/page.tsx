import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { ApprovalQueue } from '@/presentation/components/approval-queue.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';

/**
 * Every trade waiting for an answer, across every agent.
 *
 * The product's premise is "the human decides, informed". The pipeline already
 * delivered *informed* — an operator could read an agent's proposal in full —
 * and there was no way to say yes or no, so the decision expired fifteen minutes
 * later. This is where it can be answered.
 *
 * The aftermath of an answer lands back here the way the proposals queue does:
 * `?problem=` when something needs the operator's eyes, `?note=` when nothing
 * was written and they should merely know. Both render. A silent redirect is how
 * an account moves without its operator learning it did.
 */
/**
 * The step-up, offered from a page that mutates nothing.
 *
 * Deliberately understated. Most operators never answer a decision, and a
 * prominent ask here would undercut the claim the connect page makes — that
 * this product does not want authority over their money.
 */
function StepUpLink() {
  return (
    <p className="text-sm text-text-secondary">
      Answering needs authority this connection does not hold —{' '}
      <a href="/approvals/authority" className="underline">
        grant it
      </a>
      . You can read everything below without it.
    </p>
  );
}

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const q = await searchParams;
  const one = (v: string | string[] | undefined): string | null => {
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.length > 0 ? s : null;
  };
  const problem = one(q['problem']);
  const note = one(q['note']);

  const result = await app.readApprovalQueue.execute({ ...user.authority });
  // Read here as well as on the decision page so the step-up is reachable
  // without first opening something that mutates — an operator can grant this
  // before a decision arrives, and `reachability.test.ts` requires that a route
  // is offered from somewhere that is not itself a form.
  const authority = await app.readAnswerAuthority.execute({ userId: user.authority.userId });

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Trades waiting for your answer</h1>
      <CarriedProblem problem={problem} />
      {note ? (
        <p
          role="status"
          className="rounded-gc-2 border border-notice-border bg-notice-subtle p-4 text-sm text-text-primary"
        >
          {note}
        </p>
      ) : null}
      <p className="text-sm">
        An agent set to <strong>approval required</strong> proposes a trade and waits.
        The window is fifteen minutes at most — after it closes the decision expires and
        the agent does not propose it again on its own.
      </p>
      {authority.kind === 'absent' ? <StepUpLink /> : null}
      <ApprovalQueue result={result} />
    </main>
  );
}
