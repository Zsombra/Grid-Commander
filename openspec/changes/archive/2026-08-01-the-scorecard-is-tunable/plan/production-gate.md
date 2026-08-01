# Production Gate — the-scorecard-is-tunable

- Change ID: `the-scorecard-is-tunable`
- Track: `full`
- Evidence window: `cd1436b..working-tree` (audited pre-commit; the commit
  this ships in is the next on `claude/app-review-backlog-reconcile-ip3mwk`)
- Audit timestamp: `2026-08-01 09:05 UTC`
- Decision: **PASS**

## Handoff Integrity

| # | Check | Result |
|---|---|---|
| 1 | Master plan ends `EXECUTION READY FOR PRODUCTION GATE` | VALID |
| 2 | Execution checklist complete | VALID — 6/6 tasks ticked |
| 3 | Required review artifacts on disk | VALID — architecture, data, uiux, decision-log; all rows PASS with evidence |
| 4 | Decision log has planner and executor entries | VALID — DL-1..3 PLANNING, DL-4..5 EXECUTION; DL-5 records the live walk verbatim |
| 5 | Plan claims contradicted by execution disclosed | VALID — none arose; the platform accepted the first composed payload (the conformance case predates the walk) |
| 6 | File inventory matches `git status` | VALID — every changed path named in design.md File Changes |

## Spec Parity

`openspec.py validate the-scorecard-is-tunable` → clean. 1 modified
capability (`strategy-authoring`), 1 ADDED requirement, 6 scenarios — each
held by a named test or the live walk:

| Scenario | Held by |
|---|---|
| Describing names the blast radius | retune.test.ts "names the blast radius"; live DL-5 (zero-bound wording) |
| The token binds the exact values | retune.test.ts binding + tamper tests; guard consume() match |
| Absent signal refused without a token | retune.test.ts + rendering "gets no form at all" |
| No-op refused without a token | retune.test.ts + rendering "Cannot retune" |
| Stale revision refused honestly | perform refusal test; `?problem=` rendering test |
| Change proven by the re-read | perform redirect; live DL-5 read-back (allocation 0→1, r1→r2) |

## Scope Adherence

No rule-adding path, no batch edit, no threshold/section editing — the three
named exclusions stayed excluded. One pre-existing surface touched
(`strategy-detail.tsx`) only to add the way in.

## Quality Gates

All nine `./scripts/ci.sh` gates green at audit time (1002 vitest + 62 db +
221 harness; 16 key-gated live). Live walk green end-to-end (DL-5).
