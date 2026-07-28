import type { ReadAgentJournalResponse } from '@/application/use-cases/read-agent-journal.query.js';

/**
 * An agent's own record.
 *
 * Deliberately captioned as the agent's record rather than left to context.
 * This product holds two logs that a user could easily conflate: this one says
 * what their agent thought, and the audit log says what Grid-Commander did to
 * their account. Someone who mixes them up either blames their agent for our
 * actions, or credits us with theirs.
 */
export function JournalView({
  agentName,
  response,
}: {
  agentName: string;
  response: ReadAgentJournalResponse;
}) {
  const { journal, heading } = response;

  return (
    <section aria-labelledby="journal-heading" className="space-y-3">
      <div>
        <h2 id="journal-heading" className="text-lg font-medium">
          {agentName}&apos;s journal
        </h2>
        <p className="text-sm">{heading}</p>
        <p className="text-xs">
          Looking for what Grid-Commander changed on your account instead?{' '}
          <a href="/audit" className="underline">
            That is the audit log
          </a>
          .
        </p>
      </div>

      {journal.kind === 'unreadable' && (
        <p role="alert" className="rounded border p-3 text-sm">
          This journal could not be loaded: {journal.reason}
        </p>
      )}

      {journal.kind === 'empty' && (
        <p className="text-sm">
          {agentName} has not recorded anything yet.
        </p>
      )}

      {journal.kind === 'entries' && (
        <ol className="space-y-3">
          {journal.entries.map((entry, i) => (
            <li key={`${entry.at.toISOString()}-${i}`} className="rounded border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs uppercase">
                <span>{entry.kind}</span>
                <time dateTime={entry.at.toISOString()}>{entry.at.toISOString()}</time>
              </div>
              <p className="mt-1 text-sm">{entry.summary}</p>
              {entry.detail && <p className="mt-1 text-sm">{entry.detail}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
