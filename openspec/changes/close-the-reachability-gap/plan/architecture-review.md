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
 × renders no link to a route the application does not serve
+   "/agents/x/edit           (rendered by src/presentation/components/agent-actions.tsx)"
+   "/agents/x/reactivate     (rendered by src/presentation/components/agent-actions.tsx)"
+   "/strategies/x/fork       (rendered by src/presentation/components/strategy-list.tsx)"
+   "/strategies/x/archive    (rendered by src/presentation/components/strategy-list.tsx)"
+   "/strategies/x/restore    (rendered by src/presentation/components/strategy-list.tsx)"

 × binds every form to a function rather than a URL
+   "agent-form.tsx:    submits to a URL — <form method=\"post\" action=\"/agents/new\">"
+   "plan-review.tsx:   has no action    — <form method=\"post\">"
+   "rebind-confirm.tsx: submits to a URL — <form method=\"post\" action={`/agents/${rebind.agentId}/rebind`}>"

 × leaves no server action that nothing submits to
+   "app/(app)/agents/[id]/page.tsx: rename"
+   "app/(app)/agents/[id]/rebind/page.tsx: performRebind"
+   "app/(app)/agents/new/page.tsx: create"

 Tests  3 failed | 1 passed (4)
```

All nine defects named, across three distinct assertions. `rename` appears only
as an orphaned action because it has no form at all; apply appears only as an
unbound form because it has no action at all. The two halves catch different
ends of the same break, which is why both are needed.

**The guard's own first version missed two of the five.** It matched `href=` as
a JSX attribute and not `href:` as an object property, so the two links
`agent-actions.tsx` builds into an array were invisible to it. That is precisely
the failure this file exists to prevent, occurring inside the file itself — and
it was caught only because the defects were still present to compare the count
against. Had the guard been written after the fix, it would have passed at three
of five and nobody would have known.

It also flagged two `method="get"` forms in `assistant/page.tsx` and
`strategies/[id]/edit/page.tsx`. Those are correct as they stand: a GET form
navigates, reaching no operation by design. The rule now skips them.

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
