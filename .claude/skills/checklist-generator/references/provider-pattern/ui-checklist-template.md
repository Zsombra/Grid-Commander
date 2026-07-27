# {PROJECT_NAME} UI Component Review Checklist

**Version**: 1.0.0
**Last Updated**: {DATE}
**Based On**: {UI_LIBRARY} + {CSS_FRAMEWORK} + Accessibility-first + {FRONTEND_FRAMEWORK} best practices + {STATE_LIB} conventions

---

## Purpose

This document provides a standardized checklist for reviewing UI components to ensure consistency with project conventions, composition patterns, and accessibility compliance.

Use this checklist when:
- Creating or modifying components
- Reviewing pull requests that touch UI
- Auditing existing UI for consistency

**Mandatory architecture rule**:
- Components must be **dumb/presentational**
- Feature hooks own orchestration (data fetching, effects, derivations, action wiring)
- Complex shared state belongs in dedicated stores

**Lane ownership contract**:
- Component lane: rendering and UI events only
- Hook lane: data orchestration and view-model shaping
- Store lane: shared state lifecycle and mutation actions

---

## Table of Contents

1. [Component Structure Checklist](#component-structure-checklist)
2. [Hooks Design Checklist](#hooks-design-checklist)
<!-- CONDITIONAL: Include if user has state management library -->
3. [Store Design Checklist](#store-design-checklist)
<!-- END CONDITIONAL -->
4. [{UI_LIBRARY} Usage Checklist](#ui-library-usage-checklist)
5. [{CSS_FRAMEWORK} Checklist](#css-framework-checklist)
6. [Accessibility & Semantics Checklist](#accessibility--semantics-checklist)
7. [Responsive/Mobile Layout Checklist](#responsivemobile-layout-checklist)
8. [State & Interaction Checklist](#state--interaction-checklist)
9. [Common Anti-Patterns](#common-anti-patterns)
10. [Review Output Template](#review-output-template)
11. [Definition of Done](#definition-of-done)

---

## Component Structure Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Component is dumb/presentational: no direct API calls, business rules, or cross-feature orchestration | ☐ |
| 2 | Component is single-responsibility and clearly named | ☐ |
| 3 | Reusable components accept `className` (or equivalent styling prop) | ☐ |
| 4 | Class names merged properly (no manual string concatenation) | ☐ |
| 5 | No dead JSX branches or duplicated UI blocks | ☐ |
| 6 | Exports are clean and avoid circular dependencies | ☐ |

**Pattern**:
<!-- INSTRUCTION: Generate in user's FRONTEND_FRAMEWORK -->
```{LANGUAGE}
{COMPONENT_STRUCTURE_EXAMPLE}
```

---

## Hooks Design Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Hook is the feature view-model: composes query/store/helpers, returns render-ready data | ☐ |
| 2 | Hook follows framework's hook rules (no conditional hook calls) | ☐ |
| 3 | Hook naming and location follows project conventions | ☐ |
| 4 | Hook returns minimal API for dumb components | ☐ |
| 5 | Side effects use proper lifecycle hooks, not inline code | ☐ |
| 6 | Effect dependencies are precise and stable | ☐ |
| 7 | Async operations handle cancellation/unmount safety | ☐ |
| 8 | Independent async operations parallelized where possible | ☐ |
| 9 | Hook does not duplicate source-of-truth state from query/store | ☐ |
| 10 | Hook outputs pre-computed data (components don't duplicate logic) | ☐ |

**Pattern**:
<!-- INSTRUCTION: Generate hook example in user's framework -->
```{LANGUAGE}
{HOOK_VIEW_MODEL_EXAMPLE}
```

---

<!-- CONDITIONAL: Include only if user has state management library -->
## Store Design Checklist ({STATE_LIB})

| # | Check | Status |
|---|-------|--------|
| 1 | Complex cross-component state uses {STATE_LIB} store | ☐ |
| 2 | Store shape follows project conventions (State + Actions typing) | ☐ |
| 3 | Middleware follows established pattern | ☐ |
| 4 | Persisted stores define explicit persistence boundaries | ☐ |
| 5 | Store exports include hook plus selector surface | ☐ |
| 6 | Components subscribe via selectors (not full store) | ☐ |
| 7 | State mutation happens through declared actions only | ☐ |
| 8 | Derived state centralized in selectors/hooks, not duplicated | ☐ |
| 9 | Server-authoritative fields treated as authoritative (no conflicting client recomputation) | ☐ |
| 10 | No legacy/redundant store paths (single source of truth maintained) | ☐ |

**Pattern**:
<!-- INSTRUCTION: Generate store example in user's STATE_LIB -->
```{LANGUAGE}
{STORE_PATTERN_EXAMPLE}
```
<!-- END CONDITIONAL: State Management -->

---

## {UI_LIBRARY} Usage Checklist

<!-- INSTRUCTION: Adapt to user's UI library (shadcn, Material UI, Ant Design, custom, etc.) -->
<!-- If no UI library, generate rules for native HTML elements -->

| # | Check | Status |
|---|-------|--------|
| 1 | Uses existing {UI_LIBRARY} primitives before creating custom controls | ☐ |
| 2 | Interactive controls use {UI_LIBRARY} components (buttons, dropdowns, dialogs) | ☐ |
| 3 | Variant/size APIs used consistently before custom overrides | ☐ |
| 4 | No faux controls (div/span with click handlers where native element fits) | ☐ |
| 5 | Dialog/Modal/Drawer semantics preserved (title, description, close behavior) | ☐ |

---

## {CSS_FRAMEWORK} Checklist

<!-- INSTRUCTION: Adapt to user's CSS approach (Tailwind, CSS Modules, styled-components, etc.) -->

| # | Check | Status |
|---|-------|--------|
| 1 | Uses framework's standard approach consistently | ☐ |
| 2 | Avoids unnecessary one-off values | ☐ |
| 3 | Repeated style patterns extracted into reusable compositions | ☐ |
| 4 | Standard spacing/sizing scale used | ☐ |
| 5 | No conflicting style approaches (e.g., mixing Tailwind with inline styles) | ☐ |

---

## Accessibility & Semantics Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | All interactive elements are semantic (`button`, `a`, form controls) | ☐ |
| 2 | Icon-only controls have accessible labels (`aria-label` or equivalent) | ☐ |
| 3 | Keyboard navigation works (tab order, enter/space behavior) | ☐ |
| 4 | Focus-visible states are present and not removed | ☐ |
| 5 | External links use `target="_blank" rel="noopener noreferrer"` | ☐ |
| 6 | Images have alt text (decorative images use empty alt) | ☐ |
| 7 | Form fields have associated labels | ☐ |
| 8 | Color is not the only indicator of state (add icons/text) | ☐ |
| 9 | No debugging artifacts left in components (console.log, etc.) | ☐ |

---

## Responsive/Mobile Layout Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Flex/grid layouts are width-safe (no horizontal overflow) | ☐ |
| 2 | Shrinkable text regions have proper min-width handling | ☐ |
| 3 | Fixed-size elements don't cause layout shifts | ☐ |
| 4 | Long content has overflow/truncation handling | ☐ |
| 5 | Primary CTA remains visible and reachable on mobile (including when virtual keyboard is open) | ☐ |
| 6 | Scrollable content in overlays/modals (content doesn't clip when viewport shrinks) | ☐ |
| 7 | Modal/overlay max-height accounts for dynamic viewport (virtual keyboard, browser chrome) | ☐ |
| 8 | Scroll containment on overlay content (no scroll-through to page body) | ☐ |
| 9 | Fixed headers in scrollable overlays remain visible while content scrolls | ☐ |
| 10 | Form inputs in overlays handle keyboard appearance (content remains accessible) | ☐ |

**Mobile keyboard testing rule (Critical)**:
- Any component containing form inputs inside a modal, drawer, or overlay MUST be tested with the virtual keyboard open on mobile
- If the CTA or form action is not reachable while the keyboard is visible, this is a Critical severity violation

---

## State & Interaction Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Loading/disabled/error states are explicitly represented | ☐ |
| 2 | Buttons prevent duplicate submits during async operations | ☐ |
| 3 | Interaction handlers are stable and not duplicated across branches | ☐ |
| 4 | Conditional rendering does not hide required user actions unexpectedly | ☐ |
| 5 | Empty and skeleton states use consistent patterns | ☐ |
| 6 | Component-level state remains UI-local; shared complexity delegated to hooks/stores | ☐ |

---

## Common Anti-Patterns

<!-- INSTRUCTION: Generate anti-patterns specific to user's framework and libraries -->

1. Using raw HTML where {UI_LIBRARY} component is available
2. Clickable non-semantic elements (div/span with click handler instead of button)
3. Hard-coded one-off style values repeated across components
4. Mobile overflow due to missing width/overflow handling
5. Hidden CTA due to modal/overlay height stacking
6. Component fetches data directly instead of using hook/view-model
7. Components orchestrate multiple stores/queries instead of delegating to feature hooks
8. Full-store subscriptions for simple reads instead of selectors
9. Persisting ephemeral state without explicit requirement
10. Duplicated derived state across component, hook, and store
<!-- CONDITIONAL: Add framework-specific anti-patterns -->

---

## Review Output Template

```markdown
# UI Review Summary

Scope: [components reviewed]
Compliance: [PASS / VIOLATIONS FOUND]

## Violations Found

| File | Line | Severity | Issue | Fix |
|------|------|----------|-------|-----|
| ...  | ...  | Critical/Major/Minor | ... | ... |

## Hook & Store Architecture Findings
- ...

## Accessibility & Semantics Findings
- ...

## Prioritized Recommendations
1. [Critical]
2. [Major]
3. [Minor]

**UI REVIEW COMPLETE**
```

---

## Definition of Done (UI Review)

A review is complete only when:
- All components in scope are dumb/presentational
- Hook/store architecture checks pass (or deviations explicitly accepted)
- All critical accessibility/semantic issues resolved or accepted
- All major {UI_LIBRARY}/{CSS_FRAMEWORK} pattern violations resolved or tracked
- Final report includes concrete fixes with file/line references

---

**Document Maintainer**: {TEAM_OR_USER}
**Review Cycle**: Quarterly or on major pattern changes
