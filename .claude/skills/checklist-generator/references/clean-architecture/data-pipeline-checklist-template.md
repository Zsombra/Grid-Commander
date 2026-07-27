# {PROJECT_NAME} Data Pipeline Review Checklist

**Version**: 1.0.0
**Last Updated**: {DATE}
**Based On**: Clean Architecture + Source-of-Truth Data Integrity
**Companion To**: `ARCHITECTURE_REVIEW_CHECKLIST.md`

---

## Purpose

This document enforces **end-to-end data pipeline integrity** across the stack. Every field displayed on the client MUST originate from the database and flow through each layer without being fabricated, calculated, or patched in at intermediate layers.

**Use this checklist when:**

- Adding a new field to any DTO
- Displaying new data in a client component
- Reviewing PRs that add derived values (calculations, aggregations)
- Auditing existing components for pipeline violations

**Core Rule: If the client displays it, the database stores it or the server computes it from stored data. Never the client.**

### Problem Classes

| # | Defect | Symptom |
|---|--------|---------|
| 1 | **Client-side re-computation** | Same value derived differently in UI vs server, producing drift |
| 2 | **Conflicting definitions** | Multiple code paths define the same concept with different logic |
| 3 | **Inconsistent nullability / hardcoded defaults** | Fallbacks mask missing data; nullable fields bypass fail-fast gates |
| 4 | **Input validation duplication** | Route validates+transforms, but use case re-validates with different logic |
| 5 | **Shared type contract expansion without consumer update** | New enum/field added to shared types but consumers not updated |

---

## Pipeline Overview

<!-- INSTRUCTION: Adapt layers to user's actual stack. Skip layers that don't apply. -->

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: DATABASE (Source of Truth)                            │
│  {DATABASE} tables, migrations                                  │
│  Location: {MIGRATION_PATH}                                     │
│  Rule: All persistent data originates here                      │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: SCHEMA DEFINITIONS                                    │
│  {ORM} table/model definitions                                  │
│  Location: {SCHEMA_PATH}                                        │
│  Rule: 1:1 mirror of database columns, no invented fields       │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: QUERIES                                               │
│  {ORM} query objects                                            │
│  Location: {QUERY_PATH}                                         │
│  Rule: JOINs and aggregations allowed, no business logic        │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: REPOSITORY + MAPPER                                   │
│  Domain object construction from query results                  │
│  Location: {REPOSITORY_PATH}                                    │
│  Rule: Map DB rows → domain objects. No invented fields.        │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: USE CASE (Application Layer)                          │
│  Orchestration + DTO construction                               │
│  Location: {USE_CASE_PATH}                                      │
│  Rule: ONLY layer allowed to compute derived values.            │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 6: {API_LAYER_NAME} (Server Presentation)                │
│  {FRAMEWORK} route handlers / resolvers                         │
│  Location: {ROUTE_PATH}                                         │
│  Rule: Pass-through ONLY. No field additions, no calculations.  │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
<!-- CONDITIONAL: Include only if user has a BFF/proxy layer -->
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 7: BFF / API GATEWAY (Client Proxy)                      │
│  {FRONTEND_FRAMEWORK} API routes or gateway                     │
│  Location: {BFF_PATH}                                           │
│  Rule: Auth + proxy ONLY. No field additions, no calculations.  │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
<!-- END CONDITIONAL: BFF -->
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 8: CLIENT HOOK / SERVICE                                 │
│  {STATE_LIB} hooks, fetch wrappers                              │
│  Location: {CLIENT_HOOKS_PATH}                                  │
│  Rule: Fetch + cache ONLY. No field additions, no calculations. │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 9: CLIENT COMPONENT                                      │
│  {FRONTEND_FRAMEWORK} presentation components                   │
│  Location: {COMPONENTS_PATH}                                    │
│  Rule: DISPLAY ONLY. Read DTO fields. Format for display.       │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 10: FEATURE PIPELINE COMPLETENESS                        │
│  Verification gate — not a code layer                           │
│  Rule: Every server endpoint has a reachable client trigger.    │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Source-of-Truth Principle (Iron Rule)

