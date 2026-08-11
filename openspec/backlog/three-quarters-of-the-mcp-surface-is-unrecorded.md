---
id: three-quarters-of-the-mcp-surface-is-unrecorded
title: the surface record is tools-only, so every conformance guard is blind to instructions, prompts and resources
type: bug
status: done
priority: p2
created: 2026-08-11
updated: 2026-08-11
change: the-record-learns-the-other-three-surfaces
capability: platform-mapping
blocked_by: []
tags: [battlegrid, mcp, conformance, probe, record]
---

# Three quarters of the surface, unrecorded

## What

Connecting BattleGrid as a first-class MCP connector showed what the probe
never asked for. The server declares four capability surfaces and we record
one:

| Surface | Server declares | In `battlegrid-mcp-surface.json` | Guarded |
|---|---|---|---|
| `tools` | 114, `listChanged: true` | yes | yes |
| `instructions` | 25,056 chars / 266 lines | **no** | no |
| `prompts` | 5, `listChanged: true` | **no** | no |
| `resources` | 3, `listChanged: true` | **no** | no |

`tool_count` is 114 in both the record and the live connector, so the count
parity that `surface-freshness.test.ts` checks is genuine. It is also the
only thing checked. `mcp-conformance`, `payload-conformance` and
`wire-values` all read `surface.tools` and nothing else.

The consequence is precise: **a BattleGrid deploy could rewrite the
strategy-authoring contract, the grid-format validation rules, or the
per-tool pagination semantics, and not one test in this repo would move.**
Three of the last five deploys broke a write path and the guards caught every
one — but they caught them because those breaks were expressed in *tool
schemas*. A break expressed in prose is currently invisible.

## Two separate holes

**1. The generator captures `instructions` and throws it away.**
`tools/generate_mcp_reference.py:14` reads `init.get("instructions", "")`
into `cap` — and no line ever writes it out. The reference doc has `##
Prompts` and `## Resources` sections but no `## Instructions`. 25KB of
platform-authored operating guidance is loaded into memory and dropped on
every regeneration.

**2. Prompts and resources are recorded as names only.**
The reference doc lists all five prompt names and all three resource URIs,
with empty description cells and no bodies. The `author-strategy` prompt
alone is 5,898 characters of binding sequence. Nothing in the repo holds it.

## Why it matters beyond tidiness

The prose carries constraints that no JSON schema can express, and several
are ones this product has already learned the hard way or is still guessing
at:

- *"All discovery and non-financial strategy configuration uses `mcp:read`,
  not `mcp:wager`. Treat that scope as account-and-configuration authority."*
  That is CLAUDE.md's fact #1, in the platform's own words. We derived it by
  classifying 110 tools by hand; the server states it in a sentence.
- *"`coinId` … is NOT a UUID — copy the value, never construct one."*
  A copy-don't-construct rule is unrepresentable in a type.
- *"`list_pending_approvals()` … returns the full queue (no pagination)"* —
  stated per tool, while `list_trade_outcomes` paginates at 10 by default.
  That default cost a live session a $1.28 misread of the realized record.
- Hard limits on the authoring path: plan token expires in **5 minutes**;
  preview/compile have a **15-second deadline**, a **16,000-estimated-token**
  preview cap, and **256,000-byte** result and plan caps.

## Proposed

1. Extend `tools/probe_mcp_surface.py` to request `prompts/list`,
   `prompts/get` for each, `resources/list`, `resources/read` for each, and
   to persist `instructions` from `initialize`. Store them in the record
   beside `tools`.
2. Emit an `## Instructions` section from the value the generator already
   loads, and fill in the prompt/resource bodies it already fetches.
3. Extend `surface-freshness.test.ts` to hold a digest of each of the four
   surfaces, not just `tool_count`, so prose drift fails a test the way
   schema drift already does.
4. Consider subscribing to `notifications/*/list_changed` — the server
   advertises `listChanged: true` on all three. This helps a long-lived
   session only; the adapter opens a session per request, so it is not a
   drop-in replacement for re-probing on a version bump. Worth scoping, not
   assuming.

## Not in scope

The product client is deliberately tools-only (`tools/list` + `tools/call`
in `mcp-adapter.ts`). Nothing here argues it should call `resources/read` at
runtime. This is about the **record and the guards**, which are supposed to
be a faithful account of the platform and are currently a faithful account
of one quarter of it.
