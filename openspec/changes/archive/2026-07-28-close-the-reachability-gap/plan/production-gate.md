# Production Gate — close-the-reachability-gap

**Audited**: 2026-07-28
**Track**: full
**Evidence window**: `7f1cb28..ed17330` (post-plan through execution evidence)
**Decision**: **PASS**

Audited after the change had already merged to `main` via PR #3. That is
normal for a historical range and does not weaken the gate — the evidence
window is resolved and every check ran against the real code.

## Handoff integrity — VALID

| Check | Result |
|---|---|
| Master plan ends `EXECUTION READY FOR PRODUCTION GATE` | yes |
| Execution checklist complete | 24/24 |
| `data-review.md`, `architecture-review.md`, `uiux-review.md` present | yes |
| Decision log has planner + executor entries | yes, 9 decisions |
| File inventory matches `git diff --name-status <window>` | yes, 20 files, no drift |

## Spec parity — 3/3 requirements delivered, 0 scenarios uncovered

| Requirement | Op | Delivered | Evidence |
|---|---|---|---|
| Every Affordance The Interface Offers Resolves | ADDED | yes | `tests/architecture/reachability.test.ts:102`; five previously-404 routes now present under `app/(app)/` |
| Every Form The Interface Renders Can Be Submitted | ADDED | yes | `tests/architecture/reachability.test.ts:127,150`; `action` prop required in `agent-form.tsx:28`, `rebind-confirm.tsx:20`, `agent-edit.tsx:18` |
| Every Capability Is Reachable | MODIFIED | yes | `tests/architecture/reachability.test.ts:112`; new behavior in effect and the old route-table-derived check replaced, not left beside it |

**The guard was demonstrated failing, not merely observed passing.** Three
defects injected during the audit, each caught and each naming the offending
file:

| Injected | Result |
|---|---|
| link to `/agents/[id]/clone`, which no route serves | caught — `"/agents/x/clone (rendered by src/presentation/components/agent-actions.tsx)"` |
| `<form method="post" action="/api/rebind">` in `rebind-confirm.tsx` | caught — binds-every-form assertion failed |
| exported `'use server'` function nothing submits to | caught — `"app/(app)/strategies/[id]/edit/page.tsx: orphanedAction"` |

Working tree restored clean after each injection.

This matters more here than usual: the change exists *because* three previous
checks passed while measuring reachability from the route table rather than
from the interface. A replacement guard taken on trust would have repeated the
failure it was written to end.

**Regression against existing specs**: `openspec/specs/app-access/spec.md`
requirements not modified by this change still hold — verified by serving the
built application and requesting every capability route (see Quality Gates).

**Unspecified behavior**: none. Every file in the window traces to a
requirement or is a test of one.

**Task honesty**: 24/24 checked, each with locatable code. No checkbox theatre.

## Scope — clean

The proposal declares four exclusions: the agent edit form's full field set,
the strategy section editor, strategy browsing for rebind, and styling. The
diff touches none of them. `agent-edit.tsx` covers only agent-owned fields the
domain already validates; `strategies/[id]/edit/page.tsx` still composes a
tagline.

Styling arrived later under DT-0001/DT-0002 as separate work, not as creep in
this window.

## Checklist parity

| Checklist | Result |
|---|---|
| Architecture — dependency direction, no runtime dual-paths | PASS; `no-restricted-imports` boundary rules enforced in `eslint.config.mjs` and lint is green |
| Data pipeline — no hidden client recomputation | PASS; these are server components with no client boundary, which is itself a recorded decision |
| UI — `uiux-review.md` present | PASS; findings reflected in code |

## Technical debt — zero found

| Scan | Result |
|---|---|
| `TODO\|FIXME\|HACK\|XXX\|deprecated\|legacy\|obsolete` in touched runtime paths | none |
| Conflict markers, repo-wide | none |
| Stale exports without call sites | none — the guard's third assertion enforces exactly this for server actions |
| Fallback masking a required contract | none; the `action` prop is required rather than defaulted, which is the point of DL "Forms take their action as a prop" |

## Quality gates — 6 PASS, 0 FAIL

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS — 394 tests |
| `npm run build` | PASS — 16 routes |
| schema matches migrations (`db:generate` + `git status drizzle/`) | PASS — no drift |
| `npm run test:db` against PostgreSQL 16 | PASS — 51 tests |

Additionally, and for the first time on this project: the built application was
**served** against real PostgreSQL with migrations applied, and every capability
route requested. All 16 return 200.

That check found a P1 that predates this change and is not caused by it —
`.env.example` was missing `SESSION_SECRET`, so a setup following the example
returned 500 on every route but `/connect`. Filed and fixed as
`env-example-missing-session-secret`; recorded as a second instance on
`serving-is-not-gated`. It does not block this gate, because the requirement
under audit is that the routes resolve and they do.

## Violations

**None open.** No CRITICAL, no MAJOR, no MINOR against this change.

Two observations that are **not** violations of this change and are already
tracked, recorded here so the gate is not silently passing them:

| Observation | Where it lives |
|---|---|
| `openspec/config.yaml` still carries placeholder `quality_gates` (`[e.g. npm run type-check]`), so the gate commands had to be read from the checklist instead | pre-existing; filed below |
| `ARCHITECTURE_REVIEW_CHECKLIST.md` names `pnpm lint` / `pnpm typecheck` while the project uses npm | `checklist-says-pnpm` (P3), already open |

Filed during this audit: `config-quality-gates-are-placeholders`.

## Gate decision

**PASS** — 2026-07-28.

Zero open violations. Spec parity complete with every requirement delivered and
its guard demonstrated failing. All six quality gates green, plus a served-build
check no previous audit on this project had run.

Next: **archiver** (`/archive`). Until that runs, `openspec/specs/app-access/`
does not yet contain the requirements this change delivered, and the next audit
measures against a stale contract.
