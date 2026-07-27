# Production Gate: author-agents

**Track**: full · **Auditor pass**: Mode A → Mode B (re-audit after remediation)
**Evidence window**: `6ba8948..HEAD` (archive of change 1 → working tree)
**Decision**: see [Gate Decision](#gate-decision).

---

## Handoff Integrity

| Check | Result | Evidence |
|---|---|---|
| Master plan handoff marker | VALID | set below |
| Execution checklist fully checked | VALID | `tasks.md` 35/35, with the routing deviation stated in the file rather than hidden by a tick |
| Review artifacts exist with path-level evidence | VALID | all three `EVIDENCE RECORDED`, each row carrying `file:line` |
| Decision log has planner + executor entries | VALID | AL-1…AL-8 (planning), AL-9…AL-12 (execution) |
| Inventory aligned with the diff | VALID with logged drift | Planned `describe-rebind.query.ts` merged into `rebind-agent.command.ts`; planned `app/(app)/agents/**` not delivered — AL-9 |
| Live facts established before design | VALID | `findings-agents.md`, tasks 0.1–0.3 |

---

## Spec Parity

10 ADDED (`agent-authoring`, 21 scenarios) + 1 MODIFIED (`battlegrid-connection`,
3 scenarios) = **24 scenarios**.

| Req | Delivered at | Scenarios | Verdict |
|---|---|---|---|
| A1 Roster Reflects The Live Account | `list-agents.query.ts`, `agent-adapter.ts:60` | 3/3 → `tests/agent/roster.test.ts` | DELIVERED |
| A2 Fields Offered Only From Confirmed Values | `catalog.ts`, `trading-config.ts`, `create-agent.command.ts` | 3/3 → `tests/agent/catalog.test.ts` | DELIVERED |
| A3 Capacity Explained Before The Work | `list-agents.query.ts:44`, `create-agent.command.ts:47` | 1/1 → `tests/agent/capacity.test.ts` | DELIVERED — see PG-101 |
| A4 Editing Changes Only What The Agent Owns | `field-ownership.ts`, `update-agent.command.ts` | 2/2 → `tests/agent/ownership.test.ts`, `edit.test.ts` | DELIVERED |
| A5 Rebinding States That It Replaces | `rebind.ts`, `rebind-agent.command.ts`, `rebind-confirm.tsx` | 3/3 → `tests/agent/rebind.test.ts`, `rebind-flow.test.ts` | DELIVERED |
| A6 Retiring Is Reversible And Described As Such | `lifecycle.command.ts` | 3/3 → `tests/agent/lifecycle.test.ts` | DELIVERED |
| A7 Platform-Owned Agents Not Editable | `agent.ts:60`, `agent-actions.tsx` | 1/1 → `tests/agent/ownership.test.ts` | DELIVERED |
| A8 Every Mutation Carries Its Revision | `ports/agents.ts`, all agent commands | 2/2 → `tests/agent/concurrency.test.ts` | DELIVERED |
| A9 An Agent's Reasoning Is Readable | `read-agent-journal.query.ts`, `journal-view.tsx` | 2/2 → `tests/agent/journal.test.ts` | DELIVERED |
| A10 Operations That Commit Funds Unreachable | `call-path.ts`, structural scan | 1/1 → `tests/agent/wager.test.ts` | DELIVERED |
| **C3 Read Scope Requested, Wager Not** (MODIFIED) | `mcp-adapter.ts:152` | 3/3 → `tests/connection/scope.test.ts`, plus the two prior scenarios still green | DELIVERED |

**11/11 requirements delivered, 0 scenarios uncovered.**

**MODIFIED — old behavior gone.** The constant `return ['mcp:read']` survives
nowhere: `grep -rn "return \['mcp:read'\]" src/` returns nothing, and restoring
it fails 4 tests in `scope.test.ts`.

**Regression against `openspec/specs/battlegrid-connection/`.** All ten
requirements from change 1 still hold; their tests are unchanged and green. The
only touched file is `mcp-adapter.ts`, and its other requirements (R1, R10,
identity) are covered by `connect.test.ts` and `revoke.test.ts`, both passing.

**Unspecified behavior**: none. Every file serves a matrix row or is declared
infrastructure (`agent-mapper.ts`, test fakes).

**Scope adherence**: no wager tool, no strategy authoring, no halt/resume, no
assistant. `tests/agent/wager.test.ts` asserts ten wager tool names appear
nowhere in `src/` or `app/`.

**Task honesty**: 35/35 ticked, and the presentation phase carries a written
deviation in `tasks.md` rather than a silent tick — see PG-103.

---

## Violation Tracker

### PG-101 · MAJOR · FALLBACK · Absent capacity rendered as a capacity of zero

| Field | Value |
|---|---|
| **Requirement** | A3 — Capacity Limits Are Explained Before The Work |
| **Evidence** | `src/infrastructure/battlegrid/agent-mapper.ts:120` (pre-fix: `limit: num(s['limit']) ?? 0`, `used: … ?? 0`), found by the mandated `rg "\?\?"` scan on touched paths |
| **Impact** | A roster response with no `slotUsage` block produced `{limit: 0, used: 0, remaining: 0}` — a coherent-looking capacity that reads as *at capacity*. The copy built from it said **"You are using all 0 of your agent slots. your rank allows 0"**: a specific claim about the user's account that nobody made, and a create action refused on the strength of it. The same shape as PG-003 in change 1 — a fabricated number presented as fact — in a different field. |
| **Required fix** | Return null when the platform did not report a limit. Unknown is not at-capacity, and must not render as one. |
| **Status** | **FIXED** |
| **Owner** | executor |
| **Verification** | `agent-mapper.ts:118-137` returns `SlotUsage \| null`; `RosterResult.slots` is nullable, so **the type checker found the second call site** (`create-agent.command.ts`) that would otherwise have kept using the zeroes. `list-agents.query.ts:47` maps null to `unknown`; `create-agent.command.ts:47` refuses rather than composing against a limit it never learned. Three tests in `mapper.test.ts::reports unknown rather than zero`, two in `capacity.test.ts`. |

### PG-102 · MINOR · DEFENSIVE_CODE · `payload['agent'] ?? payload` at five call sites

| Field | Value |
|---|---|
| **Requirement** | — (implementation tolerance) |
| **Evidence** | `src/infrastructure/battlegrid/agent-adapter.ts:82,123,143,170,187` |
| **Impact** | The tool reference documents `create`/`update`/`rebind`/`archive`/`activate` as returning `agent`. The fallback tolerates a shape the platform is not documented to send. It fails closed rather than open — `mapAgent` throws `AgentPayloadError` without an `id` and `revision` (PG-101's sibling guarantee), so a genuinely wrong shape raises rather than producing a half-agent — but it is defensive code against a contract we have read. |
| **Required fix** | Remove once the response shape is confirmed against a live create. That confirmation requires a real mutation on a real account and was deliberately not attempted (AL-3). |
| **Status** | WONTFIX (this change) — deferred |
| **Owner** | the change that first performs a live create |
| **Verification** | Filed as backlog `confirm-agent-write-response-shape`. Not blocking: the failure mode is a thrown error, not a silent wrong value. |

### PG-103 · MAJOR · HANDOFF · Nothing renders any of this

| Field | Value |
|---|---|
| **Requirement** | — (no requirement covers reachability, which is itself the finding) |
| **Evidence** | `app/` contains three empty directories and two component files; `git diff --name-status 6ba8948..HEAD -- app/` is empty. No composition root constructs `McpBattleGridAdapter` or `McpAgentAdapter` from `loadConfig()`. |
| **Impact** | Both changes are fully implemented and fully unreachable. Every use case takes `{ userId, accessToken }` and nothing answers where a request obtains them, because there is no session. The path from an HTTP request through the guard sequence to BattleGrid is not merely untested — it does not exist. |
| **Required fix** | A change of its own: session, composition root, routes, and one end-to-end test. Doing it inside `author-agents` would mean designing identity persistence against no requirement, in a change whose delta spec is about agents. |
| **Status** | WONTFIX (this change) — deferred, **escalated** |
| **Owner** | next change (`wire-the-app`), ahead of `author-strategies` |
| **Verification** | Filed as backlog `no-composition-root` at **P1**, and recorded as AL-9. It blocks the MVP, not this change. |

**Gate note on PG-103.** This is a MAJOR that does not block, and the reasoning
should be visible rather than assumed. The gate measures a change against its
delta spec, and `author-agents` delivers every requirement in its spec. What the
finding actually indicts is the *spec* — two changes' worth of requirements can
be satisfied completely by code no user can reach, because neither spec ever
says *reachable*. Blocking this change would punish it for a gap it inherited
and would not fix the gap. Naming it at P1, ahead of the next feature change,
does.

### PG-104 · MINOR · CONTRACT · A brain with neither preset nor model maps to an empty model id

| Field | Value |
|---|---|
| **Requirement** | A2 — Agent Fields Are Offered Only From Values The Platform Confirms |
| **Evidence** | `src/infrastructure/battlegrid/agent-mapper.ts:94` — `const modelId = str(a.modelId) ?? ''` |
| **Impact** | Display only. An agent carrying neither `brainPreset` nor `modelId` renders as a custom brain with an empty model name. It cannot propagate into a write: `brain` is only sent on create, from user input validated against the catalog, never from a mapped agent. Distinct from PG-001 in change 1, where an empty string became a *key*. |
| **Required fix** | Make `Brain` mapping report an unknown brain rather than an empty custom one. |
| **Status** | WONTFIX (this change) — deferred |
| **Owner** | `wire-the-app` (where it would first be visible) |
| **Verification** | Filed as backlog `brain-with-no-model`. Non-blocking: no write path reads it. |

---

## Mandatory Recheck Evidence

| Check | Command | Result |
|---|---|---|
| Spec validation (strict) | `openspec.py validate author-agents --strict` | PASS — clean |
| Whole spec layer | `openspec.py validate --all` | PASS — 0 errors |
| Typecheck | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS |
| Tests | `npm test` | PASS — 16 files, 223 tests |
| Harness regression | `python3 -m unittest discover -s tests` | PASS — 124 tests |
| Conflict markers | repo-wide grep | PASS — none |
| Fallback masking | `grep -rn "??"` on touched paths | PASS after PG-101; remainder judged below |
| Technical debt markers | `grep -rniE "TODO\|FIXME\|HACK\|XXX\|deprecated\|legacy\|obsolete"` | PASS — none |
| Console logging | `grep -rn "console\."` | PASS — none |
| `canDelete` never read | `boundaries.test.ts::AL-2` (comment-stripped) | PASS |
| No platform vocabulary outside the adapter | `boundaries.test.ts::AL-1` | PASS |
| Every mutation carries a revision | `concurrency.test.ts::structurally_impossible` | PASS |
| No value substituted for an absent revision | same file | PASS |
| No wager tool reachable | `wager.test.ts` | PASS — 10 names, none present |
| Domain imports nothing outward | `boundaries.test.ts` | PASS |
| Stale exports | every exported symbol traced to a call site | PASS |

### On the surviving `??` operators in touched paths

Thirty hits, all in the two mapper/adapter files, judged individually rather
than counted:

- **Payload-shape tolerance on display fields** (`displayName`, `strategyName`,
  `bindingState`, journal `summary`/`kind`) — an absent optional string becomes
  a visible placeholder. Nothing keys on them and nothing writes them back.
- **Deny-by-default** — `mapPermissions` treats an absent flag as `false`
  (`mapper.test.ts::treats an absent permission as withheld`), and the two
  fields that *cannot* be defaulted, `id` and `revision`, throw instead
  (`refuses a payload with no revision rather than inventing one`).
- **The two that pointed the other way** are PG-101 (fixed) and PG-104
  (deferred, display-only).

The scan has now found the most serious defect in each of the two changes it has
been run on. It is not ceremony.

---

## Checklist Parity

| Checklist | Result | Notes |
|---|---|---|
| `ARCHITECTURE_REVIEW_CHECKLIST.md` | PASS | Four findings recorded in `architecture-review.md`, all explained or filed. One declared exception (AL-11, brain presets at the adapter boundary) — audited below |
| `DATA_PIPELINE_REVIEW_CHECKLIST.md` | PASS | Iron Rule holds: no agent state is persisted. One fact deliberately dropped between layers (`canDelete`), declared and enforced |
| `UI_COMPONENT_REVIEW_CHECKLIST.md` | PASS with a stated gap | All seven copy rows PASS; components are not rendered anywhere (PG-103) and have no component-level tests, which `uiux-review.md` F-2 states rather than omits |

**AL-11 auditor note discharged.** The decision log asked the gate to verify the
brain-preset exemption stays narrow. `boundaries.test.ts::AL-1` skips exactly
`file.includes('infrastructure/battlegrid')` and scans everything else in `src/`
for model ids and position-management presets. Moving the list into the domain,
the application layer or a component fails the test. **The exception holds as
declared.**

---

## Gate Decision

**Initial audit (Mode A)**: 2 MAJOR, 2 MINOR — 1 blocking (PG-101).
**Re-audit (Mode B), 2026-07-27**: PG-101 verified FIXED, with the fix's own
type change surfacing a second call site the finding had not named. PG-102,
PG-103 and PG-104 deferred with backlog items and named owners; PG-103 escalated
to P1 as the next change. All gates re-run in full. No new violations introduced.

```
Open violations: 0
```

## **DECISION: PASS** — 2026-07-27

Handoff: **archiver**. `agent-authoring` becomes source of truth alongside
`battlegrid-connection`, and the MODIFIED requirement replaces its predecessor.
