# Tasks

## 1. The fixes
- [x] 1.1 reactivate: read SetLifecycleResult; not-permitted → back with problem; page renders it.
- [x] 1.2 agent archive: same.
- [x] 1.3 strategy archive: read SetStrategyActiveResult; refused / repair-required → back with problem; page renders it.
- [x] 1.4 restore: refused → back with problem (repair-required path unchanged); page renders it.
- [x] 1.5 Delete the three fixed rows from KNOWN_DROPPED.

## 2. Verification
- [x] 2.1 tests/agent/refusals-reach-the-operator.test.ts: per surface — result read, problem= carried, role="alert" rendered, no domain import.
- [x] 2.2 All gates green; backlog item closed.
