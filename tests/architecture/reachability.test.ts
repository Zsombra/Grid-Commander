import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Reachability, measured from the interface rather than from the route table.
 *
 * `wire-the-app` checked that routes exist. `prove-it-runs` checked that the
 * application builds and that pages render 200. All three were true while the
 * product could not create an agent, rename one, rebind one, or apply a strategy
 * change, and while five links it rendered returned 404.
 *
 * Every one of those checks enumerated what the application *contains* and asked
 * whether it worked. None started from what the interface *offers*. A link to a
 * route nobody built is a string, and a form that renders its fields and its
 * button and submits nowhere is indistinguishable from a working one unless you
 * press it.
 *
 * So this file compares two lists that had never been compared:
 *
 *   offered   — every path the presentation layer can render, every form it draws
 *   servable  — every route on disk, every action a form is actually bound to
 *
 * Both are derived from the filesystem. A hardcoded list of either would be the
 * same mistake one level up: it would pass while a route was deleted, which is
 * how the current defect survived three production gates.
 *
 * **DL-106 is closed.** This file used to record a known blind spot: it checked
 * that a form was bound to an action and not that every control inside the form
 * reached that action's payload — so `agent-form.tsx` rendered a
 * position-management select while the create action sent `tradingConfig: null`,
 * and a user's choice was discarded silently. The last section below is that
 * check. The blind spot was stated here for two changes before anything acted on
 * it, which is its own lesson: a documented gap is still a gap.
 */

const APP = 'app';
const PRESENTATION = join('src', 'presentation');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const appFiles = walk(APP);
const presentationFiles = walk(PRESENTATION);
const uiFiles = [...appFiles, ...presentationFiles];

const read = (f: string) => readFileSync(f, 'utf8');

/**
 * Every route the application serves, from the filesystem.
 *
 * A `page.tsx` under `app/` is a route; `(group)` segments are organisational
 * and do not appear in the URL; `[id]` segments match any one path segment.
 */
function servableRoutes(): RegExp[] {
  return appFiles
    .filter((f) => /[/\\]page\.tsx$/.test(f))
    .map((f) => {
      const url = relative(APP, f)
        .replace(/[/\\]page\.tsx$/, '')
        .split(/[/\\]/)
        .filter((s) => !/^\(.*\)$/.test(s))
        .join('/');
      const pattern = ('/' + url)
        .replace(/\[[^\]]+\]/g, '__SEG__')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/__SEG__/g, '[^/]+');
      return new RegExp(`^${pattern}$`);
    });
}

/**
 * Every in-app path the presentation layer can render, with its source.
 *
 * `href` is matched as both a JSX attribute (`href=`) and an object property
 * (`href:`), because a path is as often built into a list of actions as written
 * inline. The first version of this scan only understood the attribute form,
 * and missed two of the five dead links it was written to catch — the same
 * shape of miss it exists to prevent, caught only because the defects were
 * still present to compare against.
 */
function offeredLinks(): Array<{ file: string; path: string }> {
  const found: Array<{ file: string; path: string }> = [];
  //           href= | href:      "…"  '…'  {`…`}  `…`
  const anyHref = /\bhref\s*[:=]\s*(?:\{\s*)?(?:["'`])(\/[^"'`#?]*)(?:["'`])/g;

  for (const file of uiFiles) {
    for (const m of read(file).matchAll(anyHref)) {
      // `${anything}` stands for exactly one segment at this position.
      found.push({ file, path: (m[1] as string).replace(/\$\{[^}]*\}/g, 'x') });
    }
  }
  return found;
}

describe('every affordance the interface offers resolves', () => {
  it('renders no link to a route the application does not serve', () => {
    const routes = servableRoutes();
    const dead = offeredLinks().filter(({ path }) => !routes.some((r) => r.test(path)));

    expect(
      dead.map((d) => `${d.path}  (rendered by ${d.file})`),
      'the interface offers these and the application serves none of them',
    ).toEqual([]);
  });

  it('finds the routes it is comparing against', () => {
    // If the route scan silently returned nothing, the check above would pass
    // vacuously — the failure mode this whole file exists to prevent.
    expect(servableRoutes().length).toBeGreaterThan(5);
    expect(offeredLinks().length).toBeGreaterThan(5);
  });
});

/**
 * A Server Action runs only when a form is bound to the function. A form with
 * `method="post"` and a string action is an ordinary HTML post to a URL, and a
 * `page.tsx` cannot export HTTP handlers — so Next re-renders the page and
 * nothing happens.
 */
describe('every form the interface renders can be submitted', () => {
  it('binds every form to a function rather than a URL', () => {
    const unbound: string[] = [];

    for (const file of uiFiles) {
      const src = read(file);
      for (const m of src.matchAll(/<form\b[^>]*>/g)) {
        const tag = m[0];
        // A GET form navigates — it puts its fields in the query string and
        // asks for a page. That is a legitimate way to submit a question, and
        // it reaches no operation by design. Only a form that means to *do*
        // something needs an action bound to it.
        if (/method=["']get["']/i.test(tag)) continue;
        const bound = /action=\{(?!`)/.test(tag);
        if (bound) continue;
        unbound.push(
          `${file}: ${/action=/.test(tag) ? 'submits to a URL' : 'has no action'} — ${tag.replace(/\s+/g, ' ').slice(0, 90)}`,
        );
      }
    }

    expect(unbound, 'these forms render and submit nowhere').toEqual([]);
  });

  it('leaves no server action that nothing submits to', () => {
    const orphans: string[] = [];

    for (const file of uiFiles) {
      const src = read(file);
      if (!src.includes("'use server'")) continue;

      for (const m of src.matchAll(/export\s+async\s+function\s+(\w+)\s*\(/g)) {
        const name = m[1] as string;
        const referenced = uiFiles.some((other) =>
          new RegExp(`action=\\{\\s*${name}\\b`).test(read(other)),
        );
        if (!referenced) orphans.push(`${file}: ${name}`);
      }
    }

    expect(orphans, 'these operations exist and no rendered form reaches them').toEqual([]);
  });
});


