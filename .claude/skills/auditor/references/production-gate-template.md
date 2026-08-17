# <change-id> Production Gate

## Metadata

- Change folder: `openspec/changes/<change-id>/`
- Delta specs: `openspec/changes/<change-id>/specs/`
- Master plan: `openspec/changes/<change-id>/plan/master-plan.md`
- Data review: `openspec/changes/<change-id>/plan/data-review.md`
- Architecture review: `openspec/changes/<change-id>/plan/architecture-review.md`
- UI/UX review: `openspec/changes/<change-id>/plan/uiux-review.md` (or N/A evidence)
- Decision log: `openspec/changes/<change-id>/plan/decision-log.md`
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

## Spec Parity

<!-- One row per requirement in the change's delta specs. An absent requirement
     means the audit was incomplete, not that it passed. -->

| Requirement | Capability | Delta op | Delivered | Evidence (path:line) | Scenarios covered | Finding |
|---|---|---|---|---|---|---|
| `<name>` | `<capability>` | ADDED | `YES \| NO` | `<path:line>` | `<n>/<n>` | `— \| PG-xxx` |

- Requirements delivered: `<n>/<n>`
- Scenarios covered: `<n>/<n>`
- Unspecified behavior in the diff: `NONE | <list>`
- Out-of-scope work in the diff: `NONE | <list>`
- Existing requirements regressed: `NONE | <list>`
- Task honesty (`[x]` with no code): `PASS | FAIL`
- Spec validation (`openspec.py validate <change-id> --strict`): `PASS | FAIL`

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
<!-- Read from openspec/config.yaml quality_gates, the master plan's Phase 2
     checklist, or docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md → Code Quality -->
- `<command>`: `PASS | FAIL`

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
