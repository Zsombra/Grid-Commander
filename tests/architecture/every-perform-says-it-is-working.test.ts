import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { slashed } from '../support/source-tree.js';

/**
 * Every form that performs something says it is working.
 *
 * `#153` was not one broken page. It was the same omission on every ceremony
 * surface, recorded in eleven manifests in identical words, because each page
 * spelled its own submit and there was nothing to make them agree. Fixing them
 * one at a time and leaving it there would put the next new confirmation
 * straight back into the same state — silently, and only visible to whoever
 * next read a manifest.
 *
 * So the rule is enforced rather than remembered: **a submit inside a server
 * action is a `PerformButton`, in either weight.**
 *
 * A GET form is deliberately exempt. It composes a preview and reaches no
 * operation — `control.ts` leans on that distinction for which weight a button
 * wears, and this borrows the same line rather than drawing a second one that
 * could disagree with it.
 *
 * ## The exemption that used to be here is gone
 *
 * This rule was scoped to `BUTTON_PRIMARY` until DT-0027, because that was all
 * DT-0022 had designed. That left one genuine perform uncovered — `/pending/[id]`'s
 * "Decline — this closes the proposal permanently", which mutates with no undo
 * and said nothing while it worked. It was recorded here as a gap rather than
 * hidden behind a narrow regex, precisely so it would be found and closed.
 *
 * DT-0027 designed the secondary weight's pending treatment, the Decline submit
 * moved behind `PerformButton weight="secondary"`, and the scope widened to both
 * weights in the same change. Widening it earlier would have failed on a control
 * that had nowhere to go.
 *
 * ## Two exemptions that are load-bearing — do not relax either
 *
 * The scan is gated on `<button` **and** `type="submit"`, which is what keeps it
 * off the thirteen cancel *anchors* that sit inside `<form action={…}>` blocks
 * (`plan-review.tsx`, `rebind-confirm.tsx`, every confirm page's cancel). An
 * anchor navigates; it reaches no operation. Rewriting this as "anything wearing
 * `BUTTON_SECONDARY` inside an action form" fails on all thirteen at once.
 *
 * The `method="get"` reset is what keeps it off the ten secondary submits that
 * compose previews. Both exemptions are read off the elements themselves, so
 * neither can rot into an allowlist.
 *
 * ## The scan runs twice, and the second run is the guard
 *
 * The floor here used to count files containing the literal `<PerformButton` —
 * a different pattern from the `inAction` walk it vouched for, so it proved the
 * files existed and nothing about whether the scanner still read them. If the
 * state machine broke on a shape it did not expect, the offender scan found
 * nothing, and the floor stood (`a-floor-fails-when-its-scan-goes-blind`,
 * GitHub #241 — the third rediscovery of this repository's characteristic
 * defect).
 *
 * So each scanner is now a function of its roots and runs twice: over the
 * production roots, expecting zero offenders — the rule, unchanged — and over
 * `tests/architecture/fixtures/every-perform/`, expecting **exactly** the
 * planted offender set. The fixture lives outside every production scan root,
 * so the plant can never trip a neighbouring rule; and the two runs stay
 * separate invocations, because one merged walk filtered by path would rebuild
 * the independent mechanism this change removed. A scanner that goes blind now
 * un-finds the plant, and that is a red test naming the fixture it lost.
 */

const PRODUCTION_ROOTS = ['app', 'src/presentation'] as const;
const FIXTURE_ROOT = 'tests/architecture/fixtures/every-perform';
const PLANT = `${FIXTURE_ROOT}/offender.tsx`;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const filesUnder = (roots: readonly string[]): string[] => roots.flatMap((r) => walk(r));

/**
 * Submits inside a `<form action=…>`, with the file and line that carries them.
 *
 * Tracked by walking lines rather than by matching a form-to-close regex,
 * because these forms nest hidden inputs, comments and conditional blocks, and
 * a lazy `[\s\S]*?` across them attributes a submit to whichever form opened
 * first. That would silently exempt the very pages this is for.
 */
