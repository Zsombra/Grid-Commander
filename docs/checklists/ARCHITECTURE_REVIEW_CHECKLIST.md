# Grid-Commander Architecture Review Checklist

**Version**: 1.0.0
**Last Updated**: 2026-07-27
**Based On**: Clean Architecture (lightly applied) + CQRS + constructor injection + a port for BattleGrid

---

## Purpose

Standardized review checklists for server-side components. Use them when:

- Creating use cases, repositories, or infrastructure adapters
- Reviewing pull requests that modify server components
- Auditing existing code for architectural compliance

These are **engineering standards** — how code must be built. The behavior
contract lives in `openspec/specs/` and is written by the archiver. Both are
binding and the auditor checks both.

---

## Table of Contents

1. [Layer Overview](#layer-overview)
2. [Use Case Review Checklist](#use-case-review-checklist)
3. [Repository Review Checklist](#repository-review-checklist)
4. [Infrastructure Adapter Review Checklist](#infrastructure-adapter-review-checklist)
5. [DI Wiring Review Checklist](#di-wiring-review-checklist)
6. [Project-Specific Policies](#project-specific-policies)
7. [Common Anti-Patterns](#common-anti-patterns)

---

## Layer Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│   Next.js route handlers, server actions, streaming responses   │
│   Location: app/  and  src/presentation/                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                           │
│   Use Cases (queries and commands, separated)                   │
│   Location: src/application/use-cases/                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DOMAIN LAYER                              │
│   Entities, value objects, domain services, ports               │
│   Location: src/domain/  and  src/ports/                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                         │
│   Drizzle repositories, BattleGrid MCP client, OAuth, AI, jobs  │
│   Location: src/infrastructure/                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Dependency Rule**: dependencies point inward only. Never import from an outer
layer.

**The rule that matters most here**: the domain must not import the MCP client.
BattleGrid is someone else's server with a tool list that changes under us; it
sits behind a port so the domain can be tested without an account and survives
the platform changing shape.

---

## Use Case Review Checklist

### File Naming & Location

| # | Check | Required |
|---|-------|----------|
| 1 | Located in `src/application/use-cases/` | ✅ |
| 2 | File name is `kebab-case.ts`, verb-first (`fork-strategy.ts`) | ✅ |
| 3 | Class name is `PascalCase`, verb-first, suffixed by direction (`ForkStrategyCommand`, `ListAgentsQuery`) | ✅ |

---

### SOLID Principles

#### S — Single Responsibility

| # | Check | Status |
|---|-------|--------|
| 1 | Use case has ONE clear purpose, stated in a TSDoc comment | ☐ |
| 2 | Does NOT mix query and command logic | ☐ |
| 3 | Delegates sub-operations to specialized use cases | ☐ |
| 4 | Does NOT implement persistence directly (uses repositories) | ☐ |

**Delegation Pattern**:
```typescript
// ✅ CORRECT — delegates the sub-operation
export class ForkStrategyCommand {
  constructor(
    private readonly battlegrid: BattleGridPort,
    private readonly audit: RecordAuditCommand,
  ) {}

  async execute(req: ForkStrategyRequest): Promise<ForkStrategyResponse> {
    const entry = await this.audit.begin(req.userId, 'fork_strategy', req);
    const forked = await this.battlegrid.forkStrategy(req.userId, req.strategyId, req.sourceRevision);
    await this.audit.complete(entry.id, 'succeeded');
    return { strategyId: forked.id, revision: forked.revision };
  }
}

// ❌ WRONG — writes the audit row itself, so the audit contract is duplicated
export class ForkStrategyCommand {
  async execute(req: ForkStrategyRequest) {
    await db.insert(auditEntries).values({ userId: req.userId, tool: 'fork_strategy' });
    return this.battlegrid.forkStrategy(req.userId, req.strategyId, req.sourceRevision);
  }
}
```

#### O — Open/Closed

| # | Check | Status |
|---|-------|--------|
| 1 | New behavior added via new use cases, not by branching inside existing ones | ☐ |
| 2 | Extensibility through injected strategies/ports | ☐ |
| 3 | The happy path stays readable when error handling is added | ☐ |

#### L — Liskov Substitution

| # | Check | Status |
|---|-------|--------|
| 1 | Implements its declared interface | ☐ |
| 2 | Return type matches the interface exactly | ☐ |
| 3 | Thrown error types are documented and consistent | ☐ |

#### I — Interface Segregation

| # | Check | Status |
|---|-------|--------|
| 1 | Depends only on the port methods it actually calls | ☐ |
| 2 | Request/Response DTOs carry no unused fields | ☐ |
| 3 | Does not depend on a fat `BattleGridPort` when a narrower port would do | ☐ |

#### D — Dependency Inversion

| # | Check | Status |
|---|-------|--------|
| 1 | Repository dependencies are domain interfaces, not Drizzle implementations | ☐ |
| 2 | BattleGrid access is through `BattleGridPort`, never the MCP client | ☐ |
| 3 | NO direct infrastructure imports (Drizzle, MCP SDK, Anthropic SDK, `next/*`) | ☐ |

**Allowed Dependencies**:
```typescript
// ✅ Domain interfaces and ports
import type { BattleGridPort } from '@/ports/battlegrid';
import type { AuditRepository } from '@/domain/audit/audit-repository';

// ✅ Domain types and errors
import { Strategy, StrategyRevision } from '@/domain/strategy/strategy';
import { RevisionConflictError } from '@/domain/errors';

// ❌ Infrastructure — NEVER in a use case
import { db } from '@/infrastructure/db/client';
import { Client } from '@modelcontextprotocol/sdk/client';
import { cookies } from 'next/headers';
```

---

### Clean Architecture Compliance

| # | Check | Status |
|---|-------|--------|
| 1 | Imports only from: domain, ports, other use cases, shared types | ☐ |
| 2 | Does NOT import from `src/infrastructure/` | ☐ |
| 3 | Does NOT import from `app/` or `src/presentation/` | ☐ |
| 4 | Uses domain enums/constants, not magic strings | ☐ |
| 5 | Business rules live in domain services, not in use case orchestration | ☐ |

---

### Logging Standards

| # | Check | Status |
|---|-------|--------|
| 1 | Uses the structured logger, never `console.log` | ☐ |
| 2 | Every log carries the use case name as context | ☐ |
| 3 | Error logs include a structured context object | ☐ |
| 4 | **No token, access token, refresh token, or authorization header is ever logged** | ☐ |

**Pattern**:
```typescript
// ✅ CORRECT
logger.info({ useCase: 'ApplyStrategyPlanCommand', userId, strategyId, revision },
  'applying compiled plan');
logger.error({ useCase: 'ApplyStrategyPlanCommand', userId, strategyId, err },
  'plan application refused');

// ❌ WRONG — unstructured, and leaks a credential
console.log('applying plan for', userId, 'token', connection.accessToken);
```

---

### Error Handling

| # | Check | Status |
|---|-------|--------|
| 1 | Errors caught at a granularity that lets the caller act | ☐ |
| 2 | Logged with context before rethrowing or returning | ☐ |
| 3 | Infrastructure errors converted to domain errors at the boundary | ☐ |
| 4 | Errors are NOT swallowed silently | ☐ |
| 5 | Cleanup wrapped so a non-fatal failure does not mask the original error | ☐ |

---

### Idempotency

| # | Check | Status |
|---|-------|--------|
| 1 | Checks for already-completed state before executing | ☐ |
| 2 | Returns success for an already-completed operation rather than repeating it | ☐ |
| 3 | Where BattleGrid accepts `idempotencyKey`, a stable key is supplied | ☐ |

**Pattern**:
```typescript
// ✅ CORRECT — a retry returns the original outcome instead of acting twice
async execute(req: CreateAgentRequest): Promise<CreateAgentResponse> {
  const existing = await this.audit.findByIdempotencyKey(req.userId, req.idempotencyKey);
  if (existing?.outcome === 'succeeded') {
    return existing.result as CreateAgentResponse;
  }
  return this.battlegrid.createAgent(req.userId, req.spec, req.idempotencyKey);
}
```

---

### Constructor / Initialization Pattern

| # | Check | Status |
|---|-------|--------|
| 1 | All dependencies injected via constructor injection | ☐ |
| 2 | Dependencies declared `private readonly` | ☐ |
| 3 | No I/O or business logic in the constructor | ☐ |

**Pattern**:
```typescript
export class CompileStrategyPlanCommand {
  constructor(
    private readonly battlegrid: BattleGridPort,
    private readonly plans: PlanRepository,
    private readonly logger: Logger,
  ) {}
}
```

---

### Request/Response DTOs

| # | Check | Status |
|---|-------|--------|
| 1 | Request type carries required fields only | ☐ |
| 2 | Response type carries every output field the caller needs | ☐ |
| 3 | No optional clutter on the request | ☐ |
| 4 | Failure is represented in the type, not signalled by a null | ☐ |

**Pattern**:
```typescript
export interface CompileStrategyPlanRequest {
  userId: string;
  strategyId: string;
  expectedRevision: number;
  sections: StrategySection[];
}

export interface CompileStrategyPlanResponse {
  planToken: string;
  expiresAt: string;
  diff: StrategyDiff;
  boundAgents: BoundAgentImpact[];
  viability: Viability;
}
```

---

## Repository Review Checklist

### File Naming & Location

| # | Check | Required |
|---|-------|----------|
| 1 | Interface in `src/domain/<aggregate>/` | ✅ |
| 2 | Implementation in `src/infrastructure/db/repositories/` | ✅ |
| 3 | Interface file: `<aggregate>-repository.ts`, exporting `AuditRepository` etc. | ✅ |
| 4 | Implementation file: `drizzle-<aggregate>-repository.ts`, exporting `DrizzleAuditRepository` | ✅ |

---

### CQRS Separation

| # | Check | Status |
|---|-------|--------|
| 1 | Readers (queries) and Writers (commands) are SEPARATE classes | ☐ |
| 2 | Reader methods: `find*`, `get*`, `list*`, `count*` | ☐ |
| 3 | Writer methods: `create*`, `update*`, `delete*` | ☐ |
| 4 | Writers return void or an identifier, not a domain aggregate | ☐ |
| 5 | Readers return domain objects or DTOs | ☐ |
| 6 | **Every writer path goes through scope classification and audit; no writer bypasses either** | ☐ |

**Naming Pattern**:
```typescript
// src/domain/audit/audit-repository.ts
export interface AuditReader {
  listForUser(userId: string, limit: number): Promise<AuditEntry[]>;
  findByIdempotencyKey(userId: string, key: string): Promise<AuditEntry | null>;
}

export interface AuditWriter {
  begin(entry: NewAuditEntry): Promise<string>;          // returns id only
  complete(id: string, outcome: AuditOutcome): Promise<void>;
}
```

---

### Mapper Pattern

| # | Check | Status |
|---|-------|--------|
| 1 | Row → domain mapping lives in a dedicated mapper | ☐ |
| 2 | No business calculation in the mapper | ☐ |
| 3 | **No fallback or default that masks missing data** | ☐ |
| 4 | Nullable columns map to nullable types, never silently defaulted | ☐ |

---

### Query Safety (Drizzle Specific)

| # | Check | Status |
|---|-------|--------|
| 1 | All queries use the Drizzle query builder | ☐ |
| 2 | Column references use schema objects, not string literals | ☐ |
| 3 | No raw SQL that bypasses compile-time validation | ☐ |
| 4 | No string interpolation in queries | ☐ |
| 5 | Every query touching user-owned rows filters by `userId` | ☐ |

**Allowed (type-safe)**:
```typescript
const rows = await db
  .select()
  .from(auditEntries)
  .where(and(eq(auditEntries.userId, userId), eq(auditEntries.outcome, 'failed')))
  .orderBy(desc(auditEntries.createdAt))
  .limit(limit);
```

**Prohibited (runtime-only validation, and an injection risk)**:
```typescript
const rows = await db.execute(
  sql.raw(`select * from audit_entries where user_id = '${userId}'`)
);
```

---

## Infrastructure Adapter Review Checklist

### File Naming & Location

| # | Check | Required |
|---|-------|----------|
| 1 | Located in `src/infrastructure/` | ✅ |
| 2 | Implements a port interface declared in `src/ports/` or `src/domain/` | ✅ |
| 3 | Named with its technology prefix (`Drizzle*`, `Mcp*`, `OAuth*`) | ✅ |

### Port Implementation

| # | Check | Status |
|---|-------|--------|
| 1 | Implements the domain port interface | ☐ |
| 2 | All interface methods implemented | ☐ |
| 3 | No public methods beyond the interface | ☐ |
| 4 | Infrastructure errors converted to domain errors before crossing the boundary | ☐ |
| 5 | A fake implementation of the same port exists for tests | ☐ |

---

## DI Wiring Review Checklist

### Composition Root

| # | Check | Status |
|---|-------|--------|
| 1 | All wiring happens in `src/composition-root.ts` | ☐ |
| 2 | Dependencies resolved in order, no circular references | ☐ |
| 3 | Optional dependencies handled explicitly, never with a silent null | ☐ |
| 4 | Nothing outside the composition root constructs an infrastructure adapter | ☐ |

**Pattern**:
```typescript
// src/composition-root.ts
export function buildContainer(env: Env) {
  const logger = createLogger(env.LOG_LEVEL);
  const auditRepo = new DrizzleAuditRepository(db);
  const battlegrid = new McpBattleGridAdapter(env, tokenStore, logger);

  return {
    forkStrategy: new ForkStrategyCommand(battlegrid, new RecordAuditCommand(auditRepo)),
    listAgents: new ListAgentsQuery(battlegrid),
  };
}
```

---

## Project-Specific Policies

These come from `openspec/config.yaml` and are binding. They exist because
BattleGrid is someone else's server holding other people's money-capable
credentials, and the ordinary Clean Architecture rules do not cover any of it.

### P1 — Scope Is Not A Safety Boundary

`mcp:read` is write-capable. Eleven of BattleGrid's 110 tools mutate on it
alone, six of them destructive.

| # | Check | Status |
|---|-------|--------|
| 1 | No code decides whether an operation is safe by looking at scope alone | ☐ |
| 2 | Destructiveness is read from the tool's own annotations | ☐ |
| 3 | User-facing copy never calls read scope "read-only" or "view-only" | ☐ |

```typescript
// ✅ CORRECT — classification decides, not scope
const tool = await this.capabilities.classify(toolName);
if (tool.destructive && !req.confirmed) throw new ConfirmationRequiredError(tool);

// ❌ WRONG — "we only asked for read scope, so this is safe"
if (connection.scopes.includes('mcp:read')) {
  return this.client.call(toolName, args);   // may rebind an agent
}
```

### P2 — Capabilities Are Discovered At Runtime

The tool list is not authoritative after a BattleGrid deployment. The server
says so itself.

| # | Check | Status |
|---|-------|--------|
| 1 | No hard-coded tool list anywhere outside tests and generated docs | ☐ |
| 2 | Capabilities discovered per session from the live connection | ☐ |
| 3 | **Unknown or unclassifiable tools are treated as destructive** — fail closed | ☐ |
| 4 | Discovery failure degrades to confirmed-read-only, and says so | ☐ |

```typescript
// ✅ CORRECT — absence of knowledge is not permission
classify(name: string): ToolClass {
  const known = this.discovered.get(name);
  if (!known) return { mutating: true, destructive: true, reason: 'unknown' };
  return known;
}

// ❌ WRONG — a stale list silently grants a write
const READ_ONLY = ['get_account_state', 'list_strategies', /* ... */];
if (READ_ONLY.includes(name)) return this.client.call(name, args);
```

### P3 — Every Write Is Audited, Recorded Before The Attempt

| # | Check | Status |
|---|-------|--------|
| 1 | The audit row is written BEFORE the call is attempted | ☐ |
| 2 | The row is updated with the outcome | ☐ |
| 3 | An interrupted operation reads as attempted, outcome unknown — never absent | ☐ |
| 4 | No mutating path can reach BattleGrid without producing an audit row | ☐ |

### P4 — Optimistic Concurrency Is Surfaced, Never Retried

| # | Check | Status |
|---|-------|--------|
| 1 | Every mutation carries `expectedRevision` from a fresh read | ☐ |
| 2 | A revision conflict is reported to the user | ☐ |
| 3 | **No automatic retry against the newer revision** | ☐ |

A blind retry applies an intent formed against a state that no longer exists.
That is how someone's agent gets rebound to a strategy they never saw.

### P5 — Compile Is Free Of Effect; Apply Is Not

| # | Check | Status |
|---|-------|--------|
| 1 | Compile paths perform no writes | ☐ |
| 2 | Apply resubmits the compiled plan byte-identically | ☐ |
| 3 | No dense scorecard, diff, or viability is rebuilt client-side | ☐ |
| 4 | Plan token expiry is handled as a normal path, not an error | ☐ |

### P6 — One Way In

| # | Check | Status |
|---|-------|--------|
| 1 | Every BattleGrid call goes through `BattleGridPort` | ☐ |
| 2 | The MCP client is constructed only in the composition root | ☐ |
| 3 | No feature reaches the MCP SDK directly | ☐ |

If one feature bypasses the port, every guarantee above becomes advisory.

---

## Common Anti-Patterns

### ❌ Infrastructure Leak

```typescript
// WRONG — Drizzle in a use case
import { db } from '@/infrastructure/db/client';

export class ListAuditQuery {
  async execute(userId: string) {
    return db.select().from(auditEntries).where(eq(auditEntries.userId, userId));
  }
}
```

**Fix**: depend on `AuditReader` and inject the Drizzle implementation.

---

### ❌ Console Logging

```typescript
// WRONG
console.log('connected user', userId, connection.accessToken);
```

**Fix**: structured logger, and never the token.

---

### ❌ String Literals For Enums

```typescript
// WRONG
if (agent.status === 'ACTIVE') { /* ... */ }
```

**Fix**: `if (agent.status === AgentStatus.Active)`.

---

### ❌ Missing Idempotency Check

```typescript
// WRONG — a retried request creates a second agent
async execute(req: CreateAgentRequest) {
  return this.battlegrid.createAgent(req.userId, req.spec);
}
```

**Fix**: check the idempotency key first, and pass one to BattleGrid.

---

### ❌ Swallowed Errors

```typescript
// WRONG
try {
  await this.battlegrid.applyStrategyPlan(userId, plan, token);
} catch {
  // plan probably expired
}
```

**Fix**: log with context, convert to a domain error, and let the caller decide.

---

### ❌ Unsafe Queries

```typescript
// WRONG — interpolation, and no user scoping
await db.execute(sql.raw(`select * from agents where id = '${agentId}'`));
```

**Fix**: Drizzle query builder, filtered by `userId`.

---

### ❌ Trusting Scope

```typescript
// WRONG — the single most expensive mistake available in this codebase
if (!connection.scopes.includes('mcp:wager')) {
  return this.client.call(toolName, args);  // "can't spend money, so it's fine"
}
```

**Fix**: classify the tool. `mcp:read` can rebind an agent's entire configuration.

---

## Review Summary Template

```markdown
## Component Review: [ComponentName]

**File**: [path]
**Layer**: [Presentation/Application/Domain/Infrastructure]
**Reviewer**: [name]
**Date**: [date]

### Checklist Results

| Category | Pass | Fail | N/A |
|----------|------|------|-----|
| SOLID Principles | X/Y | X/Y | - |
| Clean Architecture | X/Y | X/Y | - |
| Logging Standards | X/Y | X/Y | - |
| Error Handling | X/Y | X/Y | - |
| Idempotency | X/Y | X/Y | - |
| Query Safety | X/Y | X/Y | - |
| Project-Specific Policies (P1–P6) | X/6 | X/6 | - |

### Issues Found

1. [Issue description + file:line]

### Verdict

- [ ] Approved
- [ ] Approved with minor changes
- [ ] Changes requested
```

---

## Quick Reference Card

| Pattern | Rule |
|---------|------|
| **Dependencies** | Domain interfaces and ports only; never import infrastructure in a use case |
| **BattleGrid** | Always through `BattleGridPort`; the MCP client exists only at the composition root |
| **Scope** | Never a safety signal. Classify the tool. |
| **Unknown tools** | Fail closed — mutating and destructive until proven otherwise |
| **Audit** | Written before the attempt, updated with the outcome |
| **Concurrency** | `expectedRevision` always; surface conflicts, never retry |
| **Logging** | Structured, contextual, and never a token |
| **Queries** | Drizzle builder only, always scoped by `userId` |
| **Quality Gate** | The `quality_gates` list in `openspec/config.yaml` passes — `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, the drizzle schema check, `npm run test:db` |

---

**Document Maintainer**: Grid-Commander maintainers
**Review Cycle**: Quarterly, or whenever the BattleGrid surface changes shape
