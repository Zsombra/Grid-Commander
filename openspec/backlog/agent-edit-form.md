---
id: agent-edit-form
title: The agent edit surface is a rename, not a form
type: feature
status: open
priority: p2
created: 2026-07-27
updated: 2026-07-27
change: ""
capability: agent-authoring
blocked_by: []
tags: [ui]
---

# The agent edit surface is a rename, not a form

## What

`UpdateAgentCommand` is wired and tested — agent-owned fields only, read-modify-
write of the trading config, revision carried — and the only surface bound to it
is a rename action on the agent detail page.

Recorded as WL-6 and as F-2 in `wire-the-app`'s UI review.

## Why it matters

The behaviour is delivered; the way to reach most of it is not. A user can see
that their agent has money limits and cannot change them without the API.

## Fix

A form over the agent-owned fields, with the trading-config section driven by the
live catalog the same way the create form is. The interesting part is already
solved: `applyEdit` merges onto the current config and `validateTradingConfig`
checks the merged result, so the form sends changed fields and the command does
the rest.
