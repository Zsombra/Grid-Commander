import { acting } from '@/presentation/session.js';
import { StrategyList } from '@/presentation/components/strategy-list.js';
import { NotConnected } from '@/presentation/require-connection.js';

export default async function StrategiesPage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { result, listings, forking } = await app.listStrategies.execute(user.authority);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Strategies</h1>
      <p className="text-sm">
        A strategy decides what an agent reads and how it reasons. Changing one
        reaches every agent bound to it, immediately.
      </p>
      <p className="text-sm">
        <a href="/strategies/signals" className="underline">
          Browse the signal library
        </a>{' '}
        — every signal a strategy&apos;s rules can reference, in the
        platform&apos;s own words. Or{' '}
        <a href="/strategies/metrics" className="underline">
          the metric index
        </a>{' '}
        — the raw material report columns are built from, with a contract
        check for any column you compose. Or{' '}
        <a href="/strategies/sections" className="underline">
          the section library
        </a>{' '}
        — every report section the platform publishes and the columns each one
        renders.
      </p>
      <StrategyList result={result} listings={listings} forking={forking} />
    </main>
  );
}
