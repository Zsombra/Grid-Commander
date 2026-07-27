---
description: Create Documentation
argument-hint: <feature-or-WEEKLY>
---

## Role

You are a technical documentation specialist creating clear, maintainable architecture documentation.

## Context

Current branch: !`git branch --show-current`
Recent docs: !`ls -lt docs/ 2>/dev/null | head -5`
Architecture checklist: !`head -5 docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md 2>/dev/null || echo "No architecture checklist found"`
Active changes: !`python3 .claude/tools/openspec.py list 2>/dev/null || echo "(none)"`
Capabilities: !`ls openspec/specs 2>/dev/null | grep -v README || echo "(none yet)"`

## Task

Create or update documentation for: **$ARGUMENTS**

Use `@file-path` to examine implementations before documenting.

---

## Standard Workflow

When invoked with any argument OTHER than "WEEKLY":

1. Examine the codebase for the specified feature/component.
2. Create or update appropriate documentation in `docs/` folders.
3. If `docs/LATEST.md` exists, update it with new documentation references.
4. Follow any established documentation patterns in the project.

## Weekly Review Workflow

When invoked specifically with "WEEKLY" argument:

### 1. Query Recent Activity

Recent docs: !`ls -lt docs/ 2>/dev/null | head -10`
Recently archived changes: !`ls -t openspec/changes/archive 2>/dev/null | head -10`
Recent commits: !`git log --oneline --since="7 days ago" 2>/dev/null | head -20`
Current ISO week: !`date +"%Y-W%V"`

### 2. Archive & Rotate (if LATEST.md exists)

If `docs/LATEST.md` exists:
- Archive current `docs/LATEST.md` to `docs/archive/week-{ISO_WEEK}.md`
- Create fresh `docs/LATEST.md` for new week

If `docs/LATEST.md` doesn't exist:
- Create it as a new weekly summary

### 3. Summarize Recent Work

- Read recent git commits to identify what was built this week
- Read recent plan docs to identify completed features
- Write a summary of architectural changes, new patterns, and decisions
- Note any open issues or upcoming work

---

## Documentation Requirements

- Document completed implementations, not planned features
- Focus on architectural patterns and integration points
- Include concrete code examples demonstrating patterns
- Provide clear guidance for future engineers
- If `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md` exists, reference the project's architecture pattern and layer model

## Documentation Categories

Organize documentation based on what the project actually has. Common categories:

### Architecture (`docs/architecture/`)
- Patterns used in the project (discovered from code, not assumed)
- Layer boundaries and dependency rules
- Integration points between layers/services
- Performance considerations

### Integrations (`docs/integrations/`)
- How different parts of the system communicate
- Database access patterns
- External API integrations
- Real-time/WebSocket patterns (if applicable)

### Debug (`docs/debug/`)
- Common issues and solutions
- Troubleshooting procedures
- Error patterns and prevention

### Decisions (`docs/decisions/`)
- Architecture decision records (ADRs)
- Why specific patterns were chosen
- Trade-offs that were considered

Adapt categories to the project. Not every project needs all categories. Create only what's relevant.

## Document Structure

```markdown
# [Feature/System Name]

## Overview
[Brief description and role in system]

## Architectural Integration
[How it fits into the project's architecture layers]
[Reference docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md if available]

## Implementation Patterns
[Code examples showing key patterns in the project's language]

## Related Documentation
- [Links to related docs]
```

## Hard Rules

- Do NOT document planned features as if they're implemented
- Do NOT assume architecture patterns — read from code or checklists
- Do NOT create empty documentation categories — only create what the project needs
- Code examples must be in the project's actual language and framework

End with: **DOCUMENTATION COMPLETE ✓**
