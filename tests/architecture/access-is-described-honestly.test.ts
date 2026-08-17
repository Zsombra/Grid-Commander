import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { slashed } from '../support/source-tree.js';

/**
 * No rendered surface may call the connection read-only.
 *
 * The requirement ("Configuration Authority Is Described Honestly") and its
 * first guard (`tests/connection/consent.test.ts`) both predate this file —
 * and the wager-authority panel still shipped "it connects read-only" (#234),
 * because that guard scans `DescribeGrantQuery` and `describeScope`, and a
 * hand-written sentence on any other surface never passes through either.
 * `mcp:read` archives agents and applies strategy plans; an operator who
 * reads "read-only" in the one panel that exists to state authority walks
 * away believing the opposite of the product's first domain fact.
 *
 * Negated uses stay legal — "This is not view-only access" in the consent
 * summary is the requirement speaking in its own voice.
 */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx')) out.push(slashed(full));
  }
  return out;
}

const uiFiles = [...walk('app'), ...walk('src/presentation')];

/** Comments are not copy: block, line, and JSX comments all strip the same way. */
const stripComments = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

// A real separator is required: `readonly`/`Readonly` are TypeScript, not
// copy, and matching them reports the type system instead of the product.
const CLAIM = /(?:read|view)[-\s]only/gi;

/**
 * Every un-negated read-only/view-only claim in `src`, as the text around it.
 *
 * "not view-only" (any small gap) is the legal, requirement-voiced form; a
 * claim without that negation nearby is the one that misleads. The window is
 * deliberately short — a "not" a sentence away does not negate this clause.
 */
function dishonestClaimsIn(src: string): string[] {
  const text = stripComments(src);
  const out: string[] = [];
  for (const m of text.matchAll(CLAIM)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 12), m.index ?? 0);
    if (/\bnot\b/i.test(before)) continue;
    const start = Math.max(0, (m.index ?? 0) - 40);
    out.push(text.slice(start, (m.index ?? 0) + m[0].length).replace(/\s+/g, ' ').trim());
  }
  return out;
}

describe('the access is described honestly, on every surface', () => {
  it('no rendered copy calls the connection read-only or view-only', () => {
    const offenders = uiFiles.flatMap((f) =>
      dishonestClaimsIn(readFileSync(f, 'utf8')).map((claim) => `${f}: …${claim}`),
    );
    expect(
      offenders,
      'mcp:read archives agents and applies strategy plans — a surface calling it ' +
        'read-only tells the operator the opposite of domain fact 1',
    ).toEqual([]);
  });

  it('is scanning surfaces that really render authority copy', () => {
    // Vacuity: the corpus must contain the negated consent line this guard
    // deliberately permits — if the walk or the stripper loses it, the clean
    // report above is a report about nothing.
    expect(uiFiles.length).toBeGreaterThan(40);
    const consent = readFileSync('src/presentation/components/consent-summary.tsx', 'utf8');
    expect(stripComments(consent)).toMatch(/not view-only/);
    expect(dishonestClaimsIn(consent), 'the negated form is legal').toEqual([]);
  });

  /**
   * The proof drives the same matcher the live scan uses (harness-integrity:
   * "An Architecture Guard Fails When Its Own Matcher Stops Working"). The
   * planted offender is the sentence that actually shipped, so the proof
   * cannot go quiet just because the product is clean today.
   */
  it('the matcher catches the shipped sentence, planted', () => {
    const shipped =
      'cannot place one: it connects read-only and never requests the wager scope.';
    expect(dishonestClaimsIn(shipped)).toHaveLength(1);
    expect(dishonestClaimsIn('view only access to your account')).toHaveLength(1);
  });

  it('the matcher stays quiet on inputs it must not report', () => {
    expect(dishonestClaimsIn('This is not view-only access.')).toEqual([]);
    expect(dishonestClaimsIn('// describing it as read-only would be a lie')).toEqual([]);
    expect(dishonestClaimsIn('{/* read-only — so it is a question */}')).toEqual([]);
    expect(dishonestClaimsIn('the record is trimmed before a date')).toEqual([]);
    expect(dishonestClaimsIn('readonly foo: Readonly<string[]>'), 'types are not copy').toEqual(
      [],
    );
  });
});
