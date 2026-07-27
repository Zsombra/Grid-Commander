# Grid-Commander Data Pipeline Review Checklist

**Version**: 1.0.0
**Last Updated**: 2026-07-27
**Based On**: Clean Architecture + Source-of-Truth Data Integrity
**Companion To**: `ARCHITECTURE_REVIEW_CHECKLIST.md`

---

## Purpose

Enforces end-to-end data pipeline integrity. Every field displayed to a user
must originate from a source of truth and flow through each layer without being
fabricated, recalculated, or patched in on the way.

**Use this checklist when:**

- Adding a field to any DTO
- Displaying new data in a client component
- Reviewing a PR that adds a derived value
- Auditing a screen for pipeline violations

---

## Grid-Commander has two sources of truth, and only one of them is ours

This is the adaptation that matters most here, and it is not in the generic
template.

| Data | Source of truth | Our database holds |
|---|---|---|
| Agents, strategies, revisions, journals, signal logs | **BattleGrid** | at most a cached snapshot |
| Connections, granted scopes, tokens | **Our database** | the record itself |
| Audit entries | **Our database** | the record itself |
| Compiled plans awaiting review | **Our database** (transient, token-bound) | the record itself |

So the ordinary rule — *"if the client displays it, the database stores it"* —
is **wrong for most of this product**. The correct rule is below.

### Problem Classes

| # | Defect | Symptom |
|---|--------|---------|
| 1 | **Stale snapshot shown as live** | A user acts on an agent configuration that changed at BattleGrid minutes ago |
| 2 | **Client-side re-computation** | The same value derived differently in the UI and on the server |
| 3 | **Scorecard rebuilt locally** | A dense strategy scorecard computed client-side instead of taken from the compile result |
| 4 | **Silent defaults** | `?? 0` or `?? 'unknown'` masking a field BattleGrid did not return |
| 5 | **Conflicting definitions** | Two code paths computing "is this agent healthy" differently |
| 6 | **Contract expansion without consumers** | BattleGrid adds an enum value; the UI renders a blank |

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 0: BATTLEGRID (Remote Source of Truth)                   │
│  Agents, strategies, revisions, journals — someone else's server│
│  Rule: authoritative for everything it owns. We never invent    │
│        or recompute what it returns.                            │
└────────────────────────────────────┬────────────────────────────┘
                                     │
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: POSTGRESQL (Local Source of Truth)                    │
│  Connections, scopes, audit entries, compiled plans             │
│  Location: drizzle/migrations/                                  │
│  Rule: authoritative for what this product itself knows         │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: SCHEMA DEFINITIONS                                    │
│  Drizzle table definitions                                      │
│  Location: src/infrastructure/db/schema/                        │
│  Rule: 1:1 mirror of columns. No invented fields.               │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: QUERIES                                               │
│  Drizzle query builders                                         │
│  Location: src/infrastructure/db/repositories/                  │
│  Rule: filter, join, aggregate. No business logic.              │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: MAPPERS (both directions)                             │
│  DB row → domain object; BattleGrid payload → domain object     │
│  Location: src/infrastructure/db/mappers/, src/infrastructure/  │
│            battlegrid/mappers/                                  │
│  Rule: shape only. No calculation. No defaults that mask gaps.  │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: USE CASE (Application)                                │
│  Orchestration + DTO construction                               │
│  Location: src/application/use-cases/                           │
│  Rule: the ONLY layer allowed to compute a derived value.       │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 6: SERVER ACTIONS / ROUTE HANDLERS                       │
│  Next.js App Router                                             │
│  Location: app/                                                 │
│  Rule: pass-through and auth only. No field additions.          │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 7: CLIENT STATE                                          │
│  Zustand stores, fetch wrappers                                 │
│  Location: src/presentation/stores/                             │
│  Rule: hold and cache ONLY. No calculation, no defaults.        │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 8: CLIENT COMPONENT                                      │
│  React components, shadcn/ui                                    │
│  Location: src/presentation/components/, app/**/page.tsx        │
│  Rule: DISPLAY ONLY. Read DTO fields. Format for display.       │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 9: FEATURE PIPELINE COMPLETENESS                         │
│  Verification gate — not a code layer                           │
│  Rule: every server capability has a reachable client trigger.  │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Source-of-Truth Principle (Iron Rule)

> **Every value displayed to a user MUST trace back to one of:**
> 1. **A BattleGrid response** — returned by a tool call, unmodified
> 2. **A database column** — stored by this product
> 3. **A server-side computation** — derived in the Use Case layer from (1) or
>    (2), and returned as a first-class DTO field
>
> **NEVER:**
> - Computed on the client from other DTO fields
> - Rebuilt locally when BattleGrid already returned it
> - Added as an optional field "just for display"
> - Defaulted, approximated, or hardcoded anywhere on the way

### The Grid-Commander corollary

