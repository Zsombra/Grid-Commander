import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';

/**
 * The signal library — every strategy signal the platform publishes, in its
 * own words. This is the vocabulary a strategy's rules are written in; a
 * rule references a signal by id, and this is where an id becomes meaning.
 */
export default async function SignalLibraryPage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const library = await app.readSignalLibrary.execute(user.authority);

  if (library.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">The signal library could not be read</h1>
        <p role="alert" className="text-sm">{library.reason}</p>
        <p className="text-sm">
          <a href="/strategies" className="underline">Back to strategies</a>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">Signal library</h1>
      <p className="text-sm">
        Every signal a strategy&apos;s rules can reference — read fresh from
        BattleGrid, described in its words. Open one for what it detects, when
        it fires, and what its parameters do.
      </p>
      {library.modules.map((group) => (
        <section key={group.module} className="space-y-2">
          <h2 className="text-base font-medium">{group.module}</h2>
          <ul className="space-y-2">
            {group.signals.map((s) => (
              <li key={s.id} className="rounded border p-3 text-sm">
                <p>
                  <a href={`/strategies/signals/${s.id}`} className="font-medium underline">
                    {s.name}
                  </a>
                  {s.direction ? ` · ${s.direction}` : ''}
                </p>
                <p>{s.description}</p>
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
