# Data Review — a-drafted-condition-can-be-saved

| Check | Result | Evidence |
|---|---|---|
| The compile request matches a declared variant | PASS | `compileConditionsIntent` sends the UPDATE arm's six required fields (`operation`, `intentSummary`, `assumptions`, `coinSelection`, `strategyId`, `expectedRevision`) plus `conditions`, which that arm declares. The arm is `additionalProperties: false`, so what is *absent* matters as much as what is present — and tagline and sections are absent by design (DL-2) |
| The condition payload matches the declared union | PASS | unchanged: `serialiseCondition` is the only serialiser, and `tests/strategy/condition-draft.test.ts` holds every branch of it against `docs/battlegrid-mcp-capabilities.json` — the real `anyOf`, not the flattened record |
| No offline conformance case for the composed payload | ACCEPTED | the probed record still flattens `conditions[].definition` to the group branch, so a case in `payload-conformance.test.ts` would fail against correct code. Filed as `the-record-flattens-the-condition-union` and being fixed alongside this change; when it lands, the conformance case becomes both possible and required |
| The apply payload still carries conditions | PASS | `toApplyPlan` copies `conditions` out of `postState` — its absence was the sixth dead write path — and the unit suite asserts the projected plan carries the three-entry list |
| An empty list is a value, not an omission | PASS by construction, UNPROVEN on the platform | `conditions: [...input.conditions]` is always present; whether the platform reads `[]` as "define none" is unobserved, and `postStateDrift` refuses rather than assuming (DL-8). The probe's read half records the answer |
| Nothing re-serialises the strategy's own conditions | PASS | `resolveConditionEdit` filters and splices `conditionsAsGiven` — the platform's own objects — and only the draft passes through the serialiser; asserted by identity (`toBe`) in the unit suite |
| A key is never sent twice | PASS | `composeForResolution` is reused rather than reimplemented, so the try and the write cannot disagree about what a matching key means |
| Empty and absent are not confused | PASS | `postStateDrift` reads a missing tagline and `""` alike, and a missing condition array as its own reported state rather than as an empty list |
| No platform vocabulary written down | PASS | no enum, tool name, section key or metric appears outside the adapter; the drift check compares against values read from the strategy at request time |
