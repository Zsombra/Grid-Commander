import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';

/**
 * One signal's authoring card — the platform's full definition: what it
 * detects, when it fires, worked examples, guidance, parameters, and the
 * indicators it reads. Every sentence on this page is BattleGrid's own copy;
 * this product explains signals in the platform's words, never its own.
 */
export default async function SignalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const result = await app.readSignal.execute({ ...user.authority, signalId: id });

  if (result.kind === 'no-such-signal') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such signal</h1>
        <p className="text-sm">BattleGrid does not list a signal named &quot;{id}&quot;.</p>
        <p className="text-sm">
          <a href="/strategies/signals" className="underline">Back to the signal library</a>
        </p>
      </main>
    );
  }

  if (result.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">The signal could not be read</h1>
        <p role="alert" className="text-sm">{result.reason}</p>
        <WhyNotLoaded cause={result.cause} subject="this signal is" />
        <p className="text-sm">
          <a href="/strategies/signals" className="underline">Back to the signal library</a>
        </p>
      </main>
    );
  }

  const d = result.definition;
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">
        {d.summary.name}
        {d.summary.direction ? ` · ${d.summary.direction}` : ''}
      </h1>
      <p className="text-sm">
        {d.moduleName}
        {d.moduleDescription ? ` — ${d.moduleDescription}` : ''}
      </p>

      {d.detects ? (
        <section className="space-y-1 text-sm">
          <h2 className="text-base font-medium">What it detects</h2>
          <p>{d.detects}</p>
        </section>
      ) : null}

      {d.fires ? (
        <section className="space-y-1 text-sm">
          <h2 className="text-base font-medium">When it fires</h2>
          <p>{d.fires}</p>
        </section>
      ) : null}

      {d.examples.length > 0 ? (
        <section className="space-y-1 text-sm">
          <h2 className="text-base font-medium">Examples</h2>
          {d.exampleSetup ? <p>{d.exampleSetup}</p> : null}
          <ul className="space-y-1">
            {d.examples.map((e) => (
              <li key={e.scenario} className="rounded border p-2">
                {e.scenario} → {e.outcome}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-1 text-sm">
        <h2 className="text-base font-medium">Parameters</h2>
        {d.parameters.length === 0 ? (
          <p>This signal takes no parameters.</p>
        ) : (
          <ul className="space-y-1">
            {d.parameters.map((p) => (
              <li key={p.key} className="rounded border p-2">
                <p className="font-medium">{p.key}</p>
                {p.description ? <p>{p.description}</p> : null}
                <p>
                  {p.min !== null || p.max !== null
                    ? `Range ${p.min ?? 'unbounded'} – ${p.max ?? 'unbounded'}`
                    : 'Range unstated'}
                  {p.defaultValue !== null ? ` · default ${p.defaultValue}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {d.indicators.length > 0 ? (
        <section className="space-y-1 text-sm">
          <h2 className="text-base font-medium">Reads</h2>
          <p>{d.indicators.join(', ')}</p>
        </section>
      ) : null}

      {d.bestFor ? (
        <section className="space-y-1 text-sm">
          <h2 className="text-base font-medium">Best for</h2>
          <p>{d.bestFor}</p>
        </section>
      ) : null}

      {d.watchOut ? (
        <section className="space-y-1 text-sm">
          <h2 className="text-base font-medium">Watch out</h2>
          <p>{d.watchOut}</p>
        </section>
      ) : null}

      <p className="text-sm">
        <a href="/strategies/signals" className="underline">Back to the signal library</a>
      </p>
    </main>
  );
}
