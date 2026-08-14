import { readdirSync, readFileSync, statSync } from 'node:fs';
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

/**
 * `const result = await <tool>.execute` — through the `spending()` wrapper or not.
 *
 * #232 moved every confirmation-spending call inside
 * `spending(() => app.X.execute(…))`, so the execute is no longer adjacent to
 * the binding. The property these rows assert is unchanged — the action *reads*
 * its result — and only its spelling moved, so the matcher follows it rather
 * than the rows being edited one by one into whichever shape shipped last.
 *
 * Deliberately not `[\s\S]*`: an unbounded gap would let `const result` bind
 * something else entirely and still match the execute further down the file,
 * which is how a scanner stops being one.
 */
const reads = (tool: string): RegExp =>
  new RegExp(`const result = await (?:spending\\([\\s\\S]{0,80})?app\\.${tool}\\.execute`);

const SURFACES = [
  {
    page: 'app/(app)/agents/[id]/reactivate/page.tsx',
    call: reads('setLifecycle'),
    refusal: /result\.kind === 'not-permitted'/,
  },
  {
    page: 'app/(app)/agents/[id]/archive/page.tsx',
    call: reads('setLifecycle'),
    refusal: /result\.kind === 'not-permitted'/,
  },
  {
    page: 'app/(app)/strategies/[id]/archive/page.tsx',
    call: reads('setStrategyActive'),
    refusal: /result\.kind === 'refused' \|\| result\.kind === 'repair-required'/,
  },
  {
    page: 'app/(app)/strategies/[id]/restore/page.tsx',
    call: reads('setStrategyActive'),
    refusal: /result\.kind === 'refused'/,
  },
  {
    // A platform refusal of this perform arrives as a *throw* — live-confirmed
    // CONFLICT, 2026-08-12 — which the textual scan in write-results.test.ts
    // cannot see: the call site reads its result perfectly and still rendered
    // a framework error page. The refused arm is what makes it an outcome.
    page: 'app/(app)/agents/[id]/rebind/page.tsx',
    call: reads('rebindAgent'),
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
  // Added after the post-round re-survey found both mounting the banner on one
  // branch each: the list was written from the pages one change happened to
  // touch, which is not the same as the pages the rule applies to.
  'app/(app)/agents/[id]/reactivate/page.tsx',
  'app/(app)/recorder/trim/page.tsx',
  // Every branch of the create page is a branch a bounce can land on — a
  // refused create arrives at capacity or without a catalog by construction.
  'app/(app)/agents/new/page.tsx',
  // The last KNOWN_SILENT ledger row, reconciled onto the shared component by
  // `a-bounced-reason-survives-the-agent-editor` (#255): seven branches,
  // seven mounts, and the form's own banner is CarriedProblem now too.
  'app/(app)/agents/[id]/edit/page.tsx',
] as const;

describe('one spelling of a carried refusal, product-wide', () => {
  // The narrow guard below asks the six pages of `the-outcome-reaches-the-person`
  // to use the shared component. It could not see the five copies elsewhere that
  // had already drifted: `/pending` had lost the semibold "Refused:" prefix, and
  // the agent detail page rendered a refusal in the *consequence* role — the one
  // place in the product that called a refusal something other than a refusal,
  // on a branch nothing could reach. Both were found by reading, not by a check,
  // which is the gap this closes.
  const uiFiles = (function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = `${dir}/${entry}`;
      if (statSync(full).isDirectory()) walk(full, out);
      else if (full.endsWith('.tsx')) out.push(full);
    }
    return out;
  })('app').concat(
    (function walk(dir: string, out: string[] = []): string[] {
      for (const entry of readdirSync(dir)) {
        const full = `${dir}/${entry}`;
        if (statSync(full).isDirectory()) walk(full, out);
        else if (full.endsWith('.tsx')) out.push(full);
      }
      return out;
    })('src/presentation'),
  );

  // `{problem ? (` was the first spelling of this check, and it had a hole:
  // the rule editor writes `{problem ? <p …>` on one line, with no paren, and
  // sailed through a guard whose whole claim was "product-wide". Third time in
  // one session that a check could not fail on the thing it was written for —
  // the pattern is always the same, a rule written against the shape of the
  // one example in front of it. `[(<]` covers both, and anything else that
  // opens an element. `(?:\?|&&)` closes the second hole the same way: the
  // agent editor wrote `{problem && <p` and evaded a matcher that knew only
  // the ternary (#255) — widened together with that page's fix, not before,
  // so the ledger row recording the evasion never went stale while it stood.
  const HAND_ROLLED = /\{problem (?:\?|&&)\s*[(<]/;

  it('nothing hand-rolls the banner CarriedProblem owns', () => {
    const handRolled = uiFiles.filter((f) => HAND_ROLLED.test(readFileSync(f, 'utf8')));
    expect(
      handRolled,
      'a copy of this paragraph is how the prefix and the role drifted the first time',
    ).toEqual([]);
  });

  it('sees the surfaces it is checking', () => {
    // Vacuous-pass insurance: a path drift would report zero files and zero
    // offenders, which reads identically to compliance.
    expect(uiFiles.length).toBeGreaterThan(40);
    expect(
      uiFiles.some((f) => readFileSync(f, 'utf8').includes('<CarriedProblem')),
      'no page renders the shared component — the scan is looking in the wrong place',
    ).toBe(true);
  });
});

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
      // extracted to stop, one paragraph along. Both spellings, same property
      // as HAND_ROLLED above — a matcher split between them recreates the
      // one-spelling hole one guard over.
      expect(source).not.toMatch(/\{problem (?:\?|&&)\s*[(<]/);
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
      expect(source).toMatch(/<CarriedProblem[\s/>]|\{problem \?\s*[(<]/);
      expect(source).toMatch(/role="alert"|<CarriedProblem[\s/>]/);
    });

    it('stays out of the domain', () => {
      expect(source, 'app/ may not import the domain').not.toMatch(/@\/domain\//);
    });
  });
}

describe('the create action reads every arm the union carries', () => {
  /**
   * "Reads the result" is not "reads every arm the union carries." The general
   * scan in `write-results.test.ts` sees a binding and is satisfied; this
   * action branched on `created` (later `duplicate`) and let `at-capacity`,
   * `invalid` and `no-catalog` fall off the end for the life of the route —
   * the refused press returned undefined and the page re-rendered unchanged
   * (#245). It is the synonym-mutation lens applied to a result union instead
   * of a spelling: the compliant-looking read is the disguise.
   *
   * These pins hold the spelling of each arm's read; the `satisfies never`
   * tail in the action makes a *new* arm a typecheck failure rather than a
   * fourth silent one.
   */
  const source = readFileSync('app/(app)/agents/new/page.tsx', 'utf8');

  it('reads the result of the create at all', () => {
    expect(source).toMatch(/const result = await app\.createAgent\.execute/);
  });

  it('branches on every arm, by name', () => {
    for (const arm of ['created', 'duplicate', 'at-capacity', 'no-catalog', 'invalid']) {
      expect(source, `the '${arm}' arm must be read — a missing arm is a press that does nothing`)
        .toContain(`'${arm}'`);
    }
  });

  it('a new arm cannot fall off the end again', () => {
    expect(
      source,
      'the exhaustive tail is what turns a sixth arm into a typecheck failure',
    ).toContain('satisfies never');
  });

  it('carries the reason each refusal returned, unglossed', () => {
    expect(source).toContain('backTo(result.explanation)');
    expect(source).toContain('backTo(result.reason)');
    expect(source).toContain('result.issues.map((i) => `${i.field}: ${i.reason}`)');
  });

  it('the composition rides the bounce; the dedupe key and framework transport do not', () => {
    expect(source).toContain("k === 'idempotencyKey' || k.startsWith('$ACTION')");
  });
});

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
