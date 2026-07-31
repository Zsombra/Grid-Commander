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
] as const;

for (const surface of SURFACES) {
  describe(surface.page, () => {
    const source = readFileSync(surface.page, 'utf8');

    it('reads the result of the write instead of discarding it', () => {
      expect(source).toMatch(surface.call);
      expect(source).toMatch(surface.refusal);
    });

    it('carries the reason the operation returned, not a rewording of it', () => {
      expect(source).toMatch(/problem=\$\{encodeURIComponent\(result\.reason\)\}/);
    });

    it('renders the refusal where the operator will see it', () => {
      expect(source).toMatch(/\{problem \? \(/);
      expect(source).toMatch(/role="alert"/);
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
