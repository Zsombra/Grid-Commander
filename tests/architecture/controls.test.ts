import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  CHECKBOX,
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

/**
 * The scanners, named once so the rule and its count read the same source.
 *
 * They were two regexes: one scanning for offenders, a second, narrower one
 * counting what had been found. Audited 2026-08-10 by mutation (GitHub #87) —
 * killing the scan left the count satisfied by its own separate literal, so the
 * file passed 18/18 having examined nothing. A corpus floor built on a different
 * pattern from the rule it vouches for is not a floor.
 *
 * It is silenceable the other way too: widening an exclusion until it matches
 * everything also passes 18/18, because `filter(...).length >= 20` is satisfied
 * by a predicate that accepts every input. Both directions are proven at the
 * bottom of this file.
 */
const controlTags = (src: string): string[] =>
  [...src.matchAll(/<(?:input|select|textarea)\b[^>]*>/gs)].map((m) => m[0]);

const hasClassName = (tag: string): boolean => /className=/.test(tag);
/** A hidden input carries a value and is never seen. */
const isHidden = (tag: string): boolean => /type=["']hidden["']/.test(tag);
// A checkbox never wears CONTROL — that string is a text box's clothes — so
// the shared treatment it does wear (CHECKBOX, DT-0015) passes the guard too.
const WEARS_CONTROL = /className=\{(?:CONTROL|CHECKBOX)\}/;

describe('every form control uses the shared treatment', () => {
  it('renders no control styled by browser defaults', () => {
    const offenders: string[] = [];

    for (const file of uiFiles) {
      for (const tag of controlTags(stripComments(read(file)))) {
        if (!hasClassName(tag)) continue;
        if (isHidden(tag)) continue;
        if (WEARS_CONTROL.test(tag)) continue;
        offenders.push(`${file}: ${tag.replace(/\s+/g, ' ').slice(0, 80)}`);
      }
    }

    expect(offenders, 'these are styled per-file rather than from control.ts').toEqual([]);
  });

  it('finds the controls it is checking', () => {
    // Passing vacuously is the failure mode; this check would be green on a
    // product with no forms at all. Counted through the same scanner the rule
    // uses, so a dead scan cannot leave this floor standing.
    const controls = uiFiles
      .flatMap((f) => controlTags(stripComments(read(f))))
      .filter((tag) => WEARS_CONTROL.test(tag));
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

  it('tints the checkbox with the accent token, and nothing else', () => {
    // `accent-color` is the whole treatment (DT-0015): the native box already
    // renders its own states, so anything beyond the tint would be
    // re-implementing a control the browser draws correctly.
    expect(CHECKBOX).toMatch(/\baccent-accent-\w+/);
    expect(CHECKBOX).not.toMatch(/\bbg-|\bborder-|\bappearance-none\b/);
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
// `className={BUTTON_*}` or the composed form — DT-0004 has the archive page
// add `w-full tablet:w-auto` for the mobile stack, and composing onto the
// treatment is not the same as replacing it.
const WEARS_BUTTON =
  /className=\{(?:BUTTON_(?:PRIMARY|SECONDARY)|`[^`]*\$\{BUTTON_(?:PRIMARY|SECONDARY)\}[^`]*`)\}/;
// `className={LABEL}` or the composed form — `pipeline/[logId]` adds a width to
// the label it puts beside a select, and composing onto the treatment is not the
// same as replacing it.
const WEARS_LABEL = /className=\{(?:LABEL|`[^`]*\$\{LABEL\}[^`]*`)\}/;

const buttonTags = (src: string): string[] => [...src.matchAll(/<button\b[^>]*>/gs)].map((m) => m[0]);

/**
 * `<PerformButton>` is a button wearing `BUTTON_PRIMARY`, one indirection out.
 *
 * DT-0022 moved every perform submit behind it, so a scanner that reads only
 * `<button>` tags now watches the treatment vanish from fourteen surfaces and
 * reports a clean tree — the exact vacuity the floors below exist to catch,
 * arriving through a refactor rather than through a rename.
 *
 * Counted as a wearer rather than excluded, because it is one: the constant is
 * spent in `perform-button.tsx` and every use of the component inherits it.
 */
const performTags = (src: string): string[] =>
  [...src.matchAll(/<PerformButton\b[^>]*>/gs)].map((m) => m[0]);

/**
 * Matched whole, open tag through close, because the one exclusion is a property
 * of the content: a label wrapping its own checkbox with the text after it is an
 * inline row, and `LABEL`'s `block` would break it.
 */
const labelBlocks = (src: string): string[] =>
  [...src.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/gs)].map((m) => m[0]);

const openTagOf = (block: string): string => block.slice(0, block.indexOf('>') + 1);
const wrapsACheckbox = (block: string): boolean => /type=["']checkbox["']/.test(block);

describe('every button and label uses the shared treatment', () => {
  it('renders no button or label styled by hand', () => {
    const offenders: string[] = [];

    for (const file of uiFiles) {
      const src = stripComments(read(file));

      for (const tag of buttonTags(src)) {
        // Unlike the input scan, a button with no className is an offender
        // rather than a skip. That scan skips them because a checkbox is
        // deliberately unstyled; no button in this product is, so a bare
        // `<button>` is precisely the browser-default control this file is
        // named for.
        if (WEARS_BUTTON.test(tag)) continue;
        offenders.push(`${file}: ${tag.replace(/\s+/g, ' ').slice(0, 80)}`);
      }

      for (const block of labelBlocks(src)) {
        const open = openTagOf(block);
        if (wrapsACheckbox(block)) continue;
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
    // Counted through the same scanners the rule above uses. They were separate
    // literals, which is why killing the scan left these floors standing.
    const buttons = uiFiles.flatMap((f) => buttonTags(stripComments(read(f))));
    const performs = uiFiles.flatMap((f) => performTags(stripComments(read(f))));
    const labels = uiFiles.flatMap((f) => labelBlocks(stripComments(read(f))).map(openTagOf));
    // `<PerformButton>` counts toward the floor: it wears BUTTON_PRIMARY in its
    // own file, so a submit that moved behind it is still a submit wearing the
    // treatment. Without this the floor would have to be lowered to accommodate
    // a refactor that removed nothing — which is how an anti-vacuity floor
    // stops being one.
    const wearing = buttons.filter((t) => WEARS_BUTTON.test(t)).length + performs.length;
    expect(wearing).toBeGreaterThanOrEqual(20);
    expect(labels.filter((t) => WEARS_LABEL.test(t)).length).toBeGreaterThanOrEqual(30);
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
    // 44px, which system.json requires in prose and — since DT-0003 — provides
    // as `size.control.min`, worn as the generated `min-h-control`. Asserted so
    // that dropping it is a test failure rather than a quiet regression on
    // touch, and so nobody reintroduces the raw `min-h-11` it replaced.
    expect(BUTTON_PRIMARY).toMatch(/\bmin-h-control\b/);
    expect(BUTTON_SECONDARY).toMatch(/\bmin-h-control\b/);
    expect(BUTTON_PRIMARY).not.toMatch(/\bmin-h-11\b/);
    expect(BUTTON_SECONDARY).not.toMatch(/\bmin-h-11\b/);
  });

  it('the tap-target utility is real, not a class Tailwind silently drops', () => {
    // Tailwind ignores a utility its theme does not define — `min-h-control`
    // with no `minHeight.control` entry compiles to nothing and both buttons
    // quietly lose their 44px. The chain asserted whole: system.json states
    // the value, the generated theme maps the utility to its variable, and the
    // generated CSS gives the variable that value.
    const system = JSON.parse(readFileSync(join('openspec', 'design', 'system.json'), 'utf8'));
    expect(system.tokens.size.control.min).toBe('44px');
    const theme = JSON.parse(readFileSync('tailwind.theme.json', 'utf8'));
    expect(theme.extend.minHeight.control).toBe('var(--gc-size-control-min)');
    expect(readFileSync(join('app', 'tokens.css'), 'utf8')).toContain('--gc-size-control-min: 44px;');
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
    expect(panel).toMatch(/className=\{BUTTON_SECONDARY\}/);
    /**
     * BUTTON_PRIMARY's home moved, and this follows it rather than relaxing.
     *
     * DT-0002 landed both constants in `plan-review.tsx`, which is why that file
     * anchors them. DT-0022 then put every perform submit behind
     * `PerformButton`, so the primary treatment is now spent in exactly one
     * place. One deliberate wearer is a stronger guarantee than eight
     * incidental ones — but only if this test names it, or the constant could
     * again satisfy every assertion above while being imported by nothing.
     */
    const perform = readFileSync(join('src', 'presentation', 'components', 'perform-button.tsx'), 'utf8');
    expect(perform).toMatch(/BUTTON_PRIMARY/);
  });

  it('is worn widely enough to be a treatment rather than a page style', () => {
    const uses = (needle: string) =>
      uiFiles.filter((f) => stripComments(read(f)).includes(needle)).length;
    // A treatment one page imports is a page's style, not a system's.
    expect(uses('className={BUTTON_SECONDARY}')).toBeGreaterThanOrEqual(8);
    expect(uses('className={LABEL}')).toBeGreaterThanOrEqual(8);
    /**
     * BUTTON_PRIMARY is measured through its component now, deliberately.
     *
     * DT-0022 gave it one wearer and fourteen surfaces reach it through that,
     * so counting files that name the constant would report 1 and read as a
     * treatment nobody uses — the opposite of the truth. What has to stay true
     * is that the component is spread as widely as the constant used to be, so
     * that is what is counted.
     */
    expect(uses('<PerformButton')).toBeGreaterThanOrEqual(8);
  });
});

/**
 * The scanners and exclusions, fed markup they must report and markup they must
 * not.
 *
 * Audited 2026-08-10 by mutation (GitHub #87). This file is silenceable in
 * **both** directions and was proven in neither:
 *
 *  - Kill the scan and it passes 18/18, because every count was built on its own
 *    separate literal rather than on the scanner it vouches for.
 *  - Widen an exclusion to match everything and it passes 18/18 too, because a
 *    `length >= 20` floor is satisfied by a predicate that accepts every input.
 *
 * The second is the one that gets missed. A blind matcher and a permissive one
 * silence a rule equally, and only the blind one feels like a bug.
 */
describe('the scanners catch what they were written for', () => {
  it('finds a control however the tag is written', () => {
    expect(controlTags('<input className="x" />')).toHaveLength(1);
    expect(controlTags('<select className={CONTROL}>')).toHaveLength(1);
    // Broken across lines by a formatter — the shape a `[^>]*` without `s`
    // would miss, and the reason the flag is there.
    expect(controlTags('<textarea\n  name="notes"\n  className={CONTROL}\n/>')).toHaveLength(1);
    expect(controlTags('<input /><select />')).toHaveLength(2);
  });

  it('finds no control in markup that has none', () => {
    expect(controlTags('<div className="input-like">not a control</div>')).toEqual([]);
  });

  it('reports a hand-styled control and passes the treated one', () => {
    // The rule itself, end to end, on markup rather than on the tree.
    const offending = '<input className="border rounded px-2" />';
    const treated = '<input className={CONTROL} />';
    const hidden = '<input type="hidden" className="x" value={t} />';
    const unstyled = '<input type="checkbox" />';

    const judge = (tag: string) => hasClassName(tag) && !isHidden(tag) && !WEARS_CONTROL.test(tag);
    expect(judge(offending), 'hand-styled — the defect this file is named for').toBe(true);
    expect(judge(treated)).toBe(false);
    expect(judge(hidden), 'carries a value and is never seen').toBe(false);
    expect(judge(unstyled), 'a checkbox is deliberately unstyled').toBe(false);
  });

  it('keeps each exclusion narrow enough to still exclude something', () => {
    // The permissive direction. An exclusion widened until it matches every tag
    // silences the rule as completely as a dead scan, and no count would notice.
    expect(isHidden('<input type="text" />')).toBe(false);
    expect(WEARS_CONTROL.test('<input className="hand-rolled" />')).toBe(false);
    expect(hasClassName('<input />')).toBe(false);
  });

  it('finds a button and reads whether it wears a treatment', () => {
    expect(buttonTags('<button type="submit">Go</button>')).toHaveLength(1);
    expect(WEARS_BUTTON.test('<button className={BUTTON_PRIMARY}>')).toBe(true);
    expect(WEARS_BUTTON.test('<button className={BUTTON_SECONDARY}>')).toBe(true);
    // A bare button is the offender, not a skip.
    expect(WEARS_BUTTON.test('<button>')).toBe(false);
    expect(WEARS_BUTTON.test('<button className="rounded bg-blue-600">')).toBe(false);
  });

  it('reads a label whole, so the checkbox exclusion can see its content', () => {
    const inline = '<label className="flex"><input type="checkbox" /> Enable</label>';
    const block = '<label className="mb-1">Name</label>';
    expect(labelBlocks(`${inline}\n${block}`)).toHaveLength(2);
    // The exclusion is a property of the content, which is why the whole block
    // is matched rather than the open tag alone.
    expect(wrapsACheckbox(inline)).toBe(true);
    expect(wrapsACheckbox(block)).toBe(false);
    expect(openTagOf(block)).toBe('<label className="mb-1">');
  });

  it('accepts the composed label and rejects a hand-rolled one', () => {
    expect(WEARS_LABEL.test('<label className={LABEL}>')).toBe(true);
    expect(WEARS_LABEL.test('<label className={`${LABEL} w-32`}>')).toBe(true);
    expect(WEARS_LABEL.test('<label className="text-sm text-gray-500">')).toBe(false);
  });
});