> **Every value displayed to a user MUST trace back to either:**
> 1. **A database column** — stored directly
> 2. **A server-side computation** — derived from database columns in the Use Case layer, returned as a first-class DTO field
>
> **NEVER:**
> - Computed on the client from other DTO fields
> - Patched in at the BFF/gateway layer
> - Added as a nullable/optional field "just for display"
> - Hardcoded or approximated on the frontend

---

## Layer-by-Layer Checklist

### Layer 1: Database

| # | Check | Status |
|---|-------|--------|
| 1 | New data has a migration file | ☐ |
| 2 | Column types match application types (no implicit casts) | ☐ |
| 3 | NOT NULL constraint applied unless data is genuinely optional | ☐ |
| 4 | Default values set at DB level where applicable | ☐ |
| 5 | No computed columns that duplicate application logic | ☐ |

### Layer 2: Schema Definitions

| # | Check | Status |
|---|-------|--------|
| 1 | {ORM} model/table definition mirrors DB column exactly | ☐ |
| 2 | No extra fields invented that don't exist in DB | ☐ |
| 3 | Types match between DB and application | ☐ |

### Layer 3: Queries

| # | Check | Status |
|---|-------|--------|
| 1 | Query selects all columns needed by downstream layers | ☐ |
| 2 | JOINs are explicit (LEFT for optional, INNER for required) | ☐ |
| 3 | Aggregations named descriptively | ☐ |
| 4 | No business logic in queries beyond filtering | ☐ |
| 5 | No business calculations in SQL (no `col_a * col_b`) | ☐ |

**Allowed in queries:**
```{LANGUAGE}
// ✅ SQL aggregations (database-level operations)
{ALLOWED_QUERY_OPERATIONS}
```

**Prohibited in queries:**
```{LANGUAGE}
// ❌ Business calculations in queries
{PROHIBITED_QUERY_OPERATIONS}
```

### Layer 4: Repository + Mapper

| # | Check | Status |
|---|-------|--------|
| 1 | Repository calls typed query methods | ☐ |
| 2 | Mapper transforms DB rows → domain objects only | ☐ |
| 3 | No business calculations in mapper | ☐ |
| 4 | No fallback/default values that mask missing data | ☐ |
| 5 | Nullable DB columns map to nullable types (not silently defaulted) | ☐ |

**Allowed in mapper:**
```{LANGUAGE}
// ✅ Structural transformation only
{ALLOWED_MAPPER_OPERATIONS}
```

**Prohibited in mapper:**
```{LANGUAGE}
// ❌ Business calculation in mapper
{PROHIBITED_MAPPER_OPERATIONS}
```

### Layer 5: Use Case

| # | Check | Status |
|---|-------|--------|
| 1 | ALL computed/derived values are calculated HERE (not client) | ☐ |
| 2 | Every computed value is a named field on the return DTO type | ☐ |
| 3 | Computed fields are NOT optional/nullable unless business-required | ☐ |
| 4 | All inputs to computation come from repository results | ☐ |
| 5 | Return type is a concrete DTO | ☐ |
| 6 | Every field in the DTO is populated (no partial objects) | ☐ |
| 7 | No type casting to skip fields | ☐ |

**Correct — computation in use case:**
```{LANGUAGE}
{CORRECT_USE_CASE_COMPUTATION}
```

**Wrong — computation NOT in DTO type:**
```{LANGUAGE}
{WRONG_USE_CASE_COMPUTATION}
```

### Layer 6: {API_LAYER_NAME}

| # | Check | Status |
|---|-------|--------|
| 1 | Route handler calls use case and returns result directly | ☐ |
| 2 | No field additions to use case response | ☐ |
| 3 | No calculations or transformations on response data | ☐ |
| 4 | Response shape matches DTO type exactly | ☐ |