> **A cached BattleGrid value MUST be displayed as what it is: a snapshot, with
> its age.** Presenting a cached agent configuration as current invites a user
> to act on a state that no longer exists — and `expectedRevision` will then
> reject the write, or worse, the user will confirm a destructive action against
> the wrong picture.

---

## Layer-by-Layer Checklist

### Layer 0: BattleGrid

| # | Check | Status |
|---|-------|--------|
| 1 | Values BattleGrid returns are passed through unmodified | ☐ |
| 2 | Nothing BattleGrid computes is recomputed locally | ☐ |
| 3 | A missing field is surfaced as missing, never defaulted | ☐ |
| 4 | Unknown enum values render as themselves, not as blank or a guess | ☐ |
| 5 | Every displayed snapshot carries the time it was fetched | ☐ |

**The specific trap:**
```typescript
// ❌ WRONG — the server already computed this and refuses to accept a rebuild
const scorecard = computeDenseScorecard(plan.sections);

// ✅ CORRECT — take what compile returned
const { approvedPlan } = await compileStrategyPlan(req);
const scorecard = approvedPlan.scorecard;
```

### Layer 1: Database

| # | Check | Status |
|---|-------|--------|
| 1 | New data has a migration | ☐ |
| 2 | Column types match application types | ☐ |
| 3 | NOT NULL unless genuinely optional | ☐ |
| 4 | No computed columns duplicating application logic | ☐ |
| 5 | Every user-owned table has a `userId` column and an index on it | ☐ |

### Layer 2: Schema Definitions

| # | Check | Status |
|---|-------|--------|
| 1 | Drizzle table definition mirrors the columns exactly | ☐ |
| 2 | No invented fields absent from the database | ☐ |
| 3 | Types match between database and application | ☐ |

### Layer 3: Queries

| # | Check | Status |
|---|-------|--------|
| 1 | Selects every column downstream layers need | ☐ |
| 2 | JOINs explicit — LEFT for optional, INNER for required | ☐ |
| 3 | No business calculation in SQL | ☐ |
| 4 | Filtered by `userId` wherever rows are user-owned | ☐ |

**Allowed in queries:**
```typescript
// ✅ Filtering, ordering, database-level aggregation
const [{ count }] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(auditEntries)
  .where(and(eq(auditEntries.userId, userId), eq(auditEntries.outcome, 'failed')));
```

**Prohibited in queries:**
```typescript
// ❌ Business calculation pushed into SQL
.select({ healthScore: sql`(wins * 2 - losses) / nullif(total, 0)` })
```

### Layer 4: Mappers

| # | Check | Status |
|---|-------|--------|
| 1 | Shape conversion only — no calculation | ☐ |
| 2 | **No fallback that masks missing data** | ☐ |
| 3 | Nullable sources map to nullable types | ☐ |
| 4 | An unexpected payload shape fails loudly rather than mapping to a partial object | ☐ |

**Allowed:**
```typescript
// ✅ Renaming, parsing, type narrowing
export function toAuditEntry(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    tool: row.tool,
    outcome: row.outcome,                    // 'attempted' stays 'attempted'
    completedAt: row.completedAt,            // null stays null
  };
}
```

**Prohibited:**
```typescript
// ❌ A default that erases the difference between "failed" and "we don't know"
outcome: row.outcome ?? 'succeeded',
completedAt: row.completedAt ?? new Date(),
```

### Layer 5: Use Case — the only layer that computes

| # | Check | Status |
|---|-------|--------|
| 1 | Derived values computed here and returned as first-class DTO fields | ☐ |
| 2 | Each derived value has exactly one definition in the codebase | ☐ |
| 3 | Nothing BattleGrid already returned is recomputed | ☐ |
| 4 | Snapshot age computed here, not in the component | ☐ |

**Correct:**
```typescript
// ✅ The use case derives it, names it, and ships it
return {
  agents,
  snapshotTakenAt,
  snapshotAgeSeconds: Math.floor((now - snapshotTakenAt.getTime()) / 1000),
  isStale: now - snapshotTakenAt.getTime() > STALE_AFTER_MS,
};
```

**Wrong:**
```typescript
// ❌ Ships the raw timestamp and lets each component decide what "stale" means
return { agents, snapshotTakenAt };
```

### Layer 6: Server Actions / Route Handlers

| # | Check | Status |
|---|-------|--------|
| 1 | Pass-through only — no field added, no value changed | ☐ |
| 2 | Authentication and authorization happen here | ☐ |
| 3 | No business logic | ☐ |
| 4 | Errors mapped to a response shape the client can act on | ☐ |

### Layer 7: Client State

| # | Check | Status |
|---|-------|--------|
| 1 | Stores hold server data; they do not derive from it | ☐ |
| 2 | No `??` defaults applied to server fields | ☐ |
| 3 | No aggregation across items in a selector | ☐ |
| 4 | Cached data is invalidated after a successful mutation | ☐ |

