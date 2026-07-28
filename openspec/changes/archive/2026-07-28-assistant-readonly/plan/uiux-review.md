# UI/UX Review: assistant-readonly

Against `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md`.

## Scope

`assistant-answer.tsx`, the assistant route, and one column added to
`audit-list.tsx`.

## Checklist Matrix

| Rule | Where | Evidence |
|---|---|---|
| Components do not fetch | both | Server components taking decided values |
| Empty distinguished from broken | `assistant-answer.tsx` | `general`, `grounded`, `refused` render differently |
| **An answer carries its citation** | `assistant-answer.tsx:56` | A `<details>` listing every read, with failures marked |
| **A general answer says it is general** | `assistant-answer.tsx:29` | "I did not read anything from your account" — the claim the answer is *not* making |
| Incompleteness is an alert, not an omission | `assistant-answer.tsx:48` | `role="alert"`, naming what is missing |
| No confirmation anywhere | the route | Deliberate: nothing here can need one, which is the point of the capability |
| Labelled controls | the route | `<label htmlFor="q">` |
| The audit distinguishes actors | `audit-list.tsx` | A "Caused by" column reading "you" or "the assistant, answering you" |

## Copy Review

| Surface | Requirement | Verdict |
|---|---|---|
| Page intro | States the limit up front | PASS — "I cannot change anything" before the input |
| General answer | Not a claim about the account | PASS — says so explicitly rather than leaving it inferable |
| Incomplete answer | Unknown, not absent | PASS — "Treat anything that would have depended on it as unknown rather than absent" |
| Asked to act | Points somewhere useful | PASS — `CANNOT_CHANGE_ANYTHING` names the surfaces that can |
| Outside the account | Does not answer from elsewhere | PASS — "a guess that sounds like a reading is worse than no answer" |
| Not configured | Truthful, and still useful | PASS — says no model is configured, then says where the information is |

## Findings

**F-1 — the citation is collapsed by default.** A `<details>` rather than an
always-open list. The judgement: an answer with twelve reads above it is harder to
read, and the citation's job is to be *available* for checking rather than to
dominate. The count is visible without expanding, so its absence is noticeable.

**F-2 — no conversation history in the surface.** The port accepts `history` and
the route sends none; each question is independent. Multi-turn is a state problem
(where does a conversation live?) that this change does not need to solve to
deliver its requirements. Filed as `assistant-conversation-history`.

## Status

EVIDENCE RECORDED