<!-- CONDITIONAL: Include only if BFF layer exists -->
### Layer 7: BFF / API Gateway

| # | Check | Status |
|---|-------|--------|
| 1 | BFF is a pure proxy (auth + forward) | ☐ |
| 2 | No response body modifications | ☐ |
| 3 | No field additions or removals | ☐ |
| 4 | No calculations on proxied data | ☐ |
<!-- END CONDITIONAL: BFF -->

### Layer 8: Client Hook / Service

| # | Check | Status |
|---|-------|--------|
| 1 | Hook fetches and returns typed response | ☐ |
| 2 | No data transformation in hook | ☐ |
| 3 | Return type matches server DTO exactly | ☐ |
| 4 | No default values that mask missing server data | ☐ |
| 5 | Mutation hooks exist for every write endpoint | ☐ |
| 6 | Query hooks exist for every read endpoint | ☐ |

**Prohibited in hooks:**
```{LANGUAGE}
// ❌ Computing values from server data
{PROHIBITED_HOOK_COMPUTATION}

// ❌ Default values that hide missing fields
{PROHIBITED_HOOK_DEFAULT}
```

### Layer 9: Client Component

| # | Check | Status |
|---|-------|--------|
| 1 | Component reads DTO fields directly — no derivation | ☐ |
| 2 | ZERO financial/business calculations | ☐ |
| 3 | ZERO business logic (no clamping, rounding, percentage conversion) | ☐ |
| 4 | ZERO aggregation (no summing DTO fields) | ☐ |
| 5 | Only allowed operations: display formatting | ☐ |
| 6 | DTO fields consumed as-is from props/hooks | ☐ |
| 7 | UI controls exist for every user-facing action | ☐ |

### Layer 10: Feature Pipeline Completeness

| # | Check | Status |
|---|-------|--------|
| 1 | Every POST/PUT/DELETE endpoint has a client-side trigger | ☐ |
| 2 | Every GET endpoint has a client-side consumer | ☐ |
| 3 | Mutation success invalidates related query caches | ☐ |
| 4 | UI provides feedback for all mutation states (loading, success, error) | ☐ |
| 5 | UI is reachable from existing navigation | ☐ |
| 6 | "N/A" justification documented if client layers intentionally skipped | ☐ |

---

## Client-Side Allowed vs Prohibited Operations

### Allowed on Client (Display Formatting Only)

```{LANGUAGE}
// ✅ Number formatting
{ALLOWED_NUMBER_FORMAT}

// ✅ Date/time formatting
{ALLOWED_DATE_FORMAT}

// ✅ String formatting
{ALLOWED_STRING_FORMAT}

// ✅ Conditional rendering (not conditional business logic)
{ALLOWED_CONDITIONAL_RENDER}
```

### Prohibited on Client

```{LANGUAGE}
// ❌ Financial/business calculations
{PROHIBITED_CLIENT_CALC}

// ❌ Aggregation of DTO fields
{PROHIBITED_CLIENT_AGG}

// ❌ Re-deriving server-provided values
{PROHIBITED_CLIENT_REDERIVE}
```

---

## New Field Implementation Checklist

**When adding ANY new field that a client component will display:**

### Step 1: Define the Type
| # | Check | Status |
|---|-------|--------|
| 1 | Field added to DTO type definition | ☐ |
| 2 | Field is required (not optional) unless genuinely nullable | ☐ |
| 3 | Type is specific (not `any` or loosely typed) | ☐ |

### Step 2: Source the Data
| # | Check | Status |
|---|-------|--------|
| 4 | Data exists in DB or can be derived from DB columns | ☐ |
| 5 | Migration created if new column needed | ☐ |
| 6 | {ORM} schema updated if new column added | ☐ |

### Step 3: Query and Map
| # | Check | Status |
|---|-------|--------|
| 7 | Query updated to select new data | ☐ |
| 8 | Repository passes new data through | ☐ |
| 9 | Mapper handles the new field | ☐ |

