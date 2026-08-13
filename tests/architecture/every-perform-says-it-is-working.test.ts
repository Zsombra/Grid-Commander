import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
 */

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const uiFiles = [...walk('app'), ...walk('src/presentation')];

/**
 * Submits inside a `<form action=…>`, with the file and line that carries them.
 *
 * Tracked by walking lines rather than by matching a form-to-close regex,
 * because these forms nest hidden inputs, comments and conditional blocks, and
 * a lazy `[\s\S]*?` across them attributes a submit to whichever form opened
 * first. That would silently exempt the very pages this is for.
 */
function performSubmits(): { file: string; line: number; text: string }[] {
  const found: { file: string; line: number; text: string }[] = [];
  for (const file of uiFiles) {
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

describe('a submit that performs something', () => {
  it('is never a bare button', () => {
    const bare = performSubmits().map((s) => `${s.file}:${s.line}`);
    expect(
      bare,
      'a form that performs must submit through PerformButton, so it can say it is working (#153)',
    ).toEqual([]);
  });

  it('is a PerformButton, on enough surfaces to be the rule', () => {
    // Anti-vacuity, the same shape `controls.test.ts` uses for its treatments:
    // the assertion above passes trivially if the scanner stops matching, or if
    // someone deletes every confirmation in the product. The floor is well
    // under the real count, so it fails on a broken scan rather than on one
    // retired page.
    const uses = uiFiles.filter((f) => readFileSync(f, 'utf8').includes('<PerformButton')).length;
    expect(uses).toBeGreaterThanOrEqual(10);
  });

  it('always carries a progressive label, because the label is the state', () => {
    /**
     * The spinner is decoration and is hidden under prefers-reduced-motion; the
     * label is what a screen reader announces and what survives that. A
     * `PerformButton` without one would render a control that changes nothing
     * visible when pressed — which is the defect, reintroduced through the
     * component built to fix it.
     *
     * TypeScript already requires the prop. This catches the other half: a
     * prop passed as an empty string still type-checks.
     */
    const empty: string[] = [];
    for (const file of uiFiles) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/<PerformButton\b[\s\S]*?>/g)) {
        const tag = m[0];
        if (!/pendingLabel=/.test(tag) || /pendingLabel=(""|{``}|{''})/.test(tag)) {
          empty.push(`${file}: ${tag.slice(0, 60)}`);
        }
      }
    }
    expect(empty, 'a pending state with no label says nothing').toEqual([]);
  });
});
