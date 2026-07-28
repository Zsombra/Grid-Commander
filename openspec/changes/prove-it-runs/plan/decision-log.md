# prove-it-runs Decision Log

## Purpose

Track high-signal decisions across planner, executor, and auditor phases.
Do not log cosmetic updates. Log only items that affect scope, risk, validation,
waivers, or handoff clarity.

## Entries

### DL-001

- Timestamp: `2026-07-28 03:20 UTC`
- Phase: `PLANNING`
- Type: `scope-change`
- Decision: Five defects ship in one change rather than five.
- Impacted files: the whole change
- Reason: They are one finding. Nothing in this project had ever executed; every
  item here was found in the twenty minutes after a database started, and four of
  the five are invisible without the first two being fixed. Splitting them would
  produce four changes that cannot be verified until the fifth lands.
- Approved by: planner, on the proposal's declared scope
- Next action: executor works groups 1–5 in order

### DL-002

- Timestamp: `2026-07-28 03:20 UTC`
- Phase: `PLANNING`
- Type: `risk`
- Decision: Task 3.1 (drop `confirmation_tokens.actor`) must complete before task
  3.3 (`db:generate`), and the plan says so in three places.
- Impacted files: `src/infrastructure/db/schema/index.ts`, `drizzle/migrations/**`
- Reason: This is the only moment the column can be removed for the cost of one
  line. After the first migration is committed it costs a second migration
  against a table holding evidence of user consent — and the reviewer of that
  migration will reasonably ask why a column nobody used is being dropped.
- Approved by: planner
- Next action: executor checks 3.1 and 3.2 off before running 3.3

### DL-003

- Timestamp: `2026-07-28 03:20 UTC`
- Phase: `PLANNING`
- Type: `risk`
- Decision: Both new guards must be demonstrated failing before they are trusted —
  task 2.2 for the build gate, task 6.5 for the identity fix.
- Impacted files: `plan/architecture-review.md` (evidence)
- Reason: This project has twice shipped a guard that did not cover the case it
  was written for: the coercion scan that matched three patterns and missed the
  fourth, and CI's three gates that never covered the build. Both were added in
  good faith and both were believed. Re-injecting the defect is cheap and is the
  only thing that distinguishes a guard from a comment.
- Approved by: planner
- Next action: executor records both outputs verbatim, not a summary

### DL-004

- Timestamp: `2026-07-28 03:20 UTC`
- Phase: `PLANNING`
- Type: `risk`
- Decision: `tests/db/**` must be excluded from the default vitest config in the
  same task that creates the first file under it.
- Impacted files: `vitest.config.ts`, `vitest.db.config.ts`, `package.json`
- Reason: The default `include` is `tests/**/*.test.ts`. A database test added
  without the exclusion makes `npm test` require PostgreSQL on every machine and
  in the `app` CI job, which currently has no database — so the first symptom is
  the whole existing suite failing for an unrelated reason.
- Approved by: planner
- Next action: executor confirms `npm test` passes with the database stopped

### DL-005

- Timestamp: `2026-07-28 03:20 UTC`
- Phase: `PLANNING`
- Type: `exception`
- Decision: `oauth_transactions` is exempt from data-pipeline Layer 1 check 5
  ("every user-owned table has a `userId` column and an index on it").
- Impacted files: `src/infrastructure/db/schema/index.ts`
- Reason: The row exists before an identity does — it is created when the
  authorization starts and consumed when the callback returns, which is the
  moment the user becomes known. `state` is both the primary key and the only key
  it is ever looked up by. Adding a `user_id` would mean inventing one.
- Approved by: planner
- Next action: auditor treats this as a stated exception, not a missed check

### DL-006

- Timestamp: `2026-07-28 03:20 UTC`
- Phase: `PLANNING`
- Type: `waiver`
- Decision: The architecture checklist's quality-gate commands say `pnpm`; the
  executor runs `npm`. Not fixed in this change.
- Impacted files: `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md` (not edited)
- Reason: The repository has no pnpm lockfile and CI uses `npm ci`, so `npm` is
  what the gate actually is. Editing a checklist inside a change about migrations
  is scope creep, and the planner may not write to `docs/specs/` in any case.
- Approved by: planner
- Next action: file a backlog item; auditor runs the npm forms

### DL-007

- Timestamp: `2026-07-28 03:20 UTC`
- Phase: `PLANNING`
- Type: `risk`
- Decision: The root layout ships no visual design of any kind.
- Impacted files: `app/layout.tsx`
- Reason: A root layout is the natural place to establish a font, a background, a
  page width — and doing so here would silently settle decisions that belong to
  the `/surface` → `/design` handoff, before the design agent has seen a single
  surface. The layout that makes the build succeed and the layout that makes the
  product look like something are different pieces of work.
- Approved by: planner
- Next action: auditor checks for colour, spacing, font and token values and
  treats any as a finding

