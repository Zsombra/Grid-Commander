---
description: Debug Specific Issue
argument-hint: <error-message-or-issue-description>
---

## Role

You are a senior debugger specializing in systematic root cause analysis across all layers of the application stack.

## Context

Current branch: !`git branch --show-current`
Recent commits: !`git log --oneline -3`
Architecture checklist: !`head -5 docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md 2>/dev/null || echo "No architecture checklist found"`

## Task

Debug the specific issue: **$ARGUMENTS**

Use `@file-path` to examine referenced files. If the error includes a file path (e.g., `./src/hooks/useGame.ts:118:33` or `./app/services/game.py:42`), read that file immediately using `@` syntax.

## Debugging Framework

### Phase 1: Immediate File Analysis

1. **Read Referenced File**: Use `@path/to/file` with line number context
2. **Understand Method Signature**: Parameters, return types, constraints
3. **Trace Calling Context**: How method is invoked, where data comes from
4. **Identify Data Source**: External API, database, state store, cache

### Phase 2: Dependency Pipeline Mapping

1. **External → Internal**: Data transformation pipeline across boundaries
2. **Schema/Interface Consistency**: Verify type contracts across layers
3. **Cross-Package Data Flow**: Client ↔ Server integration points (if applicable)
4. **Library Integration Points**: External dependencies and expected types

### Phase 3: Root Cause Isolation

1. **Architectural Layer Analysis**: Where in the architecture the issue occurs
   - If `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md` exists, use its Layer Overview to identify which layer is affected
   - If not, identify the layer from the codebase structure
2. **Pattern Compliance Check**: Does implementation follow established patterns?
3. **Type Safety Verification**: Check for type mismatches, missing validations, incorrect assumptions
4. **Library Documentation**: Verify correct usage of libraries involved in the error

### Phase 4: Resolution

1. **Fix Root Cause**: Address fundamental issue, not symptoms
2. **Update Related Dependencies**: Fix cascade effects across call chain
3. **Verify Type Consistency**: Ensure types flow correctly through pipeline
4. **Test Integration Points**: Verify fix doesn't break other components

## Layer-Specific Debugging

If `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md` exists, read it to understand the project's layer structure and debugging context. Then apply layer-specific debugging:

**Presentation Layer** (routes, handlers, controllers):
- Request parsing and validation
- Response formatting
- Auth/middleware issues

**Application Layer** (use cases, services, commands):
- Business logic errors
- Orchestration failures
- Missing dependency injection

**Domain Layer** (entities, value objects, domain services):
- Business rule violations
- State machine errors
- Calculation mistakes

**Infrastructure Layer** (database, cache, external APIs):
- Connection failures
- Query errors
- Serialization/deserialization issues
- Timeout and retry failures

**Client Layer** (components, hooks, state):
- Rendering errors
- State management issues
- Event handling failures
- Real-time connection issues

If no checklist exists, inspect the codebase to identify layers before debugging.

## Deliverable

### Issue Analysis
**Problem**: [Specific technical issue]
**Referenced File**: [Exact file path from error]
**Layer**: [Which architectural layer]
**Severity**: [High/Medium/Low]

### Root Cause
**Direct File Examination**: [What was found]
**Call Chain**: [Complete dependency pipeline]
**Root Cause**: [Fundamental issue identified]

### Dependency Pipeline
```
Source → Transform1 → Transform2 → Destination
```

### Resolution
```
// BEFORE (Root Issue)
[problematic code]

// AFTER (Fix)
[fixed code]
```

### Prevention
- [ ] Pattern documentation update needed
- [ ] Type safety improvement
- [ ] Integration test coverage
- [ ] Checklist rule addition needed (if this bug type isn't covered)

### Spec Check

Before closing, check the behavior against `openspec/specs/`:

| Finding | Meaning | Action |
|---|---|---|
| A requirement covers this and the code violated it | Straight bug | Fix the code |
| A requirement covers this and the code matches it | The **spec** is wrong | Propose a change — do not silently "fix" agreed behavior |
| No requirement covers this | Behavior nobody agreed to | Worth specifying if the capability matters |

For a one-line fix, fix it and note the spec gap. For anything that changes
agreed behavior, run `/propose` — a bug fix that quietly redefines the contract
is how a spec layer goes stale.

File a backlog item (`.claude/references/tracking.md`) for the spec gap, and for
any related bug you found while tracing but did not fix. You are the person with
the most context on it that anyone will ever have; spend two minutes writing it
down.

## Success Criteria

- Referenced file read first
- Complete dependency chain traced
- Root cause fixed (not symptoms)
- Type/contract consistency verified across affected layers

End with: **DEBUG COMPLETE ✓**
