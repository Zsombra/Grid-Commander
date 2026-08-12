---
id: a-refused-rebind-perform-is-a-crash
title: A platform refusal of the rebind perform surfaces as a framework error page
type: risk
status: open
priority: p2
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: agent-authoring
github: "164"
blocked_by: []
tags: [refusal, spec-tension, writes]
---

# A refused rebind perform is a crash

## What

`RebindAgentResult` has only two arms — `'rebound' | 'destination-moved'` —
and `performRebind` has no catch. If `AgentsPort.rebindAgent` throws because
BattleGrid refuses the write (revision moved underneath, not permitted, any
`VALIDATION_ERROR`), the refusal surfaces as a Next.js framework error page
instead of the `?problem=` banner every sibling ceremony renders.

## Why it matters

p2 because it is a write path that violates a spec requirement when the
platform says no: agent-authoring's "The Outcome Of A Write Reaches The Person
Who Asked For It" (openspec/specs/agent-authoring/spec.md:463-484). Every
other perform (archive, deploy, undeploy, edit apply) catches the refusal and
redirects back with the reason; rebind is the one that does not. A refusal is
a normal platform answer — v15+ moves revisions on strategy edits, so
revision-moved during a rebind is a reachable, ordinary case.

## Evidence

- `src/application/use-cases/rebind-agent.command.ts:138-141` — the result
  type with no refusal arm.
- `app/(app)/agents/[id]/rebind/page.tsx` — `performRebind` submits with no
  catch around the port call.

Found by the 2026-08-12 ceremony survey (`agent-rebind-confirm` manifest).
Not yet reproduced against live BattleGrid — the analysis is from the types
and the sibling implementations; a live probe forcing a stale revision would
settle it.

## Notes

The fix shape is the sibling pattern: a refusal arm on the result, caught in
the action, redirected back as `?problem=`. Related: `refused-branches-drop-
the-problem-they-were-handed` (the same page's refused-describe branch also
drops carried problems — fixing both together avoids touching the branch
twice).
