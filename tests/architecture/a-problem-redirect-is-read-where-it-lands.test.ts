import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { slashed } from '../support/source-tree.js';

/**
 * A refusal sent onward as `problem` lands on a page that reads it.
 *
 * #232 gave every confirmation refusal a road back to the person, and PR
 * #235's review found two roads that did not arrive: the strategy editor
 * minted `?problem=` and never read the parameter, and the agent-archive
 * refusal landed on the one branch of its target that did not mount the
 * banner — by construction, because a spent confirmation means the re-run
 * describe declines and the page renders its other branch (#240).
 *
 * Both defects were absences, and both survived every existing guard because
 * the guarded set was a pinned list "written from the pages one change
 * happened to touch" (`refusals-reach-the-operator.test.ts`, its own words) —
 * neither defective page was on it. So this check derives the set from the
 * product: every URL the UI constructs that carries a `problem` parameter,
 * resolved to the page serving its route, which must read the parameter and
 * mount `<CarriedProblem>` on every render branch. The pinned list stays —
 * loud and cheap — but it no longer carries the rule alone.
 *
 * ## The scan runs twice, per `app-access`'s vacuity requirement
 *
 * Production roots expect zero offenders; a fixture tree carrying a known
 * offender expects exactly the plant. Comments are stripped before scanning,
 * because production files legitimately *discuss* the parameter convention in
 * prose — and because this repository has already measured a fixture being
 * "found" through its own documentation (the floors change, M0).
 *
 * ## Fail closed, in both unresolvable directions
 *
 * A mint whose destination cannot be resolved to a variable's template, or
 * whose route no page serves, is an offender — not a skip. Unfindable is
 * unchecked, not safe (`mcp-read-only.test.ts` learned this with a bare
 * `continue`).
 */

const PRODUCTION = {
  appRoot: 'app',
  uiRoots: ['app', 'src/presentation'],
} as const;

const FIXTURE_DIR = 'tests/architecture/fixtures/problem-redirects';
const FIXTURE = {
  appRoot: `${FIXTURE_DIR}/app`,
  uiRoots: [`${FIXTURE_DIR}/app`],
} as const;
const PLANT = `${FIXTURE.appRoot}/thing/[id]/page.tsx`;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx')) out.push(slashed(full));
  }
  return out;
}

const read = (f: string): string => readFileSync(f, 'utf8');

const stripComments = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

/**
 * Every template literal in this source that looks like an in-app URL: starts
 * with `/` or with an interpolation that a local `const` resolves to one.
 * Quoted strings too — a mint does not stop being one because nothing is
 * interpolated into it.
 */
function urlLiterals(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/`((?:\/|\$\{)[^`]*)`/g)) out.push(m[1] as string);
  for (const m of src.matchAll(/'(\/[^'\n]*\?[^'\n]*)'/g)) out.push(m[1] as string);
  return out;
}

/**
 * The `const <name> = \`…\`` this file binds, for resolving `${name}?…` paths
 * and `${name.toString()}` queries. First binding wins; the one production
 * file that rebinds a URL prefix binds it to the same template each time.
 */
