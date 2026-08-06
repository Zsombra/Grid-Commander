# Production Gate

Filled by the auditor after execution. Every line is PASS or BLOCKED; there is
no partial credit on this capability.

Audited 2026-08-06, against `main` at the point every task closed — including
the two that spent a day blocked on BattleGrid being down and were walked the
moment it returned.

## The negative — a model cannot reach a write

- [x] **PASS** No tool reaches a use-case that calls a mutating BattleGrid tool.
      `mcp-read-only.test.ts` derives the chain end to end and nothing in it is
      hand-maintained: mutating tools from the surface record's own
      classification → the port methods that send them, out of the adapters →
      the file implementing each use-case, out of `composition.ts` → whether
      that file calls one. Each link asserts it is non-empty, so the guard
      cannot pass vacuously
- [x] **PASS** A tool wired to `updateAgent` under an innocent name **fails** —
      proven by construction. A tool named `stop_trading` produced
      `stop_trading → updateAgent → updateAgent`. The rule it replaced matched
      none of it
- [x] **PASS** No MCP response can carry a confirmation token. Asserted three
      ways so none is the only one: the recording use-case holds no confirmation
      store, no tool in `TOOLS` resolves to a `describe*` use-case, and no
      `propose_*` body names a token. Proved by injecting
      `confirmationToken: 'leaked'` into a propose tool
- [x] **PASS** No code path performs a proposal without a human action.
      `proposals-are-inert.test.ts`: nothing touching proposals may schedule
      (timer, interval, cron, worker, queue consumer), the perform is reachable
      only from a `'use server'` route, and the close follows the write. Proved
      by injecting a `setTimeout` into `resolve-proposal.command.ts`.
      `composition.ts` is **not** exempted — it wires `updateAgent` without
      calling it, so the rule matches `.execute(` rather than the bare name

## The store holds nothing spendable

- [x] **PASS** No confirmation-token column
- [x] **PASS** No access-token column
- [x] **PASS** Both proven against a real PostgreSQL —
      `tests/db/proposals.test.ts`, "has no column for a confirmation token or
      an access token", read from the live schema rather than the Drizzle source
- [x] **PASS** Ownership enforced by the database. "is invisible to another
      account", "cannot be resolved by another account", "refuses a user the
      database does not know"
- [x] **PASS** A proposal is immutable once recorded, and resolution is
      one-way: "refuses a second resolve, so a double submit cannot report
      success twice"

## Agreement is bound to now

- [x] **PASS** `/pending/[id]` describes against the target as it is at open
      time. Confirmed **live**: opened against a real agent, the consequence and
      the confirmation both formed from a read taken during that request
- [x] **PASS** The difference is shown rather than reconciled — three honest
      dispositions, all rendered, never merged. Confirmed live in both
      directions: `tradingConfig.tradingMode=will-change` against a live value,
      and `no-op` for a proposal the account already satisfied
- [x] **PASS** A target that is gone offers no confirmation and says why —
      `not-possible`, walked live against a non-existent id
- [x] **PASS** Agreeing runs the existing perform and lands in the audit.
      Live: `agree: updated`, `audit: update_intelligence_agent=succeeded`,
      and `replay: threw ConfirmationRequiredError` — the agreement is spent
      once

## Scope held

- [x] **PASS** `applyPlan` is not proposable and asking is refused **by name**,
      with the reason: its consequence is bound to a five-minute plan token, so
      it cannot be recomputed later (DL-1)
- [x] **PASS** `STALE_AFTER_HOURS = 72`, and `partition` keeps stale proposals
      visible as history rather than deleting them (DL-2)
- [x] **PASS** No elicitation and no model-side agreement mechanism. Option 2
      was taken deliberately; elicitation was not established and therefore not
      chosen, which is what `the-assistant-cannot-be-trusted-with-a-write`
      asked for

## Gates

- [x] **PASS** `./scripts/ci.sh` green **with a credential and without** — ten
      gates, `freshness` included. The keyed run was amber for a day while
      BattleGrid was unreachable; it is green now, and the four probes that
      failed then pass untouched, which settles that they were the platform
- [x] **PASS** `openspec.py validate` clean
- [x] **PASS** `docs/MCP_SERVER.md` rewritten — "It cannot change anything. It
      can propose."
- [x] **PASS** No credential in the diff. Scanned before every commit

## Found during the audit, fixed, and worth recording

The live walk is what produced these. None was reachable from a fake.

1. **A proposed `tradingConfig` travelled inside `changes`**, so agreeing sent a
   partial — which BattleGrid does not reject; it *resets what the send omits*.
   Stopping an agent would have cleared every loss cap it ran under. The split
   is now `editArguments`, shared with the edit form, which had always done it
   inline. The live walk now observes the merge directly: **23 fields sent where
   the model named one, and the $10 caps intact after the agent was stopped**
2. `reconcile` compared the partial against the whole config object, so the
   difference read "will change" even for an agent already off
3. A proposal the account already satisfied arrived `ready` — a button to agree
   directly above the words "nothing here would change the account"
4. `readOnlyHint: true` was served for every tool, which stopped being true the
   moment a tool that *records* shipped

**Verdict: PASS.** Every line above is green, each backed by something that was
run rather than read. The capability's own standard — "either a model cannot
reach a write, or the read-only claim in the docs is false" — is met in the
first sense: a model can propose, reach nothing, and hold nothing spendable.
