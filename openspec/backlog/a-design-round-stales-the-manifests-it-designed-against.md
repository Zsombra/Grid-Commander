---
id: a-design-round-stales-the-manifests-it-designed-against
title: A design round always stales its own manifests — re-pin after implementation, not before
type: debt
status: done
priority: p3
created: 2026-08-12
updated: 2026-08-12
change: ""
capability: app-access
github: "179"
blocked_by: []
tags: [ui, design, process]
---

# A design round stales the manifests it designed against

## What

Eight surfaces are `design_surface_stale` again, one commit after #173 was
closed for exactly this. The re-survey pinned them at `6562791`; the ceremony
round then changed the very pages those manifests describe, so the pin was
stale the moment it landed.

This is not an oversight in that round. It is **structural**: the loop is
`/surface` → `/design` → implement, and implementing changes the source the
manifest was generated from. Any design round that does its job invalidates
its own manifests on commit. Closing the staleness item *before* the
implementation lands guarantees it reopens.

## Why it matters

p3 — nothing renders wrong and nobody is designing against these right now.
But it is 8 of the 15 warnings on the board, it recurs every round, and a
warning class that is always noisy is one that stops being read. #173 was
closed in good faith and was wrong within the hour; that pattern is worth
stopping rather than repeating.

## Evidence

`validate --all` after `creating-an-agent-chooses-a-strategy`: eight
`design_surface_stale`, all naming files the ceremony round touched
(`carried-problem.tsx` plus the six ceremony pages, and `recorder-trim`).
The re-survey agent predicted it in its own report: *"those four surfaces will
go stale again the moment DT-0019/0020/0021 commit"* — it declined to chase an
uncommitted working tree, which was the correct call.

## First step

Re-pin the eight, and **change where the step sits**: the survey that a round
depends on happens first, but the *re-pin* belongs after implementation, as
the round's last task rather than its first. Worth writing into the
`ui-surveyor` skill's "Refreshing a stale surface" section and the design
contract's §8 loop, so the next round does not rediscover it.

The delta is small and known: the DT-0016–DT-0021 treatments (consequence and
danger roles, mobile stacks) and `CarriedProblem` mounted on every branch.

## Notes

Deliberately not fixed by bumping `generated_at_commit` without re-reading —
same reason as #173. The check's value is that freshness is measured.

## Closed 2026-08-12

Both halves done. The nine stale manifests are re-pinned at `e7c56ce`, and the
structural fix is written into the four places a session looks:
design-contract §8 (the loop now shows `/surface` twice, and says which pass is
which), the ui-surveyor skill's refreshing section, the design-director's
completion checklist, and CLAUDE.md's UI lane.

Also recorded there: never re-pin against an uncommitted working tree, and
**why this is a convention rather than a check** — a manifest pins to a commit
hash, the hash of the commit being written does not exist yet, so the re-pin is
necessarily a second commit and any freshness guard would fail on the
intermediate state the process requires.

The re-survey earned its keep beyond bookkeeping: it caught that DT-0019/0020/
0021's acceptance said the reassurance renders *inside* the danger block when
it renders after it (tickets corrected — the criterion was wrong, not the
code), and it found `AuthorityLost` and the row treatments uncovered, filed as
#183.

