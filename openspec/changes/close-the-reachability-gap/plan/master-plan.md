# Close The Reachability Gap — Implementation Plan (Master Handoff Document)

## Status

- Change ID: `close-the-reachability-gap`
- Track: `full`
- Current phase: `Ready for Production Gate`
- Base ref for diffs: `origin/main`
- Evidence base: `4890081`
- Last updated: `2026-07-28`

## Objective

Connect what the interface offers to what the application can serve — five
routes that 404 and four forms that submit nowhere — and add the guard that
measures reachability in that direction, so the sixth instance fails a build
instead of reaching a user.

## Requirement Coverage Matrix

| Requirement | Delta op | Implementing file(s) | Scenario → verification |
|---|---|---|---|
| Every Affordance The Interface Offers Resolves | ADDED | `app/(app)/agents/[id]/edit/page.tsx`, `.../reactivate/page.tsx`, `app/(app)/strategies/[id]/{fork,archive,restore}/page.tsx` (create); `tests/architecture/reachability.test.ts` (create) | A link the interface renders → task 4.3 served probe<br>An affordance gated on permission → task 4.3<br>An affordance with no destination → task 4.2, re-inject a dead link |
| Every Form The Interface Renders Can Be Submitted | ADDED | `agent-form.tsx`, `rebind-confirm.tsx`, `plan-review.tsx` (modify); `agents/new`, `agents/[id]`, `agents/[id]/rebind`, `strategies/[id]/edit` (modify) | Submitting a rendered form → task 4.4<br>A form bound to nothing → task 4.2<br>An operation nothing submits to → task 4.2<br>A form that renders correctly and does nothing → task 1.3, the guard naming all four |
| Every Capability Is Reachable | MODIFIED | all of the above | Authoring agents → task 4.3 + 4.4<br>Authoring strategies → task 4.3 + 4.4<br>A route table is not the interface → task 1.1, the guard starts from rendered links |

Out of scope (from the proposal — do not implement):
- The agent edit form's full trading-config field set (`agent-edit-form` stays open)
- The strategy section editor
- Strategy browsing for rebind
- Styling of any kind
- Proving a real BattleGrid round trip

## Non-Negotiable Constraints

From `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md` Quick Reference Card:

- Domain interfaces and ports only in use cases; never import infrastructure
- BattleGrid only through `BattleGridPort`, composed once
- Scope is never a safety signal; classify the tool
- Unknown tools fail closed
- Audit written before the attempt, updated with the outcome
- `expectedRevision` always; surface conflicts, never retry
- Drizzle builder only, always scoped by `userId`

Quality gates, as this repository runs them (DL-006 — the checklist says pnpm):

```bash
npm run typecheck && npm run lint && npm test && npm run build
npm run test:db          # requires DATABASE_URL
python3 .claude/tools/openspec.py validate --all
```

**Constraints this change adds:**

- **No page may introduce a new way to reach BattleGrid.** Every new route goes
  through `acting()` and the composed `app`, like every existing one.
- **No new confirmation shape.** Strategy archive reuses the token path the
  agent archive page already demonstrates.
- **The new pages carry no styling beyond what the existing ones have.** The
  design survey must see one consistent surface, not five pages designed ahead
  of the design agent.
- **The guard is written before the fix and recorded failing.** See DL-101.

## Architectural Boundaries

- Layers touched: **Presentation only** (`app/`, `src/presentation/components/`)
  plus one new test.
- **Domain, application, ports, infrastructure: untouched.** Every use case this
  change reaches already exists, is tested, and is wired in `composition.ts`. If
  the executor finds itself editing a use case, the plan is wrong — stop and say
  so.
- Contracts impacted: three components gain a required `action` prop. Internal
  only; no port, DTO, or domain type changes.

## File & Responsibility Inventory

