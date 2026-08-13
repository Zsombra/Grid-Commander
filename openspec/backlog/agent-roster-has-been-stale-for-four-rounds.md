---
id: agent-roster-has-been-stale-for-four-rounds
title: The agent-roster manifest has been knowingly stale across four rounds and was never filed
type: debt
status: open
priority: p3
created: 2026-08-14
updated: 2026-08-14
change: ""
capability: harness-integrity
github: "237"
blocked_by: []
tags: [design, surfaces, staleness, deferral]
---

# The agent-roster manifest has been knowingly stale across four rounds and was never filed

## What

```
WARNING design_surface_stale: agent-roster: 1 source file(s) differ from what
was surveyed — src/presentation/components/agent-roster.tsx
```

It is one of the fourteen warnings that make up the project's "clean" baseline,
and it has been left deliberately in four consecutive rounds — the 2026-08-13
handoff, the DT-0026 round, DT-0027's re-survey, and #232's. Each time the
reasoning was the same and each time it was correct: **re-pinning it would claim
a read nobody has done.** `generated_at_commit` and `source_digest` assert that
someone described the source at that hash. Refreshing the digest without reading
the file makes the claim false while making the warning disappear, which is
strictly worse than the warning.

**What was never done is filing it.** Four rounds recorded the decision in a
journal entry or a commit message and moved on. That is precisely the shape
`CLAUDE.md` forbids — *"Do not leave a deferral unfiled"* — and the reason the
rule exists: a decision that lives only in prose is indistinguishable from an
oversight to the next reader, and by round four it has become part of the
scenery.

## Why it matters

p3, and the priority is honest. Nothing renders wrong. `agent-roster` is
`designed` with DT-0011 implemented; what is unknown is whether the manifest
still describes the component after whatever edit staled it.

The cost is that a permanent warning trains everyone to read "14 warnings" as
the clean state. That is how the next genuine staleness hides — the number does
not move, because the number is already wrong.

## What would settle it

Run the **ui-surveyor** against `agent-roster`: read
`src/presentation/components/agent-roster.tsx`, update the manifest to describe
what is actually there, and re-pin. It is one surface with five components.

The work is small. What has kept it undone is that it never belonged to any
round — it is nobody's tail, so every round correctly declined to fake it and
none picked it up.

Check while surveying whether DT-0011 still covers what the component renders;
if the drift that staled it added a state, the ticket is now incomplete and
`design_state_not_covered` will say so.

## Evidence

- `python3 .claude/tools/openspec.py validate --all` — the standing warning
- `openspec/design/surfaces/agent-roster.json` — `generated_at_commit`, digest
- `openspec/JOURNAL.md` — the same deferral recorded in four entries
- `.claude/skills/ui-surveyor/SKILL.md` — "Refresh what is committed, never the
  working tree", which is why the refusals were right

## Notes

Filed at session close 2026-08-14, on noticing that the deferral had been made
four times and recorded zero times. The decision was never wrong; the filing was
missing.
