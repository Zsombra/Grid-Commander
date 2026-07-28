# Design: author-strategies

Nine decisions, seven of them downstream of `findings-strategies.md`.

---

## S-A · `toApplyPlan()` is one named function, and its test asserts both directions

**Decision**: The projection from `approvedPlan` to the `plan` that `apply` accepts
lives in exactly one function, and its test asserts every required field is
present **and** every forbidden field is absent.

**Why**: F-2. Fifteen fields in, eleven out, two renames (`postState.id` →
`strategyId`, `explicitRuleOverrides` → `rules`), one unwrap, and seven omissions
that are each an unknown-key error. The obvious implementation — pass back what
you were given — fails every time.

Asserting only the presence half would let a stray `diff` through; asserting only
the absence half would let a missing `minAtrPct` through. Both halves, or the test
is decorative.

## S-B · The plan token is parsed, and what is parsed may only refuse

**Decision**: Decode the token's claims and use them to refuse locally — expired,
different user, different strategy, stale revision. Never use them to conclude a
plan is valid.

**Why**: F-1. The claims are readable and carry exactly what a local check needs,
which turns "the server said no" into "this plan expired four minutes ago,
compile again". The signature cannot be verified without the server's key, so a
token whose claims look fine has proven nothing.

**This is the same shape as DL-7's degraded allowlist**, and it earns the same
auditor note: verify no path treats a parsed claim as permission. If the parse can
grant, it is a violation.

**Cost**: a dependency on an undocumented token layout. Mitigated by treating an
unparseable token as *unknown* rather than as invalid — an unknown token is
submitted and the server decides, which is exactly the behaviour we would have
had without the parser.

## S-C · `mismatches` are rendered, `viability.viable` decides

**Decision**: A non-empty `mismatches` never blocks applying. `viability.viable`
is the only gate.

**Why**: F-5. A one-word tagline edit produced two mismatches while remaining
viable. A client that blocked on mismatches would refuse ordinary edits with no
way around it, and the user could not fix them — they describe the strategy's
existing signal configuration, not the change.

**The tempting bug**, written down because it is genuinely tempting: `mismatches`
is a list of things that sound like errors, and the array being empty *feels* like
the success condition.

## S-D · The confirmation is issued against the server's own summary

**Decision**: The consequence text is `reviewContext.confirmationSummary`, stored
with the token verbatim. Grid-Commander composes no description of its own.

**Why**: F-4. The server writes *"UPDATE strategy 'Midway (fork)' as revision 2;
changed axes: IDENTITY; 0 bound agent(s) and 0 open position(s) observed."* — the
operation, the revision, the axes and the blast radius, authored by the party that
will perform it.

Writing our own would create two descriptions of one act, and they would disagree
the first time BattleGrid changed a behaviour. This is a stronger position than
`author-agents` took with rebind, where the copy is ours because the platform
offers none.

**What we add rather than replace**: the count of bound agents is repeated
prominently, because "5 bound agent(s) observed" inside a sentence is not the same
as a warning.

## S-E · A compiled plan is bound to the intent that produced it

**Decision**: The compiled plan is held with a digest of the user's composed
intent. Changing the intent discards the plan.

**Why**: the requirement scenario *The composed change is edited after compiling*.
Without this, a user compiles A, edits the form to B, and applies — and A is what
lands, because the token is bound to A's post-state. The server would apply it
happily; it is a valid plan. It is just not the one on screen.

## S-F · The blast radius is read from the roster, not counted locally

**Decision**: `boundAgentCount` comes from `list_strategies` and, at apply time,
from `approvedPlan.bindingImpact`. Grid-Commander never counts agents itself.

**Why**: F-3, and the Iron Rule. We could derive it by listing agents and grouping
by `strategyId`, and that count would be wrong whenever an agent changed between
the two reads. The platform reports it in the same response as the strategy.

## S-G · Compile and apply are different shapes, not two buttons

**Decision**: Compiling produces a review *screen*; applying is an action on that
screen and does not exist before it. There is no path from the editor straight to
an apply.

**Why**: BL-5. The platform made compile effect-free so a human could look before
committing. Two similar buttons side by side would hand that back, and the mistake
would be one click wide with a fleet-sized consequence.

## S-H · `update_strategy_signal_rule` is not wired

**Decision**: The focused single-rule write is not offered.

**Why**: it is a second write path to the same state, with a weaker review than
compile → review → apply. Offered beside the stronger one, it becomes the one
people use, because it is fewer steps. The right time to add it is when there is a
demonstrated need that the pipeline serves badly — and then as a deliberate
exception with its own confirmation, not as a convenience.

**Recorded because it is a deliberate omission**, not an oversight: the tool
exists, it is mapped, and it is being left on the table.

## S-I · Vocabulary is fetched per composing session and cached for it

**Decision**: Categories, metrics and signals are read when a user starts
composing and reused for that session. Not cached across sessions, not written
down.

**Why**: F-8, twice over. My first compile guessed `coinSelection.mode` and was
wrong — the values are `ranked | explicit`, and the reference lists the field
without its values. The second failed on a rule (`at least one updatable field`)
that appears in no schema field at all.

Ten categories and 61 metrics is too much to re-fetch per keystroke and too
volatile to freeze. A composing session is the natural unit: long enough to be
cheap, short enough that a deployment mid-session is the recompile the platform
already forces.
