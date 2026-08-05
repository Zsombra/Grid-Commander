# Decision Log

The two questions `tasks.md` left open, decided here rather than deferred into
implementation. Both were framed as operator calls; both turn out to have a
defensible answer derived from the code, and the reasoning is recorded so a
reviewer can disagree with the reasoning rather than the number.

---

## DL-1 — Which operations may be proposed

**Decision: the seven whose `describe` can be re-run from a target and values
alone. `applyPlan` is excluded.**

The criterion is not "which writes matter" but **"can the consequence be
recomputed at the moment a human reads it"**. That is the whole design: a
proposal stores intent, and the web app describes it fresh when opened. An
operation whose describe cannot be reconstructed from stored intent cannot
honour that, and would have to fall back to a consequence rendered when the
model proposed — the stale sentence this change exists to avoid.

Checked against each `Describe*Request` in `src/application/use-cases/`:

| operation | describe needs | proposable |
|---|---|---|
| edit | `agentId`, `changes` | **yes** |
| rebind | `agentId`, `strategyId` | **yes** |
| archive agent | `agentId` | **yes** |
| deploy | `agentId`, coin | **yes** |
| undeploy | `agentId`, coin | **yes** |
| retune rule | `strategyId`, `signalId`, intent | **yes** |
| archive strategy | strategy, `expectedRevision` | **yes** |
| **apply plan** | `plan: CompiledPlan` + `currentIntent` | **no** |

`DescribeApplyRequest` takes a `CompiledPlan`, which exists only as the output
of `compile_strategy_plan` and carries a `planToken` that expires in five
minutes. A proposal that stored one would be dead before a human saw it; a
proposal that stored the *sections* instead would require recompiling at open
time, and a recompile can legitimately return a different plan — at which point
the operator is agreeing to something the model never proposed.

**Rejected:** proposing an apply by storing the compile inputs. It is not
unsafe, it is *unclear*, and strategy authoring already has a working ceremony
in the web app. Filed rather than forced.

**Consequence for the spec:** `A Model Can Record A Proposal And Nothing More`
already requires that an operation the product does not offer is refused by
name and stores nothing. Apply is the first real instance, and its refusal
should say where applying does happen.

---

## DL-2 — How long a proposal stays actionable

**Decision: 72 hours.**

The important observation is that **safety does not rest on this number.** A
proposal carries no authority, mints nothing, and reserves nothing; the
consequence is computed when a human opens it, against the world as it is then.
An eight-day-old proposal is not dangerous — opening it describes the change
against current values, and if the target moved the difference is shown.

So the horizon is a signal-to-noise decision, not a safety one, and it should be
chosen as such:

- **Not the confirmation TTL.** `CONFIRMATION_TTL_SECONDS = 300` is how long an
  *agreement* survives. Reusing it would conflate an agreement with a
  suggestion and make the common path an expiry.
- **Long enough to cover a weekend.** 24 hours fails an operator who proposes
  on Friday evening. 72 hours does not.
- **Not "never."** A queue that only grows stops being read, and a surface
  nobody reads is where a change waiting to happen goes unnoticed — which is
  the failure `The Operator Can See What Has Been Proposed For Them` exists to
  prevent.

**Rejected: 30 days.** Defensible on safety grounds and wrong on attention
grounds. Trading agents move revision, balance and positions within hours; a
month-old suggestion is almost always about a world that no longer exists, and
showing it as actionable trains the operator to skim.

**Stale is not deleted.** A stale proposal stops being actionable and stays
visible as history, because "the model suggested stopping this agent three days
ago and nobody looked" is exactly the thing an operator should be able to find
out.

---

## DL-3 — Where the guard rewrite draws its line

**Decision: reachability of a BattleGrid write, derived from the adapters —
not a name prefix, and not a list.**

`mcp-read-only.test.ts` currently derives mutating use-cases from
`/^(describe|perform|create|update|…)/`. That was correct while no tool touched
any of them. It cannot survive this change, because `propose_*` legitimately
reaches nothing while a tool named `stop_trading` could reach `updateAgent`
without matching the prefix at all.

The replacement asks whether a use-case can reach a port method that maps to a
tool BattleGrid classifies as mutating. It is stricter than what it replaces,
and the plan requires proving that by construction: a tool wired to
`updateAgent` under an innocent name must fail the new guard and pass the old.

**Related, and the reason this is stated so firmly:** the live-writes guard
shipped in #44 matched *tool names in test source*, and missed
`apply-probe.test.ts` entirely because that file mutates through
`ForkStrategyCommand` and `ApplyPlanCommand` without naming a tool. A guard
that matches the shape of yesterday's mistake is not a guard. Derive from what
the code can reach, not from what it happens to spell.
