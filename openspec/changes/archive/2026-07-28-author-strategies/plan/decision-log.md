# Decision Log: author-strategies

---

## Phase 1 — Planning

### 2026-07-27 · SL-1 · Assumption · The live server was read before the pipeline was designed

**Decision**: Task 0 ran four read-only tools against the live account, including
a real `compile_strategy_plan` against a PRIVATE strategy with zero bound agents.

**Why that was safe**: `compile_strategy_plan` is annotated `readOnlyHint: true`
by the server itself and its description says "This performs no write."
`apply_strategy_plan` was not called and no strategy was changed.

**Outcome**: seven of nine design decisions came from what came back. The
documentation would have produced a wrong implementation in at least three
places — the plan projection, the mismatches gate, and the confirmation copy.

**Approved by**: owner (full autonomy granted 2026-07-27).

---

### 2026-07-27 · SL-2 · Constraint · `approvedPlan` is not the plan

**Decision**: One function, `toApplyPlan`, performs the projection. Its test
asserts every required field present *and* every rejected field absent.

**Reason**: F-2. Eleven keys out, fifteen in, two renames, one unwrap, eight
omissions that are each an unknown-key error. Handing back what compile returned
— the obvious implementation — fails every time.

**Why the test has two halves**: presence alone would let a stray `diff` through;
absence alone would let a missing `minAtrPct` through. Either half on its own is
decorative.

**Approved by**: owner.

---

### 2026-07-27 · SL-3 · Constraint · `mismatches` are advisory and must never gate

**Decision**: `viability.viable` is the only gate. A non-empty `mismatches` never
blocks an apply.

**Reason**: F-5. A one-word tagline edit came back with two mismatches and
`viable: true`. They describe the strategy's existing signal configuration, not
the change, and the user cannot fix them from the editor. A client that blocked
on them would refuse routine edits with no way around it.

**Recorded because it is genuinely tempting**: `mismatches` is a list of things
that sound like errors, and an empty array *feels* like the success condition.
This is the single easiest way to get this capability wrong, and it is now a
structural test as well as a decision.

**Approved by**: owner.

---

### 2026-07-27 · SL-4 · Planned exception · The plan token is parsed, and the parse may only refuse

**Decision**: Decode the token's claims to refuse locally — expired, foreign,
superseded. Never treat a clean parse as permission.

**Reason**: F-1. The claims are readable without a key and carry exactly what a
local check needs, which turns "the server said no" into "this expired four
minutes ago, compile again". The signature cannot be verified here.

**Auditor note**: this is DL-7's shape a second time. Verify no path treats a
parsed claim as permission, and that an unreadable token yields *no* refusal — if
a format change could start refusing, a token bump becomes an outage; if a parse
could grant, it becomes an authorisation bug, which is worse.

**Approved by**: owner.

---

### 2026-07-27 · SL-5 · Design · The confirmation copy is the platform's, verbatim

**Decision**: Use `reviewContext.confirmationSummary` as the consequence text.
Refuse to propose an apply when the server did not provide one.

**Reason**: F-4. The server writes *"UPDATE strategy 'Midway (fork)' as revision
2; changed axes: IDENTITY; 0 bound agent(s) and 0 open position(s) observed."* —
the operation, revision, axes and blast radius, authored by the party that will
perform it. Ours would be a second description of one act and they would disagree
eventually.

**Stronger than `author-agents` took with rebind**, where the copy is ours because
the platform offers none. Where the platform speaks, it wins.

**What we add rather than replace**: the agent count repeated as its own block.
"5 bound agent(s) observed" inside a sentence is not a warning.

**Approved by**: owner.

---

### 2026-07-27 · SL-6 · Design · A compiled plan is bound to the intent that produced it

**Decision**: Hold a digest of the composed intent with the plan; a changed intent
discards it.

**Reason**: without it, a user compiles A, edits the form to B, and applies — and
A lands, because the token is bound to A's post-state. The server accepts it
happily; it is a valid plan. It is just not the one on screen. Silent, and
plural: it would reconfigure every bound agent to a state nobody reviewed.

