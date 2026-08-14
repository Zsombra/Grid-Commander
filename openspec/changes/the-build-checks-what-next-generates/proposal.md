# Proposal: The Build Checks What Next Generates

## Why

`next build` writes a type-validation file per route and type-checks it — and
this project throws that check away. `tsconfig.json` names
`.next/types/**/*.ts` in `include` and `.next` in `exclude`, and exclude
filters include, so the files are generated on every build and checked on
none. `npm run build` is a declared quality gate, and it passes because a
check it runs is discarded, not because the code satisfies it (#216,
`the-build-never-checks-nexts-generated-route-types`).

The drift is measurable: the item recorded six failing pages on 2026-08-13.
Reproduced on 2026-08-15 (build into a distDir the exclusion does not cover),
there are **fourteen**, plus one distinct props-contract violation. Two days
of sessions added eight violating pages because the check that would have
refused them never ran.

## What Changes

- **The tsconfig exclusion stops swallowing the generated types.**
  `exclude: ["node_modules", ".next"]` becomes an exclusion that keeps
  `.next/types` visible to the checker. From then on `npm run build` fails on
  a route-contract violation, and `npm run typecheck` sees the generated
  types whenever a build has produced them.
- **Fourteen pages come into Next's page contract.** Each exports exactly one
  server action (`export async function X(formData: FormData)`) beside its
  `default`, which the contract forbids. Every action moves to a colocated
  `actions.ts` module (`'use server'` at the top), and the page imports it.
  Rendering and behavior are unchanged — the actions read only from
  `formData` and close over nothing.
- **`app/(app)/agents/new/page.tsx` satisfies `PageProps`.** Its `= {}`
  parameter default widens the props type to `| undefined`, which the
  generated check refuses. The default goes; the three bare `Page()` calls in
  tests pass `{}` explicitly.
- **The scanner tests that discover server actions survive the move
  honestly.** `tests/architecture/a-form-sends-what-its-action-reads.test.ts`
  resolves the form for a moved action through the page that imports it;
  source-slicing tests (`rename.test.ts`,
  `a-create-carries-a-dedupe-key.test.ts`, and whatever else the suite
  surfaces) re-point at the actions module. Their anti-vacuity floors stay in
  force — the point is that they keep finding what they found before.
- **A new architecture guard pins the tsconfig coherence**: no `exclude`
  entry may swallow a path that `include` names. Proven per the existing
  guard-proof requirement (matcher shared between proof and live scan,
  fails-when-blind in both directions, clean pass).
- **The affected surface manifests are re-pinned** with the new `actions.ts`
  files added to their `source_files`, so a later edit to an action stales
  the surface that renders its form (the #230 lesson applied to this move).

## Capabilities

**New**: none
**Modified**: `harness-integrity` — one ADDED requirement (the build gate
type-checks the route types Next generates)

## Out of Scope

- **The vacuous surface-source import cross-check (#230).** Same class of
  defect, different guard; it stays its own p2 item.
- **A surface manifest for `/agents/new`.** The route still has none; that is
  `the-new-agent-form-has-no-surface` (p3) and is not created here.
- **The two `pending/[id]` actions and the `connect` action.** They are
  module-level and unexported, so they already satisfy the page contract —
  but that shape is invisible to the form-field cross-check scanner, whose
  discovery regex requires `export`. Filed as a new backlog item rather than
  bundled: moving them is a convention sweep, not a gate fix.
- **Building beside a running server.** The investigation used a temporary
  `distDir` override so a probe build would not disturb a live `next start`.
  That wiring is reverted, not shipped: its purpose was reading errors the
  gate discarded, and once the gate reports them itself a parallel probe
  build has no job. Deliberately not filed.

## Impact

- `tsconfig.json` — exclusion fix; Next's mid-build rewrite must be
  re-checked after the change (it rewrites the file when it disagrees).
- 14 × `app/(app)/**/page.tsx` edited; 14 × colocated `actions.ts` created:
  agents/[id]/{archive,deploy,edit,reactivate,rebind,undeploy/[coin]},
  agents/new, recorder/trim,
  strategies/[id]/{archive,conditions/save,edit,fork,restore,rules/[signalId]}.
- Tests: import re-points in `tests/rendering/{lifecycle-actions,
  fork-preflight,new-agent}.test.ts`; scanner updates in
  `tests/architecture/a-form-sends-what-its-action-reads.test.ts` and any
  source-slicing test the suite flags; one new architecture guard file.
- `openspec/design/surfaces/*.json` — the ~13 manifests covering the touched
  routes go stale by digest and are re-pinned with `actions.ts` added.
- No runtime behavior change, no route change, no visual change, no schema
  change. `mcp:read`/`mcp:wager` untouched; no BattleGrid call is added or
  altered.