/**
 * The other direction, which nothing measured.
 *
 * Everything above asks whether every path *out* of a page leads somewhere. All
 * of it was green while `/` returned 404 and no page linked to any other — five
 * top-level destinations served, and a walk from the only entry a user could
 * arrive at reaching exactly one route.
 *
 * A destination nothing points at is unreachable in the same way a link to
 * nothing is. The requirement said as much — *"a route table is not the
 * interface"* — and the guard written for it still started from a list rather
 * than from a walk. So this starts at the root and follows links outward, which
 * is what a person does.
 *
 * **A page's links are resolved through what actually renders it.** The first
 * version of this treated every component's links as available from every page,
 * on the reasoning that a nav lives in a shared file. Mutation testing killed
 * it: deleting the layout that renders the navigation left the suite green,
 * because the nav *file* still existed and its links still counted. Dropping a
 * section from the nav was invisible for the same reason. A guard that cannot
 * tell rendered from present is measuring the filesystem, which is the exact
 * mistake this section exists to correct.
 *
 * So the render set of a page is the page, every layout above it, and the local
 * modules those import, transitively. A component nothing imports contributes
 * nothing.
 */

/**
 * The URL a `page.tsx` serves, with `(group)` segments removed.
 *
 * The separator before `page.tsx` is optional, because `app/page.tsx` — the
 * root, and the whole point of this section — has nothing before it. Requiring
 * it turned the front door into `/page.tsx` and reported it missing after it
 * had been built.
 */
function routeOf(file: string): string {
  const url = relative(APP, file)
    .replace(/(^|[/\\])page\.tsx$/, '')
    .split(/[/\\]/)
    .filter((s) => s !== '' && !/^\(.*\)$/.test(s))
    .join('/');
  return '/' + url;
}

/** Local modules a file imports, as paths on disk. `@/x.js` is `src/x.tsx`. */
function importsOf(file: string): string[] {
  const out: string[] = [];
  for (const m of read(file).matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1] as string;
    if (!spec.startsWith('@/') && !spec.startsWith('.')) continue;
    const base = spec.startsWith('@/')
      ? join('src', spec.slice(2))
      : join(file, '..', spec);
    for (const candidate of [
      base.replace(/\.jsx?$/, '.tsx'),
      base.replace(/\.jsx?$/, '.ts'),
      `${base}.tsx`,
      `${base}.ts`,
    ]) {
      if (uiFiles.includes(candidate)) {
        out.push(candidate);
        break;
      }
    }
  }
  return out;
}

/** Every layout that wraps a page, outermost first. */
function layoutsFor(pageFile: string): string[] {
  const parts = pageFile.split(/[/\\]/).slice(0, -1);
  const found: string[] = [];
  for (let i = 1; i <= parts.length; i++) {
    const candidate = join(...parts.slice(0, i), 'layout.tsx');
    if (uiFiles.includes(candidate)) found.push(candidate);
  }
  return found;
}

