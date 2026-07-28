---
id: assistant-does-not-name-its-model
title: The assistant does not tell the user where their data goes
type: bug
status: done
priority: p1
created: 2026-07-28
updated: 2026-07-28
change: disclose-the-assistant-model
capability: assistant
blocked_by: []
tags: [assistant, disclosure, ui]
---

# The assistant does not tell the user where their data goes

## What

`/assistant` says "I can read your agents, your strategies, and the record of
what Grid-Commander has done on your behalf. I cannot change anything."

Both sentences are true. Neither says the other half: that answering sends what
it reads to Anthropic, and that a question about a strategy puts that strategy's
contents in a third party's hands.

Every other outbound path in this product is BattleGrid, which the user
connected on purpose through an OAuth screen that named it. This one is not, and
nothing on the page says so.

## Why it matters

The product's stated value is legibility — showing what a thing will do before
it does it. A surface that reads someone's trading configuration and sends it
somewhere they were not told about is the direct inverse, on the one page whose
whole job is answering honestly.

It is also the difference between a user being able to make a decision and not.
Someone who would rather not have their strategies leave the product has no way
to know they are leaving, and no way to decline short of not asking.

## Evidence

`app/(app)/assistant/page.tsx` — the intro paragraph, which names what the
assistant reads and not where the reading goes.
`.env.example` — the note exists, but it is written for whoever deploys, not for
whoever asks.
Deferred from `wire-the-assistant-model`, out of scope by declaration.

## Fix

Two parts, and the second is the one that matters:

1. Name the model provider on the surface, near the question box rather than in
   a footnote.
2. Decide whether it should be possible to ask *without* that happening. A
   deployment with no key already behaves this way; a per-user choice does not
   exist and may not be worth building.

Part 1 is a design ticket against the `assistant` surface — it changes no
behaviour, so it does not need a spec change. Part 2 does: it would be a new
requirement about consent, and it belongs in a `/propose` change of its own.

Filed P1 rather than P2 because it is a disclosure gap that ships the moment a
key is set, not a defect that waits for a trigger.

## Resolved (2026-07-28)

Closed by `disclose-the-assistant-model`. `/assistant` now names Anthropic as
the recipient, says the data leaves the product, and distinguishes this path
from the BattleGrid connection the user granted deliberately. A deployment with
no model configured says the opposite — that nothing typed there leaves — rather
than being given a warning about a recipient it does not have.

Two notes on how it differs from the fix proposed above:

**It is a spec change, not a design ticket.** "Tell the user where their data
goes" is a requirement about what the product must say, and the sentence has to
change with the deployment. Both are behaviour, and a design ticket may not
carry behaviour.

**Part 2 — whether asking should be declinable — is now
`assistant-asking-cannot-be-declined`,** not this item. Disclosure turned out to
close most of it: asking is opt-in per question, so someone told beforehand can
decline by not asking. What remains is narrower and worth its own record.
