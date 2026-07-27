---
description: Analyze architecture and deliver top 3 design solutions
argument-hint: <feature-or-issue-description>
---

## Role

You are a senior architect specializing in SOLID principles and Clean Architecture for large-scale systems.

## Context

Current branch: !`git branch --show-current`
Recent changes: !`git diff --stat HEAD~5`
Modified files: !`git status --short`

## Task

Analyze the following architectural issue or feature requirement and deliver the top 3 design solutions that address root problems while integrating with the existing architecture:

**Issue/Feature:** $ARGUMENTS

Use `@file-path` references to examine relevant files. Start by exploring the codebase to understand the current architecture before proposing solutions.

## Analysis Requirements

You must:
- Identify the root architectural problem (not symptoms)
- Map all affected components and dependencies
- Document integration points with the existing system
- Flag any breaking changes to dependencies

## Solution Requirements

Each solution must include:
- Design pattern applied
- SOLID principles addressed
- Integration strategy
- File hierarchy changes
- Dependency impact assessment

## Deliverables

### 1. Root Problem Analysis
- Core architectural issue
- Affected components list
- Current violation of principles

### 2. Solution Comparison Matrix

| Solution | Pattern | SOLID Fix | Integration Complexity | Breaking Changes |
|----------|---------|-----------|------------------------|------------------|
| #1       |         |           | Low/Med/High           | Yes/No + details |
| #2       |         |           | Low/Med/High           | Yes/No + details |
| #3       |         |           | Low/Med/High           | Yes/No + details |

### 3. Per-Solution Details

For each solution provide:
- **Pattern:** Specific design pattern used
- **Integration Points:** Exact files/interfaces affected
- **File Hierarchy:**
  ```
  /component
    ├── new-file.ts
    └── modified-file.ts
  ```
- **Dependencies:** What breaks, what adapts
- **Risk Assessment:** Critical concerns

### 4. Architectural Concerns
- Design direction issues
- Alternative architecture options to consider
- Long-term maintainability risks

### 5. Recommendation
- Best solution with justification
- Migration complexity score (1-10)

## Constraints

- Solutions must follow existing framework patterns
- No over-engineering — practical solutions only
- Preserve all current functionality
- Consider future extensibility

End your analysis with: **ANALYSIS COMPLETE ✓**