### Step 4: Compute (if derived)
| # | Check | Status |
|---|-------|--------|
| 10 | Derived value computed in use case | ☐ |
| 11 | Computation uses only repository data as inputs | ☐ |
| 12 | ALL use cases returning this DTO are updated | ☐ |

### Step 5: Verify Pass-Through
| # | Check | Status |
|---|-------|--------|
| 13 | Route returns field without modification | ☐ |
| 14 | BFF passes field through (if applicable) | ☐ |
| 15 | Client hook returns field without modification | ☐ |

### Step 6: Consume on Client
| # | Check | Status |
|---|-------|--------|
| 16 | Component reads field directly | ☐ |
| 17 | No client-side recalculation | ☐ |
| 18 | Display formatting only | ☐ |

### Step 7: Verify End-to-End
| # | Check | Status |
|---|-------|--------|
| 19 | Type-check passes across all packages | ☐ |
| 20 | Field appears in API response | ☐ |
| 21 | No client-side recalculation found via search | ☐ |

---

<!-- CONDITIONAL: Include if monorepo/shared types -->
## Shared Type Contract Expansion Checklist

When modifying shared types that have exhaustive consumers:

| # | Check | Status |
|---|-------|--------|
| 1 | Search all packages for imports of the modified type | ☐ |
| 2 | Every exhaustive consumer updated (Record maps, switch statements) | ☐ |
| 3 | Type-check passes across ALL packages (not just the one edited) | ☐ |
| 4 | No type casts added to silence missing variants | ☐ |
| 5 | No `Partial<>` wrappers added to avoid updating | ☐ |
<!-- END CONDITIONAL: Shared Types -->

---

<!-- CONDITIONAL: Include based on validation library -->
## Input Validation Pipeline

| # | Check | Status |
|---|-------|--------|
| 1 | Input validated at exactly ONE layer (presentation/route) | ☐ |
| 2 | Use cases receive pre-validated inputs | ☐ |
| 3 | Use cases do NOT re-validate format | ☐ |
| 4 | Validation schema is the single source of truth | ☐ |
<!-- END CONDITIONAL: Validation -->

---

## Calculation Placement Rules

| Calculation Type | Allowed Layer | Prohibited Layer |
|------------------|---------------|------------------|
| Financial derivation | Use Case | Client, Hook, BFF, Mapper |
| Percentage computation | Use Case | Client, Hook, BFF, Mapper |
| Business rule clamping | Use Case | Client, Hook, BFF |
| Aggregation across records | Query or Repository | Client, Hook |
| Ratio/multiplier | Use Case | Client, Hook |
| Conditional business logic | Use Case | Client Component |
| Display formatting | Client Component | — |
| Date/time formatting | Client Component | — |

---

## Common Violations & Fixes

<!-- INSTRUCTION: Generate violations specific to user's tech stack -->

### ❌ Client-Side Computation

```{LANGUAGE}
// WRONG - Client calculates business value
{CLIENT_COMPUTATION_VIOLATION}
```

**Fix**: Add as server-computed DTO field in use case.

### ❌ BFF Field Addition

```{LANGUAGE}
// WRONG - BFF adds data not in server response
{BFF_VIOLATION}
```

**Fix**: Move computation to use case, add to DTO type.

### ❌ Silent Default Masking Missing Data

```{LANGUAGE}
// WRONG - Fallback hides server bug
{SILENT_DEFAULT_VIOLATION}
```

**Fix**: Surface error for missing data, fix server to always provide it.

---

## Pipeline Audit Procedure

For each field displayed on the client, trace backwards:

1. Find the component that renders it
2. Trace to the hook that provides it
3. Trace to the API endpoint that returns it
4. Trace to the use case that computes/assembles it
5. Trace to the repository that queries it
6. Trace to the database column that stores it

If any link is broken, fabricated, or duplicated — it's a violation.

---

**Document Maintainer**: {TEAM_OR_USER}
**Review Cycle**: Quarterly or on major pattern changes
