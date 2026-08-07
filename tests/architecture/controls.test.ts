import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  CONTROL,
  LABEL,
} from '@/presentation/components/control.js';

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

  it('sets the control text weight rather than inheriting it', () => {
    // A `LABEL` that wraps its own control would otherwise push `font-medium`
    // into the input — Tailwind's preflight sets `font-weight: inherit` on form
    // elements. A control whose weight depends on what encloses it is this
    // file's defect one layer along.
    expect(CONTROL).toMatch(/\bfont-\w+/);
  });
});

/**
 * Every button and label wears one of the shared treatments, from one place.
 *
 * This scan is the one the block below used to say could not be written. It
 * could not: `agent-edit.tsx` was out of scope for the change that extracted
 * these constants and still spelled the old utilities out, so a use-scan would
 * have had to ship with an allowlist — and an allowlist is a hole nobody
 * removes. `the-last-stock-buttons-and-the-guard` swept that file, and swept
 * `condition-composer.tsx` with it: a surface written in the same merge as the
 * extraction, which had therefore never seen it. Eighteen labels and a submit,
 * already drifted, before any guard existed to notice. That is the drift this
 * scan exists to catch, arriving before the scan did.
 *
 * The two exclusions are read off the elements themselves rather than off a
 * list of files, so neither can rot into an allowlist.
 */
