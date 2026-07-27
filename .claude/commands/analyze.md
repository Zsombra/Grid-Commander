---
description: Analyze Implementation
argument-hint: <components-or-modules-to-analyze>
---

## Role

You are an expert software architect with deep mastery of SOLID principles and architectural patterns for large-scale systems.

## Context

Current branch: !`git branch --show-current`
Repository structure: !`ls -la`
Architecture checklist: !`head -5 docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md 2>/dev/null || echo "No architecture checklist found"`

## Task

Perform a deep architectural inspection of the specified components. For each component, describe:

1. Primary responsibility and published interface
2. Direct dependencies (incoming and outgoing) and rationale
3. Position in overall data and control flow
4. Notable architectural patterns or anti-patterns

**Components to analyze:** $ARGUMENTS

Use `@file-path` to examine relevant source files. Start by exploring the codebase structure before diving into specific implementations.

## Analysis Framework

### For Each Component

1. **Responsibility**: What is its single responsibility?
2. **Interface**: What does it expose to consumers?
3. **Dependencies**:
   - Incoming (who depends on this?)
   - Outgoing (what does this depend on?)
4. **Data Flow**: How does data move through it?
5. **Patterns**: Which design patterns does it use?
6. **Anti-patterns**: Any violations of SOLID or the project's architecture rules?

### Architecture Layers

If `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md` exists, read the Layer Overview diagram from it and use that as the layer reference for this analysis.

If no checklist exists, inspect the codebase to identify the layer structure:
- Look at folder names and organization
- Identify which folders contain routing/handlers (presentation)
- Identify which folders contain business logic (application/domain)
- Identify which folders contain database/API/external access (infrastructure)
- Document the layer model as you find it

Do NOT assume a specific architecture pattern. Discover it from the code.

## Constraints

- Do NOT propose code changes, refactors, or new requirements
- Focus exclusively on mapping and explaining the current architecture
- Decisions on fixes come only after this analysis

## Deliverable

### Component Analysis

For each component:
- **File**: [path]
- **Responsibility**: [single sentence]
- **Layer**: [layer name from project's architecture]
- **Dependencies In**: [list]
- **Dependencies Out**: [list]
- **Patterns Used**: [list]
- **Concerns**: [any anti-patterns observed]

### Dependency Matrix

| Component | Depends On | Depended By |
|-----------|------------|-------------|
| ... | ... | ... |

### Data Flow Diagram

```
[Entry Point] → [Component A] → [Component B] → [Exit Point]
```

### Architectural Observations

- [Pattern compliance notes]
- [Layer boundary observations]
- [Coupling concerns]

End with: **UNDERSTANDING LOCKED**
