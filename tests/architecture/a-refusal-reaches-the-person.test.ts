import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The refusal a spent confirmation earns reaches the person who earned it.
 *
 * The product writes four sentences for the four ways a confirmation can fail
 * — expired, already used, mismatched, unrecognised — and each names a
 * different next step (`call-path.ts`, `CONFIRMATION_REFUSALS`). Until #232
 * none of them arrived. `call-path` throws `ConfirmationRequiredError`,
 * `outcomeOf` deliberately re-throws it, the commands that skip `outcomeOf`
 * never catch it, and there is no error boundary in the app — so the throw ran
 * out of the server action and the person who pressed twice was shown a
 * framework crash page **after their first press had succeeded**.
 *
 * The rule is enforced rather than remembered, for the same reason
 * `every-perform-says-it-is-working` is: this was not one broken page. It was
 * every confirmation in the product, and the next one added would inherit it
 * silently, because a route that spends a confirmation works perfectly until
 * somebody presses twice.
 *
 * ## The shape this checks, and why it is a shape rather than a behaviour
 *
 * `redirect()` in Next works **by throwing**. A `try` drawn around a block that
 * also redirects catches `NEXT_REDIRECT` and turns a successful navigation into
 * a swallowed error. So the safe form is narrow — the command call inside the
 * `try`, the redirect outside it — and `spending()` is that form, made
 * unwidenable by construction.
 *
 * A hand-rolled `try` is accepted, because one predates this and is correct
 * (`conditions/save`). What is not accepted is neither.
 *
 * ## The count, and why it is written down
 *
 * Eleven spenders: ten through `spending()`, one hand-rolled. The first
 * version of this file said nine and ten, because it could not see
 * `/agents/[id]/edit` --- it passes its token by ES6 shorthand and the filter
 * matched only `confirmationToken:`. The route that edits loss caps spent a
 * confirmation with nothing catching its refusal, and this test was green.
 * The numbers are stated here so the next drift is a contradiction rather
 * than a silence.
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
const read = (f: string): string => readFileSync(f, 'utf8');

/**
 * Files that actually *spend* a confirmation — they pass one to a use case.
 *
 * A file that only renders the token as a hidden input is not a spender:
 * `agent-edit.tsx` and `plan-review.tsx` carry it into a form whose action
 * lives on a page, and that page is where the guarantee has to hold.
 */
/**
 * A token being *passed* to a call, in either spelling JavaScript allows.
 *
 * This read `includes('confirmationToken:')` and so was blind to ES6 shorthand
 * — `{ ..., confirmationToken }`. `/agents/[id]/edit` spends one that way, and
 * the scan reported a closed set of ten with the eleventh missing: the route
 * that edits loss caps and exposure limits, green on every run. A guard that
 * encodes one *spelling* of an idiom is not enforcing the rule, and this repo
 * has now been caught by a vacuous scan three times.
 *
 * The trailing `[,:]` is what keeps it off the renderers: `agent-edit.tsx` and
 * `plan-review.tsx` write `confirmationToken={…}`, which is carrying a token
 * into a form, not spending one.
 */
const SPENDS = /\bconfirmationToken\s*[,:]/;

const spenders = (): string[] =>
  uiFiles.filter((f) => {
    const src = read(f);
    return SPENDS.test(src) && src.includes('.execute(');
  });

describe('a refusal reaches the person', () => {
  it('every confirmation-spending action routes the refusal somewhere', () => {
    const unprotected = spenders().filter((f) => {
      const src = read(f);
      return !src.includes('spending(') && !/\btry\s*\{/.test(src);
    });

    expect(
      unprotected,
      'these spend a confirmation and let its refusal escape as a thrown error, ' +
        'which is a framework crash page for someone whose action succeeded',
    ).toEqual([]);
  });

  it('finds the spenders it is checking', () => {
    // Vacuity, the failure mode this repo has now hit three times: a scan that
    // stopped matching reports a clean tree by finding nothing in it.
    //
    // The floor used to sit "well under the real count" so a deleted page could
    // not break it. That is exactly why it did not fire: the scan found ten,
    // the floor asked for eight, and the eleventh spender was invisible. A
    // slack floor cannot tell a shrinking product from a shrinking scan.
    //
    // So it is pinned at the true count instead. It still permits growth --- a
    // new spender only makes this pass --- but any loss of reach has to be
    // acknowledged by editing this number, which is the point.
    expect(spenders().length).toBeGreaterThanOrEqual(11);
  });

  it('keeps the redirect outside the try, where Next requires it', () => {
    // The one way to satisfy the rule above and still be broken. `spending`
    // takes the redirect as a separate argument precisely so this cannot be
    // written by accident — but a hand-rolled `try` can still swallow a
    // NEXT_REDIRECT, so no spender may wrap a redirect in its own try block.
    const offenders: string[] = [];
    for (const f of spenders()) {
      for (const m of read(f).matchAll(/\btry\s*\{([\s\S]*?)\}\s*catch/g)) {
        if (/\bredirect\(/.test(m[1] ?? '')) offenders.push(f);
      }
    }
    expect(
      offenders,
      'redirect() throws NEXT_REDIRECT — a try around it catches the navigation itself',
    ).toEqual([]);
  });

  it('is spent through the one helper rather than re-derived per page', () => {
    // Ten copies of a narrow try/catch is ten chances to widen it by a line.
    // control.ts makes the same argument about className strings.
    //
    // Ten of the eleven spenders route through `spending()`. The eleventh is
    // `conditions/save`, whose hand-rolled try predates the helper and is
    // correct; it is counted out here rather than exempted invisibly.
    const viaHelper = spenders().filter((f) => read(f).includes('spending('));
    expect(viaHelper.length).toBeGreaterThanOrEqual(10);
  });
});