### DL-008

- Timestamp: `2026-07-28 04:45 UTC`
- Phase: `EXECUTION`
- Type: `scope-change`
- Decision: `ConnectionWriter.upsert` changes its return type from `string` to
  `ResolvedConnection { userId, connectionId }`. The plan's claim that this
  change makes no contract changes was wrong.
- Impacted files: `src/domain/connection/connection-repository.ts`,
  `src/infrastructure/db/repositories/drizzle-connection-repository.ts`,
  `src/application/use-cases/connect.commands.ts`, `tests/support/fakes.ts`
- Reason: Fixing the storage side alone converts a loud failure into a silent
  one. `CompleteConnectionCommand` proposes a user id, and returned *its own*
  proposal to the session layer. Once the repository resolves the conflict
  internally, the losing callback would be signed in under an id that holds no
  connection — a user who authorised successfully and lands on "not connected",
  with nothing in any log saying why. The delta spec requires that "both
  callbacks resolve to that identity", which cannot be satisfied without telling
  the caller which identity it resolved to.
- Approved by: executor, against the delta spec's third scenario
- Next action: auditor treats the port change as in scope; the plan's
  "Contracts impacted: none" line is superseded by this entry

### DL-009

- Timestamp: `2026-07-28 04:47 UTC`
- Phase: `EXECUTION`
- Type: `risk`
- Decision: `FakeConnectionRepository.upsert` now resolves the identity by
  subject, as the real one does.
- Impacted files: `tests/support/fakes.ts`
- Reason: The fake keyed connections on the proposed `userId` alone, so it could
  not represent the invariant the unique index on `battlegrid_subject` enforces —
  one BattleGrid account, one identity. A fake that models a weaker rule than the
  database is a fake that agrees with whatever the code does, which is the
  failure mode this whole change exists to close.
- Approved by: executor
- Next action: none; 390 unit tests pass unchanged against the corrected fake

### DL-010

- Timestamp: `2026-07-28 04:52 UTC`
- Phase: `EXECUTION`
- Type: `scope-change`
- Decision: A `db:migrate` script was added (`drizzle-kit migrate`), and CI runs
  it against the service container before the database tests.
- Impacted files: `package.json`, `.github/workflows/validate.yml`
- Reason: The proposal puts "migration tooling beyond the first migration" out of
  scope, and this is close to that line. It is included because CI has to apply
  the migration somehow, and applying it *from the committed journal* is what
  makes the second scenario of "The Schema Is Created By A Committed Migration"
  checkable on every run: schema drift fails in CI rather than in production.
  It is drizzle-kit's own command, not a bespoke runner, and no deploy hook or
  rollback story is added. The deployment question stays open in
  `apply-migrations-on-deploy`.
- Approved by: executor
- Next action: auditor confirms no deploy-time migration machinery was added

### DL-011

- Timestamp: `2026-07-28 04:40 UTC`
- Phase: `EXECUTION`
- Type: `exception`
- Decision: The CI `Build` step carries no environment at all, rather than the
  build-time placeholders the plan anticipated.
- Impacted files: `.github/workflows/validate.yml`
- Reason: The build was found to need no configuration — the composition root is
  lazy, so nothing calls `loadConfig()` during prerender. A step holding
  placeholder credentials would be an invitation to replace them with real ones
  later, for a need that does not exist.
- Approved by: executor
- Next action: none

### DL-012

- Timestamp: `2026-07-28 05:02 UTC`
- Phase: `EXECUTION`
- Type: `risk`
- Decision: `next-env.d.ts` is added to the ESLint ignore list.
- Impacted files: `eslint.config.mjs`
- Reason: `next build` generates it, `.gitignore` excludes it, and Next documents
  it as not-to-be-edited — but ESLint linted it and failed on the triple-slash
  reference it contains. Because CI runs lint before build, the file would not
  exist there and lint would pass, while any developer who had built once would
  see it fail. A gate whose result depends on whether you built first is worse
  than one that fails: it teaches people the gate is noise.
- Approved by: executor
- Next action: none

### DL-013

- Timestamp: `2026-07-28 05:05 UTC`
- Phase: `EXECUTION`
- Type: `handoff`
- Decision: The absence of Tailwind is filed rather than fixed
  (`tailwind-classes-with-no-tailwind`, p2).
- Impacted files: none in this change
- Reason: Serving the application for the first time revealed that all 213
  `className` values are Tailwind utilities and Tailwind is not installed — no
  dependency, no config, no stylesheet. The product renders in browser defaults.
  Styling is explicitly out of scope here, and the fix is a design decision
  (`/surface` → `/design`), not a build fix. Installing Tailwind to make the
  existing classes work would pre-commit the design agent to a vocabulary it did
  not choose.
- Approved by: executor
- Next action: `/surface` when the design handoff is picked up