function templateBindings(src: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*`([^`]*)`/g)) {
    if (!out.has(m[1] as string)) out.set(m[1] as string, m[2] as string);
  }
  return out;
}

/**
 * Whether `name` is a URLSearchParams whose contents include `problem` —
 * either in its initialiser (shorthand or `problem:`) or via `.set`/`.append`.
 * Resolved by name across the whole file, never by a character window: a
 * window is wrong in both directions, as `confirmation-binds-values.test.ts`
 * records.
 */
function paramsCarryProblem(src: string, name: string): boolean {
  const init = new RegExp(`(?:const|let)\\s+${name}\\s*=\\s*new URLSearchParams\\(([^;]*)\\)`).exec(
    src,
  );
  if (init && /(?<!\w)problem\s*[,:}]/.test(init[1] as string)) return true;
  return new RegExp(`\\b${name}\\.(?:set|append)\\(\\s*'problem'`).test(src);
}

interface Mint {
  readonly file: string;
  readonly literal: string;
  /** The path template, variables substituted, or null when unresolvable. */
  readonly path: string | null;
}

/** Every URL this file constructs that carries a `problem` parameter. */
function mintsIn(file: string): Mint[] {
  const src = stripComments(read(file));
  const bindings = templateBindings(src);
  const found: Mint[] = [];

  for (const literal of urlLiterals(src)) {
    const cut = literal.indexOf('?');
    if (cut < 0) continue;
    let path = literal.slice(0, cut);
    const query = literal.slice(cut + 1);

    const inline = /(?<!\w)problem=/.test(query);
    const viaParams = [...query.matchAll(/\$\{(\w+)(?:\.toString\(\))?\}/g)].some((m) =>
      paramsCarryProblem(src, m[1] as string),
    );
    if (!inline && !viaParams) continue;

    // `${target}?problem=…` — the path lives in a nearby const. Substitute it;
    // a name this cannot resolve stays unresolved and is reported below.
    const indirect = /^\$\{(\w+)\}/.exec(path);
    if (indirect) {
      const bound = bindings.get(indirect[1] as string);
      path = bound === undefined ? '' : bound + path.slice(indirect[0].length);
    }
    found.push({ file, literal, path: path.startsWith('/') ? path : null });
  }
  return found;
}

/** The route a `page.tsx` serves — `(group)` segments dropped. */
function routeOf(appRoot: string, pageFile: string): string {
  const url = relative(appRoot, pageFile)
    .split(/[/\\]/)
    .filter((s) => s !== '' && !/^\(.*\)$/.test(s) && s !== 'page.tsx')
    .join('/');
  return '/' + url;
}

/** The page serving `path` — exact match before dynamic, the way Next resolves. */
function pageFor(appRoot: string, pages: readonly string[], path: string): string | undefined {
  const asRoute = path.replace(/\$\{[^}]*\}/g, 'x').replace(/(.)\/$/, '$1');
  return (
    pages.find((p) => routeOf(appRoot, p) === asRoute) ??
    pages.find((p) =>
      new RegExp(
        `^${routeOf(appRoot, p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\[[^\]]+\\\]/g, '[^/]+')}$`,
      ).test(asRoute),
    )
  );
}

/**
 * Local fragments that carry the banner — `const head = (<>…</>)` with the
 * component inside. `conditions/save` factors its heading and banner into one
 * fragment rendered on seven branches; a textual count read that as one
 * carrying branch and six bare ones, which punishes exactly the one-spelling
 * discipline this product wants. So a branch complies by containing the
 * component or by rendering a fragment that does.
 */
function carrierFragments(src: string): string[] {
  const names: string[] = [];
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*\(/g)) {
    const open = (m.index ?? 0) + m[0].length - 1;
    let depth = 0;
    let end = src.length;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (/<CarriedProblem[\s/>]/.test(src.slice(open, end))) names.push(m[1] as string);
  }
  return names;
}

/** Each `<main`…`</main>` region — one per render branch in every target. */
function mainRegions(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/<main[\s>]/g)) {
    const from = m.index ?? 0;
    const close = src.indexOf('</main>', from);
    out.push(src.slice(from, close === -1 ? undefined : close));
  }
  return out;
}

/**
 * Pages allowed to stay silent, each with the verdict that earned the row.
 *
 * The same instrument `write-results.test.ts` uses, asserted in both
 * directions below: an unlisted silent target fails (new instance — read
 * "A Refused Confirmation Reaches The Person Who Spent It" before adding a
 * row), and a listed page that has since started carrying fails (the row is
 * stale — delete it; the ledger only shrinks).
 */
const KNOWN_SILENT: ReadonlyArray<{ page: string; verdict: string }> = [
  // Empty since `a-bounced-reason-survives-the-agent-editor` reconciled the
  // last row's page (the agent editor, #255) onto the shared banner. The
  // ledger stays, and stays enforced in both directions, so the next
  // exemption has to be argued into a row rather than into silence.
];

interface Verdict {
  readonly offenders: string[];
  readonly mints: Mint[];
  readonly targets: string[];
  readonly silent: string[];
}

/** The whole relation, as a function of its roots so it can run twice. */
function verdictFor(roots: { appRoot: string; uiRoots: readonly string[] }): Verdict {
  const uiFiles = roots.uiRoots.flatMap((r) => walk(r));
  const pages = uiFiles.filter((f) => /(^|\/)page\.tsx$/.test(f));
  const mints = uiFiles.flatMap((f) => mintsIn(f));

  const offenders: string[] = [];
  const targets = new Set<string>();

  for (const mint of mints) {
    if (mint.path === null) {
      offenders.push(`${mint.file}: mints \`${mint.literal.slice(0, 60)}\` — destination unresolved, so its landing is unchecked`);
      continue;
    }
    const page = pageFor(roots.appRoot, pages, mint.path);
    if (page === undefined) {
      offenders.push(`${mint.file}: mints to ${mint.path} — no page serves that route`);
      continue;
    }
    targets.add(page);
  }

  const silent: string[] = [];
  for (const page of [...targets].sort()) {
    const src = read(page);
    const regions = mainRegions(src);
    const fragments = carrierFragments(src);
    const carries = (region: string): boolean =>
      /<CarriedProblem[\s/>]/.test(region) ||
      fragments.some((name) => new RegExp(`\\{${name}\\}`).test(region));
    const bare = regions.filter((r) => !carries(r));
    const bound = /<CarriedProblem\b[^>]*problem=\{/.test(src);
    if (regions.length === 0) {
      silent.push(`${page}: a problem lands here and no render branch was found — the scan cannot see this page`);
    } else if (bare.length > 0 || !bound) {
      silent.push(
        `${page}: ${bare.length} of ${regions.length} render branches drop the reason` +
          (bound ? '' : ', and none binds a value') +
          ' — a branch that drops it loses the only record of what the click did',
      );
    }
  }
  offenders.push(...silent.filter((s) => !KNOWN_SILENT.some(({ page }) => s.startsWith(`${page}:`))));

  return { offenders, mints, targets: [...targets].sort(), silent };
}

