# {PROJECT_NAME} Architecture Review Checklist

**Version**: 1.0.0
**Last Updated**: {DATE}
**Based On**: Clean Architecture + {ADDITIONAL_PATTERNS}

---

## Purpose

This document provides standardized review checklists for all server-side components to ensure consistency with the established architectural patterns. Use these checklists when:

- Creating new use cases, repositories, or infrastructure adapters
- Reviewing pull requests that modify server components
- Auditing existing code for architectural compliance

---

## Table of Contents

1. [Layer Overview](#layer-overview)
2. [Use Case Review Checklist](#use-case-review-checklist)
3. [Repository Review Checklist](#repository-review-checklist)
4. [Infrastructure Adapter Review Checklist](#infrastructure-adapter-review-checklist)
5. [DI Wiring Review Checklist](#di-wiring-review-checklist)
6. [Common Anti-Patterns](#common-anti-patterns)
<!-- CONDITIONAL: Add entries for each optional module selected -->

---

## Layer Overview

<!-- INSTRUCTION: Replace framework names and folder paths with the user's actual stack -->

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│   {FRAMEWORK} Routes, {REALTIME_IF_APPLICABLE} Handlers         │
│   Location: {SERVER_PATH}/presentation/                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                           │
│   Use Cases, Event Handlers, Application Services               │
│   Location: {SERVER_PATH}/application/                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DOMAIN LAYER                              │
│   Entities, Value Objects, Domain Services, Repository IFaces   │
│   Location: {SERVER_PATH}/domain/                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                         │
│   {ORM} Repos, {CACHE_IF_APPLICABLE}, External API Clients      │
│   Location: {SERVER_PATH}/infrastructure/                       │
└─────────────────────────────────────────────────────────────────┘
```

**Dependency Rule**: Dependencies ONLY point inward (outer → inner). Never import from outer layers.

---

## Use Case Review Checklist

### File Naming & Location

<!-- INSTRUCTION: Replace paths and naming with user's conventions -->

| # | Check | Required |
|---|-------|----------|
| 1 | Located in `{SERVER_PATH}/application/use-cases/` | ✅ |
| 2 | File name follows `{FILE_NAMING_CONVENTION}` | ✅ |
| 3 | Class/function name follows `{CLASS_NAMING_CONVENTION}` | ✅ |

---

### SOLID Principles

#### S - Single Responsibility

| # | Check | Status |
|---|-------|--------|
| 1 | Use case has ONE clear purpose (stated in JSDoc/docstring) | ☐ |
| 2 | Does NOT mix query and command logic | ☐ |
| 3 | Delegates sub-operations to specialized use cases | ☐ |
| 4 | Does NOT directly implement persistence (uses repositories) | ☐ |

**Delegation Pattern**:
<!-- INSTRUCTION: Generate code example in the user's LANGUAGE -->
```{LANGUAGE}
// ✅ CORRECT - Delegates sub-operation
{CORRECT_DELEGATION_EXAMPLE}

// ❌ WRONG - Implements persistence directly
{WRONG_DELEGATION_EXAMPLE}
```

#### O - Open/Closed

| # | Check | Status |
|---|-------|--------|
| 1 | New behavior added via new use cases or strategies, not modifying existing logic | ☐ |
| 2 | Uses strategy/delegate patterns for extensibility | ☐ |
| 3 | Core happy path remains unchanged when adding error handling | ☐ |

#### L - Liskov Substitution

| # | Check | Status |
|---|-------|--------|
| 1 | Implements interface if specified | ☐ |
| 2 | Return type matches declared interface exactly | ☐ |
| 3 | Exceptions are documented and consistent | ☐ |

#### I - Interface Segregation

| # | Check | Status |
|---|-------|--------|
| 1 | Only imports methods it actually uses from dependencies | ☐ |
| 2 | Request/Response DTOs are minimal (no unused fields) | ☐ |
| 3 | Does NOT depend on fat interfaces | ☐ |

#### D - Dependency Inversion

| # | Check | Status |
|---|-------|--------|
| 1 | Repository dependencies use domain interfaces, not concrete implementations | ☐ |
| 2 | Service dependencies use domain ports/interfaces | ☐ |
| 3 | NO direct infrastructure imports ({ORM}, {CACHE_LIB}, external SDKs) | ☐ |

**Allowed Dependencies**:
<!-- INSTRUCTION: Generate import examples in user's LANGUAGE and FRAMEWORK -->
```{LANGUAGE}
// ✅ Domain interfaces (for repositories/services)
{CORRECT_IMPORT_EXAMPLE}

// ✅ Shared types
{SHARED_TYPES_IMPORT_EXAMPLE}

// ❌ Infrastructure imports (NEVER in use cases)
{WRONG_IMPORT_EXAMPLE}
```

---

### Clean Architecture Compliance

| # | Check | Status |
|---|-------|--------|
| 1 | Imports ONLY from: shared types, domain layer, other use cases | ☐ |
| 2 | Does NOT import from infrastructure layer | ☐ |
| 3 | Does NOT import from presentation layer | ☐ |
| 4 | Uses domain enums/constants, not magic strings | ☐ |
| 5 | Business logic lives in domain services, not use case orchestration | ☐ |

---

### Logging Standards

| # | Check | Status |
|---|-------|--------|
| 1 | Uses structured logger (NOT console.log/print) | ☐ |
| 2 | Log messages prefixed with `[ClassName]` or equivalent context | ☐ |
| 3 | Error logs include structured context object | ☐ |
| 4 | Sensitive data (passwords, tokens, PII) NOT logged | ☐ |

**Pattern**:
<!-- INSTRUCTION: Generate logging example in user's LANGUAGE and logging library -->
```{LANGUAGE}
// ✅ CORRECT
{CORRECT_LOGGING_EXAMPLE}

// ❌ WRONG
{WRONG_LOGGING_EXAMPLE}
```

---

### Error Handling

| # | Check | Status |
|---|-------|--------|
| 1 | Catches errors at appropriate granularity | ☐ |
| 2 | Logs errors with context before re-throwing or returning | ☐ |
| 3 | Returns structured error response (not raw exceptions) when appropriate | ☐ |
| 4 | Does NOT swallow errors silently | ☐ |
| 5 | Cleanup operations wrapped in try/catch (non-fatal failures) | ☐ |

---

### Idempotency

| # | Check | Status |
|---|-------|--------|
| 1 | Checks for already-completed state before executing | ☐ |
| 2 | Returns success for already-completed operations (no re-processing) | ☐ |
| 3 | Database operations are idempotent or check preconditions | ☐ |

**Pattern**:
<!-- INSTRUCTION: Generate idempotency example in user's LANGUAGE -->
```{LANGUAGE}
// ✅ CORRECT - Idempotent check
{IDEMPOTENCY_EXAMPLE}
```

---

### Constructor / Initialization Pattern

<!-- INSTRUCTION: Adapt to user's DI approach -->

| # | Check | Status |
|---|-------|--------|
| 1 | All dependencies injected via {DI_APPROACH} | ☐ |
| 2 | Dependencies are immutable after initialization | ☐ |
| 3 | No business logic in constructor/initialization | ☐ |

**Pattern**:
```{LANGUAGE}
{CONSTRUCTOR_PATTERN_EXAMPLE}
```

---

### Request/Response DTOs

| # | Check | Status |
|---|-------|--------|
| 1 | Request type defined with required fields only | ☐ |
| 2 | Response type defined with all output fields | ☐ |
| 3 | Request has no optional clutter | ☐ |
| 4 | Response includes success indicator and message | ☐ |

**Pattern**:
```{LANGUAGE}
{DTO_PATTERN_EXAMPLE}
```

---

## Repository Review Checklist

### File Naming & Location

| # | Check | Required |
|---|-------|----------|
| 1 | Interface in `{SERVER_PATH}/domain/repositories/` | ✅ |
| 2 | Implementation in `{SERVER_PATH}/infrastructure/persistence/repositories/` | ✅ |
| 3 | Interface file follows: `{INTERFACE_NAMING_CONVENTION}` | ✅ |
| 4 | Implementation file follows: `{IMPL_NAMING_CONVENTION}` | ✅ |

---

<!-- CONDITIONAL: Include only if user chose CQRS -->
### CQRS Separation

| # | Check | Status |
|---|-------|--------|
| 1 | Readers (queries) and Writers (mutations) are SEPARATE classes | ☐ |
| 2 | Reader methods: `find*`, `get*`, `list*`, `count*` | ☐ |
| 3 | Writer methods: `create*`, `update*`, `delete*` | ☐ |
| 4 | Writers return void or ID only (no domain objects) | ☐ |
| 5 | Readers return domain objects or DTOs | ☐ |

**Naming Pattern**:
```{LANGUAGE}
{CQRS_NAMING_EXAMPLE}
```
<!-- END CONDITIONAL: CQRS -->

---

### Mapper Pattern

| # | Check | Status |
|---|-------|--------|
| 1 | DB row → Domain object mapping in dedicated mapper | ☐ |
| 2 | No business calculations in mapper | ☐ |
| 3 | No fallback/default values that mask missing data | ☐ |
| 4 | Nullable DB columns map to nullable types (not silently defaulted) | ☐ |

---

### Query Safety ({ORM} Specific)

<!-- INSTRUCTION: Generate rules specific to the user's ORM -->

| # | Check | Status |
|---|-------|--------|
| 1 | Uses {ORM} type-safe query builder for all queries | ☐ |
| 2 | Column references use schema objects, not string literals | ☐ |
| 3 | No raw SQL that bypasses compile-time validation | ☐ |
| 4 | No string interpolation in queries (injection risk) | ☐ |

**Allowed (type-safe)**:
```{LANGUAGE}
{CORRECT_QUERY_EXAMPLE}
```

**Prohibited (runtime-only validation)**:
```{LANGUAGE}
{WRONG_QUERY_EXAMPLE}
```

---

## Infrastructure Adapter Review Checklist

### File Naming & Location

| # | Check | Required |
|---|-------|----------|
| 1 | Located in `{SERVER_PATH}/infrastructure/` | ✅ |
| 2 | Implements domain port interface | ✅ |
| 3 | Named with technology prefix (`{ORM}`, `Redis`, `Stripe`, etc.) | ✅ |

### Port Implementation

| # | Check | Status |
|---|-------|--------|
| 1 | Implements interface from domain layer | ☐ |
| 2 | All interface methods implemented | ☐ |
| 3 | No additional public methods beyond interface | ☐ |
| 4 | Error handling converts infrastructure errors to domain errors | ☐ |

---

## DI Wiring Review Checklist

<!-- INSTRUCTION: Adapt to user's DI approach (constructor injection, NestJS modules, manual wiring, etc.) -->

### Composition Root

| # | Check | Status |
|---|-------|--------|
| 1 | All wiring happens in designated composition root location | ☐ |
| 2 | Dependencies resolved in correct order | ☐ |
| 3 | No circular dependencies | ☐ |
| 4 | Optional dependencies explicitly handled | ☐ |

**Pattern**:
```{LANGUAGE}
{DI_WIRING_EXAMPLE}
```

---

<!-- CONDITIONAL: Include only if user selected Redis/Cache module -->
## Cache Layer Review Checklist

### Key Management

| # | Check | Status |
|---|-------|--------|
| 1 | Every cache key pattern is documented with constants | ☐ |
| 2 | Delete/cleanup removes ALL key patterns for a resource | ☐ |
| 3 | New key patterns are added to cleanup methods | ☐ |
| 4 | TTLs are consistent and configured centrally | ☐ |

### Cache Read Pattern

| # | Check | Status |
|---|-------|--------|
| 1 | Cache reads are gated on authoritative state from DB | ☐ |
| 2 | Stale cache returns are handled (not silently served) | ☐ |
| 3 | Cache misses fall back to DB read (not error) | ☐ |
<!-- END CONDITIONAL: Redis/Cache -->

---

<!-- CONDITIONAL: Include only if user selected Auth module -->
## Authentication / Authorization Review Checklist

### Auth Middleware

| # | Check | Status |
|---|-------|--------|
| 1 | Auth check happens at presentation layer (middleware/guard) | ☐ |
| 2 | Use cases receive validated user identity, not raw tokens | ☐ |
| 3 | Authorization (role/permission) checked before use case execution | ☐ |
| 4 | No auth logic in domain or infrastructure layers | ☐ |

### Token Handling

| # | Check | Status |
|---|-------|--------|
| 1 | Tokens validated on every request (not cached without TTL) | ☐ |
| 2 | Token secrets stored in environment variables, not code | ☐ |
| 3 | Expired tokens return 401, not 500 | ☐ |
<!-- END CONDITIONAL: Auth -->

---

<!-- CONDITIONAL: Include only if user selected WebSocket/Real-time module -->
## WebSocket / Real-time Review Checklist

### Connection Lifecycle

| # | Check | Status |
|---|-------|--------|
| 1 | Connection authenticated on handshake | ☐ |
| 2 | Disconnection cleans up all subscriptions | ☐ |
| 3 | Reconnection handles state recovery | ☐ |

### Event Patterns

| # | Check | Status |
|---|-------|--------|
| 1 | Event names follow consistent naming convention | ☐ |
| 2 | Event payloads are typed | ☐ |
| 3 | Broadcasts are internally consistent (same tick data) | ☐ |
<!-- END CONDITIONAL: WebSocket -->

---

<!-- CONDITIONAL: Include only if user selected Message Queue module -->
## Message Queue Review Checklist

### Job Definition

| # | Check | Status |
|---|-------|--------|
| 1 | Jobs are idempotent (safe to retry) | ☐ |
| 2 | Job payloads are serializable and typed | ☐ |
| 3 | Retry policy defined (max retries, backoff) | ☐ |
| 4 | Dead letter queue configured for failed jobs | ☐ |

### Queue Patterns

| # | Check | Status |
|---|-------|--------|
| 1 | Producer and consumer are separate classes | ☐ |
| 2 | Queue names use constants, not magic strings | ☐ |
| 3 | Consumer handles partial failures gracefully | ☐ |
<!-- END CONDITIONAL: Message Queue -->

---

<!-- CONDITIONAL: Include only if user selected Testing module -->
## Testing Standards

### Test Location & Naming

| # | Check | Status |
|---|-------|--------|
| 1 | Tests co-located or in parallel `__tests__` directory | ☐ |
| 2 | Test file named `{component}.test.{ext}` or `{component}.spec.{ext}` | ☐ |
| 3 | Describe block matches class/function name | ☐ |

### Test Patterns Per Layer

| # | Check | Status |
|---|-------|--------|
| 1 | Use cases: mock repositories, test business logic | ☐ |
| 2 | Repositories: integration tests against real/test DB | ☐ |
| 3 | Presentation: test request validation and response shape | ☐ |
| 4 | Domain: unit test pure business logic with no mocks | ☐ |
<!-- END CONDITIONAL: Testing -->

---

<!-- CONDITIONAL: Include only if user selected Security module -->
## Security Review Checklist

### Input Handling

| # | Check | Status |
|---|-------|--------|
| 1 | All user input validated at presentation layer | ☐ |
| 2 | No string interpolation in SQL queries | ☐ |
| 3 | HTML output escaped to prevent XSS | ☐ |
| 4 | File uploads validated (type, size, content) | ☐ |

### Secrets Management

| # | Check | Status |
|---|-------|--------|
| 1 | Secrets in environment variables, not in code | ☐ |
| 2 | No secrets in logs, error messages, or API responses | ☐ |
| 3 | API keys rotatable without code changes | ☐ |
<!-- END CONDITIONAL: Security -->

---

<!-- CONDITIONAL: Include only if user selected Monitoring module -->
## Monitoring / Observability Review Checklist

### Health Checks

| # | Check | Status |
|---|-------|--------|
| 1 | Health endpoint exists and checks DB connectivity | ☐ |
| 2 | Health endpoint checks cache connectivity (if applicable) | ☐ |
| 3 | Health endpoint returns structured status (not just 200) | ☐ |

### Metrics

| # | Check | Status |
|---|-------|--------|
| 1 | Request duration tracked per endpoint | ☐ |
| 2 | Error rates tracked per endpoint | ☐ |
| 3 | Business metrics tracked where valuable | ☐ |
<!-- END CONDITIONAL: Monitoring -->

---

<!-- CONDITIONAL: Include if user provided project-specific policies -->
## Project-Specific Policies

<!-- INSTRUCTION: Generate rules from user's custom policies -->
<!-- Example: "No polymorphism" becomes a full section with checkbox rules and code examples -->
<!-- END CONDITIONAL: Project Policies -->

---

## Common Anti-Patterns

<!-- INSTRUCTION: Generate anti-patterns specific to the user's tech stack -->

### ❌ Infrastructure Leak

```{LANGUAGE}
// WRONG - Direct {ORM} usage in use case
{INFRASTRUCTURE_LEAK_EXAMPLE}
```

**Fix**: Use repository interface.

---

### ❌ Console Logging

```{LANGUAGE}
// WRONG - Console usage
{CONSOLE_LOGGING_EXAMPLE}
```

**Fix**: Use structured logger.

---

### ❌ String Literals for Enums

```{LANGUAGE}
// WRONG - Magic string
{MAGIC_STRING_EXAMPLE}
```

**Fix**: Use domain enum/constant.

---

### ❌ Missing Idempotency Check

```{LANGUAGE}
// WRONG - No state check before mutation
{MISSING_IDEMPOTENCY_EXAMPLE}
```

**Fix**: Check current state first.

---

### ❌ Swallowed Errors

```{LANGUAGE}
// WRONG - Error swallowed silently
{SWALLOWED_ERROR_EXAMPLE}
```

**Fix**: Log error, then decide to throw or return error result.

---

### ❌ Unsafe Queries

```{LANGUAGE}
// WRONG - {ORM}-specific unsafe query pattern
{UNSAFE_QUERY_EXAMPLE}
```

**Fix**: Use {ORM} type-safe query builder.

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

### Issues Found

1. [Issue description + file:line]
2. [Issue description + file:line]

### Recommendations

1. [Recommendation]
2. [Recommendation]

### Verdict

- [ ] Approved
- [ ] Approved with minor changes
- [ ] Changes requested
```

---

## Quick Reference Card

<!-- INSTRUCTION: Fill with actual patterns from user's stack -->

| Pattern | Rule |
|---------|------|
| **Dependencies** | Domain interfaces for repos, never import infrastructure in use cases |
| **Logging** | Structured logger only, prefix with [ClassName] |
| **Idempotency** | Check state before mutating |
| **Enums** | Use domain enums, not string literals |
| **Error Handling** | Log with context, don't swallow |
| **Queries** | {ORM} type-safe builder only |
| **Quality Gate** | Type-check and lint must pass before every commit |

---

**Document Maintainer**: {TEAM_OR_USER}
**Review Cycle**: Quarterly or on major pattern changes
