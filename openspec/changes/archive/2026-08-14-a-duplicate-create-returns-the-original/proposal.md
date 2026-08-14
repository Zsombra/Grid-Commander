# Proposal: A duplicate create returns the original, not a crash

Resolves #239 (backlog: `a-duplicate-create-crashes-instead-of-returning-the-original`).

## Why

#231 shipped an `idempotencyKey` on `/agents/new` and three binding records quote
BattleGrid's contract for it — *"a retry with the same key returns the original
result rather than repeating the command."* Measured, neither half is in force:
the key never reaches BattleGrid (`request.args` does not carry it), and the
local mechanism is a bare INSERT against a unique index with no conflict path.
So a second press of Create is a raw Postgres unique violation surfacing as
*"Application error: a server-side exception has occurred"* — and a create that
**failed** at the platform burns its key, so the one retry this feature exists
to make safe is the one press it refuses, with a crash.

This must land **before** the active change's task 1: running
checklist-generator first would write the falsified clause into a binding
standard, and the annotation on that change's task 3.3 records that no existing
gate catches it.

## What Changes

- **A second press of a create that succeeded creates nothing and tells the
  operator it was already created**, on the surface they acted from — never a
  framework error page.
- **A failed create no longer burns its key.** Only a `succeeded` (or
  still-undecided) attempt holds the key; a retry after a platform failure is a
  fresh attempt with the same key. (Operator decision, this session: only
  succeeded dedupes.)
- **A press whose earlier attempt has no outcome yet is refused honestly** —
  "it may have landed; check your roster" — rather than either crashing or
  quietly attempting a possible duplicate.
- **The key is sent to BattleGrid** in the field `create_intelligence_agent`
  declares, so the platform contract the records quote is actually offered to
  the platform. (Whether the platform honours it stays an open question — #238
  is deliberately not closed by this change.)
- **Two presses racing resolve to at most one attempt**, the loser refused with
  the same legible sentence instead of a 500.

## Capabilities

**New**: none
**Modified**: `agent-authoring` — one ADDED requirement (new concern on
existing behavior: what a repeated create does)

## Out of Scope

- **Whether BattleGrid actually dedupes** a keyed or same-named create — #238
  and `forking-a-name-that-exists-is-a-500` (#245-adjacent) stay open. This
  change makes the local guarantee true regardless of the platform's.
- **The create action's other silent arms.** `create` in
  `app/(app)/agents/new/page.tsx` ignores `invalid`, `at-capacity` and
  `no-catalog` results today (reachable by race, since the page gates both
  before rendering). Distinct defect — silence, not a crash — filed as its own
  backlog item alongside this proposal.
- **An app-wide error boundary** — #236.
- **The checklist wording** — the active change
  `a-duplicate-submit-cannot-duplicate-a-write` owns it; this change is what
  makes an honest wording available to it.
- Dedupe keys for any other write path. Create is the only keyed submit; the
  guard machinery this change touches stays generic, but no other surface
  starts passing a key here.

## Impact

- `src/infrastructure/db/schema/index.ts` + a new drizzle migration — the
  unique index on `(user_id, idempotency_key)` becomes partial
  (`WHERE outcome != 'failed'`).
- `src/domain/errors.ts` (or `domain/audit`) — new typed
  `DuplicateIdempotencyKeyError`.
- `src/infrastructure/db/repositories/drizzle-audit-repository.ts` — `begin`
  converts the unique violation into the typed error; `findByIdempotencyKey`
  narrows to the live (non-failed) entry.
- `src/infrastructure/battlegrid/agent-adapter.ts` — `createAgent` puts the key
  into the tool arguments.
- `src/application/use-cases/create-agent.command.ts` — new `duplicate` result
  kind.
- `app/(app)/agents/new/page.tsx` — the action branches on it; the page reads
  `?problem=` and mounts `CarriedProblem` on every branch.
- `tests/support/fakes.ts`, plus new db/unit/rendering/wire tests.
- No BattleGrid scope change: `create_intelligence_agent` mutates without
  wager scope and is not destructive, so no confirmation flow is touched.
