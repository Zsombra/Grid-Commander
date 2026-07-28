# Architecture Review — close-the-reachability-gap

- Checklist source: `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md`
- Status: `EXECUTION EVIDENCE COMPLETE`

## Scope Summary

Presentation and one new structural test. The architectural claim to preserve is
P6 — one way in. Five new pages each reach BattleGrid, and each must do it the
existing way.

## Component Checklist Matrix

| Component | File | Status |
|---|---|---|
| Reachability guard | `tests/architecture/reachability.test.ts` | PASS |
| Three bound components | `agent-form.tsx`, `rebind-confirm.tsx`, `plan-review.tsx` | PASS |
| Four bound pages | `agents/new`, `agents/[id]`, `agents/[id]/rebind`, `strategies/[id]/edit` | PASS |
| Five new pages | agent edit/reactivate, strategy fork/archive/restore | PASS |

## Project-Specific Policies

| Policy | Applies | Status | Evidence |
|---|:--:|---|---|
| P1 Scope is not a safety boundary | ✗ | N/A | |
| P2 Capabilities discovered at runtime | ✓ | PASS | No new hardcoded BattleGrid vocabulary in the new pages |
| P3 Every write is audited | ✓ | PASS | Four write paths reach the audit for the first time |
| P4 Concurrency surfaced, never retried | ✓ | PASS | Edit and lifecycle carry `expectedRevision` |
| P5 Compile free of effect; apply is not | ✓ | PASS | The apply action must not compile |
| P6 One way in | ✓ | PASS | Structural tests green; no new adapter import |

## Anti-Patterns Checked

| Anti-pattern | Found | Evidence |
|---|:--:|---|
| Infrastructure leak into presentation | PASS | |
| Console logging | PASS | |
| Swallowed errors | PASS | A refused result must render, not throw away |
| Dual path / fallback branch | PASS | |
| Stale / unreferenced code | PASS | Three previously-dead actions become referenced |

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
### 1. a link to a route that does not exist
 × renders no link to a route the application does not serve
+   "/agents/x/telemetry  (rendered by src/presentation/components/agent-actions.tsx)"
      Tests  1 failed | 3 passed (4)

### 2. a form with a string action
 × binds every form to a function rather than a URL
+   "agent-form.tsx: submits to a URL — <form method=\"post\" action=\"/agents/new\">"
      Tests  1 failed | 3 passed (4)

### 3. an unreferenced 'use server' export
 × leaves no server action that nothing submits to
+   "app/(app)/agents/[id]/reactivate/page.tsx: reactivate"
      Tests  1 failed | 3 passed (4)

### restored
      Tests  4 passed (4)
```

Three defect classes, three distinct assertions, three distinct messages. Each
names the file and what is wrong with it rather than reporting that something
failed.

## Diff Boundary (DL-107)

The change may touch only `app/`, `src/presentation/`, `tests/`, and
`openspec/`. Any file outside those means the premise was wrong.

```
app/(app)/agents/[id]/edit/page.tsx
app/(app)/agents/[id]/page.tsx
app/(app)/agents/[id]/reactivate/page.tsx
app/(app)/agents/[id]/rebind/page.tsx
app/(app)/agents/new/page.tsx
app/(app)/strategies/[id]/archive/page.tsx
app/(app)/strategies/[id]/edit/page.tsx
app/(app)/strategies/[id]/fork/page.tsx
app/(app)/strategies/[id]/restore/page.tsx
src/presentation/components/agent-edit.tsx
src/presentation/components/agent-form.tsx
src/presentation/components/plan-review.tsx
src/presentation/components/rebind-confirm.tsx
src/presentation/form.ts
tests/architecture/reachability.test.ts
openspec/**
```

`app/`, `src/presentation/`, `tests/`, `openspec/` — nothing else. DL-107 holds:
no use case, port, repository or domain file was modified, so the change's
premise (the behaviour exists; only the connection was missing) is confirmed
rather than assumed.

**The boundary was tested during execution, twice.** Three routes initially
imported domain predicates (`isEditable`, `isReactivatable`) and one imported a
domain type; `tests/architecture/boundaries.test.ts` failed on all four. The
correct response was to move the domain-dependent code into
`src/presentation/`, where `agent-actions.tsx` already does exactly that — not
to relax the rule. The plan-parsing moved to `form.ts` for the same reason, and
belongs there anyway: it is the same job as every other reader in that file.

## Quality Gates

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS — 0 problems |
| Unit tests | `npm test` | PASS — 38 files, 394 tests |
| Build | `npm run build` | PASS — 19 routes |
| Database tests | `npm run test:db` | PASS — 51 tests |
| Spec layer | `openspec.py validate --all` | PASS — 0 errors |

## Findings

**F-A — the route-boundary rule fired twice on new code and was obeyed both
times.** Three pages imported domain predicates; one imported a domain type.
Fixed by moving the code to `src/presentation/components/agent-edit.tsx` and
`src/presentation/form.ts` rather than by relaxing the rule. This is the first
time in this project a pre-existing guard has caught real drift in new code
cleanly, and it is worth saying because every other guard story here has been
about one that did not.

**F-B — the guard's own first version missed two of five.** Recorded in full
above. Written after the fix it would have passed at 3-of-5.

**F-C — no new BattleGrid call site.** Every new page reaches the composed `app`
through `acting()`; `rg` finds no adapter import outside
`src/infrastructure/battlegrid/`.

**F-D — the known blind spot stands (DL-106).** The guard checks that a form is
bound, not that every control inside it reaches the payload.
`agent-form.tsx`'s position-management select still collects a value that
`tradingConfig: null` discards. Filed as
`a-preset-does-not-constrain-its-config`; deliberately not fixed here.

## Verdict

`EXECUTION EVIDENCE COMPLETE`
