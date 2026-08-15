# Architecture Review: The Approval Can Be Answered

**Status: PENDING EXECUTION EVIDENCE**

Slug: `the-approval-can-be-answered` · Checklist:
`docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md` · Base ref: `origin/main`

The executor fills the Evidence column with `file:line` or a command's output.
An unfilled row is an unmet row — do not mark a box on intent.

## Scope Summary

Two BattleGrid writes (`cancel_entry_decision`, `accept_entry_decision`), the
first `mcp:wager` operations this product performs. One new query, one new
command, one new domain module, one new confirmation-target case, one port
method, one new surface. `EntryDecision`, the confirmation mechanism and the
audit repository are **extended, not replaced** (DL-4).

## Layer Compliance

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Domain does not import the MCP client | | ☐ |
| 2 | Dependencies point inward only | | ☐ |
| 3 | Tool names appear only in the infrastructure adapter | | ☐ |
| 4 | New domain module is pure — no I/O, testable without an account | | ☐ |

## Project-Specific Policies

### P1 — Scope Is Not A Safety Boundary

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Nothing decides safety from scope alone | | ☐ |
| 2 | Destructiveness read from the tool's annotation (`cancel` is `destructiveHint: true`) | | ☐ |
| 3 | No copy calls read scope "read-only" or "view-only" — **including the new step-up surface** | | ☐ |

### P2 — Capabilities Are Discovered At Runtime

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | No hard-coded tool list | | ☐ |
| 2 | Both tools resolved from the live connection | | ☐ |
| 3 | Unknown tool treated as destructive — fail closed | | ☐ |
| 4 | Discovery failure degrades to confirmed-read-only and says so | | ☐ |

### P3 — Every Write Is Audited, Recorded Before The Attempt

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Audit row written **before** the call | | ☐ |
| 2 | Row updated with the outcome | | ☐ |
| 3 | Interrupted answer reads as attempted, outcome unknown — never absent | | ☐ |
| 4 | No mutating path reaches BattleGrid without a row | | ☐ |
| 5 | **A binding refusal is audited too** — a refusal is a thing that happened | | ☐ |

### P4 — Optimistic Concurrency — **EXCEPTED, SEE PE-1 / DL-2**

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | ~~Every mutation carries `expectedRevision`~~ **EXCEPTED** — the platform publishes no revision on a decision. Auditor must confirm the limitation is real | | ☐ |
| 1a | Substitute in force: all five of `entryPrice`, `stopLoss`, `takeProfit`, `status === "PENDING"`, `closedAt === null` verified on one re-read immediately before the write | | ☐ |
| 2 | A refused binding is reported to the user, naming what moved | | ☐ |
| 3 | **No automatic retry** — NOT excepted, holds absolutely | | ☐ |

### P6 — One Way In

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Every call goes through the port | | ☐ |
| 2 | MCP client constructed only in the composition root | | ☐ |
| 3 | No feature reaches the MCP SDK directly | | ☐ |

## Confirmation Binding (DL-1, DL-3)

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | `confirmationTarget.decisionAnswer` is the **only** construction site | | ☐ |
| 2 | Guard test extended so an inline target fails the build | | ☐ |
| 3 | **Accept and cancel produce different targets** — asserted by test, not inspection | | ☐ |
| 4 | The command cannot be called without the bound values (compiler-enforced, per the `agentEdit` precedent) | | ☐ |
| 5 | Binding verified against a re-read, never against the rendered copy | | ☐ |

## Use Case Compliance

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Query and command separated (CQRS section) | | ☐ |
| 2 | One responsibility each | | ☐ |
| 3 | Refusals are typed results, not thrown-and-swallowed | | ☐ |
| 4 | No console logging | | ☐ |
| 5 | No string literals where an enum exists | | ☐ |

## Quality Gate

| Command | Result | Status |
|---|---|---|
| `npm run typecheck` | | ☐ |
| `npm run lint` | | ☐ |
| `npm test` | | ☐ |
| `npm run build` | | ☐ |
| `npm run db:generate && git diff --quiet drizzle/` | | ☐ |
| `npm run test:db` (needs `DATABASE_URL`; CI provides postgres) | | ☐ |

## Violations Found

1. _[file:line — description]_

## Verdict

- [ ] Approved
- [ ] Changes requested
