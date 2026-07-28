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
 * **Known blind spot, stated rather than discovered (DL-106).** This checks that
 * a form is bound to an action. It does not check that every control inside the
 * form reaches that action's payload — `agent-form.tsx` renders a
 * position-management select while the create action sends `tradingConfig: null`,
 * and nothing here catches it. That is filed as
 * `a-preset-does-not-constrain-its-config`.
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