**Approved by**: owner.

---

### 2026-07-27 · SL-7 · Deliberate omission · `update_strategy_signal_rule` is not wired

**Decision**: Do not offer the focused single-rule write.

**Reason**: it is a second write path to the same state with weaker review than
compile → review → apply. Offered beside the pipeline it becomes the one people
use, because it is fewer steps, and the pipeline's safety stops being exercised.

**Recorded because it is an omission, not an oversight**: the tool exists, it is
mapped, and it is being left on the table. Adding it later should be a deliberate
exception with its own confirmation.

**Approved by**: owner.

---

## Phase 2 — Execution

### 2026-07-27 · SL-8 · Finding · The structural guard caught its own exemption

**Decision**: The composition root is exempt from the compile/apply scan, and the
exemption is tested.

**What happened**: wiring the strategy use cases made `composition.ts` name both
`compilePlan` and `applyPlan`, and the scan failed — correctly, by its letter.
The root constructs both and calls neither, so the exemption is right; an
untested exemption would be a hole.
`structure.test.ts::the composition root wires them without invoking either`
fails the moment the root starts calling either one.

---

### 2026-07-27 · SL-9 · Deviation · The editor composes one field

**Decision**: Ship `app/(app)/strategies/[id]/edit` composing a tagline only.

**Reason**: the pipeline is the change — compile, review, refuse, confirm,
project, apply, all complete and tested. A section editor is a design problem of
its own and is declared out of scope in the proposal.

**Filed as**: `strategy-section-editor`. Stated in `uiux-review.md` F-1 rather
than ticked off silently.

---

### 2026-07-27 · SL-10 · Executor handoff

**Decision**: Execution complete. 339 tests, up from 267.

**Mutation-checked**, each reverting to named failures:
- `mismatches` gating the apply → 13 failures
- `approvedPlan` sent verbatim → 3 failures
- intent binding removed → 1 failure

**Next action**: production gate.

---

## Phase 3 — Production Gate

### 2026-07-27 · SL-11 · AUDIT · The fourth occurrence, and the guard that should have caught it

**Decision**: PASS. One MAJOR fixed, three MINOR deferred with owners.

**PG-301** — `mapStrategy` defaulted `id` to `''` and `revision` to `0`. Neither
is a display field: the id becomes `strategyId` on a **destructive apply**, the
revision becomes `expectedRevision` on a compile and `sourceRevision` on a fork.
An id-less payload would key on the empty string; a revision-less one would
compile against a revision nobody read, on an operation that reconfigures every
bound agent. Fixed by refusing the payload, as `mapAgent` already did for exactly
these two fields.

**The pattern, fourth time**: `expectedRevision ?? -1` (PG-003),
`slotUsage.limit ?? 0` (PG-101), `Number(formData.get(…))` (PG-201), and now
`id ?? ''` with `revision : 0`.

**And the guard did not catch it.** `wire-the-app` added
`concurrency.test.ts::no identifier is coerced into existence` precisely so a
fourth occurrence would fail the build. It scans for form coercions and for
`<identifier> ?? <value>`; `String(s['id'] ?? '')` matches neither. The fourth
occurred and the build stayed green — PG-301 was caught by a human reading the
scan output, which is the work the guard was supposed to replace.

That is the finding worth carrying, more than the defect itself: **a guard that
misses the next instance is worse than none**, because it creates a belief the
class is covered. Filed as `extend-coercion-guard-to-mappers` (P2) with the
concrete rule — inside a mapper or adapter, an `id` or `revision` assignment must
be preceded by a `throw`, as both mappers now are.

**SL-4 discharged**: the token parser is verified on both counts — it cannot
return a permission shape, and an unreadable token yields no refusal. A format
change degrades to "submit and let the server judge" rather than to an outage or
an authorisation bug.

**Next action**: archiver.
