# Production Gate: assistant-readonly

**Track**: full · **Evidence window**: `6e59337..HEAD`

## Handoff Integrity

| Check | Result | Evidence |
|---|---|---|
| Master plan handoff marker | VALID | `EXECUTION READY FOR PRODUCTION GATE` |
| Execution checklist | VALID | 15/15 |
| Review artifacts with path-level evidence | VALID | three files, `EVIDENCE RECORDED` |
| Decision log, both phases | VALID | AL-1…AL-4 (planning), AL-5…AL-8 (execution) |
| Inventory matches the diff | VALID | no drift |

## Spec Parity

6 ADDED (`assistant`), **16 scenarios**.

| Req | Delivered at | Verdict |
|---|---|---|
| S1 The Assistant Can Only Read | `toolset.ts`, `ask-assistant.command.ts` | DELIVERED — 4/4 |
| S2 An Answer Names What It Was Built From | `answer.ts`, `assistant-answer.tsx` | DELIVERED — 3/3 |
| S3 The Assistant Answers About This User's Account | `ask-assistant.command.ts`, `answer.ts` | DELIVERED — 2/2 |
| S4 Not Knowing Is An Answer | `answer.ts` | DELIVERED — 2/2 |
| S5 Asking Requires An Account That Can Act | `ask-assistant.command.ts` | DELIVERED — 2/2 |
| S6 What The Assistant Did Is Visible | audit `actor`, `audit-list.tsx` | DELIVERED — 2/2 |

**6/6 delivered, 0 scenarios uncovered.**

**Regression**: all 34 requirements across the four prior capabilities still hold.
The `actor` change touched the audit path used by every one of them; making the
field **required** meant nine call sites failed to compile rather than silently
recording `undefined` — the type checker performed the search.

**Scope adherence**: no write-capable assistant, no wager tool, no general
BattleGrid Q&A, no model chosen. The proposal's Out of Scope holds.

## Violation Tracker

### PG-401 · MAJOR · SPEC_PARITY · A swallowed revocation produced a grounded answer

| Field | Value |
|---|---|
| **Requirement** | S5 — Asking Requires An Account That Can Act, scenario *Access is lost mid-answer* |
| **Evidence** | `ask-assistant.command.ts` (pre-fix: `ConnectionRevokedError` re-thrown from `callTool` and caught only by the outer `try`) |
| **Impact** | The re-throw only reaches the use case if the assistant lets it propagate. **A model harness that catches its own tool errors and carries on is entirely ordinary** — and in that case the answer completed, grounded, about an account the product had just lost access to, with the revocation recorded as nothing worse than a failed read. The requirement says the answer is abandoned; it was not. |
| **Required fix** | Record the revocation and check it after the port returns, rather than relying on a throw the callee may absorb. |
| **Status** | **FIXED** |
| **Owner** | executor |
| **Verification** | `ask-assistant.command.ts` tracks `revoked` and returns `refused`; `tests/assistant/ask.test.ts::abandons the answer even when the assistant swallows the error`. Removing the check fails it. |

**How it was found, because the method is the point.** Mutation testing removed
the re-throw and **nothing failed** — which reads as "redundant defensive code",
exactly what the gate exists to strip. Following it instead of trusting it
produced a test that **failed against the unmutated code**. The guard was not
redundant; it simply was not what carried the requirement.

Second time in this project that a surviving mutation was a missing test rather
than dead code. Both times, deleting the "redundant" guard would have been the
confident, wrong move.

### PG-402 · MINOR · HANDOFF · No model is configured

| Field | Value |
|---|---|
| **Evidence** | `src/infrastructure/assistant/not-configured.ts` is the wired implementation |
| **Impact** | The assistant surface exists, is reachable, and truthfully says no model is configured — then points at the pages holding the same information. Every requirement is delivered and tested against the port; none depends on a model. |
| **Status** | WONTFIX — deferred · **Owner**: backlog `wire-an-assistant-model` |
| **Verification** | A-D makes the model a deployment decision. A half-built adapter to a model nobody chose would claim more than it earned. |

### PG-403 · MINOR · UI · No conversation history

| Field | Value |
|---|---|
| **Evidence** | The port accepts `history`; the route sends none |
| **Impact** | Each question is independent. Multi-turn is a state problem this change does not need to solve to deliver its requirements. |
| **Status** | WONTFIX — deferred · **Owner**: backlog `assistant-conversation-history` |

## Mandatory Recheck Evidence

| Check | Result |
|---|---|
| `validate assistant-readonly --strict` / `--all` | PASS |
| `npm run typecheck` / `lint` | PASS |
| `npm test` | PASS — 25 files, 390 tests |
| harness regression | PASS — 124 |
| conflict markers / debt markers / console | PASS — none |
| fallback masking on touched paths | PASS — two hits, both an empty conversation and an empty input; neither an identifier |
| identifier guard over the enlarged `src/` | PASS — the rule added last change still holds |
| no mutating tool reaches the assistant | PASS — `toolset.test.ts::has no overlap with the mutating half` |
| the toolset has one source | PASS |
| the port carries no adapter, token or fetch | PASS — asserted by name |
| every audit row says who caused it | PASS — six layers |
| no wager tool reachable | PASS |

## Gate Decision

One MAJOR fixed; two MINOR deferred with owners.

```
Open violations: 0
```

## **DECISION: PASS** — 2026-07-28

Handoff: **archiver**. This completes the MVP's four planned changes plus the two
the gates found along the way.
