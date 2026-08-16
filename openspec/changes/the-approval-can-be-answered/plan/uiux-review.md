# UI/UX Review: The Approval Can Be Answered

**Status: EXECUTION EVIDENCE RECORDED — one row deferred with the change's own gate**

Slug: `the-approval-can-be-answered` · Checklist:
`docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md` · Base ref: `origin/main`

**UI scope: IN SCOPE.** A new approvals queue surface, one confirmation, a new
step-up surface, and a change to the trading mode selector.

## Scope Summary

| Surface | Action | Note |
|---|---|---|
| Approvals queue | **created** | `/approvals` — account-wide, one read per agent, partial failure carried |
| Cancel confirmation | **created** | `/approvals/[agentId]/[id]` — destructive per the platform's annotation; commits no money |
| Accept confirmation | **NOT BUILT — held by the Phase D gate** | DL-11; no surface reaches accept, and a test asserts it |
| Connection step-up | **created** | `/approvals/authority` — offers wager authority from the point of use |
| Trading mode selector | **modified** | Disclosure retired; links to the queue (spec REMOVED requirement) |

## Consequence & Confirmation

The checklist calls this *"the reason the UI exists"*. It is the section that
matters most here.

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Answering is visually distinct from reading the queue | The queue offers **no control at all** — one link per row to the page that describes answering (`approval-queue.tsx:112-116`). The only submit in the feature is on the decision page, under the consequence block | ☑ |
| 2 | Cancel names what is lost — the proposal will not return on its own | `describe-decision-answer.query.ts` composes *"The agent will not propose this trade again on its own"* into the stored consequence; asserted in `approval-queue.test.ts` ("states the coin, the direction, and that the proposal will not return") | ☑ |
| 3 | Copy states the consequence, not the mechanism | No tool name appears in `src/` or `app/` outside the adapter — `wager.test.ts` A10 enforces it structurally. The consequence names the coin, direction and what moves | ☑ |
| 4 | Blast radius shown **before** the control: coin, direction, the three levels, the proportion committed | Decision page renders the `<dl>` of entry/stop/target/conviction, then the proportion sentence, then the reasoning, and only then `<CancelForm>` | ☑ |
| 5 | **Gate by not rendering.** Accept absent where cancel is unavailable; a rendered-but-disabled control is forbidden twice over | Without authority the page renders `<StepUpBlock>` and no control; with it, `<CancelForm>`. `tests/rendering/approvals.test.ts` asserts no accept control on **either** branch and that the string `disabled` does not appear | ☑ |
| 6 | Cancel and accept are **not** styled as equal-weight siblings | Vacuously satisfied and asserted: accept is not rendered anywhere. The sentence naming battlegrid.trade stands in its place, so its absence is explained rather than merely missing | ☑ |
| 7 | An expired decision produces a "it expired, here is the queue again" state, not an error toast | `<ExpiredNotice>` replaces the whole answer section, with the back-link in the Shell. Asserted: *"reports a decision that expired first as expired, not as a cancel"* | ☑ |
| 8 | A refused binding explains what moved and offers **no one-click retry** | `explainAnswerRefusal` names the moved level from-value and to-value; the refusal redirects to a **freshly described** decision. No retry control exists on any branch | ☑ |
| 9 | Nothing describes read scope as "read-only" or "view-only" — check the step-up copy specifically | The step-up says the connection *"connects without authority to commit your funds"* — an accurate statement about wager scope, never about read scope. `consent-summary.tsx` was corrected in the same pass (DL-16) and `tests/connection/consent.test.ts` still fails on softening | ☑ |

### Money wording

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | The accept confirmation says in plain words that a position opens with real money | **Deferred with the gate.** The sentence is written and tested — `describeAnswer('accept', …)` produces *"Opens a real position … This spends your money at BattleGrid immediately"*, asserted in `approval-queue.test.ts` — but no surface renders it, by design (DL-11) | ◐ |
| 2 | **No currency amount is shown** (PE-2) | `approval-queue.test.ts` scans all five files on this path for `toLocaleString(`, `Intl.NumberFormat`, `style: 'currency'` and the money-shaped budget fields; `approvals.test.ts` asserts no currency figure reaches the rendered page | ☑ |
| 3 | Size is rendered as the proportion the platform sent | *"Would stake 10% of the agent's available funds (SMALL)"* on both the queue card and the decision page, from `positionSizePct` unmodified | ☑ |
| 4 | The wording does not imply the amount is knowable and merely omitted | Both surfaces finish the sentence: *"BattleGrid sets the actual size when the trade is accepted."* That is why it is absent, said rather than left to inference | ☑ |

