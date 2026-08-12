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
        <p role="status" className="rounded-gc-2 border border-notice-border bg-notice-subtle p-3 text-sm text-text-primary">
          {unresolvedCount} operation{unresolvedCount === 1 ? '' : 's'} started but never
          reported an outcome. They may or may not have taken effect on BattleGrid.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Operations performed on your behalf, newest first</caption>
          <thead>
            <tr className="border-b border-border-default">
              <th scope="col" className="py-2 pr-4 text-left font-semibold text-text-secondary">When</th>
              <th scope="col" className="py-2 pr-4 text-left font-semibold text-text-secondary">Operation</th>
              <th scope="col" className="py-2 pr-4 text-left font-semibold text-text-secondary">Caused by</th>
              <th scope="col" className="py-2 pr-4 text-left font-semibold text-text-secondary">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="py-2 pr-4">
                  <time dateTime={e.createdAt.toISOString()}>
                    {e.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
                  </time>
                </td>
                <td className="py-2 pr-4">
                  <code>{e.tool}</code>
                  {/* Colour is never the only signal — the word is there too.
                      The chip wears the consequence role: destructive-ness is
                      blast radius (DT-0012). */}
                  {e.destructive && <span className="ml-2 rounded-gc-2 border border-consequence-border bg-consequence-subtle px-1">destructive</span>}
                </td>
                <td className="py-2 pr-4">
                  {/*
                    Nothing can write an `assistant` row any more — that
                    capability was removed in `only-mcp-control`. This branch
                    reads rows from before it was, and deleting it would render
                    them as "you": a false statement about who acted, on the one
                    surface whose entire job is saying who acted. See `AuditActor`.
                  */}
                  {e.actor === 'assistant' ? 'the assistant, answering you' : 'you'}
                </td>
                {/* Failed is tinted beside its word; attempted deliberately is
                    not — unknown is neither failure nor success (DT-0012). */}
                <td className={`py-2 pr-4${e.outcome === 'failed' ? ' text-danger-default' : ''}`}>
                  {outcomeLabel(e)}
                </td>
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
