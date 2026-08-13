# UI/UX Review — The Connection Asks Who It Is

**Checklist**: `docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md`
**Status**: `EXECUTION EVIDENCE RECORDED`

## Scope

Narrow, and not N/A. No new component, no new route, no layout change, no token
change. What changed is copy: `app/connect/page.tsx` names two outcomes it never
had to name.

| Reason | What the user is told |
|---|---|
| `unidentified` | the authorization succeeded, BattleGrid did not say which account it was for, a connection has to be filed under an account, and **the authorization was withdrawn** |
| `unidentified-standing` | the same — plus that it **may still stand at BattleGrid**, and that it can be withdrawn from their account at `battlegrid.trade` |

## Matrix

| Rule | Applies | Evidence | Verdict |
|---|:--:|---|---|
| Every affordance the interface offers resolves | ● | The retry is the consent form itself, present on both branches — asserted by `expect(r.text).toContain('Continue to BattleGrid')` in both new tests | IMPLEMENTED |
| A refusal is rendered, never thrown | ● | `route.ts:44-47` catches `AccountUnidentifiedError` and returns a redirect. The bare `Error` that used to escape the `catch` is gone | IMPLEMENTED |
| Copy states what happened, not what failed internally | ● | Neither sentence names a tool, a status code, or the platform's raw words. `route.ts:45` emits a fixed enum rather than `err.message` | IMPLEMENTED |
| No raw color/spacing values; roles come from tokens | ● | Both reasons render inside the existing `role="alert"` block — `border-danger-default bg-danger-subtle`, behind the semibold "No connection was made: " prefix. No new class, no literal value | IMPLEMENTED |
| Tap target floor (`min-h-control`) | ○ | The retry is the pre-existing `BUTTON_PRIMARY` submit, untouched. `tests/architecture/controls.test.ts` green in the full run | N/A — nothing added |
| No new design ticket required | ● | Reuses `danger` as established by DT-0001–DT-0021; no surface manifest changes shape | IMPLEMENTED |

## The Sentence That Matters

The un-released case is the only place this product tells a user about a state at
BattleGrid it could not verify. Three things were checked rather than assumed:

| Check | Evidence | Verdict |
|---|---|---|
| It hedges accurately — *may*, not *does* | Copy reads "it may still stand at BattleGrid". Asserted positively (`toContain('may still stand at BattleGrid')`) **and** negatively (`not.toMatch(/does still stand\|is still active/i)`) | IMPLEMENTED |
| The withdrawal pointer resolves | The remedy is the user's own BattleGrid account at `battlegrid.trade` — reachable from any deployment, which is what "A Remedy Named Must Exist In That Deployment" requires. It is not a link into this product, because this product holds no connection at that moment | IMPLEMENTED |
| Neither reason collapses into the generic `error=` fallback | `tests/rendering/connect.test.ts` "neither unidentified branch degrades into the raw-value fallback" — asserts the fallback text and the raw slug are both absent for both values | IMPLEMENTED |

One further assertion worth naming: the released case asserts
`not.toContain('may still stand')`. A doubt that does not apply is its own kind
of inaccuracy, and copying the longer sentence into both branches would have been
the easy mistake.

## Verdict

`EXECUTION EVIDENCE RECORDED` — `tests/rendering/connect.test.ts`, 9 tests, all
passing.