## Component Structure

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | No component fetches its own data | Every read happens in the page's server component and is passed down; `ApprovalQueue`, `CancelForm`, `StepUpBlock`, `ExpiredNotice` and `Remaining` are pure props | ☑ |
| 2 | No client-side derivation of displayed values | `msRemaining` is derived server-side in the query; the component formats it and is forbidden from touching `expiresAt` (constraint recorded on the manifest). No other displayed value is computed in a component | ☑ |
| 3 | No credential in client state | The only client component reachable here is `PerformButton` (`useFormStatus`). Hidden inputs carry the decision id, agent id, the three levels and the confirmation token — no access token, no scopes | ☑ |
| 4 | Empty queue and refused read are visually distinct states | Distinct result kinds (`none` / `unreadable` / `no-agents`) with distinct renderings, and the empty heading stays **qualified** when any agent went unread. Asserted in `approvals.test.ts` — the component was corrected mid-session when the test caught it saying "Nothing is waiting" over a failed read | ☑ |

## Accessibility & Semantics

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Consequence copy carries an appropriate live role | Problem banner `role="alert"` (shared `CarriedProblem`), unreachable-agents block `role="alert"`, success note `role="status"`. The consequence block itself is static content the operator reads before acting, so it takes no live role — the same treatment every other confirmation in this product uses | ☑ |
| 2 | Controls are buttons, never clickable divs | One `<PerformButton>` per form (a real `<button>`); every other affordance is an `<a>` performing navigation only | ☑ |
| 3 | Remaining-time updates are announced without hijacking focus | **Not applicable as built, deliberately.** The remaining time does not update — it is rendered at request time and does not tick. The operator asked for no polling watch, so there is no live region to announce. Recorded as a constraint on the queue manifest: a design implying a live countdown would be claiming behavior the page does not have | N/A |
| 4 | Refusal messaging reaches assistive technology | `CarriedProblem` is `role="alert"` and is mounted on every post-connection branch of the decision page; `tests/agent/refusals-reach-the-operator.test.ts` asserts one mount per `<main>` | ☑ |

## Responsive & State

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Queue readable at mobile widths | `max-w-3xl` column, `p-6`; the levels `<dl>` is `grid-cols-2` rising to `sm:grid-cols-4`; the decision header uses `flex-wrap` so the coin and the remaining time stack rather than collide. Both viewports declared on the manifests | ☑ |
| 2 | Pending, refused, expired and empty states all designed | Nine states on the queue container and eight on the decision container, all enumerated on the manifests and all reachable in `approvals.test.ts` | ☑ |
| 3 | An answer in flight cannot be double-submitted | `PerformButton` reports the in-flight submit; the confirmation is **single-use** at the store (`consume`), so a second submit refuses as `already-used` and lands on the decision page with that reason rather than answering twice | ☑ |

## Design Handoff

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | `/surface` run for the new approvals surface after it is built | Three manifests written and stamped: `approvals-queue`, `approvals-decision`, `approvals-authority`. Four staled manifests refreshed in prose **and** digest (DL-16). `validate --all` back to the standing 15 warnings | ☑ |
| 2 | No raw colour or spacing values — tokens only | Every class is a token or a shared constant: `border-consequence-border`, `bg-quiet-subtle`, `border-danger-default`, `bg-notice-subtle`, `rounded-gc-2`, and `BUTTON_PRIMARY` via `PerformButton`. `tests/architecture/controls.test.ts` passes | ☑ |

## Violations Found

**One, found by a test and fixed rather than accepted.** The queue's empty
branch rendered *"Nothing is waiting — none of your agents has a trade waiting
for an answer"* even when an agent's read had failed, which is precisely the
claim the surface exists to refuse. `approval-queue.tsx` now renders a qualified
heading — *"Nothing is waiting from the agents that answered"* — plus the
sentence that this is not the whole account, whenever any agent went unread.

**One row deferred, not waived**: Money wording #1, held by the Phase D gate
along with the rest of section 5.

## Verdict

- [x] Approved **for the scope built** — everything up to the gate
- [ ] Changes requested

The accept surface has not been reviewed because it has not been written. This
review must be re-run against section 5 when the gate is crossed; the rows above
that mention accept record its **absence** as the reviewed property.
