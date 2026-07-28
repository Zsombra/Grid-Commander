# UI/UX Review: author-strategies

Against `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md`.

## Scope

Two components — `strategy-list.tsx`, `plan-review.tsx` — and two routes.

## Checklist Matrix

| Rule | Where | Evidence |
|---|---|---|
| Components do not fetch | both | Server components taking decided values |
| Empty distinguished from broken | `strategy-list.tsx` | `unreadable` renders an alert saying the strategies are not gone |
| **Consequence before a destructive action** | `plan-review.tsx` | The review *is* the consequence, and applying does not exist outside it |
| **Compile and apply are not two buttons** | route + component | Compiling is a `GET` form producing a review; applying is a `POST` on that review. `structure.test.ts` holds the code-level half |
| The confirm control names the consequence | `plan-review.tsx:78` | "Apply this — reconfigures 5 agents now", not "Apply" |
| The cancel path is named | `plan-review.tsx:85` | "Go back and change it" |
| The blast radius is not folded into prose | `plan-review.tsx:BlastRadius` | Its own `role="alert"` block, bolded, above everything |
| Advisory findings read as advisory | `plan-review.tsx:52` | "These do not prevent the change" precedes the list |
| No affordance for an impossible action | `strategy-list.tsx` | SYSTEM strategies offer "Make my own copy to edit", never "Edit" |
| No form without a vocabulary | `edit/page.tsx` | An unreadable vocabulary explains itself rather than rendering a form certain to fail |
| Labelled controls, errors not colour-only | both | `<label htmlFor>`; `role="alert"` with text |

## Copy Review

| Surface | Requirement | Verdict |
|---|---|---|
| Review heading | Compiling changed nothing | PASS — "Nothing has changed yet", then why |
| Blast radius, 0 | Stated as plainly as a large number | PASS — "No agents are bound to this strategy." |
| Blast radius, 5 | Names the immediacy | PASS — "will all be reconfigured immediately", plus the open-positions caveat |
| Apply button | Names what it does | PASS — carries the agent count |
| Concerns | Advisory, not blockers | PASS — "These do not prevent the change" |
| Unviable | Says what to do | PASS — "Adjust the change and compile again" |
| Expired plan | Explains the five minutes | PASS — `describeRefusal` says why the window exists |
| REPAIR_REQUIRED | Not "failed" | PASS — asserted in `lifecycle.test.ts` |

## Findings

**F-1 — the editor composes one field.** Tagline only. The pipeline beneath it is
complete; the section editor is out of scope by declaration and filed as
`strategy-section-editor`. Stated rather than ticked.

**F-2 — components remain untested as components.** Same position as
`author-agents`: their behaviour is covered through the use cases and domain, and
no component test framework is set up. The one thing a component test would add
here — that the blast radius renders above the apply control — is worth having
once there is a reason to add the framework.

## Status

EVIDENCE RECORDED
