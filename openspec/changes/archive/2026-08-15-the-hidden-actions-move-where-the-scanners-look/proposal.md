# Proposal: The Hidden Actions Move Where The Scanners Look

## Why

Three server actions — `agree` and `decline` on `/pending/[id]`, and the
connect action — are module-level but unexported, declared with function-level
`'use server'` directives inside their pages. Both action scanners
(`tests/architecture/a-form-sends-what-its-action-reads.test.ts:164` and
`reachability.test.ts:95-99`) anchor discovery on `export`, so the cross-check
that exists because `RebindConfirm` shipped with a form sending four fields to
an action reading five has never covered them. They are one refactor away from
the same defect, and the scanners would stay green (backlog #263).

## What Changes

- `agree` and `decline` move from `app/(app)/pending/[id]/page.tsx` into a
  colocated `app/(app)/pending/[id]/actions.ts` with a module-level
  `'use server'` directive, exported — the convention
  `the-build-checks-what-next-generates` established for every other action.
- `startAuthorization` moves from `app/connect/page.tsx` into
  `app/connect/actions.ts`, same shape.
- `agree`/`decline`'s tolerant local `text()` reads (absent field → `''`)
  become `requiredText` from `@/presentation/form.js`, the shared reader every
  other ceremony action uses — this is what makes their required-field sets
  visible to the form-field cross-check. `agree`'s `JSON.parse` try/catch for a
  *malformed* `changes` value stays; only field *absence* changes outcome
  (`FormError` instead of a silently empty string). No form the product
  renders can produce that absence — the cross-check now proves it for these
  forms too.
- A new architecture guard bans function-level `'use server'` directives in UI
  source, so the shape invisible to both scanners cannot regrow silently. Its
  matcher is proven against fixture text in both directions, per the existing
  "An Architecture Guard Fails When Its Own Matcher Stops Working" requirement
  — the live tree has nothing for it to find once the move lands.
- The form-field cross-check's discovery floor rises from 14 to 16, since
  `agree` and `decline` join the discovered set.

## Capabilities

**New**: (none)
**Modified**: `harness-integrity` — one ADDED requirement: a server action is
declared where the action scanners look, and the inline-directive shape fails
a guard.

## Out of Scope

- **Teaching the scanners the unexported in-page shape** — the item's other
  repair option. Mooted rather than rejected on taste: a page module cannot
  *export* an action without violating the page contract the build gate
  enforces ("The Build Gate Type-Checks The Route Types Next Generates"), so
  the in-page shape can never be made scanner-visible by export. Banning the
  shape and moving its three instances is the version of "teach the scanners"
  that cannot drift.
- **The field cross-check's extraction breadth** — it reads only
  `requiredText`/`requiredInteger` calls. Actions reading via `optionalText`
  or other tolerant readers contribute no required fields, by design (an
  optional field absent from a form is not a broken write path). Unchanged.
- **Any behavior of the agree/decline/connect flows themselves** — the specced
  scenarios (refused agree returns with the reason, decline closes
  permanently, connect starts authorization) are untouched. The one observable
  delta is deliberate and stated above: a hand-crafted POST omitting a field
  now gets the same `FormError` every other ceremony action gives it.

## Impact

- `app/(app)/pending/[id]/page.tsx` shrinks to rendering; new
  `app/(app)/pending/[id]/actions.ts` (imports: `acting`, `requestApp`,
  `spending`, `editArguments`, `requiredText`, `redirect`).
- `app/connect/page.tsx` shrinks to rendering; new `app/connect/actions.ts`.
- `tests/architecture/reachability.test.ts` gains the inline-directive matcher,
  its rule, and fixture proofs; its orphan-action rule now covers all three
  moved actions.
- `tests/architecture/a-form-sends-what-its-action-reads.test.ts` now
  discovers `agree` (4 required fields) and `decline` (1); floor 14 → 16.
- Surface manifests `pending-proposal.json` and `connect.json` go stale (both
  pin their page's digest) and must be re-surveyed with the new actions.ts
  files added as sources — manifests pin actions.ts files on every other
  confirm surface already.
- No schema, port, or adapter changes. No new dependencies.
