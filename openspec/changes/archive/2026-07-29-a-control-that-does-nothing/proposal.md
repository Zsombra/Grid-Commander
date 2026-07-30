# Proposal: A Control That Does Nothing

## Why

The create-agent form renders a **Position management** fieldset with a preset
select. A user opens it, chooses how their agent should trail stops and decay
positions, and submits. `app/(app)/agents/new/page.tsx:71` sends
`tradingConfig: null`.

The choice is discarded. Nothing says so. The agent is created with BattleGrid's
defaults, and the user believes they configured it.

**This is the same defect `close-the-reachability-gap` fixed, one level in.**
That change made every *form* reach its operation. This is a *control inside a
form* that reaches nothing — and the guard written then names this exact gap as
a known blind spot:

> **Known blind spot, stated rather than discovered (DL-106).** This checks that
> a form is bound to an action. It does not check that every control inside the
> form reaches that action's payload — `agent-form.tsx` renders a
> position-management select while the create action sends `tradingConfig: null`.

It was recorded and left. On a product whose stated value is showing what a
change will do before it does it, a control that silently drops what the user
set is the worst available outcome — worse than not offering it, because the
user leaves believing something that is not true.

## What Changes

- **The fieldset is removed from the create form.** Not offered is honest;
  offered and ignored is not. A user who cannot set position management at
  creation is strictly better off than one who thinks they did.
- **A guard closes DL-106.** Every named control inside a form bound to a Server
  Action must appear in a file that defines one. Written first, and run against
  the product as it stands to find the real scope rather than the assumed one.

## What the guard found

Four candidates, and **only one is a defect** — established rather than assumed:

| Control | Verdict |
|---|---|
| `positionManagementPreset` | **Never read.** The defect. |
| `plan` | Read via `compiledPlan(formData, 'plan')` — a project accessor the first probe did not know |
| `q` | A GET form; read from `searchParams` |
| `tagline` | A GET form; read from `searchParams` |

So the guard must understand that a GET form navigates and its values are
legitimately read from the query string, or it would report three false
positives forever and be turned off.

## Capabilities

**Modified**: `agent-authoring` — one ADDED requirement. The capability already
requires that fields are offered only from values the platform confirms; this
adds that a field offered must reach the operation it appears to configure.

## Out of Scope

- **Making position management settable.** It needs fourteen independently
  settable fields, not a preset dropdown —
  `a-preset-does-not-constrain-its-config` establishes that against the live
  server, and `agent-edit-form` is the feature that would build it. Wiring the
  preset alone is not available: `PositionManagementPreset` carries only
  `preset`, `label` and `description`, so this product does not hold the values
  a complete `tradingConfig` requires, and inventing them is the fabrication it
  refuses everywhere else.
- **The other fourteen fields' bounds.** Already mapped and unused; they become
  relevant when the editor is built.
