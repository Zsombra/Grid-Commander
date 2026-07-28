---
id: assistant-conversation-history
title: Each assistant question is independent
type: feature
status: open
priority: p3
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: assistant
blocked_by: []
tags: [ui, assistant]
---

# Each assistant question is independent

## What

`AssistantPort` accepts a `history` of prior turns; the route sends an empty one.
Every question starts fresh.

Recorded as PG-403 and as F-2 in `assistant-readonly`'s UI review.

## Why it matters

"Which of my agents use Berlin?" followed by "and what would change if I edited
it?" is the natural shape of the questions this assistant exists for, and the
second is unanswerable without the first.

## Fix

A conversation needs somewhere to live. The options are a table, the session, or
the URL, and they differ in whether a conversation survives a reload, a new tab,
and a disconnect. Worth deciding deliberately rather than defaulting — a
conversation containing readings of someone's account is not obviously something
to persist without saying so.
