import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A confirmation is agreed to by a person, or it is paperwork.
 *
 * `update-cannot-carry-a-confirmation` wrote this down under *The fix that
 * would be wrong*:
 *
 * > Issuing the confirmation inside `UpdateAgentCommand`, immediately before
 * > the call. It makes the guard pass and means nothing: a confirmation the
 * > product grants itself records that the product intended to proceed, which
 * > was never in doubt.
 *
 * The fix landed in the command — and the same shape reappeared one layer out,
 * in the server action:
 *
 * ```ts
 * const proposed = await app.describeEdit.execute({ …, changes });
 * // …four lines later, same request, nobody has seen anything…
 * confirmationToken: proposed.proposal.confirmationToken,
 * ```
 *
 * `proposed.proposal.consequence` was computed, stored against the token for the
 * audit, and discarded. The guard passed because a token existed; the token
 * existed because the product minted one for itself.
 *
 * So the property is not "a token is supplied". It is **two requests** — one
 * that names the consequence and renders it, and a later one the person
 * initiated that spends the token. A single function that does both cannot have
 * shown anyone anything, whatever its comments say.
 */

const ROOTS = ['app', 'src'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const files = ROOTS.flatMap((r) => walk(r));
const read = (f: string) => readFileSync(f, 'utf8');

/** Bodies of every `'use server'` function, one per exported action. */
function serverActions(): Array<{ file: string; name: string; body: string }> {
  const found: Array<{ file: string; name: string; body: string }> = [];
  for (const file of files) {
    const src = read(file);
    if (!src.includes("'use server'")) continue;
    for (const m of src.matchAll(/export\s+async\s+function\s+(\w+)\s*\([^)]*\)[^{]*\{/g)) {
      const start = (m.index ?? 0) + m[0].length;
      // Brace-match to the end of the function rather than guessing at a
      // terminator — an action containing a nested block would otherwise be
      // truncated and read as clean.
      let depth = 1;
      let i = start;
      while (i < src.length && depth > 0) {
        const c = src[i];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        i++;
      }
      found.push({ file, name: m[1] as string, body: src.slice(start, i) });
    }
  }
  return found;
}

/**
 * Derived, not listed. Naming the pairs by hand would pass while a seventh
 * operation was added.
 *
 * **`PERFORMS` looks for the call, not for the token.** The first version
 * matched `confirmationToken:` with a negative lookahead for `formData` — and a
 * re-injection walked straight through it, because
 *
 * ```ts
 * const confirmationToken = proposed.proposal.confirmationToken;
 * await app.updateAgent.execute({ …, confirmationToken });   // shorthand
 * ```
 *
 * has no colon after the name. The guard would have missed the exact defect it
 * was written for, dressed slightly differently. How the token is threaded is
 * incidental; what matters is that one request both named a consequence and
 * carried out the operation, so nobody can have read anything in between.
 */
const MINTS = /\bapp\.(describe|propose)[A-Z]\w*\.execute\s*\(/;
const PERFORMS = /\bapp\.(?!describe|propose)[a-z]\w*\.execute\s*\(/;

describe('no server action both issues a confirmation and spends it', () => {
  it('leaves the agreement to a second request', () => {
    const offenders = serverActions()
      .filter((a) => MINTS.test(a.body) && PERFORMS.test(a.body))
      .map((a) => `${a.file}: ${a.name} proposes and performs in one request`);

    expect(
      offenders,
      'the consequence is computed, stored, and read by nobody',
    ).toEqual([]);
  });

  /**
   * The vacuity check, corrected by its own subject.
   *
   * This originally required some action to mint a token — and the fix made
   * that false, because minting moved out of actions entirely and into page
   * render, which is where it belongs. A page render is a GET the user
   * navigated to; a server action is a POST. Insisting an *action* mints one
   * would have re-required the thing this file forbids.
   *
   * So: somewhere mints, somewhere spends, and they are not the same function.
   */
  it('found the code it is checking', () => {
    const actions = serverActions();
    expect(actions.length).toBeGreaterThan(8);
    expect(actions.some((a) => PERFORMS.test(a.body)), 'no action performs anything').toBe(true);
    const mintsSomewhere = files.some((f) => MINTS.test(read(f)));
    expect(mintsSomewhere, 'nothing anywhere mints a confirmation').toBe(true);
  });

  /**
   * The other half: a token that comes off the submitted form is one a person
   * was shown on a previous page. That is the shape this file is asking for, so
   * it must be visible somewhere or the check above is satisfiable by having no
   * confirmed operations at all.
   */
  it('has at least one operation confirmed the right way round', () => {
    const fromForm = serverActions().filter((a) =>
      /confirmationToken:\s*(requiredText|formData)/.test(a.body),
    );
    expect(
      fromForm.map((a) => a.name).length,
      'no action spends a token that came back from a rendered form',
    ).toBeGreaterThan(0);
  });
});
