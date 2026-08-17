import { acting } from '@/presentation/session.js';
import { ProposalQueue } from '@/presentation/components/proposal-queue.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';

/**
 * The agree and decline actions send their aftermath here — `?problem=` when
 * something needs the operator's eyes (a write that succeeded against a
 * proposal already closed), `?note=` when nothing was written and they should
 * merely know. Both render; a silent redirect is how an account moves without
 * its operator learning it did.
 */
export default async function PendingPage({
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

  const result = await app.readProposals.execute({ userId: user.authority.userId });

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-medium">What has been proposed for you</h1>
      <CarriedProblem problem={problem} />
      {note ? (
        // Nothing failed and nothing was written — advisory wears notice.
        <p role="status" className="rounded-gc-2 border border-notice-border bg-notice-subtle p-4 text-sm text-text-primary">
          {note === 'already-resolved'
            ? 'This proposal was already resolved — nothing was written to the account.'
            : note}
        </p>
      ) : null}
      <p className="text-sm">
        A model connected to Grid-Commander can suggest a change but cannot make one. Nothing
        here has touched your BattleGrid account. Opening a proposal reads the account again and
        shows what agreeing would do to it as it is at that moment.
      </p>
      <ProposalQueue result={result} />
    </main>
  );
}