describe('every capability is reachable by walking from the root', () => {
  const pageFiles = appFiles.filter((f) => /(^|[/\\])page\.tsx$/.test(f));
  const served = pageFiles.map(routeOf);

  const linksIn = (file: string): string[] =>
    [...read(file).matchAll(/\bhref\s*[:=]\s*(?:\{\s*)?(?:["'`])(\/[^"'`#?]*)(?:["'`])/g)].map(
      (m) => (m[1] as string).replace(/\$\{[^}]*\}/g, 'x').replace(/(.)\/$/, '$1'),
    );

  /** Page + its layouts + everything those import, transitively. */
  function renderSet(pageFile: string): string[] {
    const seen = new Set<string>();
    const frontier = [pageFile, ...layoutsFor(pageFile)];
    while (frontier.length > 0) {
      const file = frontier.pop() as string;
      if (seen.has(file)) continue;
      seen.add(file);
      frontier.push(...importsOf(file));
    }
    return [...seen];
  }

  const linksByRoute = new Map(
    pageFiles.map((f) => [routeOf(f), renderSet(f).flatMap(linksIn)] as const),
  );

  function reachedFromRoot(): Set<string> {
    /**
     * Exact before dynamic, the way Next resolves a request.
     *
     * Without the first lookup, `/agents/[id]` swallowed `/agents/new`: the
     * pattern matched, the walk marked the *dynamic* route seen, and the static
     * page it had just arrived at was reported unreachable. A shadowed sibling
     * is the kind of near-miss this walk exists to notice, so it must not be
     * one itself.
     */
    const matches = (path: string): string | undefined =>
      served.find((r) => r === path) ??
      served.find((r) => new RegExp(`^${r.replace(/\[[^\]]+\]/g, '[^/]+')}$`).test(path));

    const rootFile = pageFiles.find((f) => routeOf(f) === '/');
    const seen = new Set<string>();
    const frontier = ['/'];

    // The root may redirect rather than render. Both destinations count as
    // arrived at, and a root that redirects has no links of its own.
    if (rootFile !== undefined) {
      for (const m of read(rootFile).matchAll(/redirect\(\s*['"`](\/[^'"`]*)['"`]/g)) {
        frontier.push(m[1] as string);
      }
      for (const m of read(rootFile).matchAll(/\?\s*['"`](\/[^'"`]*)['"`]\s*:\s*['"`](\/[^'"`]*)['"`]/g)) {
        frontier.push(m[1] as string, m[2] as string);
      }
    }

    while (frontier.length > 0) {
      const route = matches(frontier.pop() as string);
      if (route === undefined || seen.has(route)) continue;
      seen.add(route);
      frontier.push(...(linksByRoute.get(route) ?? []));
    }
    return seen;
  }

  it('answers at the root rather than returning a not-found', () => {
    // The only URL a user is ever given. Nothing in this capability said it had
    // to do anything, and for the product's whole life it did not.
    expect(served, 'app/page.tsx must exist').toContain('/');
  });

  it('reaches every top-level capability', () => {
    const reached = reachedFromRoot();
    const stranded = served
      // Sub-pages are reached from their own section; this is about the
      // destinations a user has no other way to find.
      .filter((r) => !r.includes('['))
      .filter((r) => !reached.has(r));

    expect(
      stranded,
      'the application serves these and nothing the interface renders arrives at them',
    ).toEqual([]);
  });

  it('resolves links through what renders a page, not through what exists', () => {
    // The property that makes the check above mean anything: a component that
    // no page imports must contribute no links. Asserted directly, because
    // getting this wrong is silent — the suite stays green and the guard stops
    // guarding.
    const nav = join(PRESENTATION, 'components', 'section-nav.tsx');
    expect(uiFiles, 'the nav this asserts about must exist').toContain(nav);

    const connect = pageFiles.find((f) => routeOf(f) === '/connect') as string;
    expect(
      renderSet(connect),
      '/connect is outside the (app) group and must not inherit its navigation',
    ).not.toContain(nav);

    const agents = pageFiles.find((f) => routeOf(f) === '/agents') as string;
    expect(renderSet(agents), '/agents is inside the group and must').toContain(nav);
  });

  it('is comparing against something', () => {
    // A walk that found nothing would report nothing stranded — passing
    // vacuously is the failure mode every check in this file guards against.
    expect(served.length).toBeGreaterThan(5);
    expect(reachedFromRoot().size).toBeGreaterThan(4);
  });
});

/**
 * Reachable from *where you are*, not merely reachable somehow.
 *
 * The walk above is satisfied by any path, however long. That is the right
 * question for "is this route stranded" and the wrong one for the requirement's
 * `Moving between capabilities` scenario, which says every top-level capability
 * is reachable from wherever the user currently is.
 *
 * Mutation found the gap: removing Activity from the navigation left the walk
 * green, because `/audit` is also linked from `journal-view.tsx`. So it stayed
 * reachable — via an agent, then that agent's journal. True, and useless to
 * someone on the strategies page.
 */
describe('every capability is reachable from wherever you already are', () => {
  const TOP_LEVEL = ['/agents', '/strategies', '/assistant', '/audit'];

  const pageFiles = appFiles.filter((f) => /(^|[/\\])page\.tsx$/.test(f));

  /** Pages inside the group that carries the shared navigation. */
  const inGroup = pageFiles.filter((f) => f.includes('(app)'));

  function linksAvailableOn(pageFile: string): Set<string> {
    const seen = new Set<string>();
    const frontier = [pageFile, ...layoutsFor(pageFile)];
    const links = new Set<string>();
    while (frontier.length > 0) {
      const file = frontier.pop() as string;
      if (seen.has(file)) continue;
      seen.add(file);
      for (const m of read(file).matchAll(
        /\bhref\s*[:=]\s*(?:\{\s*)?(?:["'`])(\/[^"'`#?]*)(?:["'`])/g,
      )) {
        links.add(m[1] as string);
      }
      frontier.push(...importsOf(file));
    }
    return links;
  }

  it('offers every top-level section on every page inside the product', () => {
    const missing: string[] = [];

    for (const page of inGroup) {
      const available = linksAvailableOn(page);
      for (const section of TOP_LEVEL) {
        if (!available.has(section)) missing.push(`${routeOf(page)} cannot reach ${section}`);
      }
    }

    expect(missing, 'a user here would have to know an address').toEqual([]);
  });

  it('checks every page rather than a sample', () => {
    expect(inGroup.length).toBeGreaterThan(9);
  });

  /**
   * The connect page is outside the group on purpose, and this states it so the
   * exclusion is a decision rather than an oversight the next reader has to
   * rediscover.
   */
  it('does not offer them to someone who has not connected', () => {
    const connect = pageFiles.find((f) => routeOf(f) === '/connect') as string;
    const available = linksAvailableOn(connect);
    for (const section of TOP_LEVEL) {
      expect(available, 'four sections that all refuse is worse than none').not.toContain(section);
    }
  });
});

/**
 * Every control inside a form reaches the operation, not just the form itself.
 *
 * This closes the blind spot stated at the top of this file (DL-106). The checks
 * above establish that a form is bound to an action; none of them asked whether
 * the values the form collects are ones that action reads. So `agent-form.tsx`
 * rendered a position-management preset select, the create action sent
 * `tradingConfig: null`, and a user's choice was discarded silently — the same
 * defect as a form that submits nowhere, one level in, and less visible because
 * the *rest* of the form works.
 *
 * **A GET form is not a defect.** It navigates: its values go into the query
 * string and are read from `searchParams`, which is a legitimate way to submit a
 * question and reaches no Server Action by design. The first version of this
 * scan did not know that and reported three false positives — `q` on the
 * assistant and `tagline` on the strategy editor — which is how a guard gets
 * turned off.
 */
describe('every control the interface renders reaches an operation', () => {
  /** Named controls inside forms that are bound to a Server Action. */
  function controlsInActionForms(): Array<{ file: string; name: string }> {
    const found: Array<{ file: string; name: string }> = [];

    for (const file of uiFiles) {
      const src = read(file);
      for (const form of src.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)) {
        const attrs = form[1] as string;
        // Navigates rather than acting — its values are read from the query
        // string, and no Server Action is involved.
        if (/method=["']get["']/i.test(attrs)) continue;

        for (const control of (form[2] as string).matchAll(
          /<(?:input|select|textarea)\b[^>]*?\bname=["']([^"']+)["']/gs,
        )) {
          found.push({ file, name: control[1] as string });
        }
      }
    }
    return found;
  }

  /**
   * Every field name any Server Action reads.
   *
   * Matched as a string literal anywhere in a file containing `'use server'`,
   * because a form and the action bound to it are usually in different files —
   * the component takes its action as a prop. Deliberately generous: a name that
   * appears is assumed read. The failure this catches is a name that appears
   * *nowhere*, which is unambiguous.
   */
  function namesActionsRead(): Set<string> {
    const names = new Set<string>();
    for (const file of uiFiles) {
      const src = read(file);
      if (!src.includes("'use server'")) continue;
      for (const m of src.matchAll(/["']([a-zA-Z][a-zA-Z0-9_]*)["']/g)) names.add(m[1] as string);
    }
    return names;
  }

  it('leaves no control whose value no operation reads', () => {
    const read_ = namesActionsRead();
    const orphans = controlsInActionForms()
      .filter(({ name }) => !read_.has(name))
      .map(({ file, name }) => `${name}  (rendered by ${file})`);

    expect(
      [...new Set(orphans)],
      'a user sets these and the operation never receives them',
    ).toEqual([]);
  });

  it('finds the controls it is checking', () => {
    // Passing vacuously is the failure mode every check in this file guards
    // against, and this one would pass on a product with no forms at all.
    expect(controlsInActionForms().length).toBeGreaterThan(5);
    expect(namesActionsRead().size).toBeGreaterThan(5);
  });

  it('does not report a form that navigates', () => {
    // The assistant's question box is a GET form. If this ever appears in the
    // scanned set, the check has started producing false positives and will be
    // ignored rather than fixed.
    expect(controlsInActionForms().map((c) => c.name)).not.toContain('q');
  });
});
