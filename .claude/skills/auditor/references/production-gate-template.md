# <Slug> Production Gate

## Metadata

- Master plan: `docs/plan/<slug>-master-plan.md`
- Data review: `docs/plan/<slug>-data-review.md`
- Architecture review: `docs/plan/<slug>-architecture-review.md`
- UI/UX review: `docs/plan/<slug>-uiux-review.md` (or N/A evidence)
- Decision log: `docs/plan/<slug>-decision-log.md`
- Audit date: `<YYYY-MM-DD>`
- Evidence base: `<commit/ref>`
- Evidence head: `<commit/ref>`
- Gate decision: `BLOCKED | PASS`

## Execution Handoff Integrity

- Plan status marker (`EXECUTION READY FOR PRODUCTION GATE`): `PASS | FAIL`
- Execution checklist complete or explicitly tracked: `PASS | FAIL`
- Required artifacts exist on disk: `PASS | FAIL`
- Decision log contains planner and executor entries: `PASS | FAIL`
- Review artifacts contain path-level evidence: `PASS | FAIL`
- Evidence window resolved deterministically: `PASS | FAIL`
- Inventory vs diff alignment: `MATCH | DRIFT (see PG-xxx)`
- Handoff integrity verdict: `VALID | SUSPECT`

## Production Gate Summary

- Open critical: `0`
- Open major: `0`
- Open minor: `0`
- Total open: `0`
- Blocking rationale: `<short summary>`

## Violation Tracker

| ID | Severity | Category | Evidence (path:line + check) | Impact | Required Fix | Owner | Status | Verification |
|---|---|---|---|---|---|---|---|---|
| PG-001 | | | | | | | OPEN | |

## Mandatory Recheck Evidence

### Quality gate commands
<!-- Read from docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md → Code Quality section -->
- `<command from checklist>`: `PASS | FAIL`

### Repo-wide scans
- Conflict markers (`rg "^(<<<<<<<|=======|>>>>>>>)" -n`): `PASS | FAIL`

### Scoped scans (touched paths)
- Fallback scan: `PASS | FAIL`
- Debt marker scan: `PASS | FAIL`
- Dual-path scan: `PASS | FAIL`
- Stale method verification: `PASS | FAIL`
- Contract consistency: `PASS | FAIL`
- Decision-log parity: `PASS | FAIL`

## Decision Log Updates (Auditor)

- Final gate rationale entry added to decision log: `YES | NO`
- Waivers recorded with owner and expiry: `YES | NO | N/A`

## Final Decision

- Decision: `BLOCKED | PASS`
- Decision date: `<YYYY-MM-DD>`
- Notes: `<final sign-off notes>`
