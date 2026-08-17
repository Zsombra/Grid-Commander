/**
 * Deliberate offenders, planted for `every-perform-says-it-is-working.test.ts`.
 *
 * This directory is walked by exactly one thing: that scan's fixture run.
 * The production runs walk `app/` and `src/presentation/` and never reach it,
 * so nothing here can trip an unrelated rule — see the change
 * `a-floor-fails-when-its-scan-goes-blind` (design: fixtures live outside
 * every production scan root).
 *
 * Two plants, one per rule in that file:
 *
 *   1. A bare secondary-treatment submit inside a server-action form — the
 *      #153 defect the line walk exists to report.
 *   2. A perform control whose progressive label is empty — a pending state
 *      that says nothing, which the label rule exists to report.
 *
 * **Do not fix these, do not reformat them — and do not spell the scanned
 * idioms in this comment.** The scanner reads comments (that is a property of
 * the rule, unchanged by the change that planted this file): an earlier
 * version of this header quoted the form-open idiom verbatim, the walk latched
 * on the quotation, and the plant below was "found" through a form its own
 * documentation had opened — measured in the change's tasks.md. The form open
 * tags below must stay on one line, because a tag broken across lines is
 * precisely the shape the line walk cannot read; that boundary is measured in
 * the same place.
 *
 * The scan asserts both plants are found, exactly. A plant that stops being
 * reported means the scanner has gone blind, and that failing test is the
 * entire point of this file.
 */
import { BUTTON_SECONDARY } from '@/presentation/components/control.js';
import { PerformButton } from '@/presentation/components/perform-button.js';

function decline(formData: FormData): Promise<void> {
  void formData;
  return Promise.resolve();
}

export function PlantedOffender() {
  return (
    <section>
      <form action={decline}>
        <input type="hidden" name="proposalId" value="planted" />
        <button type="submit" className={BUTTON_SECONDARY}>
          Decline without saying it is working
        </button>
      </form>
      <form action={decline}>
        <PerformButton pendingLabel="">Archive it</PerformButton>
      </form>
    </section>
  );
}