**Prohibited in a store or selector:**
```typescript
// ❌ Deriving in the client — the server owns this definition
const healthyCount = useAgentStore(s => s.agents.filter(a => a.winRate > 50).length);

// ❌ Papering over an absent field
const balance = useStore(s => s.account?.balance ?? 0);   // 0 and "unknown" differ
```

### Layer 8: Client Components

| # | Check | Status |
|---|-------|--------|
| 1 | Reads DTO fields and formats them for display | ☐ |
| 2 | No arithmetic on DTO fields | ☐ |
| 3 | No aggregation, no re-derivation | ☐ |
| 4 | Missing values render as "unknown", not as zero or blank | ☐ |
| 5 | A stale snapshot is visibly labelled as stale | ☐ |

**Allowed in a component:**
```tsx
// ✅ Formatting a value the server computed
<span>{formatUsd(account.balanceUsd)}</span>
<Badge variant={data.isStale ? 'warning' : 'default'}>
  {data.isStale ? `Snapshot ${formatAge(data.snapshotAgeSeconds)} old` : 'Live'}
</Badge>

// ✅ Conditional rendering on a server-provided flag
{plan.viability === 'VIABLE' ? <ApplyButton /> : <ViabilityWarning reasons={plan.reasons} />}
```

**Prohibited in a component:**
```tsx
// ❌ Arithmetic
<span>{(agent.wins / agent.total * 100).toFixed(1)}%</span>

// ❌ Re-deriving a decision the server already made
{Date.now() - new Date(data.snapshotTakenAt).getTime() > 60000 && <StaleWarning />}
```

### Layer 9: Feature Pipeline Completeness

| # | Check | Status |
|---|-------|--------|
| 1 | Every use case is reachable from a client trigger | ☐ |
| 2 | Every DTO field is either displayed or deliberately unused with a comment | ☐ |
| 3 | Every failure path in the spec has a rendered state | ☐ |
| 4 | Loading, empty, and error states exist for every data-backed view | ☐ |

---

## Common Anti-Patterns

### ❌ Stale Snapshot Shown As Live

```tsx
// WRONG — the user acts on a picture that may be minutes old
const { agents } = await getCachedAgents(userId);
return <AgentRoster agents={agents} />;
```

**Fix**: carry `snapshotTakenAt` through to the DTO, compute staleness in the
use case, and render the age. A user about to rebind an agent deserves to know
the configuration they are looking at is not current.

---

### ❌ Rebuilding What The Server Computed

```typescript
// WRONG — apply_strategy_plan rejects anything it did not itself derive
const payload = { ...approvedPlan, diff: computeDiff(before, after) };
```

**Fix**: resubmit `approvedPlan` byte-identically. Sending back a locally
rebuilt `diff` is an unknown-key error at best and a rejected plan at worst.

---

### ❌ Silent Default

```typescript
// WRONG — "no wager scope" and "scope unknown" become the same thing
const canWager = connection.scopes?.includes('mcp:wager') ?? false;
```

**Fix**: model the unknown case explicitly. An absent scope list means discovery
failed, and that is not the same as a user having declined.

---

### ❌ Two Definitions Of The Same Concept

```typescript
// WRONG — the roster and the detail page disagree about what "healthy" means
// roster.tsx:   agent.winRate > 50
// detail.tsx:   agent.winRate > 50 && agent.openPositions === 0
```

**Fix**: one definition, computed in the use case, shipped as `agent.isHealthy`.

---

## Review Summary Template

```markdown
## Pipeline Review: [FeatureName]

**Fields added**: [list]
**Layers touched**: [list]

| Layer | Pass | Fail | N/A |
|-------|------|------|-----|
| 0. BattleGrid | X/5 | X/5 | - |
| 1. Database | X/5 | X/5 | - |
| 2. Schema | X/3 | X/3 | - |
| 3. Queries | X/4 | X/4 | - |
| 4. Mappers | X/4 | X/4 | - |
| 5. Use Case | X/4 | X/4 | - |
| 6. Server Actions | X/4 | X/4 | - |
| 7. Client State | X/4 | X/4 | - |
| 8. Components | X/5 | X/5 | - |
| 9. Completeness | X/4 | X/4 | - |

### Iron Rule Violations

1. [Field + layer + file:line]

### Verdict

- [ ] Approved
- [ ] Changes requested
```

---

## Quick Reference Card

| Question | Answer |
|---|---|
| Who owns agent and strategy data? | **BattleGrid.** We cache it; we never author it locally. |
| Who owns audit and connections? | **Us.** Postgres is authoritative. |
| Where may a derived value be computed? | The **use case layer**, and nowhere else. |
| May the client compute anything? | Formatting only. No arithmetic, no aggregation. |
| What about a value BattleGrid returned? | Pass it through. Never rebuild it. |
| What if a field is missing? | Surface it as missing. Never default it. |
| What if the data is cached? | Show its age, and say when it is stale. |

---

**Document Maintainer**: Grid-Commander maintainers
**Review Cycle**: Quarterly, or whenever a new BattleGrid field reaches the UI
