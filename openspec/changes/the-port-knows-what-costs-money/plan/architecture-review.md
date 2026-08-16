# Architecture Review: The Port Knows What Costs Money

**Status**: PENDING EXECUTION EVIDENCE

Checklist: `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md`. Fill each row with
`file:line` evidence, not a claim. A row whose evidence is "done" is not filled.

## Scope summary

The port gains the fact that an operation commits funds, supplied by the adapter
from `money-tools.ts` and consumed by `classify.ts` through the already-declared
`declaredScope` field. Both port gates then key to it.

## Checklist matrix

| # | Rule | Evidence (`file:line`) | ☐ |
|---|---|---|:--:|
| 1 | Domain imports no infrastructure — `classify.ts` names no tool | | ☐ |
| 2 | Tool names appear only in `src/infrastructure/battlegrid/` (A10 half 2) | | ☐ |
| 3 | No `WAGER_TOOLS` name anywhere in `src/`/`app/` (A10 half 1) | | ☐ |
| 4 | A10's guard imports the same list the runtime uses — not a second copy | | ☐ |
| 5 | Scope is not promoted to a safety signal; the gate keys to consequence (C1) | | ☐ |
| 6 | `UNKNOWN_TOOL` unchanged and still fails closed (C2) | | ☐ |
| 7 | Audit still written before the attempt (C5) | | ☐ |
| 8 | No file under `src/application/use-cases/` modified — no second opinion | | ☐ |
| 9 | `inferScope` no longer describes a mechanism with no producer | | ☐ |
| 10 | Composition root untouched; no new wiring of the MCP client (C3) | | ☐ |

## Anti-patterns specifically watched here

| Anti-pattern | Why it is a risk on this change | Evidence | ☐ |
|---|---|---|:--:|
| A second source of truth | A test list and a runtime list that can disagree — the exact defect being fixed | | ☐ |
| A guard with an exception | Adding a bypass for a tool rather than classifying it | | ☐ |
| A comment describing a mechanism | `classify.ts:61` did this for four months | | ☐ |
| A test asserting a fabricated input | `answer-authority.test.ts:171-176` passes while the defect is live | | ☐ |

## Deviations from the plan

*(none yet)*
