# Proposal: Refused Is Not Unreachable

## Why

When BattleGrid returns 401 or 403, the roster renders two sentences that
disagree with each other:

> Your BattleGrid connection is no longer valid. Check the BATTLEGRID_API_KEY
> this deployment was configured with, then restart it.
>
> This does not mean your agents are gone — **Grid-Commander could not reach
> BattleGrid to ask.** Nothing can be created or changed until it can.

It *did* reach BattleGrid. BattleGrid answered, and the answer was no.

The second sentence was written for a network failure and is shown for every
`unreadable`, including the one case where the platform was reached and
responded. The first paragraph is correct and the second contradicts it — and
the contradicting one is the more likely to be acted on, because it is the
reassuring one: it says the problem is transient and on somebody else's side.
Someone with a mistyped key waits for an outage that is not happening.

Found by serving personal mode with a bad key and reading the whole page rather
than the sentence under test. Filed as `refused-is-not-unreachable` (P2) and not
fixed with the change that found it, because it is pre-existing, identical on
the delegated path, and needs a shape change rather than a reword.

## What Changes

- **`unreadable` says which failure it was.** All four result types
  (`RosterResult`, `JournalResult`, `StrategiesResult`, `VocabularyResult`) gain
  a `cause` alongside `reason`: `'refused'` when the platform answered and
  declined, `'unreachable'` when there was no usable answer.

- **The adapters decide it, where the error already is.** A
  `ConnectionRevokedError` is a refusal; everything else is not. Both adapters
  already catch in one place per method and call one `message(err)` helper —
  that helper's call sites are exactly the decision points.

- **The two views that make the claim branch on it.** `agent-roster.tsx` and
  `strategy-list.tsx` keep the reassurance, which is the valuable half, and vary
  only the explanation. The other thirteen `unreadable` sites render `reason`
  and no causal claim; they are left alone.

## Why not reword instead

"Grid-Commander could not get an answer from BattleGrid" would cover both and be
true in both. It is worse. The sentence exists to stop a user concluding their
agents were deleted, and it does that by naming a cause that is obviously
external and obviously not deletion. A vaguer cause is a weaker reassurance, and
this is the only thing on screen telling them their work still exists.

## Capabilities

- `agent-authoring` — MODIFIED: "The Roster Reflects The Live Account", the
  failure scenario.

## Out of Scope

- **The thirteen other `unreadable` render sites.** They print `reason` without
  claiming a cause, so none of them can be wrong in this way. Adding a branch to
  each would be change for its own sake.
- **`DiscoveryUnavailableError`'s wording on `/agents/new`.** "The choices this
  form needs come from BattleGrid, and it could not be reached" has the same
  shape of problem, but it is a different error on a different path with its own
  requirement. Filed if not taken here.
- **Retry affordances.** A refusal and an outage differ in whether waiting helps,
  which is an argument for offering retry on one and not the other. That is a
  behaviour change, not a truthfulness fix, and architecture policy P4 has
  opinions about retry that deserve their own change.
