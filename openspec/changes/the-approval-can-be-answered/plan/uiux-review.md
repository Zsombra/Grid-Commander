# UI/UX Review: The Approval Can Be Answered

**Status: PENDING EXECUTION EVIDENCE**

Slug: `the-approval-can-be-answered` · Checklist:
`docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md` · Base ref: `origin/main`

**UI scope: IN SCOPE.** A new approvals queue surface, two confirmations, and a
change to the connection step-up surface.

## Scope Summary

| Surface | Action | Note |
|---|---|---|
| Approvals queue | create | Lists decisions awaiting an answer; reachable from the agent pipeline |
| Cancel confirmation | create | Destructive per the platform's own annotation; commits no money |
| Accept confirmation | create | **Opens a position with real money** |
| Connection step-up | modify | Offers wager authority from the point of use |
| Trading mode selector | modify | Remove the "cannot yet accept or cancel" disclosure (spec REMOVED) |

## Consequence & Confirmation

The checklist calls this *"the reason the UI exists"*. It is the section that
matters most here.

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Answering is visually distinct from reading the queue | | ☐ |
| 2 | Cancel names what is lost — the proposal will not return on its own | | ☐ |
| 3 | Copy states the consequence, not the mechanism — never "this calls `accept_entry_decision`" | | ☐ |
| 4 | Blast radius shown **before** the control: coin, direction, the three levels, the proportion committed | | ☐ |
| 5 | **Gate by not rendering.** Accept is absent where cancel is unavailable; a confirmation control does not exist until the decision has been rendered. A rendered-but-disabled control is forbidden twice over (item 5 here, `system.json` principle 10) | | ☐ |
| 6 | Cancel and accept are **not** styled as equal-weight siblings — one declines, one spends | | ☐ |
| 7 | An expired decision produces a "it expired, here is the queue again" state, not an error toast | | ☐ |
| 8 | A refused binding explains what moved and offers **no one-click retry** | | ☐ |
| 9 | Nothing describes read scope as "read-only" or "view-only" — **check the step-up copy specifically** | | ☐ |

### Money wording

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | The accept confirmation says in plain words that a position opens with real money | | ☐ |
| 2 | **No currency amount is shown** (PE-2) — the platform computes none until accept time | | ☐ |
| 3 | Size is rendered as the proportion the platform sent | | ☐ |
| 4 | The wording does not imply the amount is knowable and merely omitted | | ☐ |

## Component Structure

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | No component fetches its own data | | ☐ |
| 2 | No client-side derivation of displayed values | | ☐ |
| 3 | No credential in client state | | ☐ |
| 4 | Empty queue and refused read are visually distinct states | | ☐ |

## Accessibility & Semantics

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Consequence copy carries an appropriate live role | | ☐ |
| 2 | Controls are buttons, never clickable divs | | ☐ |
| 3 | Remaining-time updates are announced without hijacking focus | | ☐ |
| 4 | Refusal messaging reaches assistive technology | | ☐ |

## Responsive & State

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Queue readable at mobile widths | | ☐ |
| 2 | Pending, refused, expired and empty states all designed | | ☐ |
| 3 | An answer in flight cannot be double-submitted | | ☐ |

## Design Handoff

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | `/surface` run for the new approvals surface after it is built | | ☐ |
| 2 | No raw colour or spacing values — tokens only | | ☐ |

## Violations Found

1. _[component — file:line — description]_

## Verdict

- [ ] Approved
- [ ] Changes requested
