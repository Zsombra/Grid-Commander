# <Slug> Decision Log

## Purpose

Track high-signal decisions across planner, executor, and auditor phases.
Do not log cosmetic updates. Log only items that affect scope, risk, validation, waivers, or handoff clarity.

## Entry Format (Required)

- Timestamp: `<YYYY-MM-DD HH:MM TZ>`
- Phase: `PLANNING | EXECUTION | AUDIT`
- Type: `scope-change | exception | risk | waiver | handoff`
- Decision: `<what was decided>`
- Impacted files: `<path list>`
- Reason: `<why>`
- Approved by: `<name/role>`
- Next action: `<required follow-up>`

## Entries

### DL-001

- Timestamp: `<YYYY-MM-DD HH:MM TZ>`
- Phase: `PLANNING`
- Type: `handoff`
- Decision: `<initial planning handoff>`
- Impacted files: `<files>`
- Reason: `<rationale>`
- Approved by: `<name/role>`
- Next action: `<next step>`
