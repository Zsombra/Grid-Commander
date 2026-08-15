import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { ForwardReturnsPanel } from '@/presentation/components/forward-returns.js';

/**
 * The record, asked its first analytical question: when a state held, what
 * did price do by the next capture?
 *
 * Everything here is derived from the product's own record at read time —
 * no BattleGrid call, no stored summary. The page's one standing promise is
 * statistical honesty: the depth line renders before any figure, every
 * figure carries its pair count, and no table sorts by the return.
 */
export default async function RecorderAnalysisPage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const result = await app.readForwardReturns.execute({ userId: user.authority.userId });

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-6 py-8">
      <h1 className="text-lg font-medium">Forward returns</h1>
      <p className="text-sm text-text-secondary">
        For each pair of consecutive captures, what price did by the next capture — attributed
        to the states at the earlier one. Derived from the record as it stands, every time
        this page loads.
      </p>
      <ForwardReturnsPanel result={result} />
      <p className="text-sm">
        <a href="/recorder" className="underline">
          Back to the record
        </a>{' '}
        — coverage, gaps, and what has been captured.
      </p>
    </main>
  );
}
