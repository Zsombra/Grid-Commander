# UI/UX Review: author-agents

Against `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md`.

## Scope

Four components: `agent-roster.tsx`, `agent-actions.tsx`, `agent-form.tsx`,
`rebind-confirm.tsx`, plus `journal-view.tsx`. All are server components taking
decided values as props.

**Not delivered: routes.** Nothing renders these yet — the product has no
session, so no request can supply `{ userId, accessToken }`. See architecture
review F-4 and backlog `no-composition-root` (P1). The components are complete
and their logic is covered; the wiring is a separate, larger gap.

## Checklist Matrix

| Rule | Component | Evidence |
|---|---|---|
| Components do not fetch data | all five | No `fetch`, no `useEffect`, no client directive in any of them |
| Empty is distinguished from broken | `agent-roster.tsx:22,42` | `unreadable` renders an alert saying the agents are not gone; `empty` renders the invitation. Two branches, not one `length === 0` |
| Consequence stated before a destructive action | `rebind-confirm.tsx:26` | The consequence is passed in — the same string the token was issued against — and rendered above the control |
| The confirm control names the consequence | `rebind-confirm.tsx:37` | "Replace Volatilis's configuration with Momentum Breakout's", not "Confirm". A button reading OK agrees to nothing in particular |
| The cancel path is also named | `rebind-confirm.tsx:40` | "Keep it bound to X" — the safe option states what it preserves |
| No affordance for an impossible action | `agent-actions.tsx` | No delete action; the file says why. `boundaries.test.ts::AL-2` enforces it |
| Affordances gated by platform permission | `agent-actions.tsx:16-30` | Each action is behind `isEditable` / `isRebindable` / `isArchivable`, which read `capabilities` |
| A locked agent explains itself | `agent-actions.tsx:44` | "BattleGrid does not permit Grid-Commander to change this agent" rather than silently missing buttons |
| Inherited configuration shown as inherited | `agent-roster.tsx:53` | "Bound to X at revision N"; the form offers no strategy-owned field at all |
| Labelled controls | `agent-form.tsx:118` | Every input has a `<label htmlFor>`; `Field` makes the label structural rather than optional |
| Errors are not colour-only | `agent-form.tsx:127` | `role="alert"` and the reason in text; no colour carries meaning |
| Capacity explained before the form | `agent-roster.tsx:71` | The at-capacity notice replaces the create link, with the rank that governs the limit |
| Journal distinct from the audit log | `journal-view.tsx:29` | Headed as the agent's record, with an explicit link to the audit log for the other question |

## Copy Review

The rebind confirmation is the copy that matters most in this change.

| Surface | Requirement | Wording verdict |
|---|---|---|
| Rebind confirmation | Says *replaced*, names what | PASS — `describeRebind` names the agent, both strategies, and lists context sources / signal rules / prose / timeframe. `tests/agent/rebind.test.ts::names_the_replacement` asserts each |
| Rebind confirmation | Does not undersell it | PASS — the test rejects "simply change" / "just change" phrasing |
| Rebind confirmation | Says what survives | PASS — "name, brain and money limits are not affected". A warning that reads as total loss is its own kind of inaccurate |
| Archive | Reversible, not deletion | PASS — "this is not deletion"; `tests/agent/lifecycle.test.ts::never calls it deletion` |
| Deletion request | Honest about the limit | PASS — `DELETION_UNAVAILABLE` says Grid-Commander cannot, says where it can be done, and offers archiving as the *reversible alternative* rather than as the answer |
| Unreadable roster | Does not imply data loss | PASS — "This does not mean your agents are gone" |
| At capacity | Actionable, not just refusing | PASS — names the rank and the limit, and says archiving frees a slot |

## Findings

**F-1 — the confirm button is a sentence, not a word.** Unusual, and deliberate.
The one thing a user must not be able to do is agree to a replacement they read
as a change. The button carries the verb.

**F-2 — the components are untested as components.** Their behaviour is covered
through the use cases and domain (the three roster states, the consequence
wording, the affordance gating are all asserted), but nothing renders them. No
test framework for components is set up, and adding one for four presentational
files with no branching logic beyond what is already covered would be ceremony.
Revisit when routes land and there is something to render.

## Status

EVIDENCE RECORDED
