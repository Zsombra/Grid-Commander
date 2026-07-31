# Grid-Commander UI Component Review Checklist

**Version**: 1.0.0
**Last Updated**: 2026-07-27
**Based On**: Clean Architecture + React / Next.js App Router + shadcn/ui + Tailwind + Zustand
**Companion To**: `ARCHITECTURE_REVIEW_CHECKLIST.md`, `DATA_PIPELINE_REVIEW_CHECKLIST.md`

---

## Purpose

Standards for every client-side component. Use when building a screen,
reviewing a UI pull request, or auditing an existing surface.

**The rule that shapes this product's UI**: Grid-Commander presents actions that
change other people's trading agents. Several of them are irreversible. The
interface's job is not only to be usable — it is to make the consequence visible
before the click.

---

## Table of Contents

1. [Component Structure](#component-structure-checklist)
2. [Hooks Design](#hooks-design-checklist)
3. [Store Design (Zustand)](#store-design-checklist-zustand)
4. [shadcn/ui Usage](#shadcnui-usage-checklist)
5. [Tailwind](#tailwind-checklist)
6. [Consequence & Confirmation](#consequence--confirmation-checklist)
7. [Accessibility & Semantics](#accessibility--semantics-checklist)
8. [Responsive Layout](#responsive-layout-checklist)
9. [State & Interaction](#state--interaction-checklist)
10. [Common Anti-Patterns](#common-anti-patterns)

---

## Component Structure Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Server Component by default; `'use client'` only where interactivity requires it | ☐ |
| 2 | One component per file, named in `PascalCase`, file in `kebab-case.tsx` | ☐ |
| 3 | Presentational components take data via props and render it | ☐ |
| 4 | **No data fetching inside a presentational component** | ☐ |
| 5 | No business logic — see the Iron Rule in the pipeline checklist | ☐ |
| 6 | Props typed with an exported interface, no `any` | ☐ |
| 7 | Component under ~200 lines, or split | ☐ |

**Pattern**:
```tsx
// ✅ CORRECT — server component fetches, presentational component renders
// app/(app)/agents/page.tsx
export default async function AgentsPage() {
  const data = await container.listAgents.execute({ userId: await requireUserId() });
  return <AgentRoster agents={data.agents} snapshotAgeSeconds={data.snapshotAgeSeconds} isStale={data.isStale} />;
}

// src/presentation/components/agent-roster.tsx
export interface AgentRosterProps {
  agents: AgentSummary[];
  snapshotAgeSeconds: number;
  isStale: boolean;
}

export function AgentRoster({ agents, snapshotAgeSeconds, isStale }: AgentRosterProps) {
  return ( /* renders only */ );
}
```

```tsx
// ❌ WRONG — component fetches its own data and derives its own state
export function AgentRoster() {
  const [agents, setAgents] = useState([]);
  useEffect(() => { fetch('/api/agents').then(r => r.json()).then(setAgents); }, []);
  const healthy = agents.filter(a => a.winRate > 50).length;   // also an Iron Rule violation
}
```

---

## Hooks Design Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Custom hooks live in `src/presentation/hooks/`, named `use*` | ☐ |
| 2 | A hook orchestrates state and effects; it does not compute business values | ☐ |
| 3 | Every effect declares a complete dependency array | ☐ |
| 4 | Every effect that subscribes also cleans up | ☐ |
| 5 | No `??` default applied to a server-provided field | ☐ |

---

## Store Design Checklist (Zustand)

| # | Check | Status |
|---|-------|--------|
| 1 | Stores live in `src/presentation/stores/`, one per domain area | ☐ |
| 2 | Store holds server data and UI state; it does not derive business values | ☐ |
| 3 | Selectors read fields; they do not aggregate or calculate | ☐ |
| 4 | Actions are named for intent (`beginReview`, not `setStep`) | ☐ |
| 5 | Cached data is invalidated after a successful mutation | ☐ |
| 6 | **No token, plan token, or credential is ever put in a client store** | ☐ |

**Pattern**:
```typescript
// ✅ CORRECT — multi-step authoring state, which genuinely belongs on the client
interface StrategyAuthoringState {
  step: 'editing' | 'compiling' | 'reviewing' | 'applying';
  draft: StrategyDraft | null;
  compiled: CompiledPlan | null;      // what the server returned, unmodified
  beginReview: (compiled: CompiledPlan) => void;
  reset: () => void;
}

// ❌ WRONG — deriving, and holding a credential
interface BadState {
  planToken: string;                                   // never on the client
  isViable: boolean;                                   // the server said this already
  affectedAgentCount: number;                          // and this
}
```

---

## shadcn/ui Usage Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Component added via the CLI into `src/presentation/components/ui/` | ☐ |
| 2 | Local modifications to a generated component are commented with a reason | ☐ |
| 3 | Variants extended through `cva`, not by forking the component | ☐ |
| 4 | Destructive actions use the `destructive` variant, consistently | ☐ |
| 5 | `AlertDialog` — not `Dialog` — for anything irreversible | ☐ |

---

## Tailwind Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Utility classes in the markup; no parallel stylesheet | ☐ |
| 2 | Design tokens from the theme, not arbitrary values (`p-4`, not `p-[17px]`) | ☐ |
| 3 | Conditional classes composed with `cn()`, not string concatenation | ☐ |
| 4 | No inline `style` except for genuinely dynamic values | ☐ |
| 5 | Colour never the only carrier of meaning — see accessibility | ☐ |

---

## Consequence & Confirmation Checklist

**This section is specific to Grid-Commander and is the reason the UI exists.**

| # | Check | Status |
|---|-------|--------|
| 1 | An action that modifies a BattleGrid account is visually distinct from one that reads | ☐ |
| 2 | A **destructive** action names what will change or be lost, in the confirmation itself | ☐ |
| 3 | Confirmation copy states the consequence, not the mechanism | ☐ |
| 4 | Blast radius — which agents a change reaches — is shown **before** the apply control | ☐ |
| 5 | Apply is unreachable until the diff has been rendered | ☐ |
| 6 | Compile and Apply are not styled as sibling buttons of equal weight | ☐ |
| 7 | An expired plan token produces a "recompiled, review again" state, not an error toast | ☐ |
| 8 | A revision conflict explains that the underlying state moved, and does not offer a one-click retry | ☐ |
| 9 | Nothing in the UI describes read scope as "read-only" or "view-only" | ☐ |

**Pattern**:
```tsx
// ✅ CORRECT — the consequence is the message
<AlertDialogDescription>
  Rebinding <strong>{agent.displayName}</strong> to <strong>{strategy.name}</strong> replaces
  its context sources, signal rules, prose, and timeframe. This is not a merge — its current
  configuration is discarded and cannot be recovered from here.
</AlertDialogDescription>

// ❌ WRONG — describes the mechanism, not what the user loses
<AlertDialogDescription>
  This will call rebind_intelligence_agent with confirm: true. Continue?
</AlertDialogDescription>
```

```tsx
// ✅ CORRECT — blast radius before the control
{plan.boundAgents.length > 0 && (
  <Alert>
    <AlertTitle>{plan.boundAgents.length} agent(s) will change immediately</AlertTitle>
    <AlertDescription>
      <ul>{plan.boundAgents.map(a => <li key={a.id}>{a.displayName}</li>)}</ul>
    </AlertDescription>
  </Alert>
)}
<ApplyButton disabled={!hasReviewedDiff} />
```

---

## Accessibility & Semantics Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Semantic elements — `button`, `nav`, `main`, `ul` — not clickable `div`s | ☐ |
| 2 | Every interactive element is keyboard reachable and has a visible focus ring | ☐ |
| 3 | Every form control has an associated `<label>` | ☐ |
| 4 | Icon-only buttons carry an `aria-label` | ☐ |
| 5 | Colour is never the sole signal — pair it with text or an icon | ☐ |
| 6 | Text contrast meets WCAG AA (4.5:1 body, 3:1 large) | ☐ |
| 7 | Dialogs trap focus and restore it on close | ☐ |
| 8 | Async results announced via a live region | ☐ |
| 9 | Destructive confirmations are not dismissible by a stray Escape without an explicit cancel path | ☐ |

**Why 5 matters here**: a red badge is how this product signals "destructive". A
user who cannot distinguish red from grey must still be able to tell an archive
from a refresh.

---

## Responsive Layout Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Mobile-first — base styles unprefixed, breakpoints layered on | ☐ |
| 2 | No fixed pixel widths on containers | ☐ |
| 3 | Tap targets at least 44×44px | ☐ |
| 4 | Wide content — diffs, scorecards, tables — scrolls in its own container | ☐ |
| 5 | The page body never scrolls horizontally | ☐ |
| 6 | Diff views remain legible at narrow widths, or degrade to a stacked form | ☐ |

---

## State & Interaction Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Loading, empty, and error states exist for every data-backed view | ☐ |
| 2 | Empty states say what to do next, not just "no data" | ☐ |
| 3 | Errors are actionable — what happened, what to do | ☐ |
| 4 | Submit controls disable while in flight | ☐ |
| 5 | No optimistic UI on any BattleGrid mutation | ☐ |
| 6 | Long operations show progress, not a frozen control | ☐ |

**Why 5**: optimistic UI shows a change as done before the server agrees.
With `expectedRevision` conflicts and a five-minute plan token, "done" is a claim
this client is not in a position to make.

---

## Common Anti-Patterns

### ❌ Component Fetching Its Own Data

```tsx
// WRONG
export function StrategyList() {
  const [items, setItems] = useState([]);
  useEffect(() => { fetch('/api/strategies').then(r => r.json()).then(setItems); }, []);
}
```
**Fix**: fetch in the server component, pass as props.

---

### ❌ Client-Side Derivation

```tsx
// WRONG
<span>{(agent.wins / agent.total * 100).toFixed(1)}% win rate</span>
```
**Fix**: the use case ships `agent.winRatePct`.

---

### ❌ Equal-Weight Compile And Apply

```tsx
// WRONG — two identical buttons, one of which is irreversible
<Button onClick={compile}>Compile</Button>
<Button onClick={apply}>Apply</Button>
```
**Fix**: compile is the default action; apply is destructive-variant, gated on a
rendered diff, and confirms with its consequence.

---

### ❌ Mechanism In The Confirmation

```tsx
// WRONG
<p>Call archive_strategy with confirm: true?</p>
```
**Fix**: say what the user loses and whether it can be undone.

---

### ❌ Clickable Div

```tsx
// WRONG
<div onClick={handleApply} className="cursor-pointer">Apply</div>
```
**Fix**: `<Button onClick={handleApply}>Apply</Button>` — focusable, keyboard
operable, announced as a button.

---

### ❌ Credential In Client State

```typescript
// WRONG
useAuthStore.setState({ accessToken, planToken });
```
**Fix**: tokens stay server-side. The client receives results, never authority.

---

## Review Output Template

```markdown
## UI Review: [ComponentName]

**File**: [path]
**Type**: [Server Component / Client Component / Hook / Store]

### Checklist Results

| Category | Pass | Fail | N/A |
|----------|------|------|-----|
| Component Structure | X/7 | X/7 | - |
| Hooks | X/5 | X/5 | - |
| Store | X/6 | X/6 | - |
| shadcn/ui | X/5 | X/5 | - |
| Tailwind | X/5 | X/5 | - |
| Consequence & Confirmation | X/9 | X/9 | - |
| Accessibility | X/9 | X/9 | - |
| Responsive | X/6 | X/6 | - |
| State & Interaction | X/6 | X/6 | - |

## Violations Found

1. [file:line] — [rule] — [what and why]

## Hook & Store Architecture Findings

- [finding]

## Accessibility & Semantics Findings

- [finding]

## Prioritized Recommendations

1. [highest impact first]

### Verdict

- [ ] Approved
- [ ] Approved with minor changes
- [ ] Changes requested
```

---

## Definition of Done (UI Review)

A UI change is done when:

- [ ] Every checklist category above has been walked, not skimmed
- [ ] Loading, empty, and error states exist and were viewed
- [ ] Keyboard-only navigation reaches every control
- [ ] Every destructive action names its consequence before it happens
- [ ] Blast radius is visible before any apply control
- [ ] No value on screen was computed by the client
- [ ] `npm run typecheck` and `npm run lint` pass

---

**Document Maintainer**: Grid-Commander maintainers
**Review Cycle**: Quarterly, or when a new destructive action reaches the UI
