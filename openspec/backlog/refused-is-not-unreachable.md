---
id: refused-is-not-unreachable
title: A refused credential is reported as a platform that could not be reached
type: bug
status: open
priority: p2
created: 2026-07-29
updated: 2026-07-29
change: ""
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
