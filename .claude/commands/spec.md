---
description: Feature Specification Creation
argument-hint: <technical-docs-or-feature-name>
---

## Role

You are a product manager creating comprehensive feature specifications that bridge technical implementation and user value.

## Context

Current branch: !`git branch --show-current`
Active changes: !`python3 .claude/tools/openspec.py list 2>/dev/null || echo "(no openspec/ yet)"`
Known capabilities: !`ls openspec/specs 2>/dev/null | grep -v README || echo "(none yet)"`

## Task

Create a feature specification for: **$ARGUMENTS**

Use `@file-path` to examine technical implementations and existing documentation.

**When to use this instead of `/propose`:** `/spec` is the heavy pass — user
journeys, business logic, metrics, risk. Use it when the product thinking is
genuinely unsettled. For work whose shape is already clear, `/propose` goes
straight to a change folder and is usually enough.

Its normative output is Phase 4: delta specs in the change folder. The `_PM/`
document is the narrative behind them, not a substitute for them.

## Specification Phases

### Phase 0: Setup

1. **CREATE** specification document: `_PM/[feature-name]_Feature_Specification.md`
2. **READ** relevant technical implementation documents
3. **IDENTIFY** all user touchpoints and business logic flows
4. Output: `SPECIFICATION INITIALIZED`

### Phase 1: Discovery & Analysis

#### Mandatory Discovery Process

1. **Map User Journey**
   - Entry points to feature
   - Decision points and user choices
   - Success and failure paths
   - Exit conditions

2. **Extract Business Logic**
   - Core rules and constraints
   - State transitions
   - Value exchanges

3. **Identify Dependencies**
   - Upstream features required
   - Downstream features affected
   - External system integrations

4. **Flag Concerns** (NEVER ASSUME - ASK)
   - Unclear technical implementations
   - User experience friction points
   - Logic gaps or contradictions
   - Missing metrics/success criteria

### Phase 2: Specification Development

#### Document Structure

##### Executive Summary
- Problem being solved
- User value proposition
- Business value proposition

##### Status Tracker
```
### Implementation Status
- **Resolved**: [Confirmed and clear elements]
- **Pending Discussion**: [Items needing Product Owner input]
- **Unclear**: [Technical ambiguities requiring clarification]
- **Blocked**: [Dependencies preventing progress]
```

##### User Stories
```
AS A [user type]
I WANT TO [action/goal]
SO THAT [benefit/value]

ACCEPTANCE CRITERIA:
- [ ] Criterion 1
- [ ] Criterion 2
```

##### Business Logic Flow
- State diagrams for complex flows
- Decision trees for user choices
- Sequence diagrams for multi-actor interactions
- **NO CODE** - Only logical representations

##### User Journey Maps
```
[Entry] → [Action 1] → [Decision Point] → [Outcome A/B]
```

##### Success Metrics
- **Adoption**: Feature uptake measurement
- **Engagement**: User interaction metrics
- **Business**: Revenue/value metrics
- **Quality**: Error rates, support tickets

##### Risk Assessment

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| [Risk] | H/M/L | H/M/L | [Strategy] | [Who] |

##### Decision Log

| Date | Decision | Rationale | Decided By | Impact |
|------|----------|-----------|------------|--------|
| [Date] | [What] | [Why] | [Who] | [Changes] |

### Phase 3: Validation

#### Collaboration Checkpoints

1. **Technical Feasibility Review**
   - [ ] Engineering confirms implementation approach
   - [ ] No architectural conflicts identified
   - [ ] Performance requirements achievable

2. **Business Alignment Review**
   - [ ] Product Owner approves user value
   - [ ] Business metrics defined
   - [ ] Go-to-market strategy clear

3. **User Experience Review**
   - [ ] User flows are intuitive
   - [ ] Error states handled gracefully
   - [ ] Accessibility requirements met

### Phase 4: Convert to Delta Specs

The `_PM/` document is prose. The pipeline runs on requirements. Convert.

Read `.claude/references/spec-format.md` first, then:

1. **Create or select the change**: `openspec/changes/<change-id>/`
   (via `/propose`, or by hand with a `.openspec.yaml` declaring the track).
2. **Map each acceptance criterion to a requirement**:

   | `_PM/` element | Becomes |
   |---|---|
   | User story acceptance criterion | `### Requirement:` with a SHALL/MUST statement |
   | Success path in a journey map | `#### Scenario:` (happy path) |
   | Failure path / error state | `#### Scenario:` (the one that matters most) |
   | State transition | A requirement per transition rule, scenarios per edge |
   | Business rule | A requirement — this is the contract |
   | Success metric | **Not** a requirement unless the system must enforce it |

3. **Write one delta file per capability**, choosing ADDED / MODIFIED /
   REMOVED against the current `openspec/specs/<capability>/spec.md`. Read the
   existing spec before writing a MODIFIED.
4. **Validate**: `python3 .claude/tools/openspec.py validate <change-id>`

What does **not** cross over: metrics, risk tables, go-to-market, decision
history. Those stay in `_PM/`. A spec is a behavior contract; keep it one.

## Critical Rules

- **NEVER ASSUME** - Ask Product Owner when unclear
- **USER FIRST** - Every feature must map to user value
- **BUSINESS LOGIC ONLY** - No implementation details
- **LIVING DOCUMENT** - Update as decisions are made
- **TRACE DEPENDENCIES** - Map all connections

## Deliverable

Two artifacts:
1. `_PM/[feature-name]_Feature_Specification.md` — the narrative
2. Delta specs in `openspec/changes/<change-id>/specs/` — the contract

End specification with:
```
STATUS: [DRAFT | IN REVIEW | APPROVED | IMPLEMENTED]
```

End with: **SPECIFICATION COMPLETE ✓**
