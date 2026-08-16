# Data Pipeline Review: The Approval Can Be Answered

**Status: EXECUTION EVIDENCE RECORDED**

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
| 1 | Every queue field traces to one of the three permitted sources | Every field on the card comes from `EntryDecision` as mapped from the payload; `msRemaining` is the one derivation and it is server-side and first-class | ☑ |
| 2 | Nothing computed on the client from other DTO fields | Components format; they do not derive. `Remaining` renders `msRemaining` and is forbidden from touching `expiresAt` | ☑ |
| 3 | Nothing rebuilt locally that BattleGrid already returned | The proportion, the levels, the conviction and the reasoning are rendered as sent | ☑ |
| 4 | No field defaulted, approximated, or hardcoded on the way | A missing level renders *not set*, never 0; a missing expiry renders *No expiry was sent*, never zero-time. `optionalNumber` in the action returns null rather than 0 for an empty field | ☑ |
| 5 | Absent is never mapped to false or zero | As above, and the confirmation token is `string | null` rather than defaulted to `''` — `concurrency.test.ts` enforces this shape (DL-15) | ☑ |
| 6 | Time remaining is derived server-side and returned as a DTO field, not computed in the component | `remainingMs` in `read-pending-decisions.query.ts`, returned as `msRemaining`; the rendering test asserts the raw `expiresAt` stamp does not reach the page | ☑ |

### PE-2 — the confirmation cannot name a currency amount

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | **No currency amount is produced anywhere for a pending decision** | `approval-queue.test.ts` scans all five files on this path for `toLocaleString(`, `Intl.NumberFormat`, `style: 'currency'`, a `$`-figure, and `headroomUsd`/`capitalAtRiskUsd`/`effectiveNotionalUsd`/`marginedUsd`. `approvals.test.ts` asserts no currency figure in the rendered output | ☑ |
| 2 | Size is rendered as the proportion the platform sent | *Would stake 10% of the agent's available funds (SMALL)* on both surfaces, from `positionSizePct` unmodified | ☑ |
| 3 | `headroom × pct × leverage` is **not** computed for display — the formula is known and reconstructs observed fills exactly, which is precisely why using it would be our arithmetic presented as the platform's fact, on a confirmation, about money | Not computed anywhere. The scan above covers the three fields it would need, and none is read by any query, component or page in this change — which is also why #299 remains a separate piece of work | ☑ |

## Snapshot Discipline

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | The queue is read fresh, not served from cache | Both pages are dynamic server components; no cache directive, no memoisation. `npm run build` lists all three routes as `ƒ` (server-rendered on demand) | ☑ |
| 2 | The pre-write re-read is a genuine second read, not a memoised first | The describe reads on page open; `AnswerDecisionCommand` issues its **own** `readEntryDecisions` on submit. Separate requests, separate objects — the comparison is meaningless otherwise | ☑ |
| 3 | A stale decision is refused rather than rendered as current | Liveness is filtered in the query, checked again in the describe, and checked a third time in the command against the pre-write re-read | ☑ |

## Observed-Not-Declared

The declaration was wrong twice on this surface. Both must stay fixed.

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Liveness matched on `status === "PENDING"`; **`AWAITING_APPROVAL` appears nowhere in the code** — the declared string does not exist in any live payload | `ANSWERABLE_STATUS = 'PENDING'`; `grep AWAITING_APPROVAL src/ app/` returns nothing | ☑ |
| 2 | No enrichment envelope is expected from `list_pending_approvals` — both tools return byte-identical rows (DL-5) | The queue reads `readEntryDecisions` only; `list_pending_approvals` is not reached by any path in this change (DL-5) | ☑ |
| 3 | `closedAt` is mapped — it did not exist on the port type before this change and liveness depends on it | Added as a required field in Phase A (DL-8) and load-bearing in `isAnswerable`; a test covers the `EXECUTED` / `closedAt: null` case that a `closedAt`-only check would have mis-read as answerable | ☑ |
| 4 | `executedAt` is **never** rendered as "when the trade opened" — it is set at creation on decisions that never executed | `executedAt` is not rendered on any surface in this change — the queue card and the decision page show entry/stop/target/conviction, the proportion and the reasoning, and nothing else. The field's trap is recorded on the decision manifest so a later design does not reintroduce it. | ☑ |
| 5 | The cancel response is treated as two keys (`decisionId`, `cancelled`); the outcome comes from a re-read, not from the response | The port returns `void` and the adapter discards the response. `answer-authority.test.ts` asserts the port returns undefined and that the command's result carries only `kind`, `verb`, `decisionId` — so no surface can render an outcome from the ack | ☑ |

## Iron Rule Violations

1. _[field + layer + file:line]_

## Verdict

- [ ] Approved
- [ ] Changes requested
