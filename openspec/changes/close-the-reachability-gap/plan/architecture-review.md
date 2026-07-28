# Architecture Review — close-the-reachability-gap

- Checklist source: `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md`
- Status: `PENDING EXECUTION EVIDENCE`

## Scope Summary

Presentation and one new structural test. The architectural claim to preserve is
P6 — one way in. Five new pages each reach BattleGrid, and each must do it the
existing way.

## Component Checklist Matrix

| Component | File | Status |
|---|---|---|
| Reachability guard | `tests/architecture/reachability.test.ts` | PENDING |
| Three bound components | `agent-form.tsx`, `rebind-confirm.tsx`, `plan-review.tsx` | PENDING |
| Four bound pages | `agents/new`, `agents/[id]`, `agents/[id]/rebind`, `strategies/[id]/edit` | PENDING |
| Five new pages | agent edit/reactivate, strategy fork/archive/restore | PENDING |

## Project-Specific Policies

| Policy | Applies | Status | Evidence |
|---|:--:|---|---|
| P1 Scope is not a safety boundary | ✗ | N/A | |
| P2 Capabilities discovered at runtime | ✓ | PENDING | No new hardcoded BattleGrid vocabulary in the new pages |
| P3 Every write is audited | ✓ | PENDING | Four write paths reach the audit for the first time |
| P4 Concurrency surfaced, never retried | ✓ | PENDING | Edit and lifecycle carry `expectedRevision` |
| P5 Compile free of effect; apply is not | ✓ | PENDING | The apply action must not compile |
| P6 One way in | ✓ | PENDING | Structural tests green; no new adapter import |

## Anti-Patterns Checked

| Anti-pattern | Found | Evidence |
|---|:--:|---|
| Infrastructure leak into presentation | PENDING | |
| Console logging | PENDING | |
| Swallowed errors | PENDING | A refused result must render, not throw away |
| Dual path / fallback branch | PENDING | |
| Stale / unreferenced code | PENDING | Three previously-dead actions become referenced |

## Guard Evidence (DL-101)

### Task 1.3 — the guard against the unfixed tree

```
[ expected: 5 unresolved links + 4 unbound forms, named ]
PENDING
```

### Task 4.2 — three re-injections after the fix

```
[ a link to a route that does not exist  — expected FAIL ]
PENDING
[ a form with a string action            — expected FAIL ]
PENDING
[ an unreferenced 'use server' export    — expected FAIL ]
PENDING
```

## Diff Boundary (DL-107)

The change may touch only `app/`, `src/presentation/`, `tests/`, and
`openspec/`. Any file outside those means the premise was wrong.

```
[ git diff --name-only <base>..HEAD ]
PENDING
```

## Quality Gates

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | PENDING |
| Lint | `npm run lint` | PENDING |
| Unit tests | `npm test` | PENDING |
| Build | `npm run build` | PENDING |
| Database tests | `npm run test:db` | PENDING |
| Spec layer | `openspec.py validate --all` | PENDING |

## Findings

_To be filled by the executor with `path:line` evidence._

## Verdict

`PENDING EXECUTION EVIDENCE`
