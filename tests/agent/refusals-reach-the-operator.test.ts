import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Four lifecycle actions, each pinned to the shape the rename fix established:
 * read the result, and send a refusal's reason back to the surface that was
 * acted from as `?problem=`, where the page renders it as an alert.
 *
 * These existed as silent drops — a not-permitted reactivate or archive
 * reloaded the page indistinguishable from success, and a refused restore
 * redirected to the roster exactly as success does. The general scan in
 * `tests/architecture/write-results.test.ts` keeps new drops out; this file
 * keeps the four fixes from regressing into *partial* reads, which the
 * textual scan cannot see (the restore action read its result for a year and
 * still discarded the `refused` arm).
 */

const SURFACES = [
  {
    page: 'app/(app)/agents/[id]/reactivate/page.tsx',
    call: /const result = await app\.setLifecycle\.execute/,
    refusal: /result\.kind === 'not-permitted'/,
  },
  {
    page: 'app/(app)/agents/[id]/archive/page.tsx',
    call: /const result = await app\.setLifecycle\.execute/,
    refusal: /result\.kind === 'not-permitted'/,
  },
  {
    page: 'app/(app)/strategies/[id]/archive/page.tsx',
    call: /const result = await app\.setStrategyActive\.execute/,
    refusal: /result\.kind === 'refused' \|\| result\.kind === 'repair-required'/,
  },
  {
    page: 'app/(app)/strategies/[id]/restore/page.tsx',
    call: /const result = await app\.setStrategyActive\.execute/,
    refusal: /result\.kind === 'refused'/,
  },
  {
    // A platform refusal of this perform arrives as a *throw* — live-confirmed
    // CONFLICT, 2026-08-12 — which the textual scan in write-results.test.ts
    // cannot see: the call site reads its result perfectly and still rendered
    // a framework error page. The refused arm is what makes it an outcome.
    page: 'app/(app)/agents/[id]/rebind/page.tsx',
    call: /const result = await app\.rebindAgent\.execute/,
    refusal: /result\.kind === 'destination-moved' \|\| result\.kind === 'refused'/,
  },
] as const;

/**
 * Refusals that ride in on the URL, on the branch that renders next.
 *
 * Distinct from the four above: those are about an action reading its own
 * result. These are about a *page* not discarding a reason it was handed
 * because its own re-read then failed — the third shape of the
 * dropped-redirect class, after `/connect` and `/pending`.
 */
const CARRY_PROBLEM = [
  'app/(app)/agents/[id]/rebind/page.tsx',
  'app/(app)/agents/[id]/deploy/page.tsx',
  'app/(app)/agents/[id]/undeploy/[coin]/page.tsx',
  'app/(app)/strategies/[id]/archive/page.tsx',
  'app/(app)/strategies/[id]/restore/page.tsx',
  'app/(app)/strategies/[id]/fork/page.tsx',
] as const;

describe('a carried reason survives the branch that renders next', () => {
  for (const page of CARRY_PROBLEM) {
    it(`${page} renders it on every branch, not merely on some`, () => {
      const source = readFileSync(page, 'utf8');
      // Every branch of these pages renders its own <main>, so counting them
      // counts the branches. The first cut of this test asked for "two or
      // more", which passed while five branches across three pages still
      // dropped the reason — a floor is not the property. The property is
      // that no branch is missing it, and `CarriedProblem` renders null when
      // there is nothing to say, so every branch can carry it unconditionally.
      const branches = source.match(/<main[\s>]/g) ?? [];
      const carried = source.match(/<CarriedProblem[\s/>]/g) ?? [];
      expect(branches.length, 'no render branches found — the scan drifted').toBeGreaterThan(0);
      expect(
        carried.length,
        `${branches.length} render branches, ${carried.length} carry the reason — ` +
          'a branch that drops it loses the only record of what the click did',
      ).toBe(branches.length);
    });

    it(`${page} renders the shared component rather than its own copy`, () => {
      const source = readFileSync(page, 'utf8');
      // Fifteen hand-rolled copies of one paragraph is how the treatment
      // drifts and how a branch gets forgotten — the defect WhyNotLoaded was
      // extracted to stop, one paragraph along.
      expect(source).not.toMatch(/\{problem \? \(/);
    });
  }
});

describe('an action that could not attempt the operation says so', () => {
  const LIFECYCLE = [
    'app/(app)/strategies/[id]/archive/page.tsx',
    'app/(app)/strategies/[id]/restore/page.tsx',
    'app/(app)/strategies/[id]/fork/page.tsx',
  ] as const;

  for (const page of LIFECYCLE) {
    it(`${page} bounces a failed re-read instead of landing on the roster`, () => {
      const source = readFileSync(page, 'utf8');
      // The re-read's own failure is read...
      expect(source).toMatch(/reread\.kind === 'unreadable'/);
      // ...and both non-attempt paths say nothing was attempted.
      const nothing = source.match(/Nothing was attempted/g) ?? [];
      expect(nothing.length).toBeGreaterThanOrEqual(2);
      // The bare roster redirect that swallowed them is gone.
      expect(source).not.toMatch(/if \(!listing\) redirect\('\/strategies'\)/);
    });
  }
});

for (const surface of SURFACES) {
  describe(surface.page, () => {
    const source = readFileSync(surface.page, 'utf8');

    it('reads the result of the write instead of discarding it', () => {
      expect(source).toMatch(surface.call);
      expect(source).toMatch(surface.refusal);
    });

    it('carries the reason the operation returned, not a rewording of it', () => {
      // Two spellings, both verbatim and both encoded: the inline template
      // most pages use, and URLSearchParams where a second parameter travels
      // with it (rebind carries `to=` as well). What matters is that
      // `result.reason` is what goes into `problem`, unglossed — a rewording
      // would fail both.
      expect(source).toMatch(
        /problem=\$\{encodeURIComponent\(result\.reason\)\}|problem: result\.reason/,
      );
    });

    it('renders the refusal where the operator will see it', () => {
      // Through the shared component since `the-outcome-reaches-the-person`:
      // it carries the role=alert and the "Refused:" prefix that used to be
      // hand-rolled per branch. Pages that mint a `?problem=` but render
      // their own surface a different way are matched by the second arm.
      expect(source).toMatch(/<CarriedProblem[\s/>]|\{problem \? \(/);
      expect(source).toMatch(/role="alert"|<CarriedProblem[\s/>]/);
    });

    it('stays out of the domain', () => {
      expect(source, 'app/ may not import the domain').not.toMatch(/@\/domain\//);
    });
  });
}

describe('the restore page keeps its dedicated repair-required rendering', () => {
  it('repair-required is guidance, not a problem banner', () => {
    // `repair-required` is not a failure — the platform declined and said what
    // would work instead. Folding it into `?problem=` would render guidance as
    // an alert; the restore action must keep routing it to its own outcome.
    const source = readFileSync('app/(app)/strategies/[id]/restore/page.tsx', 'utf8');
    expect(source).toMatch(/outcome=repair-required/);
    expect(source).toMatch(/REPAIR_REQUIRED_GUIDANCE/);
  });
});
