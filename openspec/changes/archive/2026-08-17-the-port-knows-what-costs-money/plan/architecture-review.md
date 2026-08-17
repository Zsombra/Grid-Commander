# Architecture Review: The Port Knows What Costs Money

**Status**: EXECUTION EVIDENCE FILLED

Checklist: `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md`. Fill each row with
`file:line` evidence, not a claim. A row whose evidence is "done" is not filled.

## Scope summary

The port gains the fact that an operation commits funds, supplied by the adapter
from `money-tools.ts` and consumed by `classify.ts` through the already-declared
`declaredScope` field. Both port gates then key to it.

## Checklist matrix

| # | Rule | Evidence (`file:line`) | ☐ |
|---|---|---|:--:|
| 1 | Domain imports no infrastructure — `classify.ts` names no tool | `classify.ts` — grep for any tool name returns 0; `grep -rn "from '.*infrastructure" src/domain/` returns 0 | ☑ |
| 2 | Tool names appear only in `src/infrastructure/battlegrid/` (A10 half 2) | `money-tools.ts`, `agent-adapter.ts` — the only two files under `src/`/`app/` naming a money tool | ☑ |
| 3 | No `WAGER_TOOLS` name anywhere in `src/`/`app/` (A10 half 1) | grep for the 5 forbidden names across `src/` and `app/` returns 0 files | ☑ |
| 4 | A10's guard imports the same list the runtime uses — not a second copy | `tests/agent/wager.test.ts:7-8` imports `FORBIDDEN_MONEY_TOOL_NAMES` and `REACHABLE_MONEY_TOOLS` — no second copy (DE-1) | ☑ |
| 5 | Scope is not promoted to a safety signal; the gate keys to consequence (C1) | `classify.ts:55` `commitsFunds = tool.declaredScope === 'mcp:wager'`; `call-path.ts:71` gates on `cls.destructive`, not on scope | ☑ |
| 6 | `UNKNOWN_TOOL` unchanged and still fails closed (C2) | `classify.ts:33` missing tool, `:39` missing `readOnlyHint`; `call-path.ts:60` comment retains fail-closed intent | ☑ |
| 7 | Audit still written before the attempt (C5) | `call-path.ts:45-46` — throws **before** any row is written when a guard refuses; `:65` refuses authority before the attempt | ☑ |
| 8 | No file under `src/application/use-cases/` modified — no second opinion | `git diff --name-only main...HEAD -- src/application/` returns empty | ☑ |
| 9 | `inferScope` no longer describes a mechanism with no producer | **deleted outright** — grep for `inferScope` in `classify.ts` returns 0 (PD-3 permitted removal or rewrite) | ☑ |
| 10 | Composition root untouched; no new wiring of the MCP client (C3) | `git diff --name-only main...HEAD` matches no composition/container/wiring file | ☑ |

## Anti-patterns specifically watched here

| Anti-pattern | Why it is a risk on this change | Evidence | ☐ |
|---|---|---|:--:|
| A second source of truth | A test list and a runtime list that can disagree — the exact defect being fixed | Avoided: one home per set, imported not copied — `wager.test.ts:7-8` (DE-1) | ☑ |
| A guard with an exception | Adding a bypass for a tool rather than classifying it | None added. DE-3 de-named a doc comment rather than weakening A10 | ☑ |
| A comment describing a mechanism | `classify.ts:61` did this for four months | `inferScope` and its claim both removed; `mcp-adapter.ts:392-397` now *is* the producer | ☑ |
| A test asserting a fabricated input | `answer-authority.test.ts:171-176` passes while the defect is live | `answer-authority.test.ts` now drives `buildClassificationMap` (task 5.1); DE-4 scopes the guard | ☑ |

## Deviations from the plan

*(none yet)*
