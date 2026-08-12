import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { slashed } from '../support/source-tree.js';

/**
 * A server action reads fields. The form bound to it has to send them.
 *
 * `requiredText(formData, 'agentId')` throws `FormError` when the field is
 * absent, so a form that does not render it is not a form with a small gap —
 * it is a write path that cannot be walked, throwing before the use case is
 * reached. With no error boundary in this product that arrives as a framework
 * error page, the least actionable failure it can produce.
 *
 * This is how `RebindConfirm` shipped: four hidden inputs, an action reading
 * five, every rebind submit throwing. Nothing caught it. The rebind flow tests
 * call the use case directly, so the *form* was on no path any test walked, and
 * `four-dead-write-paths` (closed 2026-07) guarded the other half of the
 * problem — whether an action is bound at all, never whether it is fed.
 *
 * **The first version of this file asked the weaker question** — is the field
 * name rendered *anywhere* in the UI — and passed while the bug was present,
 * because `agentId` is a hidden input on four other pages. A guard that cannot
 * fail on the defect it was written for is worse than no guard: it is the same
 * false confidence, now recorded as covered. So it resolves the actual form
 * bound to each action, through the component the page hands it to.
 */

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(slashed(full));
  }
  return out;
};

const uiFiles = [...walk('app'), ...walk('src/presentation')];
const read = (f: string): string => readFileSync(f, 'utf8');

/** Field names a server action insists on. */
function requiredBy(src: string, action: string): string[] {
  // The action's body: from its declaration to the next top-level `export`.
  const start = src.indexOf(`export async function ${action}(`);
  if (start === -1) return [];
  const rest = src.slice(start + 1);
  const end = rest.indexOf('\nexport ');
  const body = end === -1 ? rest : rest.slice(0, end);
  return [...body.matchAll(/required(?:Text|Integer)\(\s*formData\s*,\s*'([^']+)'/g)].map(
    (m) => m[1] as string,
  );
}

