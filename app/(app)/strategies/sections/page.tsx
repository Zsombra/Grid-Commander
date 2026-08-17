import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';

/**
 * The section library — every report section the platform's vocabulary
 * advertises.
 *
 * `/strategies/[id]/edit` answers *which sections does this strategy include*.
 * This answers the question underneath it, which that page cannot: *what does
 * including one actually read*. Same vocabulary call, asked without a strategy,
 * because a section's contents are the platform's and belong to no strategy in
 * particular.
 */
export default async function SectionLibraryPage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const library = await app.readSectionLibrary.execute(user.authority);

  if (library.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">The section vocabulary could not be read</h1>
        <p role="alert" className="text-sm">{library.reason}</p>
        {/* A strategy already including one of these sections still includes
            it. A library that will not load looks like the sections going with
            it, and they have not. */}
        <WhyNotLoaded cause={library.cause} subject="these sections are" />
        <p className="text-sm">
          <a href="/strategies" className="underline">Back to strategies</a>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">Section library</h1>
      <p className="text-sm">
        {`Every report section BattleGrid publishes — fresh from its vocabulary. Open one to see the columns it renders, what each column's metric is, and to check a column of your own against the platform's contract.`}
      </p>
      {library.groups.map((group) => (
        <section key={group.category ?? 'ungrouped'} className="space-y-2">
          {/* No heading where the platform published no category. Inventing one
              would put a word of ours where its own grouping goes. */}
          {group.category !== null ? (
            <h2 className="text-base font-medium">{group.category}</h2>
          ) : null}
          <ul className="space-y-2">
            {group.templates.map((template) => {
              const key = template.kind === 'platform' ? template.sectionKey : template.templateKey;
              const columns = template.columns;
              return (
                <li key={key} className="rounded-gc-2 border border-border-default p-3 text-sm">
                  <p>
                    <a
                      href={`/strategies/sections/${encodeURIComponent(key)}`}
                      className="font-medium underline"
                    >
                      {template.label.length > 0 ? template.label : key}
                    </a>
                    {' · '}
                    {key}
                    {' · '}
                    {template.kind}
                  </p>
                  {/* Not published and none are different claims, so they read
                      differently. The platform's own template entries carry the
                      columns; an entry without them has told us nothing. */}
                  <p className="text-text-secondary">
                    {columns === undefined
                      ? `BattleGrid did not publish this section's columns.`
                      : `${columns.length} column${columns.length === 1 ? '' : 's'}`}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="text-sm">
        <a href="/strategies" className="underline">Back to strategies</a>
      </p>
    </main>
  );
}
