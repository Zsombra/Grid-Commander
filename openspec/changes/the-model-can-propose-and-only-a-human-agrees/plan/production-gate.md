# Production Gate

Filled by the auditor after execution. Every line is PASS or BLOCKED; there is
no partial credit on this capability.

## The negative — a model cannot reach a write

- [ ] No tool reaches a use-case that calls a mutating BattleGrid tool
      (derived from the adapters, not from a list)
- [ ] A tool wired to `updateAgent` under an innocent name **fails** the guard
      — proven by construction, not asserted in a comment
- [ ] No MCP response can carry a confirmation token
- [ ] No code path performs a proposal without a human action: no worker, no
      scheduler, no retry, no setting

## The store holds nothing spendable

- [ ] No confirmation-token column
- [ ] No access-token column
- [ ] Both proven against a real PostgreSQL
- [ ] Ownership enforced by the database, not only by the query
- [ ] A proposal is immutable once recorded

## Agreement is bound to now

- [ ] `/pending/[id]` describes against the target as it is at open time
- [ ] Where the fresh describe differs from the proposal, the difference is
      shown rather than reconciled
- [ ] A target that is gone or ineligible offers no confirmation and says why
- [ ] Agreeing runs the existing perform and lands in the audit

## Scope held

- [ ] `applyPlan` is not proposable, and asking is refused by name (DL-1)
- [ ] The staleness horizon is 72 hours, and stale proposals are visible as
      history rather than deleted (DL-2)
- [ ] No elicitation, no model-side agreement mechanism

## Gates

- [ ] `./scripts/ci.sh` green with a credential and without
- [ ] `openspec.py validate` clean
- [ ] `docs/MCP_SERVER.md` no longer states no writes are coming
- [ ] No credential in the diff

**Verdict:** _(auditor)_
