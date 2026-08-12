import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { RebindConfirm } from '@/presentation/components/rebind-confirm.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { BUTTON_SECONDARY } from '@/presentation/components/control.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';

/**
 * Propose a rebind, and render what the confirmation was issued against.
 *
 * The consequence text on screen is the same string stored with the token, so
 * what the user reads, what they agree to, and what the audit can later prove
 * are one thing rather than three that drift.
 */
export default async function RebindPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ to?: string; problem?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { to, problem } = await searchParams;
  if (!to) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Choose a strategy to rebind to</h1>
        <CarriedProblem problem={problem} />
        <p className="text-sm">
          Strategy browsing is not built yet. Supply a strategy id to continue.
        </p>
        <p className="text-sm">
          <a href={`/agents/${id}`} className={BUTTON_SECONDARY}>Back to the agent</a>
        </p>
      </main>
    );
  }

  /**
   * The id is all the query supplies. The destination's name and revision
   * come back from the platform inside the proposal — a consequence printing
   * a caller-supplied name would let the URL decide what the user believes
   * they are binding to.
   */
  const result = await app.describeRebind.execute({
    ...user.authority,
    agentId: id,
    toStrategyId: to,
  });

  if (result.kind !== 'proposal') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Cannot rebind</h1>
        {/* A bounced perform rode in with its reason; the fresh refusal must
            not eat it. Both are the outcome the person is owed. */}
        <CarriedProblem problem={problem} />
        <p role="alert" className="text-sm">{result.reason}</p>
        <p className="text-sm">
          <a href={`/agents/${id}`} className={BUTTON_SECONDARY}>Back to the agent</a>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <CarriedProblem problem={problem} />
      <RebindConfirm proposal={result.proposal} action={performRebind} />
    </main>
  );
}

export async function performRebind(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  const toStrategyId = requiredText(formData, 'toStrategyId');
  const result = await app.rebindAgent.execute({
    ...user.authority,
    agentId,
    toStrategyId,
    toStrategyRevision: requiredInteger(formData, 'toStrategyRevision'),
    expectedRevision: requiredInteger(formData, 'expectedRevision'),
    confirmationToken: requiredText(formData, 'confirmationToken'),
  });
  // A moved destination returns to this page: the describe re-runs against
  // what the platform holds now, so the fresh proposal and the reason it was
  // needed arrive together. A platform refusal takes the same road — it used
  // to escape as a thrown error, which rendered a framework error page in
  // place of the reason (the outcome-reaches-the-person requirement; the
  // CONFLICT case is live-confirmed).
  if (result.kind === 'destination-moved' || result.kind === 'refused') {
    const query = new URLSearchParams({ to: toStrategyId, problem: result.reason });
    redirect(`/agents/${agentId}/rebind?${query.toString()}`);
  }
  redirect(`/agents/${agentId}`);
}
