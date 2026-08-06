---
id: the-exposure-panel-still-prints-its-reason
title: The exposure panel prints its reason and stops — the one branch the sweep did not reach
type: debt
status: in-progress
priority: p3
created: 2026-08-06
updated: 2026-08-06
change: the-exposure-panel-explains-itself
capability: app-access
blocked_by: []
tags: [ui, failure, consistency]
---

# The exposure panel still prints its reason and stops

## What

`a-failed-read-explains-itself` swept twenty-eight unreadable branches onto the
shared `WhyNotLoaded` sentence and left one behind. `Exposure` renders

```
What this agent is holding could not be read: {exposure.reason}
```

and nothing more. `AgentExposure`'s `unreadable` member already carries a
`FailureCause`, so there is nothing to widen — this is one component edit.

It is recorded as a **declared exemption** in
`tests/architecture/failure-is-explained.test.ts`, keyed
`src/presentation/components/exposure.tsx  (exposure)`, with the reason written
out. So it is visible rather than silent, and the guard fails the moment the
entry stops matching a real branch.

## Why it matters

Less than the other twenty-eight did, and more than the count suggests.

Less, because `the-outage-explains-itself` already fixed the reason at the
boundary, so the sentence a user reads is accurate as far as it goes.

More, because of *which* panel it is. This one says what the agent has at
stake — open positions, margin, unrealized result. A blank where money should
be is the place in this product where a reader is most likely to conclude
something was closed out. The refused-versus-unreachable branch matters here
too: a rejected credential and an exchange outage send an operator to opposite
actions, and neither is legible from the reason alone.

## First step when taken

```tsx
<WhyNotLoaded cause={exposure.cause} subject="these positions are" />
```

beside the reason, then delete the exemption entry from
`tests/architecture/failure-is-explained.test.ts` — the guard fails if you add
the sentence and leave the entry, which is the intended way to be reminded.

Worth a moment on the subject wording before committing to it. Everything else
the sweep reassured about is a record: an agent, a strategy, a journal. A
position is a live market fact that can genuinely have ceased to exist between
the read and the page, so "these positions are gone" is the one subject where
the reassurance could be read as a claim about the market rather than about the
read. It is not — the sentence only ever says the *failure* is not evidence —
but this is the surface where that distinction is worth getting right.

## Taken as `the-exposure-panel-explains-itself`

The wording question above was settled against `these positions are`: nothing is
listed on the branch, so a demonstrative points at the list that failed to load.
The subject is `this agent’s positions are` — the words `/explorer` already uses
for a stranger's holdings. The exemption is out of the guard.

## Notes

Not folded into `a-failed-read-explains-itself`: `exposure.tsx` and
`read-exposure.query.ts` were outside that change's scope.
