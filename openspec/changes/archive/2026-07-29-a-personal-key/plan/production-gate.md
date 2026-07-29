# Production Gate: a-personal-key

**Evidence window**: `6c88094..HEAD` (working tree at audit time)
**Handoff integrity**: VALID — proposal, delta specs, design, tasks, master plan
(`EXECUTION READY FOR PRODUCTION GATE`), three reviews and a decision log all
present. Tasks 23/23, with the one unfinished item owned by a backlog entry
rather than an unchecked box.

## Spec parity

### Requirement: A Deployment May Hold The Owner's Own Credential — DELIVERED

| Scenario | Evidence | Verdict |
|---|---|---|
| Configured with the owner's credential | `owner-only-user.ts:24`; `config.ts` `personalConfig()`. Served on :3500, all five routes | delivered |
| No authorization flow required | **Booted and served with `BATTLEGRID_CLIENT_ID` and `BATTLEGRID_REDIRECT_URI` unset.** `config.ts` `oauth()` | delivered |
| Not configured with one | `check-serving.sh` passes on the delegated path unchanged; 511 tests | delivered |
| The credential stops working | Adapter's 401/403 → `ConnectionRevokedError`, unchanged; rendered in the roster's `unreadable` branch. See PG-601 | delivered, with a MINOR |

### Requirement: A Declared Scope Is Not A Granted One — DELIVERED

| Scenario | Evidence | Verdict |
|---|---|---|
| Acting with a declared scope | `DeclaredScopes`; `personal-key.test.ts` ×3 | delivered |
| What still decides | Classification and confirmation untouched — `mcp-adapter.ts` `callTool` unchanged apart from the seam | delivered |
| Declaring less than the credential holds | Default `mcp:read`; mutation "default widened to include wager" caught | delivered |

### Requirement: A Deployment Without A Login Says So — DELIVERED

| Scenario | Evidence | Verdict |
|---|---|---|
| Using a deployment that authenticates nobody | `PersonalModeNotice`, rendered by the layout; screenshotted both schemes | delivered |
| A deployment that does authenticate | `{personal && ...}`; mutation caught | delivered |

**Scenario coverage**: 9/9 have a test or a recorded manual check.
**Unspecified behavior**: none.
**Regression**: the delegated path is behaviourally untouched — `check-serving.sh`
green on it, 511 tests pass, and the three modified test harnesses changed only
how they construct `AdapterDeps`.

## Scope adherence

Three out-of-scope items declared, three absent and filed:
`oauth-path-may-be-dead-weight` (P2), `cannot-verify-what-a-key-grants` (P2),
and protecting an exposed deployment (stated in the proposal, not filed — it is
a non-goal rather than deferred work).

## Scans

| Scan | Result |
|---|---|
| Conflict markers | clean |
| `TODO\|FIXME\|HACK\|XXX` on touched paths | none |
| Key literals in source or `.env.example` | none |
| Runtime dual-path — anything downstream branching on mode | **none.** Three mentions in `src/application` and `src/domain`, all in comments |

## Quality gates

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS — 511 |
| `npm run build` | PASS |
| `./scripts/check.sh` | PASS |
| `./scripts/check-serving.sh` | PASS (delegated path) |
| Served in personal mode | PASS — five routes, no OAuth client configured |

## Violations

| ID | Severity | Category | Finding | Status |
|---|---|---|---|---|
| PG-601 | MINOR | UI | A refused key renders "Reconnect to continue", naming an action personal mode does not have. Wrong remedy, correct diagnosis. | **FILED** |

**PG-601** is not blocking: the account genuinely cannot be read, nothing fake is
shown, and the disclosure banner above it explains the deployment. Filed as
`personal-mode-says-reconnect` (P1 in the backlog — higher than its gate
severity, because it is the primary failure path of this mode). Not fixed here
because both strings are domain constants and the delegated path deliberately
gives one message for every way authority is lost (design W-C); varying the
remedy by mode is a design decision, not a copy edit.

## Backlog filed

- `personal-mode-says-reconnect` (P1) — PG-601.
- `oauth-path-may-be-dead-weight` (P2) — declared out of scope.
- `cannot-verify-what-a-key-grants` (P2) — declared out of scope.

## Decision

**PASS** — 0 open violations (1 MINOR filed). Timestamped 2026-07-29.