| File | Action | Responsibility | Notes |
|---|---|---|---|
| `tests/architecture/reachability.test.ts` | create | Both halves of the guard | Written first, run against the broken tree |
| `src/presentation/components/agent-form.tsx` | modify | Require `action`; drop the hardcoded `method`/`action` | |
| `src/presentation/components/rebind-confirm.tsx` | modify | Same | |
| `src/presentation/components/plan-review.tsx` | modify | Same | |
| `app/(app)/agents/new/page.tsx` | modify | Pass `create` | |
| `app/(app)/agents/[id]/page.tsx` | modify | Render a rename form; pass `rename` | Currently an action with no form at all |
| `app/(app)/agents/[id]/rebind/page.tsx` | modify | Pass `performRebind` | |
| `app/(app)/strategies/[id]/edit/page.tsx` | modify | Write the apply action; pass it to `PlanReview` | No `'use server'` exists here today |
| `app/(app)/agents/[id]/edit/page.tsx` | create | Agent-owned fields via `UpdateAgentCommand` | Render `rejected`/`invalid` as named field errors |
| `app/(app)/agents/[id]/reactivate/page.tsx` | create | Reactivate, its own consequence copy | Not a query param on archive — DL-104 |
| `app/(app)/strategies/[id]/fork/page.tsx` | create | Fork; no confirmation token | Forking changes nothing that exists |
| `app/(app)/strategies/[id]/archive/page.tsx` | create | Archive with the blast-radius token | Follows the agent archive page |
| `app/(app)/strategies/[id]/restore/page.tsx` | create | Restore; handle `repair-required` | Uses `REPAIR_REQUIRED_GUIDANCE` |

## Dependency / Call-Tree Sketch

```text
page.tsx  --acting()-->  app (composition root)
   |                        |
   |  <Component action={serverAction} />
   |                        |
   +-- form submit ---> serverAction --'use server'--> app.<useCase>.execute()
                                                          |
                                          guard sequence -> audit -> BattleGrid
```

The middle edge is the whole defect. Today four pages have the top and the
bottom and nothing joining them.

## Checklist Coverage

### Data pipeline

| Layer | Touched | What must hold |
|---|:--:|---|
| 0 BattleGrid | ✗ | No new call sites |
| 1–4 Database/schema/queries/mappers | ✗ | No schema change, no migration |
| 5 Use case | ✗ | **None modified** — this is the test of whether the plan is right |
| 6 Route handlers | ✓ | Every new page reads through `acting()`; every write goes through a server action |
| 8 Client components | ✓ | The three components stay presentational; they gain a prop, not a decision |

The Iron Rule is unaffected: nothing is computed here that a use case already
computed.

### Architecture

| Rule | Applies | What must hold |
|---|:--:|---|
| Use case review | ✗ | None touched |
| Repository / mapper / query safety | ✗ | None touched |
| DI wiring / composition root | ✓ | Unchanged; new pages reach it the existing way |
| P6 One way in | ✓ | Structural test must still pass |
| P3 Every write audited | ✓ | Newly *reachable* writes now actually reach the audit — for the first time |

### UI

| Rule | Applies | What must hold |
|---|:--:|---|
| Component structure | ✓ | Server components; no `'use client'`; no data fetching in components |
| Accessibility | ✓ | Each new page has one `<main>` and one `<h1>`; errors in `role="alert"`, status in `role="status"` |
| Consequence & confirmation | ✓ | Archive and restore name the consequence before the button; fork does not confirm (DL-105) |
| Tokens / Tailwind | ✗ | Neither exists; none introduced |

## Phase-by-Phase Tasks

Numbering matches `tasks.md`.

### Phase 1 — The guard, written first (1.1–1.3)

| Task | File | Specific change | Notes |
|---|---|---|---|
| 1.1 | `tests/architecture/reachability.test.ts` | Extract every path the presentation layer can render; resolve each against the route tree with dynamic segments expanded | Read `app/**/page.tsx` for the route set; `rg`-style scan of `href=` in `app/` and `src/presentation/` for the offered set |
| 1.2 | same | No `<form>` with a string or template `action`; every exported `'use server'` function referenced by an `action={...}` | Two assertions, two messages — a failure must say which half |
| 1.3 | — | **Run against the unfixed tree; record verbatim** | Must name 5 links + 4 forms. This is the only moment it can be observed failing without reverting nine changes |

**Trap.** The route set must come from the filesystem, not from a hardcoded
list — a hardcoded list is the same mistake one level up.

### Phase 2 — Bind the forms (2.1–2.7)

Order matters: components first, then their callers, so each intermediate
commit typechecks.

| Task | Specific change |
|---|---|
| 2.1–2.3 | Add `action: (fd: FormData) => Promise<void>` as a required prop to the three components; remove `method`/string `action` |
| 2.4–2.6 | Pass `create`, `performRebind`, `rename`; 2.6 also has to *render* a form, which does not exist today |
| 2.7 | Write the apply action in `strategies/[id]/edit/page.tsx` and pass it |