function performSubmits(roots: readonly string[]): { file: string; line: number; text: string }[] {
  const found: { file: string; line: number; text: string }[] = [];
  for (const file of filesUnder(roots)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    let inAction = false;
    lines.forEach((ln, i) => {
      if (ln.includes('<form action=')) inAction = true;
      else if (/<form\b[^>]*method=["']get["']/.test(ln)) inAction = false;
      else if (ln.includes('</form>')) inAction = false;
      if (
        inAction &&
        /<button\b[^>]*type="submit"/.test(ln) &&
        /BUTTON_(?:PRIMARY|SECONDARY)/.test(ln)
      ) {
        found.push({ file, line: i + 1, text: ln.trim() });
      }
    });
  }
  return found;
}

/**
 * `<PerformButton>` tags whose `pendingLabel` is missing or empty.
 *
 * The spinner is decoration and is hidden under prefers-reduced-motion; the
 * label is what a screen reader announces and what survives that. A
 * `PerformButton` without one would render a control that changes nothing
 * visible when pressed — which is the defect, reintroduced through the
 * component built to fix it.
 *
 * TypeScript already requires the prop. This catches the other half: a prop
 * passed as an empty string still type-checks.
 */
function emptyPendingLabels(roots: readonly string[]): string[] {
  const empty: string[] = [];
  for (const file of filesUnder(roots)) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/<PerformButton\b[\s\S]*?>/g)) {
      const tag = m[0];
      if (!/pendingLabel=/.test(tag) || /pendingLabel=(""|{``}|{''})/.test(tag)) {
        empty.push(`${slashed(file)}: ${tag.slice(0, 60)}`);
      }
    }
  }
  return empty;
}

describe('a submit that performs something', () => {
  it('is never a bare button', () => {
    const bare = performSubmits(PRODUCTION_ROOTS).map((s) => `${slashed(s.file)}:${s.line}`);
    expect(
      bare,
      'a form that performs must submit through PerformButton, so it can say it is working (#153)',
    ).toEqual([]);
  });

  it('reports the planted bare submit, so a blind walk cannot report a clean tree', () => {
    // The guard on the rule above, exercising the rule's own machinery: the
    // same walk, the same state machine, pointed at a tree known to offend.
    // Exactly the plant — a second finding would mean the scan double-counts,
    // which silences nothing but misreports everything.
    const found = performSubmits([FIXTURE_ROOT]);
    expect(
      found.map((s) => slashed(s.file)),
      `the scan lost the offender planted in ${PLANT} — its machinery has gone blind`,
    ).toEqual([PLANT]);
    expect(found[0]?.text).toContain('BUTTON_SECONDARY');
  });

  it('walks a production tree that is really there', () => {
    // The one blindness the fixture run cannot see: a root dropped from the
    // production list narrows the rule without breaking the machinery. Floored
    // through the scan's own file walk — never through an independent count,
    // which is the defect this file's old floor had.
    //
    // Calibrated to the failure it guards, per the lesson pinned in
    // `a-refusal-reaches-the-person`: the failure grain here is a whole root,
    // so the floor sits *above either root alone* (50 and 41 at time of
    // writing) and below their union (91). Losing a root cannot pass; retiring
    // a page or two is not an edit here. The first version said `> 40`, which
    // either root cleared by itself — a floor that could not fail on the one
    // thing it existed to catch, found by measuring rather than reading.
    expect(filesUnder(PRODUCTION_ROOTS).length).toBeGreaterThan(60);
  });

  it('always carries a progressive label, because the label is the state', () => {
    expect(
      emptyPendingLabels(PRODUCTION_ROOTS),
      'a pending state with no label says nothing',
    ).toEqual([]);
  });

  it('reports the planted empty label, so a dead tag matcher cannot pass as clean', () => {
    const found = emptyPendingLabels([FIXTURE_ROOT]);
    expect(
      found,
      `the scan lost the empty pendingLabel planted in ${PLANT} — its matcher has gone blind`,
    ).toHaveLength(1);
    expect(found[0]).toContain(PLANT);
  });
});
