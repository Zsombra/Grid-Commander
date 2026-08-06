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
    .filter((f) => /(^|[/\\])page\.tsx$/.test(f))
    .map((f) => {
      // The separator is optional, because this runs on the path *relative* to
      // `app/` — and the root route's is just `page.tsx`, with nothing before
      // it. Requiring one turned `/` into `/page.tsx`, so the root was absent
      // from this list and any link to it read as dead. Nothing linked to `/`
      // until `nothing-to-connect.tsx` did, and then it was reported dead
      // immediately: the same bug already fixed once in `routeOf` below, living
      // on in the helper written first.
      //
      // The `filter` above is not the same case and never was: it tests the
      // full path, where `app/page.tsx` does have a separator.
      const url = relative(APP, f)
        .replace(/(^|[/\\])page\.tsx$/, '')
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

describe('every route the application serves is offered somewhere', () => {
  /**
   * The mirror of the check above it, and it was missing.
   *
   * `renders no link to a route the application does not serve` compares
   * offered against servable in one direction: no link may 404. Nothing
   * compared the other way, so a route that exists and is linked from nowhere
   * passed every gate.
   *
   * It was not hypothetical. `/agents/[id]/thinking` and `/agents/[id]/limits`
   * were built, tested, proven against the live platform, archived — and
   * unreachable. Of twenty routes, the only two orphans were the two added that
   * afternoon.
   *
   * This is DL-106's shape one level up: that blind spot was a control inside a
   * form that reached no payload; this is a page inside the app that reached no
   * link. Both are capability the operator cannot get to.
   */
  it('leaves no route that nothing links to', () => {
    const offered = offeredLinks().map((l) => l.path);
    // `servableRoutes` yields matchers, so the comparison runs the same way the
    // sibling check does: a route is offered when some rendered path matches it.
    const orphans = servableRoutes()
      .filter((route) => !route.test('/'))
      .filter((route) => !offered.some((path) => route.test(path)))
      .map((route) => route.source);

    expect(orphans, 'built, and reachable from nowhere').toEqual([]);
  });

  it('is comparing against paths it actually found', () => {
    // A vacuous pass here would hide every orphan at once.
    expect(offeredLinks().length).toBeGreaterThan(10);
    expect(servableRoutes().length).toBeGreaterThan(10);
  });
});

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
  const pageFiles = appFiles.filter((f) => /(^|[/\\])page\.tsx$/.test(f));

  /**
   * Derived from the route table, not written down.
   *
   * It was written down — `['/agents', '/strategies', '/assistant', '/audit']` —
   * and `only-mcp-control` broke it by removing a capability, which is the
   * milder half of what a hardcoded list does. The worse half is silent: add a
   * fifth section and this keeps passing while no page links to it.
   *
   * A top-level section is a route one segment deep inside the group that
   * carries the shared navigation. **Not derived from the nav itself**, which
   * would be circular — the nav lives in the layout, so every page's render set
   * contains it by construction and the check would assert nothing.
   */
  const TOP_LEVEL = pageFiles
    .filter((f) => f.includes('(app)'))
    .map(routeOf)
    .filter((r) => r.split('/').length === 2 && !r.includes('['))
    .sort();

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

  it('derived a section list that is neither empty nor everything', () => {
    // The derivation must find the real sections. Empty would pass the check
    // above vacuously; the whole route table would fail it for the wrong reason.
    expect(TOP_LEVEL).toEqual([
      '/agents',
      '/arena',
      '/audit',
      '/explorer',
      '/pending',
      '/strategies',
    ]);
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

/**
 * A destructive page is a destination, never a corridor.
 *
 * The walk above is satisfied by any path. That made it green while
 * `/agents/[id]` — an agent's own page, holding its binding, its brain, its
 * money summary and its rename form — was linked from nowhere a person would
 * look. Its row on `/agents` offered six sub-pages and not the agent; the only
 * live link to it was the cancel on `/agents/[id]/archive`. **You reached your
 * agent's own page by starting to retire it.**
 *
 * Both prior checks were right by their own terms. The link scan reads source
 * text, `agent-edit.tsx` contains `/agents/${agent.id}` three times, and the
 * walk arrives via `/agents/[id]/edit`. Neither can see that those links sit in
 * branches that do not render, nor that the surviving path opens a form the
 * user did not come to submit.
 *
 * So this walks again with the mutation routes removed from the corridors. They
 * stay reachable as destinations — the point is that nothing may *depend* on
 * passing through one.
 */
describe('nothing is reachable only by passing through a mutation', () => {
  const pageFiles = appFiles.filter((f) => /(^|[/\\])page\.tsx$/.test(f));
  const served = pageFiles.map(routeOf);

  const linksIn = (file: string): string[] =>
    [...read(file).matchAll(/\bhref\s*[:=]\s*(?:\{\s*)?(?:["'`])(\/[^"'`#?]*)(?:["'`])/g)].map(
      (m) => (m[1] as string).replace(/\$\{[^}]*\}/g, 'x').replace(/(.)\/$/, '$1'),
    );

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

  /**
   * **Derived, never listed.** A hardcoded set of destructive segments —
   * `archive`, `edit`, `rebind` — is the same mistake one level up: it passes
   * while a seventh is added, which is exactly how every check in this file
   * earned its comment.
   *
   * A page mutates when what renders it binds a form to a Server Action. That is
   * the definition the sibling checks already use for "can be submitted", so the
   * two cannot drift apart.
   */
  function mutates(pageFile: string): boolean {
    return renderSet(pageFile).some((file) =>
      [...read(file).matchAll(/<form\b[^>]*>/g)].some(
        (m) => !/method=["']get["']/i.test(m[0]) && /action=\{(?!`)/.test(m[0]),
      ),
    );
  }

  const mutationRoutes = new Set(pageFiles.filter(mutates).map(routeOf));

  const linksByRoute = new Map(
    pageFiles.map((f) => [routeOf(f), renderSet(f).flatMap(linksIn)] as const),
  );

  function reachedWithoutMutating(): Set<string> {
    const matches = (path: string): string | undefined =>
      served.find((r) => r === path) ??
      served.find((r) => new RegExp(`^${r.replace(/\[[^\]]+\]/g, '[^/]+')}$`).test(path));

    const rootFile = pageFiles.find((f) => routeOf(f) === '/');
    const seen = new Set<string>();
    const frontier = ['/'];
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
      // Arrived at, and that is as far as it goes: a page that changes something
      // is somewhere a user chose to be, not somewhere they pass through.
      if (mutationRoutes.has(route)) continue;
      frontier.push(...(linksByRoute.get(route) ?? []));
    }
    return seen;
  }

  it('reaches every route without opening a form that changes something', () => {
    const reached = reachedWithoutMutating();
    const stranded = served.filter((r) => !reached.has(r));

    expect(
      stranded,
      'a user can only get to these by first opening something that mutates',
    ).toEqual([]);
  });

  it('found mutation routes to exclude, and did not exclude everything', () => {
    // Both halves matter. An empty set makes this identical to the walk above
    // and it stops guarding; a set containing the whole product makes it fail
    // for a reason that has nothing to do with reachability.
    expect(mutationRoutes.size).toBeGreaterThan(2);
    expect(mutationRoutes.size).toBeLessThan(served.length - 2);
  });
});

/**
 * A list of things offers each thing.
 *
 * The check above protects the *property* — the agent page is reachable without
 * mutating — and any one link satisfies it. Mutation testing showed the cost:
 * deleting the agent's name-link from its row left the suite green, because
 * `thinking` and `limits` now link back and the walk finds the agent through
 * one of them. True, and not what a person does. They look at their agents and
 * open one.
 *
 * So this is the narrower requirement, stated separately: a page that lists
 * entities links to each entity's own page. Not *how* — the name, a button, a
 * chevron are all a design question — only that the destination is offered from
 * the list, rather than reached by wandering through its children.
 */
describe('a list offers the thing it lists', () => {
  const pageFiles = appFiles.filter((f) => /(^|[/\\])page\.tsx$/.test(f));

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

  /**
   * Derived: a list route is one with a dynamic sibling beneath it. `/agents`
   * has `/agents/[id]`, `/strategies` has `/strategies/[id]`. Listing the two
   * by hand would pass while a third was added — the mistake every check in
   * this file carries a comment about.
   */
  const listRoutes = pageFiles
    .map(routeOf)
    .filter((r) => !r.includes('['))
    .filter((r) =>
      pageFiles
        .map(routeOf)
        // The prefix test is load-bearing and was missing. Without it,
        // `/agents/new` counted as a list because `/strategies/[id]` happens to
        // have `[id]` at the same offset — a substring coincidence between two
        // unrelated routes, reported as a real finding.
        .some((other) => other.startsWith(`${r}/`) && /^\[[^\]]+\]$/.test(other.slice(r.length + 1))),
    );

  it('links from each list to the entity it lists', () => {
    const missing: string[] = [];

    for (const list of listRoutes) {
      const page = pageFiles.find((f) => routeOf(f) === list) as string;
      const offered = renderSet(page).flatMap((f) =>
        [...read(f).matchAll(/\bhref\s*[:=]\s*(?:\{\s*)?(?:["'`])(\/[^"'`#?]*)(?:["'`])/g)].map((m) =>
          (m[1] as string).replace(/\$\{[^}]*\}/g, 'x'),
        ),
      );
      const entity = new RegExp(`^${list}/[^/]+$`);
      // A static sibling is not an entity. `/agents/new` matches the shape and
      // is a route of its own — counting it passed this check with the row link
      // deleted, found by re-injecting the defect rather than by reading.
      const staticSiblings = new Set(pageFiles.map(routeOf));
      // A sub-page is not the entity either. `/agents/x/edit` has an extra
      // segment and fails this deliberately: it was the whole defect, six links
      // to an agent's pages and none to the agent.
      if (!offered.some((path) => entity.test(path) && !staticSiblings.has(path))) {
        missing.push(`${list} lists things and links to none of them`);
      }
    }

    expect(missing, 'a user can see these and not open them').toEqual([]);
  });

  it('found lists to check', () => {
    expect(listRoutes).toContain('/agents');
    expect(listRoutes.length).toBeGreaterThan(1);
  });
});

/**
 * A page about one thing can get back to it.
 *
 * The third property, and the two above do not imply it. One asks whether a
 * route can be reached at all; the other whether a list offers the thing it
 * lists. Neither notices a page with no way out — and both were green while
 * `/strategies/[id]/edit` rendered exactly four links, all of them the global
 * navigation.
 *
 * It was written down before it was enforced. `app-access` has said *"a page
 * about one of several things SHALL name which one, and offer a way back to it"*
 * since the agents side broke the same way this morning; the fix there was four
 * hand-edits and a component, and nothing measured whether it held or whether
 * the other half of the product had the same hole. It did, in all four places.
 *
 * **The list is not a way back, and neither is a sibling sub-page.** Returning a
 * user to `/strategies` after they decline an archive loses their place, which
 * makes the safe choice the more costly one; and `/strategies/[id]/restore`
 * offered `/strategies/[id]/edit` — which is another page about the same
 * strategy, not the strategy.
 *
 * This reads source text, so it cannot tell a link in a rendering branch from
 * one in a branch that does not render — the same limitation every check in this
 * file has. It catches the absence of the link, which is unambiguous.
 */
describe('a page about one thing can get back to it', () => {
  const pageFiles = appFiles.filter((f) => /(^|[/\\])page\.tsx$/.test(f));
  const served = pageFiles.map(routeOf);

  const linksIn = (file: string): string[] =>
    [...read(file).matchAll(/\bhref\s*[:=]\s*(?:\{\s*)?(?:["'`])(\/[^"'`#?]*)(?:["'`])/g)].map(
      (m) => (m[1] as string).replace(/\$\{[^}]*\}/g, 'x').replace(/(.)\/$/, '$1'),
    );

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

  /**
   * **Derived, never listed.** A route is one entity when its last segment is
   * dynamic and nothing above it is: `/agents/[id]`, `/strategies/[id]`.
   * Writing the two down would pass while a third entity was added with the
   * same hole — the mistake every check in this file carries a comment about.
   *
   * The second clause arrived with `/agents/[id]/undeploy/[coin]`: a dynamic
   * segment *under* an entity parameterizes an operation on that entity — the
   * page is about the agent, and it is `scoped` to it below, not an entity of
   * its own.
   */
  const entityRoutes = served.filter((r) => /\/\[[^\]]+\]$/.test(r) && !/\[[^\]]+\]\//.test(r));

  /** A page is scoped to an entity when an entity route is a strict prefix. */
  const scoped = pageFiles.flatMap((file) => {
    const route = routeOf(file);
    const entity = entityRoutes.find((e) => route.startsWith(`${e}/`));
    return entity === undefined ? [] : [{ file, route, entity }];
  });

  /**
   * The entity's own page, and nothing else.
   *
   * A static sibling has the same shape and is a route of its own: `/agents/new`
   * matches `^/agents/[^/]+$` and is not an agent. The same exclusion the list
   * check needs, for the same reason.
   */
  const staticSiblings = new Set(served);
  const isTheEntity = (entity: string, path: string): boolean =>
    new RegExp(`^${entity.replace(/\[[^\]]+\]/g, '[^/]+')}$`).test(path) &&
    !staticSiblings.has(path);

  it('offers a way back to the entity from every page scoped to one', () => {
    const stranded = scoped
      .filter(
        ({ file, entity }) =>
          !renderSet(file)
            .flatMap(linksIn)
            .some((path) => isTheEntity(entity, path)),
      )
      .map(({ route, entity, file }) => `${route} cannot get back to ${entity}  (${file})`);

    expect(stranded, 'a user here has no way back to what the page is about').toEqual([]);
  });

  it('does not accept the list, or another page about the same thing, as a way back', () => {
    // Asserted against the function the check actually uses, not against a
    // regex retyped here — a vacuity check that tests its own copy of the rule
    // measures nothing.
    expect(isTheEntity('/strategies/[id]', '/strategies/x')).toBe(true);
    expect(isTheEntity('/strategies/[id]', '/strategies')).toBe(false);
    expect(isTheEntity('/strategies/[id]', '/strategies/x/edit')).toBe(false);
    expect(isTheEntity('/agents/[id]', '/agents/new')).toBe(false);
  });

  it('derived the entities, and the pages scoped to them', () => {
    // The derivation must find the real ones. Empty passes the check above
    // vacuously; everything fails it for a reason unrelated to getting back.
    expect([...entityRoutes].sort()).toEqual([
      '/agents/[id]',
      '/arena/[id]',
      '/explorer/[agentId]',
      '/pending/[id]',
      '/strategies/[id]',
      '/strategies/metrics/[metric]',
      '/strategies/signals/[id]',
    ]);
    // An entity's own page is the destination, never in the set that must reach
    // it. Getting this wrong would demand every entity page link to itself.
    for (const entity of entityRoutes) {
      expect(scoped.map((s) => s.route)).not.toContain(entity);
    }
    expect(scoped.length).toBeGreaterThan(8);
    expect(scoped.length).toBeLessThan(served.length);
  });

  /**
   * Declining does not dump you on the roster.
   *
   * The check above is satisfied by any link to the entity anywhere in the page,
   * which is the right question for "is this a dead end" and the wrong one for
   * the decline itself. A page can carry a perfectly good `Back to X` paragraph
   * while the button beside Apply goes somewhere else — and three of them did.
   *
   * **This is the check that found the worst instance, because it resolves
   * relative hrefs.** `plan-review.tsx` offered *"Go back and change it"* as
   * `href=".."`, which from `/strategies/<id>/edit` resolves to `/strategies/` —
   * the roster. The one control promising to change the composed plan discarded
   * it and landed the user in a list of thirty-seven. Every scan in this file
   * matched only paths beginning with `/`, so none of them could see it.
   *
   * Going back to the form is a fine place to be sent, and so is the entity.
   * The list is not: it is the one destination that throws away both the
   * operation and the user's place.
   */
  it('sends a declined confirmation somewhere other than the list', () => {
    /** The list a scoped entity belongs to: `/strategies/[id]` → `/strategies`. */
    const listOf = (entity: string): string => entity.slice(0, entity.lastIndexOf('/'));

    const wrong: string[] = [];

    for (const { file, route, entity } of scoped) {
      const list = listOf(entity);
      for (const source of renderSet(file)) {
        for (const form of read(source).matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)) {
          const attrs = form[1] as string;
          // A GET form navigates and reaches no operation, so it has nothing to
          // decline — the same exclusion the sibling checks make.
          if (/method=["']get["']/i.test(attrs)) continue;
          if (!/action=\{(?!`)/.test(attrs)) continue;

          for (const link of (form[2] as string).matchAll(/href=\{?["'`]([^"'`]+)/g)) {
            const href = link[1] as string;
            // Resolved the way a browser resolves it, against a concrete URL
            // standing in for this route. Reading the attribute as written is
            // what let `..` pass for a way back.
            const here = `http://h${route.replace(/\[[^\]]+\]/g, 'x')}`;
            const to = new URL(href.replace(/\$\{[^}]*\}/g, 'x'), here).pathname.replace(
              /(.)\/$/,
              '$1',
            );
            if (to === list) {
              wrong.push(`${route}: declining goes to ${list} — "${href}" in ${source}`);
            }
          }
        }
      }
    }

    expect(wrong, 'declining an operation drops the user on a list').toEqual([]);
  });

  it('is looking inside forms that actually exist', () => {
    // Vacuity: if no scoped page had an action-bound form, the check above would
    // pass on a product where every confirmation cancelled to the roster.
    const withForms = scoped.filter(({ file }) =>
      renderSet(file).some((source) =>
        [...read(source).matchAll(/<form\b([^>]*)>/g)].some(
          (m) => !/method=["']get["']/i.test(m[1] as string) && /action=\{(?!`)/.test(m[1] as string),
        ),
      ),
    );
    expect(withForms.map((w) => w.route).sort()).toEqual([
      '/agents/[id]/archive',
      '/agents/[id]/deploy',
      '/agents/[id]/edit',
      '/agents/[id]/reactivate',
      '/agents/[id]/rebind',
      '/agents/[id]/undeploy/[coin]',
      '/strategies/[id]/archive',
      '/strategies/[id]/conditions/save',
      '/strategies/[id]/edit',
      '/strategies/[id]/fork',
      '/strategies/[id]/restore',
      '/strategies/[id]/rules/[signalId]',
    ]);
  });
});
