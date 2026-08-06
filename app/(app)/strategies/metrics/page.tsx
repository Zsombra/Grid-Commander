import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';

/**
 * The metric index — every report metric the platform publishes, grouped by
 * family. This is the raw material a strategy's report columns are built
 * from; the card behind each entry explains its transforms and checks
 * candidate columns against the platform's own contract.
 */
export default async function MetricIndexPage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const index = await app.readMetricIndex.execute(user.authority);

  if (index.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">The metric vocabulary could not be read</h1>
        <p role="alert" className="text-sm">{index.reason}</p>
        {/* A report column already saved reads one of these metrics, so an
            index that will not load looks like the column's meaning going
            with it. It has not. */}
        <WhyNotLoaded cause={index.cause} subject="these metrics are" />
        <p className="text-sm">
          <a href="/strategies" className="underline">Back to strategies</a>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">Metric index</h1>
      <p className="text-sm">
        Every metric a report column can read — fresh from BattleGrid. Open
        one for its transforms, formulas, and a contract check of any column
        you compose from it.
      </p>
      {index.families.map((group) => (
        <section key={group.family} className="space-y-2">
          <h2 className="text-base font-medium">{group.family}</h2>
          <ul className="space-y-2">
            {group.metrics.map((m) => (
              <li key={m.id} className="rounded border p-3 text-sm">
                <p>
                  <a href={`/strategies/metrics/${m.id}`} className="font-medium underline">
                    {m.label}
                  </a>
                  {' · '}
                  {m.id}
                  {m.unit ? ` · ${m.unit}` : ''}
                  {m.range ? ` · ${m.range[0]}–${m.range[1]}` : ''}
                </p>
                <p>Transforms: {m.transformIds.length > 0 ? m.transformIds.join(', ') : 'none declared'}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-sm">
        <a href="/strategies" className="underline">Back to strategies</a>
      </p>
    </main>
  );
}
