import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTROL } from '@/presentation/components/control.js';

/**
 * Form controls carry the design system's tokens, from one place.
 *
 * Every input, select and textarea in this product was
 * `w-full rounded border p-2` — seven byte-identical copies, none touching a
 * token, so each rendered as a white box in dark mode beside panels that were
 * themed. `tailwind-classes-with-no-tailwind` made the utilities real and
 * DT-0001 generated the tokens; neither pass touched form controls, which is how
 * they stayed the one family of elements styled by browser defaults.
 *
 * The check that matters is not "does it look right" — that needs eyes, and it
 * got them. It is that the treatment has **one source**. Seven copies of a
 * token-based className would be the same defect one layer along.
 */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(full)) out.push(full);
  }
  return out;
}

const uiFiles = [...walk('app'), ...walk('src/presentation')];
const read = (f: string) => readFileSync(f, 'utf8');

/** Drop comments, so a file may explain the old treatment without carrying it. */
const stripComments = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');

describe('every form control uses the shared treatment', () => {
  it('renders no control styled by browser defaults', () => {
    const offenders: string[] = [];

    for (const file of uiFiles) {
      const src = stripComments(read(file));
      for (const m of src.matchAll(/<(?:input|select|textarea)\b[^>]*>/gs)) {
        const tag = m[0];
        if (!/className=/.test(tag)) continue;
        // A hidden input carries a value and is never seen.
        if (/type=["']hidden["']/.test(tag)) continue;
        if (/className=\{CONTROL\}/.test(tag)) continue;
        offenders.push(`${file}: ${tag.replace(/\s+/g, ' ').slice(0, 80)}`);
      }
    }

    expect(offenders, 'these are styled per-file rather than from control.ts').toEqual([]);
  });

  it('finds the controls it is checking', () => {
    // Passing vacuously is the failure mode; this check would be green on a
    // product with no forms at all.
    const controls = uiFiles.flatMap((f) => [
      ...stripComments(read(f)).matchAll(/<(?:input|select|textarea)\b[^>]*className=\{CONTROL\}/gs),
    ]);
    expect(controls.length).toBeGreaterThanOrEqual(7);
  });
});

describe('the treatment itself is made of tokens', () => {
  it('sets a background, so the browser does not', () => {
    // The whole defect: with no background the control is white, whatever the
    // page around it is doing.
    expect(CONTROL).toMatch(/\bbg-bg-\w+/);
  });

  it('uses token colours rather than Tailwind defaults', () => {
    // The bare `border` is the *width*; `border-border-default` is the colour,
    // and Tailwind needs both. The defect was a width with no colour, which
    // falls through to Tailwind's grey — so what matters is that the colour
    // classes are present, not that the width class is absent. A first version
    // of this test asserted the opposite and failed against correct code.
    expect(CONTROL).toMatch(/\bborder-border-\w+/);
    expect(CONTROL).toMatch(/\btext-text-\w+/);
  });

  it('uses the focus token that nothing used', () => {
    expect(CONTROL).toMatch(/ring-focus/);
  });

  it('rings only on keyboard focus', () => {
    // `focus:` would draw a ring on every mouse click — noise for one user and
    // the only signal for another.
    expect(CONTROL).toMatch(/focus-visible:/);
    expect(CONTROL).not.toMatch(/(^|\s)focus:(?!visible)/);
  });
});
