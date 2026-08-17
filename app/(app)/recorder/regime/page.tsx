import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { RegimeContextPanel } from '@/presentation/components/regime-context.js';

/**
 * The regime the record was taken in.
 *
 * The subjects come from the product's own record — which coins, at which
 * interval, over which window — and the answers come from BattleGrid's
 * regime classification, read live per series. This page exists because the
 * forward returns state their window and nothing about what kind of market
 * that window was; a figure earned entirely in one regime should say so
 * before anyone lets it travel.
 */
export default async function RecorderRegimePage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const result = await app.readRegimeContext.execute({ ...user.authority });

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-6 py-8">
      <h1 className="text-lg font-medium">Regime context</h1>
      <p className="text-sm text-text-secondary">
        For each recorded series, the platform&rsquo;s own regime classification over the
        record&rsquo;s window — its bars counted per regime label, read live each time this
        page loads — beside the state it classifies now. The labels are the platform&rsquo;s
        vocabulary, shown as stated; the composition counts platform bars, not captures.
      </p>
      <RegimeContextPanel result={result} />
      <p className="text-sm">
        <a href="/recorder/analysis" className="underline">
          The forward returns
        </a>{' '}
        these windows contextualize —{' '}
        <a href="/recorder" className="underline">
          back to the record
        </a>
        .
      </p>
    </main>
  );
}
