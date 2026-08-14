# Design: The Build Checks What Next Generates

## Technical Approach

Two halves, ordered so the gate can only come on once the tree passes it:
first bring the fourteen non-conforming routes into Next's page contract,
then remove the exclusion that has been discarding the check, then prove the
gate bites by breaking one page on purpose and watching the build fail.

The route fix is uniform: every page-exported server action moves to a
colocated `actions.ts` with `'use server'` at module top, one action per
module, page imports it via the repo's `.js`-specifier convention. All
fourteen actions are module-level and read exclusively from `formData`, so
the move is a cut-and-paste with imports — no closure can be severed because
none exists.

## Decisions

### Decision: All fourteen actions move to `actions.ts`, none is unexported in place
Chosen because the test ecosystem defines a server action as
`export async function X(formData: FormData)`: the discovery regex in
`a-form-sends-what-its-action-reads.test.ts` and `serverActionsIn()` in
`reachability.test.ts` both anchor on `export`. Moving keeps both regexes
matching and keeps every action directly importable by tests — four already
are (`create`, `forkStrategy`, `archiveStrategy`, `restoreStrategy`).
Rejected: removing the `export` keyword in place (the `pending/[id]` shape)
because it silently removes those actions from the form-field cross-check's
corpus and forces regex surgery in two scanners; a mixed pattern (move only
the test-imported four) because two conventions invite the next page to copy
whichever it saw last.

### Decision: `exclude` drops `.next`, rather than enumerating `.next`'s subdirectories
Chosen because it is Next's own default (`create-next-app` excludes only
`node_modules`) and the sweep risk is empirically small: the only `.ts`
files under `.next` are the generated types this change wants checked, which
`tsc --listFiles` must confirm after a real build. Rejected: excluding
`.next/cache`, `.next/standalone`, … individually, because the list is
Next-version-dependent and a new subdirectory would silently re-open the
hole this change closes. If `--listFiles` shows unwanted sweep, the narrow
enumeration becomes the fallback, with the guard below still pinning types
visibility.

### Decision: The coherence guard compares `include` against `exclude` generally
Chosen because the failure class is "an exclude entry swallows an include
entry", not ".next specifically" — hard-coding `.next` would be the same
one-step-behind assumption #230 records about hard-coding `@/`. The guard
parses `tsconfig.json` (JSONC — comments stripped before parsing), and fails
when any include entry's path falls under any exclude entry. Proven per the
existing guard-proof requirement: the live matcher is the one the proof
mutates, both blind directions fail, and the clean pass carries an input the
matcher must not report. Rejected: asserting the literal expected arrays,
because that pins formatting Next rewrites mid-build and fails on churn
rather than on meaning.

### Decision: `agents/new` keeps `searchParams` optional but loses the `= {}` default
Chosen because `PageProps` declares `searchParams?: Promise<any>` — an
optional member is fine, an optional *parameter* is not (it widens the props
union with `undefined`). The three bare `Page()` test calls become
`Page({})`, which is the same rendering with the contract satisfied.
Rejected: making the whole param required with a mandatory `searchParams`,
because Next genuinely may construct the page with either present, and tests
render both shapes.

### Decision: Scanners are extended, never loosened
The form-field cross-check must resolve the form for an action that lives in
`actions.ts` by finding the page that imports it — the same cross-file
resolution it already does for forms handed to components. Its floors
(`pairs.length >= 8`, "no form resolved" empty) stay as they are; if the
extension is wrong the floor fails loudly, which is the property that made
this ordering safe to attempt. Source-slicing tests re-point to the file the
code actually lives in and must be watched for the opposite failure: a
slice that greps for absence passes vacuously when its subject moves files,
so every re-point is verified by breaking the moved code once and watching
the test fail.

## File Changes

- `tsconfig.json` (modified) — exclusion fix; re-checked against Next's
  mid-build rewrite
- `app/(app)/agents/[id]/{archive,deploy,edit,reactivate,rebind}/page.tsx`,
  `app/(app)/agents/[id]/undeploy/[coin]/page.tsx`,
  `app/(app)/agents/new/page.tsx`, `app/(app)/recorder/trim/page.tsx`,
  `app/(app)/strategies/[id]/{archive,edit,fork,restore}/page.tsx`,
  `app/(app)/strategies/[id]/conditions/save/page.tsx`,
  `app/(app)/strategies/[id]/rules/[signalId]/page.tsx` (modified) — action
  extracted, imported back
- Same fourteen directories × `actions.ts` (new) — one server action each
- `tests/rendering/{lifecycle-actions,fork-preflight,new-agent}.test.ts`
  (modified) — import re-points; bare `Page()` → `Page({})`
- `tests/architecture/a-form-sends-what-its-action-reads.test.ts` (modified)
  — cross-file form resolution for moved actions
- `tests/agent/rename.test.ts`, `tests/architecture/
  a-create-carries-a-dedupe-key.test.ts` (modified) — source slices re-point;
  plus whatever the suite run surfaces
- `tests/architecture/tsconfig-coherence.test.ts` (new) — the guard
- `openspec/design/surfaces/*.json` (~13 modified) — `actions.ts` added to
  `source_files`, digests re-pinned