describe('a problem redirect is read where it lands', () => {
  const production = verdictFor(PRODUCTION);

  it('every minted problem lands on a page that reads it, on every branch', () => {
    expect(
      production.offenders,
      'a refusal sent to these pages arrives as silence — see #240 for how that is worse than the crash it replaced',
    ).toEqual([]);
  });

  it('reports the planted silent target, so a blind derivation cannot pass as clean', () => {
    // The rule's own machinery, pointed at a tree known to offend: the plant
    // mints to its own route and never reads what it sent.
    const fixture = verdictFor(FIXTURE);
    expect(
      fixture.offenders,
      `the scan lost the offender planted in ${PLANT} — its derivation has gone blind`,
    ).toEqual([
      `${PLANT}: 1 of 1 render branches drop the reason, and none binds a value — a branch that drops it loses the only record of what the click did`,
    ]);
  });

  it('every ledger row still names a really-silent page, and says why', () => {
    // The other direction, or the ledger becomes a list of things that used
    // to be true. A page that started carrying must lose its row.
    const found = production.silent;
    const stale = KNOWN_SILENT.filter(
      ({ page }) => !found.some((s) => s.startsWith(`${page}:`)),
    ).map(({ page }) => page);
    expect(stale, 'these carry the reason now — delete the rows; the ledger only shrinks').toEqual(
      [],
    );
    for (const row of KNOWN_SILENT) {
      expect(row.verdict.length, `${row.page} is listed without a real reason`).toBeGreaterThan(80);
    }
  });

  it('derived the relation from a tree that is really there', () => {
    // Floors and pins from the scan's own output — never an independent count.
    // The failure grain is a matcher arm dying, so each arm is pinned by a
    // target only it can derive: /pending/[id] mints inline in a template,
    // /agents/new builds its query through URLSearchParams shorthand, and the
    // fork page through the longhand `problem:` key. The floor sits above
    // what any single file contributes, so a walk losing a root cannot pass.
    expect(production.mints.length).toBeGreaterThan(12);
    expect(production.targets.length).toBeGreaterThanOrEqual(8);
    expect(production.targets).toContain('app/(app)/pending/[id]/page.tsx');
    expect(production.targets).toContain('app/(app)/agents/new/page.tsx');
    expect(production.targets).toContain('app/(app)/strategies/[id]/fork/page.tsx');
    // And the two pages #240 was filed about are in the derived set — the
    // check exists because the pinned list did not reach them.
    expect(production.targets).toContain('app/(app)/strategies/[id]/edit/page.tsx');
    expect(production.targets).toContain('app/(app)/agents/[id]/archive/page.tsx');
  });

  it('resolves the indirect path spelling the product actually writes', () => {
    // `${target}?…` with the prefix bound one line up — the undeploy page's
    // shape. Held here so a refactor of the substitution fails loudly rather
    // than converting that mint into a permanent "unresolved" offender, or
    // worse, a silent skip.
    expect(production.targets).toContain('app/(app)/agents/[id]/undeploy/[coin]/page.tsx');
  });
});
