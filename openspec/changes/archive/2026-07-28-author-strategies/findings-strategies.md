# Findings: what the live server says about strategies

Task 0, run against `https://mcp.battlegrid.trade/mcp` on 2026-07-27. Four
read-only tools: `list_strategies`, `list_strategy_categories`,
`compile_strategy_plan`, plus the tool schemas.

**`compile_strategy_plan` is annotated `readOnlyHint: true` by the server itself**
and its description says "This performs no write." It was called twice against a
PRIVATE strategy of the test account with **zero bound agents** — the safest
possible target. `apply_strategy_plan` was **not** called, and no strategy was
changed.

---

## F-1 — The plan token is a readable, self-describing envelope

`planToken` is `bgsp1.<base64url claims>.<signature>` — three parts. The claims
decode without a key:

```json
{
  "authoringCatalogDigest": "2d35afc7…",
  "credentialId": "9a022f12-…",
  "expectedRevision": 1,
  "expiresAtEpochMs": 1785200930257,
  "materializationFenceDigest": "4f53cda1…",
  "operation": "UPDATE",
  "postStateDigest": "fee760f6…",
  "proposedRevision": 2,
  "strategyId": "9fc7be37-…",
  "userId": "0eccbf37-…",
  "version": 1
}
```

**Consequence**: the product can answer "is this token still usable?" *locally* —
expired, wrong user, wrong strategy, stale revision — and say so, instead of
submitting a plan that is certain to be rejected and relaying a server error.

**The constraint that comes with it**: the signature cannot be verified
client-side, so these claims may be used **only to refuse, never to permit**.
Exactly the shape of DL-7's degraded allowlist. A token whose claims look fine is
not thereby valid; only the server decides that.

## F-2 — `approvedPlan` is not the plan, and sending it back is an error

`approvedPlan` returns eleven keys:

```
operation  postState  proposedRevision  explicitRuleOverrides  viability
mismatches  diff  authoringCatalogDigest  expiresAt  expectedRevision  bindingImpact
```

`apply_strategy_plan`'s `plan` wants fifteen, and they are a **projection with
renames**:

| plan field | comes from |
|---|---|
| `operation`, `expiresAt` | `approvedPlan.*` directly |
| `strategyId` | `approvedPlan.postState.id` — **renamed** |
| `name`, `description`, `tagline`, `timeframe`, `regimeAutoDerive`, `regimeTimeframe`, `marketReadText`, `sections`, `minAggregateScore`, `minRequiredCount`, `minAtrPct` | `approvedPlan.postState.*` — **unwrapped** |
| `rules` | `approvedPlan.explicitRuleOverrides` — **renamed** |

And seven fields must **not** be sent: `postState` (as a container),
`proposedRevision`, `viability`, `mismatches`, `diff`, `authoringCatalogDigest`,
`expectedRevision`, `bindingImpact`. Each is an unknown-key error.

**Consequence**: the obvious implementation — hand `approvedPlan` back — fails
every time. The projection is fiddly enough (two renames, one unwrap, seven
omissions) that doing it inline at a call site is a defect waiting to happen. It
belongs in one named function with a test that asserts *both* directions: every
required field present, every forbidden field absent.

## F-3 — The blast radius is known before you compile, and again after

`list_strategies` carries `boundAgentCount` per strategy; `approvedPlan.bindingImpact`
carries it again alongside a `materializationFenceDigest`. Live values today:
**Berlin 5, Dunkirk 4, El Alamein 2, Iwo Jima 2**, several at 1, four at 0.

**Consequence**: "editing this strategy changes 5 agents immediately" can be said
on the roster, before the user opens an editor — not only in the confirmation.
The fence digest is what makes a token go stale when the bound set moves, which
is why a recompile is required rather than a retry.

## F-4 — The server writes the confirmation copy

`reviewContext.confirmationSummary`:

> *"UPDATE strategy 'Midway (fork)' as revision 2; changed axes: IDENTITY; 0 bound
> agent(s) and 0 open position(s) observed."*

**Consequence**: this is the consequence text the confirmation should be issued
against. It is authored by the platform, names the operation, the revision, the
axes and the blast radius, and it cannot drift from what the server will actually
do — because the server wrote it. Composing our own would be a second
description of one act, and the two would disagree eventually.

## F-5 — `mismatches` is populated on a perfectly ordinary change

A one-word tagline edit returned mismatches:

```
ACTIVE_SIGNAL_MODULE_NOT_IN_REPORT — bollinger_cci_overbought
ACTIVE_SIGNAL_MODULE_NOT_IN_REPORT — bollinger_cci_oversold
```

while `viability.viable` was `true` and `diff.changedAxes` was `["IDENTITY"]`.

**Consequence**: mismatches are **advisory**, not errors. A client that refused to
apply while `mismatches.length > 0` would block routine edits and be impossible to
work around. `viability.viable` is the gate; mismatches are shown, not enforced.
This is the single easiest way to get this feature wrong.

## F-6 — `diff.changedAxes` is the vocabulary for "what will change"

Seven axes: `IDENTITY`, `timeframeProfile`, `report`, `marketRead`, `setupGates`,
`signalRules`, `lifecycle`. Unchanged axes come back `null`, and `changedAxes`
lists the ones that moved.

**Consequence**: the review screen is organised by axis, from the server's own
diff, rather than by a field-by-field comparison we compute. Recomputing it
client-side would violate the Iron Rule and produce a second opinion on a
question the server already answered.

## F-7 — Strategies have a quota

`list_strategies` returns `quota: {used: 2, limit: 25, remaining: 23}`. Same shape
as agents' `slotUsage`, same requirement: say so before the form.

## F-8 — The vocabulary genuinely cannot be guessed, and it caught me first try

The first compile failed:

```
invalid_union_discriminator at request.coinSelection.mode
options: ["ranked", "explicit"]
```

I had guessed `TOP_BY_VOLUME`. The reference table lists the field and not its
values. The second attempt failed too — *"At least one updatable field is
required"* — a rule that appears in no schema field.

**Consequence**: this is the requirement *Vocabulary Is Discovered, Never
Guessed* stated as concretely as it can be. Two of my first three calls were
rejected for facts that only the server holds. Ten categories and 61 metrics are
reachable through `list_strategy_categories` → `list_strategy_vocabulary` →
`get_metric_construction_hints`; none of it belongs in this repo.

## F-9 — Five minutes, and it is exact

Compiled at `01:03:50Z`, `expiresAt: 01:08:50Z`, `expiresAtEpochMs` agreeing.

---

## What was not established

- **What `apply_strategy_plan` returns, and how it rejects a mismatch.** Applying
  is destructive and would change a real strategy on a real account. Not
  attempted. The rejection path is handled through the general JSON-RPC error
  route rather than against a specific code.
- **Whether `REPAIR_REQUIRED` from `restore_strategy` looks the way the docs
  describe.** Same reason.
- **Whether a fork counts against the quota immediately.** `fork_strategy` writes.
