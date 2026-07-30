import type { AuditEntry } from '@/domain/audit/audit-entry.js';

/**
 * Every write Grid-Commander made on this account.
 *
 * Display only — the outcome, the age and the unresolved count are all decided
 * server-side. An entry reading "attempted" is not a bug: it means we started
 * an operation and never learned how it ended, which is exactly what an audit
 * log should tell you.
 */
export function AuditList({
  entries,
  unresolvedCount,
}: {
  entries: readonly AuditEntry[];
  unresolvedCount: number;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm">
        Nothing yet. Every change Grid-Commander makes to your BattleGrid
        account will be listed here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {unresolvedCount > 0 && (
        <p role="status" className="rounded border p-3 text-sm">
          {unresolvedCount} operation{unresolvedCount === 1 ? '' : 's'} started but never
          reported an outcome. They may or may not have taken effect on BattleGrid.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Operations performed on your behalf, newest first</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left">When</th>
              <th scope="col" className="text-left">Operation</th>
              <th scope="col" className="text-left">Caused by</th>
              <th scope="col" className="text-left">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>
                  <time dateTime={e.createdAt.toISOString()}>
                    {e.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
                  </time>
                </td>
                <td>
                  <code>{e.tool}</code>
                  {/* Colour is never the only signal — the word is there too. */}
                  {e.destructive && <span className="ml-2 rounded border px-1">destructive</span>}
                </td>
                <td>
                  {/*
                    Nothing can write an `assistant` row any more — that
                    capability was removed in `only-mcp-control`. This branch
                    reads rows from before it was, and deleting it would render
                    them as "you": a false statement about who acted, on the one
                    surface whose entire job is saying who acted. See `AuditActor`.
                  */}
                  {e.actor === 'assistant' ? 'the assistant, answering you' : 'you'}
                </td>
                <td>{outcomeLabel(e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function outcomeLabel(entry: AuditEntry): string {
  switch (entry.outcome) {
    case 'succeeded':
      return 'Succeeded';
    case 'failed':
      return entry.failureReason ? `Failed — ${entry.failureReason}` : 'Failed';
    case 'attempted':
      return 'Attempted, outcome unknown';
  }
}
