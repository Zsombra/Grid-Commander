---
id: refused-is-not-unreachable
title: A refused credential is reported as a platform that could not be reached
type: bug
status: done
priority: p2
created: 2026-07-29
updated: 2026-07-29
change: "refused-is-not-unreachable"
capability: agent-authoring
blocked_by: []
tags: [copy, error-reporting, both-modes]
---

# A refused credential is reported as a platform that could not be reached

## What

When BattleGrid returns 401 or 403, the roster renders two sentences that
disagree:

> Your BattleGrid connection is no longer valid. Check the BATTLEGRID_API_KEY
> this deployment was configured with, then restart it.
>
> This does not mean your agents are gone — **Grid-Commander could not reach
> BattleGrid to ask.** Nothing can be created or changed until it can.

It *did* reach BattleGrid. BattleGrid answered, and the answer was no. The
second sentence was written for a network failure and is shown for every
`unreadable`, including the one case where the platform was reached and
responded.

The same sentence appears on `/strategies` ("could not reach BattleGrid to
ask") and, in a different form, on `/agents/new` ("it could not be reached").

## Why it matters

The first paragraph is diagnostic and correct. The second contradicts it, and
it is the one a reader is more likely to act on because it is the reassuring
one — it says the problem is transient and on BattleGrid's side. Someone with a
mistyped key waits for an outage to clear.

It is not severe: the correct remedy is on screen, one line above. It is wrong,
consistently, on the most common failure the product has.

## Evidence

Found 2026-07-29 by serving personal mode with an invalid key and reading the
whole page rather than the sentence under test —
`docs/merge/proof/refused-key-remedy-light.png`.

`src/presentation/components/agent-roster.tsx` — the `unreadable` branch.
`src/presentation/components/strategy-list.tsx` — same shape.
`app/(app)/agents/new/page.tsx` — same shape.

## Not introduced by `a-remedy-that-exists`

Pre-existing and identical on the delegated path: the old pairing was
"Reconnect to continue." above "could not reach BattleGrid to ask", which
contradicts in exactly the same way. That change made the first sentence
correct in both modes and did not touch the second.

## Fix

`unreadable` carries a `reason` string and nothing else, so the view cannot tell
a refusal from a timeout. Distinguishing them means the port reporting *which*,
not just *what* — a small shape change to `RosterResult` and its siblings, plus
one branch in each view.

Worth doing with the shape change rather than as a copy edit: rewording the
sentence to cover both cases would make it vaguer, and it is currently the only
thing on screen telling the user their agents still exist.

## Resolution

Closed by `refused-is-not-unreachable` (2026-07-29).

`unreadable` now carries a `FailureCause` alongside its `reason`, set once in
`src/infrastructure/battlegrid/unreadable.ts` where the error is still in hand.
`ConnectionRevokedError` is a refusal; everything else — transport failure,
JSON-RPC error, malformed payload — is unreachable. The two adapters route every
site through that one function, so they cannot describe the same failure two
ways.

`WhyNotLoaded` renders the sentence for both views. The reassurance sits outside
the branch, so neither case can be written without it.

Beyond what was filed: splitting the sentence broke the one after it. "Nothing
can be created or changed **until it can**" had "could not reach BattleGrid" as
its antecedent, and once that clause started varying the pronoun referred to
nothing. Caught by rendering the page, not by reading the diff. It now states
its own condition.

A surviving mutation also exposed that `callTool`'s `instanceof
ConnectionRevokedError` guard was redundant in fact — `toDomainError` returns a
non-conflict `Error` unchanged, so revocations were preserved by accident. The
hazard is real (a revocation reshaped into a `RevisionConflictError` would tell
a user their state moved on when their credential died), so the invariant is now
pinned where it can actually break: the remedy sentences. Reword one to contain
"conflict" and the test fails.