/** The names a JSX region renders as form fields. */
const fieldsIn = (region: string): Set<string> =>
  new Set([...region.matchAll(/name="([^"]+)"/g)].map((m) => m[1] as string));

/** Where a local import points, as a path on disk. */
function resolve(file: string, spec: string): string | null {
  const base = spec.startsWith('@/')
    ? `src/${spec.slice(2)}`
    : `${file.split('/').slice(0, -1).join('/')}/${spec}`;
  const norm = base.replace(/\.jsx?$/, '');
  for (const candidate of [`${norm}.tsx`, `${norm}.ts`]) {
    if (uiFiles.includes(slashed(candidate))) return slashed(candidate);
  }
  return null;
}

/** The form that carries `action`, wherever it lives. */
function formFor(file: string, action: string): { where: string; fields: Set<string> } | null {
  const src = read(file);

  // Bound directly: <form action={performX} ...> … </form>
  const direct = src.indexOf(`<form action={${action}}`);
  if (direct !== -1) {
    const close = src.indexOf('</form>', direct);
    return { where: file, fields: fieldsIn(src.slice(direct, close === -1 ? undefined : close)) };
  }

  // Handed to a component: <SomeConfirm … action={performX} …>
  //
  // Found by walking *backwards* from the prop to the nearest element open.
  // Scanning forwards with `[^>]*?` looked right and missed `AgentEditForm`,
  // whose earlier prop is `changes={… as Record<string, string | number>}` —
  // the `>` inside a type argument ends the character class long before the
  // prop is reached. A JSX element is not a regular language; the anchor that
  // survives is the one nearest the thing being anchored.
  const at = src.indexOf(`action={${action}}`);
  if (at !== -1) {
    const opens = [...src.slice(0, at).matchAll(/<([A-Z]\w+)/g)];
    const component = opens.length ? (opens[opens.length - 1]?.[1] as string) : null;
    if (!component) return null;
    const imported = new RegExp(
      `import\\s*\\{[^}]*\\b${component}\\b[^}]*\\}\\s*from\\s*'([^']+)'`,
    ).exec(src);
    const target = imported ? resolve(file, imported[1] as string) : file;
    if (target) {
      const body = read(target);
      // The component's own form, not the file's first one. `agent-edit.tsx`
      // exports both `AgentEditForm` and `ReactivatePrompt`; taking the first
      // `<form` reported ReactivatePrompt as missing a field it renders forty
      // lines further down.
      const declared = body.indexOf(`export function ${component}(`);
      const from = declared === -1 ? 0 : declared;
      const form = body.indexOf('<form', from);
      if (form !== -1) {
        const close = body.indexOf('</form>', form);
        return {
          where: `${target}::${component}`,
          fields: fieldsIn(body.slice(form, close === -1 ? undefined : close)),
        };
      }
    }
  }
  return null;
}

interface Pair {
  readonly page: string;
  readonly action: string;
  readonly required: readonly string[];
  readonly form: { where: string; fields: Set<string> } | null;
}

const pairs: Pair[] = uiFiles
  .filter((f) => read(f).includes("'use server'"))
  .flatMap((page) => {
    const src = read(page);
    return [...src.matchAll(/export async function (\w+)\(formData: FormData\)/g)].map((m) => {
      const action = m[1] as string;
      return { page, action, required: requiredBy(src, action), form: formFor(page, action) };
    });
  })
  .filter((p) => p.required.length > 0);

/**
 * Write paths known to be unwalkable, with the reason they are not fixed here.
 *
 * A ledger, not an escape hatch — the same instrument
 * `write-results.test.ts` uses, and asserted both ways below so a stale row
 * fails as loudly as a new defect. A row is a promise that somebody looked.
 */
const KNOWN_UNSENDABLE: ReadonlyArray<{ action: string; field: string; verdict: string }> = [
  {
    action: 'create',
    field: 'strategyId',
    verdict:
      'Creating an agent has never been possible: `AgentForm` renders no strategy control at all — ' +
      'not a hidden input, not a select, no mention of the word — while `create` requires one, so ' +
      'every submit throws FormError before the use case is reached. Unlike the rebind defect this ' +
      'guard was written for, the fix is not a missing hidden input: an agent binds to a strategy the ' +
      'operator chooses, so this needs a chooser, which is behaviour and needs a proposal. Filed as ' +
      '`creating-an-agent-cannot-choose-a-strategy`. Found by this guard on the day it was written.',
  },
];

const ledgerKey = (r: { action: string; field: string }): string => `${r.action}::${r.field}`;
const ledger = new Set(KNOWN_UNSENDABLE.map(ledgerKey));

describe('a form sends what its action reads', () => {
  it('finds the actions and their forms', () => {
    // Vacuous-pass insurance, and the reason the first version of this file was
    // useless: a check that resolves nothing reports nothing wrong.
    expect(pairs.length).toBeGreaterThanOrEqual(8);
    expect(
      pairs.filter((p) => p.form === null).map((p) => `${p.page} :: ${p.action}`),
      'no form resolved for these — the resolver drifted, not the product. A pair whose form ' +
        'cannot be found is unchecked, which is the state this file exists to make visible',
    ).toEqual([]);
  });

  const missing = pairs.flatMap(({ page, action, required, form }) =>
    required
      .filter((field) => form && !form.fields.has(field))
      .map((field) => ({ page, action, field, where: form?.where ?? '?' })),
  );

  it('renders every field its action requires', () => {
    const unsent = missing
      .filter((m) => !ledger.has(ledgerKey(m)))
      .map((m) => `${m.page} :: ${m.action} reads '${m.field}', which ${m.where} does not render`);

    expect(
      unsent,
      'a required field the bound form never sends throws FormError before the use case is reached',
    ).toEqual([]);
  });

  it('every ledger row still names a real unwalkable path', () => {
    // The other direction: a row that has been fixed must be deleted, or the
    // ledger becomes a list of things that used to be true.
    const live = new Set(missing.map(ledgerKey));
    const stale = KNOWN_UNSENDABLE.filter((r) => !live.has(ledgerKey(r))).map(ledgerKey);
    expect(stale, 'these are listed as broken but the form now sends them — delete the row').toEqual(
      [],
    );
  });

  it('gives a reason rather than a label', () => {
    const thin = KNOWN_UNSENDABLE.filter((r) => r.verdict.trim().length < 80).map(ledgerKey);
    expect(thin, 'listed without saying why').toEqual([]);
  });
});