describe('every button and label uses the shared treatment', () => {
  const WEARS_BUTTON = /className=\{(?:BUTTON_PRIMARY|BUTTON_SECONDARY)\}/;
  // `className={LABEL}` or the composed form — `pipeline/[logId]` adds a width
  // to the label it puts beside a select, and composing onto the treatment is
  // not the same as replacing it.
  const WEARS_LABEL = /className=\{(?:LABEL|`[^`]*\$\{LABEL\}[^`]*`)\}/;

  it('renders no button or label styled by hand', () => {
    const offenders: string[] = [];

    for (const file of uiFiles) {
      const src = stripComments(read(file));

      for (const m of src.matchAll(/<button\b[^>]*>/gs)) {
        // Unlike the input scan, a button with no className is an offender
        // rather than a skip. That scan skips them because a checkbox is
        // deliberately unstyled; no button in this product is, so a bare
        // `<button>` is precisely the browser-default control this file is
        // named for.
        if (WEARS_BUTTON.test(m[0])) continue;
        offenders.push(`${file}: ${m[0].replace(/\s+/g, ' ').slice(0, 80)}`);
      }

      // Matched whole, open tag through close, because the one exclusion is a
      // property of the content: a label wrapping its own checkbox with the
      // text after it is an inline row, and `LABEL`'s `block` would break it.
      for (const m of src.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/gs)) {
        const open = m[0].slice(0, m[0].indexOf('>') + 1);
        if (/type=["']checkbox["']/.test(m[0])) continue;
        if (WEARS_LABEL.test(open)) continue;
        offenders.push(`${file}: ${open.replace(/\s+/g, ' ').slice(0, 80)}`);
      }
    }

    expect(offenders, 'these are styled per-file rather than from control.ts').toEqual([]);
  });

  it('finds the buttons and labels it is checking', () => {
    // Vacuity, the same failure mode as the control scan's: a regex that
    // stopped matching — a rename, a prop before `className`, a formatter
    // breaking the tag across lines — reports a clean tree by finding nothing
    // in it. The floors are well under the real counts, so this fails on a
    // broken scan and not on a deleted page.
    const buttons = uiFiles.flatMap((f) => [...stripComments(read(f)).matchAll(/<button\b[^>]*>/gs)]);
    const labels = uiFiles.flatMap((f) => [...stripComments(read(f)).matchAll(/<label\b[^>]*>/gs)]);
    expect(buttons.filter((m) => WEARS_BUTTON.test(m[0])).length).toBeGreaterThanOrEqual(20);
    expect(labels.filter((m) => WEARS_LABEL.test(m[0])).length).toBeGreaterThanOrEqual(30);
  });

  it('leaves the anchors to a person', () => {
    // Deliberately unscanned. A cancel sized as a button wears
    // `BUTTON_SECONDARY`; `<a className="underline">` inside a sentence is a
    // link and should look like one. Nothing in the tag tells the two apart, so
    // a scan over `<a>` would either force prose links into button shapes or
    // need the allowlist this file refuses. What is checkable is that both
    // spellings are still in use, i.e. that neither was quietly swept into the
    // other.
    const anchors = uiFiles.map((f) => stripComments(read(f))).join('\n');
    expect(anchors).toMatch(/<a[^>]*className=\{BUTTON_SECONDARY\}/);
    expect(anchors).toMatch(/<a[^>]*className="underline"/);
  });
});

/**
 * The button and label treatments, asserted on the constants themselves.
 *
 * These outlive the scan above rather than being replaced by it, because the
 * scan cannot see them: it proves every button wears one of the two constants,
 * and would stay green if `BUTTON_PRIMARY` were `bg-blue-600`. Wearing one
 * treatment and that treatment being made of tokens are two properties, and the
 * defect this file exists for was the second one.
 */
describe('the button and label treatments are made of tokens', () => {
  it('fills the primary from the accent role, not from a default', () => {
    // `bg-blue-600` is legible in both schemes and belongs to no design system.
    expect(BUTTON_PRIMARY).toMatch(/\bbg-accent-\w+/);
    expect(BUTTON_PRIMARY).toMatch(/\btext-accent-\w+/);
    expect(BUTTON_PRIMARY).toMatch(/\bhover:bg-accent-\w+/);
  });

  it('gives the secondary a token border and token text', () => {
    // The bare `border` is a width. Without a colour it falls through to
    // Tailwind's grey — the original defect, on a different element.
    expect(BUTTON_SECONDARY).toMatch(/\bborder-border-\w+/);
    expect(BUTTON_SECONDARY).toMatch(/\btext-text-\w+/);
  });

  it('states the label colour rather than inheriting it', () => {
    expect(LABEL).toMatch(/\btext-text-\w+/);
  });

  it('carries the radius from the token scale', () => {
    // `rounded` is Tailwind's 4px; `rounded-gc-2` is radius.2 from system.json,
    // and the two are not the same value.
    expect(BUTTON_PRIMARY).toMatch(/\brounded-gc-\w+/);
    expect(BUTTON_SECONDARY).toMatch(/\brounded-gc-\w+/);
  });

  it('meets the tap-target floor the design system states as a principle', () => {
    // 44px, which system.json requires in prose and gives no token for — its
    // space scale is 32px then 48px. DT-0002 spent Tailwind's `min-h-11` for the
    // same reason. Asserted so that dropping it is a test failure rather than a
    // quiet regression on touch. See `the-button-primitive-has-no-tokens`.
    expect(BUTTON_PRIMARY).toMatch(/\bmin-h-11\b/);
    expect(BUTTON_SECONDARY).toMatch(/\bmin-h-11\b/);
  });

  it('declares no focus ring of its own', () => {
    // `globals.css` draws one outline for every interactive element. A second
    // one here would be a second place to forget it, and the two could disagree.
    expect(BUTTON_PRIMARY).not.toMatch(/\bring-|\boutline-/);
    expect(BUTTON_SECONDARY).not.toMatch(/\bring-|\boutline-/);
  });

  it('is worn by the surface the treatments were taken from', () => {
    // Vacuity: these constants could satisfy every assertion above and be
    // imported by nothing. `plan-review.tsx` is where DT-0002 landed them, so it
    // is the one file that must not drift back to spelling them out.
    const panel = readFileSync(join('src', 'presentation', 'components', 'plan-review.tsx'), 'utf8');
    expect(panel).toMatch(/className=\{BUTTON_PRIMARY\}/);
    expect(panel).toMatch(/className=\{BUTTON_SECONDARY\}/);
  });

  it('is worn widely enough to be a treatment rather than a page style', () => {
    const uses = (needle: string) =>
      uiFiles.filter((f) => stripComments(read(f)).includes(needle)).length;
    // A treatment one page imports is a page's style, not a system's.
    expect(uses('className={BUTTON_PRIMARY}')).toBeGreaterThanOrEqual(8);
    expect(uses('className={BUTTON_SECONDARY}')).toBeGreaterThanOrEqual(8);
    expect(uses('className={LABEL}')).toBeGreaterThanOrEqual(8);
  });
});
