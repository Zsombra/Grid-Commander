# Data Pipeline Review: assistant-readonly

Against `docs/specs/DATA_PIPELINE_REVIEW_CHECKLIST.md`.

## Scope

One schema change: an `actor` column on `audit_entries`. No new tables.

## Checklist Matrix

| Rule | Where | Evidence |
|---|---|---|
| Iron Rule — one source of truth | `ask-assistant.command.ts` | Every fact in an answer comes from a live read; nothing is cached or reconstructed |
| No client-side recomputation | `assistant-answer.tsx` | Renders the answer and its citation; computes nothing |
| The citation is observed, not claimed | `ask-assistant.command.ts` | Built from the calls this use case saw, not from what the port reported — a port under-reporting its reads would otherwise write its own citation |
| Missing data is a state | `answer.ts` | `grounded` / `general` / `refused`, and `incomplete` within `grounded` |
| No silent defaults | `answer.ts` | A failed read is *named*; the answer is not quietly narrowed |
| A new column does not erase history | `schema/index.ts` | `actor` defaults to `'user'`, which is what a pre-existing row was |
| An unrecognised value reads conservatively | `drizzle-audit-repository.ts:79` | Anything other than `'assistant'` reads as `'user'` — the reading that claims less about the product's own behaviour |

## Contract Map

| Fact | Source | Domain | Presentation |
|---|---|---|---|
| What may be read | live `tools/list` → `classifyTool` | `ReadOnlyToolset` | not shown |
| What was read | this use case's observations | `Consultation[]` | the citation list |
| Whether it is complete | derived from consultations | `incomplete[]` | an alert, not an omission |
| Who caused a call | the use case | `AuditActor` | "you" / "the assistant, answering you" |

## Findings

**F-1 — the answer text is the only value in this product that is not derived.**
Everything else returns what BattleGrid said or refuses. Its containment is
structural: the text is opaque to the domain, and every *claim* the surface makes
about the text — grounded or general, complete or not, what was read — is
computed here rather than taken from the model.

**F-2 — the actor default is `'user'` and that is a factual claim, not a
convenience.** A row written before the column existed was caused by a user,
because the assistant did not exist. The default states that rather than guessing.

## Status

EVIDENCE RECORDED
