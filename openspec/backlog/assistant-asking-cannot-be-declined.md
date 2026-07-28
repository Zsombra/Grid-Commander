---
id: assistant-asking-cannot-be-declined
title: A user who does not want their data sent has only one option — not asking
type: question
status: open
priority: p3
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: assistant
blocked_by: []
tags: [assistant, consent]
---

# A user who does not want their data sent has only one option — not asking

## What

`disclose-the-assistant-model` tells the user, before they ask, that answering
sends what the assistant reads to a named third party. It gives them no way to
ask *without* that happening.

## Why it may not matter

Asking is opt-in per question, and the disclosure comes first. Someone who reads
it and would rather not can decline by not asking — which is a real choice,
available immediately, and needs no preference store to exist. A deployment-level
opt-out also already exists and is honest: no key configured, nothing sent, and
the page says so.

That is why this is P3 and a `question` rather than a bug. It may be complete
as it stands.

## What would change the answer

- A user who wants the assistant for *some* questions and not others. Nothing
  supports that, and per-question consent would be noise on every ask.
- A deployment serving users who cannot consent for themselves — an operator
  running Grid-Commander on behalf of others. The disclosure reaches whoever
  looks at the page, which may not be whoever owns the account.
- A regulatory answer that says disclosure without an opt-out is not consent.

## If it is worth building

Per-user opt-out needs storage, a policy, and a decision about what the
assistant *is* when it cannot read — probably nothing, in which case the
setting is "hide this page", which the deployment-level switch already achieves
more honestly.

Investigate before proposing. The likely outcome is that this closes as
"already answered by the disclosure".
