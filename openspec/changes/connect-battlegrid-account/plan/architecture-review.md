# Architecture Review: connect-battlegrid-account

**Checklist**: `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md` v1.0.0
**Status**: PENDING EXECUTION EVIDENCE

---

## Scope

First application code in the repository. Establishes the layer boundaries, the
BattleGrid port, capability classification, and the audit layer that every later
feature depends on.

## Applicable Rules

| Rule | Applies to | Evidence |
|---|---|---|
| Layer dependency rule (inward only) | all of `src/` | _pending_ |
| SOLID — SRP on use cases | `src/application/use-cases/*` | _pending_ |
| SOLID — DIP, no infrastructure imports in use cases | `src/application/**` | _pending_ |
| CQRS separation (readers/writers) | repositories, use case naming | _pending_ |
| Constructor injection, `private readonly` | all use cases and adapters | _pending_ |
| Structured logging, never a token | logger config + adapter | _pending_ |
| Error handling — no swallowed errors | adapter, use cases | _pending_ |
| Idempotency | `record-audit`, connection creation | _pending_ |
| Drizzle query safety, `userId`-scoped | `src/infrastructure/db/repositories/*` | _pending_ |
| Composition root is the only constructor of adapters | `src/composition-root.ts` | _pending_ |
| **P1** Scope is not a safety boundary | `mcp-adapter.ts` | _pending_ |
| **P2** Runtime discovery; unknown fails closed | `classify.ts`, `capability-cache.ts` | _pending_ |
| **P3** Audit written before the attempt | `record-audit.command.ts` | _pending_ |
| **P4** Conflicts surfaced, never retried | `errors.ts`, `mcp-adapter.ts` | _pending_ |
| **P5** Compile free of effect | N/A — strategy authoring is a later change | N/A |
| **P6** One way in | lint rule + boundary test | _pending_ |

## Findings

_To be filled by the executor._

## Verdict

_Pending._
