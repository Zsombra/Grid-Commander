# Tasks

## 1. Repairs

- [x] 1.1 radar-probe: accept both known refusal shapes; fail only on an
      accepted create; name the drift in the assertion messages
- [x] 1.2 deploy-agent.command.ts: comment records the drift, not the retired
      shape
- [x] 1.3 write-probe thinking log: page ≤ server-reported total, not
      more-than-one-page
- [x] 1.4 recorded-surface.ts helper; both width assertions floor on the
      record's required tradingConfig children

## 2. Verification

- [x] 2.1 typecheck + lint + offline vitest green
- [x] 2.2 keyed run, account 1: radar-probe + write-probe pass (the two
      repaired tests that reproduce there)
- [x] 2.3 keyed run, testing account: write-probe create + proposal-probe
      write test pass (the width repairs where creates are possible)
- [x] 2.4 backlog items closed against this change

## 3. Found during verification

- [x] 3.1 proposal-probe: the agree-write count is scoped to the agree
      (`writesBeforeAgree`), not the whole audit trail — a fresh-created
      throwaway arms itself with one update first, and the old `toBe(1)`
      failed the first live run that ever reached it