**Watch:** 2.7 needs the approved-plan projection. `toApplyPlan` already exists
in the domain — use it; do not re-derive.

### Phase 3 — The five routes (3.1–3.5)

| Task | Notes |
|---|---|
| 3.1 agent edit | `UpdateAgentCommand` returns `updated`/`not-editable`/`rejected`/`invalid`. Render the last two as named field errors, not "something went wrong" |
| 3.2 agent reactivate | `SetLifecycleCommand` with `to: 'ACTIVE'`; its own consequence text |
| 3.3 strategy fork | `ForkStrategyCommand` takes the whole `Strategy`, not an id — load the listing first |
| 3.4 strategy archive | `DescribeArchiveStrategyQuery` then `SetStrategyActiveCommand(active: false)` |
| 3.5 strategy restore | `SetStrategyActiveCommand(active: true)`; `repair-required` is a state, not an error |

**All three strategy pages need the `Strategy` object**, so each loads
`listStrategies` and finds its own. That is the shape the use cases were built
for; do not add an id-based lookup to the port to avoid it.

### Phase 4 — Verification (4.1–4.6)

| Task | Proves |
|---|---|
| 4.1 | The guard passes on the fixed tree |
| 4.2 | Re-inject each of the three defect classes; three separate failures |
| 4.3 | Serve the build; no rendered link 404s |
| 4.4 | Submit all six write paths; reaching the not-connected refusal is success — it proves the request reached the use case |
| 4.5 | The ceiling stated in writing: no BattleGrid round trip proven, and why |
| 4.6 | All quality gates |

## Phase 1 Review Checklist (Planner)

- [x] Every ADDED/MODIFIED requirement has a coverage row
- [x] Every scenario names a verification
- [x] Inventory drafted before tasks
- [x] Layer boundaries stated, with "no use case is touched" as the falsifiable claim
- [x] Ordering hazards named (guard first; components before callers)
- [x] Rejected implementations recorded in `design.md` so they are not rediscovered
- [x] Out-of-scope copied from the proposal
- [x] The known gap in the guard's reach is stated up front (DL-106)

## Phase 2 Execution Checklist (Executor)

- [ ] 1.1–1.2 guard written
- [ ] 1.3 **guard observed failing, output recorded verbatim**
- [ ] 2.1–2.7 forms bound; each step typechecks
- [ ] 3.1–3.5 five routes
- [ ] 4.1 guard passes
- [ ] 4.2 three re-injections, three distinct failures
- [ ] 4.3 served probe, no 404s
- [ ] 4.4 six write paths reach their use case
- [ ] 4.5 ceiling recorded
- [ ] 4.6 typecheck, lint, test, build, test:db, openspec validate --all
- [ ] Review artifacts filled with `file:line` evidence
- [ ] Decision log has an EXECUTION entry per deviation
- [ ] Final line set to `EXECUTION READY FOR PRODUCTION GATE`

## Phase 3 Production Gate Checklist (Auditor)

- [ ] Spec parity: 3 requirements, every scenario located at `file:line`
- [ ] MODIFIED: new behaviour in effect **and** the old wording's insufficiency addressed
- [ ] Nothing from Out of Scope was built — particularly no trading-config field set
- [ ] No use case, port, or repository was modified
- [ ] `rg "\?\?"` over touched paths
- [ ] The guard derives its route set from the filesystem, not a literal list
- [ ] Task 1.3 and 4.2 evidence present — the guard seen failing, twice, for different reasons
- [ ] No new BattleGrid call site outside the composition root
- [ ] The new pages carry no colour, spacing, font, or token value
- [ ] All quality gates PASS

## Artifacts

| Path | Owner | Status |
|---|---|---|
| `proposal.md`, `specs/app-access/spec.md`, `design.md`, `tasks.md` | proposer | done |
| `plan/master-plan.md` | planner | this file |
| `plan/data-review.md`, `plan/architecture-review.md`, `plan/uiux-review.md` | planner → executor | scaffold |
| `plan/decision-log.md` | planner → executor → auditor | started |
| `plan/production-gate.md` | auditor | not yet |

EXECUTION READY FOR PRODUCTION GATE
