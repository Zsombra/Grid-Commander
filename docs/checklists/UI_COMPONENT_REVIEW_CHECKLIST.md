# Grid-Commander UI Component Review Checklist

**Version**: 2.0.0
**Last Updated**: 2026-08-14
**Based On**: Clean Architecture + React 19 / Next.js 15 App Router (Server
Components) + Tailwind with `system.json` design tokens + shared control-class
constants. No shadcn/ui, no Zustand, no custom hooks — by design; see
[Deliberately Absent](#deliberately-absent).
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
2. [Deliberately Absent](#deliberately-absent)
3. [Tailwind](#tailwind-checklist)
4. [Consequence & Confirmation](#consequence--confirmation-checklist)
5. [Accessibility & Semantics](#accessibility--semantics-checklist)
6. [Responsive Layout](#responsive-layout-checklist)
7. [State & Interaction](#state--interaction-checklist)
8. [Common Anti-Patterns](#common-anti-patterns)

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
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;
  const { roster } = await app.listAgents.execute(user.authority);
  return <AgentRoster roster={roster} />;
}

// src/presentation/components/agent-roster.tsx
export interface AgentRosterProps {
  roster: RosterResult;
}

export function AgentRoster({ roster }: AgentRosterProps) {
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

## Deliberately Absent

This product has **no custom hooks, no `useEffect`, no client store, and no
component library**. Interactivity lives in a handful of small client
components (`PerformButton` and its siblings); everything else is a Server
Component, and state that matters lives on the server. These are decisions,
not omissions — a checklist that governed machinery this product does not have
taught its readers to skim, and a skimmed standard is how item 4 below sat
false for a month (#229, #233).

| # | Check | Status |
|---|-------|--------|
| 1 | **Introducing a custom hook, a client store, or a component library requires regenerating this checklist first** — checklist-generator in UPDATE mode, before the PR that adds the dependency | ☐ |

Two rules from the removed sections were real and moved rather than died:
credentials in client state (now State & Interaction 7) and irreversible
actions confirming with their consequence (Consequence & Confirmation, which
always owned it).

---

## Tailwind Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Utility classes in the markup; no parallel stylesheet | ☐ |
| 2 | Design tokens from the theme, not arbitrary values (`p-4`, not `p-[17px]`; token classes like `rounded-gc-2`, `border-danger-default` come from `system.json`) | ☐ |
| 3 | Shared control classes come from the exported constants in `src/presentation/components/control.ts` — `className={BUTTON_X}` or a template interpolating exactly them, the spelling `tests/architecture/controls.test.ts` enforces. There is no `cn()` helper here, and hand-composing a control's classes makes the file an offender against that scan | ☐ |
| 4 | No inline `style` except for genuinely dynamic values | ☐ |
| 5 | Colour never the only carrier of meaning — see accessibility | ☐ |
| 6 | A change that unifies N class spellings into one ships, in the same diff, the scan that the spelling cannot recur — a deferred guard never arrives, and a file born beside the sweep drifts the day it is born (`condition-composer.tsx`, round three) | ☐ |

---

## Consequence & Confirmation Checklist

**This section is specific to Grid-Commander and is the reason the UI exists.**

| # | Check | Status |
|---|-------|--------|
| 1 | An action that modifies a BattleGrid account is visually distinct from one that reads | ☐ |
| 2 | A **destructive** action names what will change or be lost, in the confirmation itself | ☐ |
| 3 | Confirmation copy states the consequence, not the mechanism | ☐ |
| 4 | Blast radius — which agents a change reaches — is shown **before** the apply control | ☐ |
| 5 | Apply is unreachable until the diff has been rendered — by not rendering the control, never by styling it disabled (`system.json` principle 10) | ☐ |
| 6 | Compile and Apply are not styled as sibling buttons of equal weight | ☐ |
| 7 | An expired plan token produces a "recompiled, review again" state, not an error toast | ☐ |
| 8 | A revision conflict explains that the underlying state moved, and does not offer a one-click retry | ☐ |
| 9 | Nothing in the UI describes read scope as "read-only" or "view-only" | ☐ |

**Pattern**:
```tsx
// ✅ CORRECT — the consequence is the message, in the product's own idiom
<p role="alert" className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm">
  Rebinding <strong>{agent.displayName}</strong> to <strong>{strategy.name}</strong> replaces
  its context sources, signal rules, prose, and timeframe. This is not a merge — its current
  configuration is discarded and cannot be recovered from here.
</p>

// ❌ WRONG — describes the mechanism, not what the user loses
<p>This will call rebind_intelligence_agent with confirm: true. Continue?</p>
```

```tsx
// ✅ CORRECT — blast radius before the control, and the control exists only
// once there is a reviewed diff to apply. Gating by not rendering is the
// product's pattern; a rendered-but-disabled apply is forbidden twice over
// (item 5 here, principle 10 there).
{plan.boundAgents.length > 0 && (
  <p role="alert">
    {plan.boundAgents.length} agent(s) will change immediately:{' '}
    {plan.boundAgents.map((a) => a.displayName).join(', ')}
  </p>
)}
{hasReviewedDiff && <PerformButton label="Apply" pendingLabel="Applying…" />}
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
| 4 | A duplicate submit cannot produce a duplicate write. The guarantee is the mechanism behind the control, never the control: a single-use confirmation spent by one atomic `consume`; a per-form idempotency key deduped by the product's own ledger, returning the original outcome, and offered to the platform in the field its create tool declares (platform honour unmeasured — #238); or natural idempotence of the write. A control that stops accepting presses is a mitigation, not a guarantee, and must not be relied on alone | ☐ |
| 5 | No optimistic UI on any BattleGrid mutation | ☐ |
| 6 | Long operations show progress, not a frozen control | ☐ |
| 7 | **No token, plan token, or credential in any client-held state** — the client receives results, never authority | ☐ |

**Why 4 is written as an outcome**: the previous wording — "submit controls
disable while in flight" — prescribed one client-side mechanism this product
deliberately does not use (`perform-button.tsx` keeps focus on the pressed
control because that focus is the announcement channel; DT-0022, #229). The
outcome is guarded where it can actually hold: fourteen submits spend a
single-use confirmation, create carries a per-form idempotency key
(`tests/architecture/a-create-carries-a-dedupe-key.test.ts` for the plumbing,
`tests/agent/duplicate-create.test.ts` and the db idempotency suite for where
the key lands and what dedupes), fork is refused by the platform (measured
2026-08-14), restore and connect are idempotent by nature.

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
<button className={BUTTON_PRIMARY}>Compile</button>
<button className={BUTTON_PRIMARY}>Apply</button>
```
**Fix**: compile is the default action; apply renders only once a diff has been
reviewed, wears the destructive treatment, and confirms with its consequence.

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
**Fix**: a real `<button>` carrying a `control.ts` constant — focusable,
keyboard operable, announced as a button, and visible to the scan.

---

### ❌ Credential In Client State

```typescript
// WRONG — wherever the client holds state, authority must not be in it
const [accessToken, setAccessToken] = useState(props.accessToken);
```
**Fix**: tokens stay server-side. The client receives results, never authority.

---

## Review Output Template

```markdown
## UI Review: [ComponentName]

**File**: [path]
**Type**: [Server Component / Client Component]

### Checklist Results

| Category | Pass | Fail | N/A |
|----------|------|------|-----|
| Component Structure | X/7 | X/7 | - |
| Deliberately Absent | X/1 | X/1 | - |
| Tailwind | X/6 | X/6 | - |
| Consequence & Confirmation | X/9 | X/9 | - |
| Accessibility | X/9 | X/9 | - |
| Responsive | X/6 | X/6 | - |
| State & Interaction | X/7 | X/7 | - |

## Violations Found

1. [file:line] — [rule] — [what and why]

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
