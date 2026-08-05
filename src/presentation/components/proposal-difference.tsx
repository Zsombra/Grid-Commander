import type { ValueDisposition } from '@/domain/proposal/difference.js';
import { changesAnything, departsFromProposal } from '@/domain/proposal/difference.js';

/**
 * What a model proposed, beside what will actually happen.
 *
 * Both, always. This page is the only place in the product where those two
 * things are separately knowable, and the failure mode is not a crash — it is
 * a page that merges them into one confident sentence and so agrees on the
 * operator's behalf.
 *
 * So: every proposed value is listed, whatever became of it. One that is
 * already true is shown as already true rather than dropped, because dropping
 * it reports a smaller change than was proposed. One that is refused is shown
 * as refused rather than omitted, because omitting it reports a larger one.
 */

const value = (v: unknown): string =>
  v === undefined ? '(not set)' : typeof v === 'string' ? v : JSON.stringify(v);

function Row({ d }: { d: ValueDisposition }) {
  return (
    <tr className="border-t border-border-default align-top">
      <td className="p-2 text-text-primary">{d.key}</td>
      <td className="p-2 text-text-primary">{value(d.proposed)}</td>
      <td className="p-2 text-text-secondary">
        {d.kind === 'will-change' ? (
          // Named in words, not by colour alone — an operator must be able to
          // tell these apart without seeing hue.
          <>will change, from {value(d.current)}</>
        ) : d.kind === 'already-true' ? (
          <>already the case — agreeing changes nothing here</>
        ) : (
          <>not accepted: {d.reason}</>
        )}
      </td>
    </tr>
  );
}

export function ProposalDifference({
  dispositions,
}: {
  dispositions: readonly ValueDisposition[];
}) {
  const willDo = changesAnything(dispositions);
  const departs = departsFromProposal(dispositions);

  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium text-text-primary">What was proposed, and what it does</h2>

      {dispositions.length === 0 ? (
        <p className="text-base text-text-secondary">
          This proposal carries no values of its own — what it would do is described above.
        </p>
      ) : (
        <>
          {departs && (
            // Stated before the table, because a reader who stops at the first
            // sentence must still learn that this is not what was suggested.
            <p className="text-sm text-text-primary">
              This is not exactly what was proposed. The account has been read again just now,
              and some of it no longer applies.
            </p>
          )}
          <div className="overflow-x-auto rounded-gc-2 border border-border-default">
            <table className="w-full text-sm">
              <thead className="bg-bg-raised text-left">
                <tr>
                  <th className="p-2 font-medium text-text-primary">Setting</th>
                  <th className="p-2 font-medium text-text-primary">Proposed</th>
                  <th className="p-2 font-medium text-text-primary">What happens</th>
                </tr>
              </thead>
              <tbody>
                {dispositions.map((d) => (
                  <Row key={d.key} d={d} />
                ))}
              </tbody>
            </table>
          </div>

          {!willDo && (
            // No confirmation is offered above this in the page. An operator
            // agreeing to a no-op learns nothing and is charged a decision.
            <p className="text-base text-text-primary">
              Nothing here would change the account. Every part of this proposal is either
              already the case or not accepted, so there is nothing to agree to.
            </p>
          )}
        </>
      )}
    </section>
  );
}
