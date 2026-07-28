---
id: brain-with-no-model
title: An agent with neither preset nor model maps to a custom brain with an empty model id
type: bug
status: open
priority: p3
created: 2026-07-27
updated: 2026-07-27
change: ""
capability: agent-authoring
blocked_by: []
tags: [mapping, display]
---

# An agent with neither preset nor model maps to a custom brain with an empty model id

## What

`agent-mapper.ts:94` falls back to `''` when a payload carries no `brainPreset`
and no `modelId`, producing `{kind: 'custom', modelId: ''}`.

Recorded as PG-104 in the production gate.

## Why it matters

Display only, and bounded. `brain` is sent to BattleGrid on create alone, from
user input validated against the live catalog — never from a mapped agent. So
the empty string can reach a screen and cannot reach a write.

Worth distinguishing from PG-001 in change 1, which looked identical and was
critical: there the empty string became a *key*, and two users collided on it.
Here it is a label.

## Fix

Give `Brain` a third case — unknown — so a brain the payload does not describe
is reported as undescribed rather than as a custom brain with no model. Do it
when there is a screen to see it on.
