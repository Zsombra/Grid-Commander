# Data Pipeline Review: The Approval Can Be Answered

**Status: PENDING EXECUTION EVIDENCE**

Slug: `the-approval-can-be-answered` · Checklist:
`docs/checklists/DATA_PIPELINE_REVIEW_CHECKLIST.md` · Base ref: `origin/main`

## Scope Summary

One read path (the queue of decisions awaiting an answer) and two write paths.
Every field on the queue row originates in a BattleGrid response that has been
**observed**, not declared — the payload is recorded verbatim in
`openspec/backlog/approvals-have-no-write-side.md`.

## Contract Map

| Field shown | Source | Traced to |
|---|---|---|
| coin, direction, decision | BattleGrid response | |
| conviction / convictionPercent | BattleGrid response | |
| entryPrice, stopLoss, takeProfit | BattleGrid response | |
| positionSizePct, positionSizePreset | BattleGrid response | |
| reasoning, signalChecklist | BattleGrid response, unparaphrased | |
| time remaining | Server-side derivation from `expiresAt`, returned as a DTO field | |
| liveness (`status`, `closedAt`) | BattleGrid response | |
| **position size in currency** | **MUST NOT EXIST — PE-2** | |

## The Iron Rule

> Every value displayed MUST trace to a BattleGrid response, a database column,
> or a server-side derivation returned as a first-class DTO field.

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Every queue field traces to one of the three permitted sources | | ☐ |
| 2 | Nothing computed on the client from other DTO fields | | ☐ |
| 3 | Nothing rebuilt locally that BattleGrid already returned | | ☐ |
| 4 | No field defaulted, approximated, or hardcoded on the way | | ☐ |
| 5 | Absent is never mapped to false or zero | | ☐ |
| 6 | Time remaining is derived server-side and returned as a DTO field, not computed in the component | | ☐ |

### PE-2 — the confirmation cannot name a currency amount

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | **No currency amount is produced anywhere for a pending decision** | | ☐ |
| 2 | Size is rendered as the proportion the platform sent | | ☐ |
| 3 | `headroom × pct × leverage` is **not** computed for display — the formula is known and reconstructs observed fills exactly, which is precisely why using it would be our arithmetic presented as the platform's fact, on a confirmation, about money | | ☐ |

## Snapshot Discipline

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | The queue is read fresh, not served from cache | | ☐ |
| 2 | The pre-write re-read is a genuine second read, not a memoised first | | ☐ |
| 3 | A stale decision is refused rather than rendered as current | | ☐ |

## Observed-Not-Declared

The declaration was wrong twice on this surface. Both must stay fixed.

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Liveness matched on `status === "PENDING"`; **`AWAITING_APPROVAL` appears nowhere in the code** — the declared string does not exist in any live payload | | ☐ |
| 2 | No enrichment envelope is expected from `list_pending_approvals` — both tools return byte-identical rows (DL-5) | | ☐ |
| 3 | `closedAt` is mapped — it did not exist on the port type before this change and liveness depends on it | | ☐ |
| 4 | `executedAt` is **never** rendered as "when the trade opened" — it is set at creation on decisions that never executed | | ☐ |
| 5 | The cancel response is treated as two keys (`decisionId`, `cancelled`); the outcome comes from a re-read, not from the response | | ☐ |

## Iron Rule Violations

1. _[field + layer + file:line]_

## Verdict

- [ ] Approved
- [ ] Changes requested
