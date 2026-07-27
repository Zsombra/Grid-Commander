# UI/UX Review: author-agents

Against `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md`.

## Scope

Six surfaces: roster, create form, agent detail/edit, action bar, rebind
confirmation, journal view. This is the first substantial UI in the product.

## Checklist Matrix

| Rule | Component | Evidence |
|---|---|---|
| Components do not fetch data | all | |
| Empty is distinguished from broken | roster | |
| Consequence stated before a destructive action | `rebind-confirm.tsx` | |
| No affordance for an impossible action | `agent-actions.tsx` | |
| Inherited configuration shown as inherited | agent detail | |
| Labelled controls; not colour-only | create form, confirmation | |
| Journal is visually distinct from the audit log | `journal-view.tsx` | |

## Copy Review

The rebind confirmation is the copy that matters most in this change. It must
say *replaced*, not *changed*, and must name what is being replaced.

| Surface | Requirement | Wording verdict |
|---|---|---|
| | | |

## Findings

## Status

PENDING EXECUTION EVIDENCE
