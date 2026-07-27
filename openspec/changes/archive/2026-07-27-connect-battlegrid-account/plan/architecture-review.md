# Architecture Review: connect-battlegrid-account

**Checklist**: `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md` v1.0.0
**Status**: EVIDENCE RECORDED

---

## Scope

First application code in the repository. Establishes the layer boundaries, the
BattleGrid port, capability classification, and the audit layer that every later
feature depends on.

## Applicable Rules

| Rule | Applies to | Evidence |
|---|---|---|
| Layer dependency rule (inward only) | all of `src/` | `tests/architecture/boundaries.test.ts` — domain imports asserted empty |
| SOLID — SRP on use cases | `src/application/use-cases/*` | one class per operation; `connect.commands.ts` |
| SOLID — DIP, no infrastructure imports in use cases | `src/application/**` | eslint rule + `boundaries.test.ts` |
| CQRS separation (readers/writers) | repositories, use case naming | `AuditReader`/`AuditWriter`, `ConnectionReader`/`ConnectionWriter`; writers return ids |
| Constructor injection, `private readonly` | all use cases and adapters | every use case and adapter |
| Structured logging, never a token | logger config + adapter | `boundaries.test.ts` — no console call anywhere in src/ |
| Error handling — no swallowed errors | adapter, use cases | `toDomainError` converts; discovery failure is the one deliberate catch, documented |
| Idempotency | `record-audit`, connection creation | `idempotencyKey` threaded to audit; `findByIdempotencyKey` tested |
| Drizzle query safety, `userId`-scoped | `src/infrastructure/db/repositories/*` | schema indexes on `userId`; repositories take it first |
| Composition root is the only constructor of adapters | `src/composition-root.ts` | `src/config.ts` + adapter deps injected |
| **P1** Scope is not a safety boundary | `mcp-adapter.ts` | `call-path.test.ts` — classification runs before the scope check; mutation removing the scope check fails 3 tests |
| **P2** Runtime discovery; unknown fails closed | `classify.ts`, `capability-cache.ts` | `classify.test.ts`, `discovery.test.ts`; mutation classifying unknown as safe fails 2 tests |
| **P3** Audit written before the attempt | `record-audit.command.ts` | `audit.test.ts::interrupted_reads_as_attempted`; mutation skipping begin() fails 2 tests |
| **P4** Conflicts surfaced, never retried | `errors.ts`, `mcp-adapter.ts` | `conflict.test.ts` — plus a structural assertion that no retry loop exists in src/ |
| **P5** Compile free of effect | N/A — strategy authoring is a later change | N/A |
| **P6** One way in | lint rule + boundary test | eslint `no-restricted-imports` + `boundaries.test.ts`; the MCP SDK is not even a dependency |

## Findings

**F-1 — the MCP SDK was removed as a dependency.** The adapter speaks the
documented Streamable HTTP surface with `fetch` directly: the calls are few and
keeping the transport visible at the one boundary that matters is worth more
than the abstraction. An unused dependency is supply-chain surface for nothing.
The lint rule and boundary test remain, so reintroducing it outside
`src/infrastructure/battlegrid/` still fails.

**F-2 — one deliberate catch-and-continue.** `CapabilityCache.load` swallows a
discovery failure rather than rethrowing, because R5's third scenario requires
the product to keep working read-only. It is the only such catch, and it
degrades to refusing every mutation.

**F-3 — `scopesFor` is currently narrow.** The adapter returns `['mcp:read']`
rather than reading the grant's recorded scopes. This is correct today (the
registration cannot obtain more) but is a stub the next change must replace with
a read from the connection record. Filed rather than hidden.

## Verdict

Compliant. All applicable rules have evidence; P5 is genuinely N/A for this
change. One stub (F-3) is recorded for the next change rather than left silent.
