# Decision Log: author-agents

High-signal decisions only, across all phases. Cosmetic choices are not logged.

---

## Phase 1 — Planning

### 2026-07-27 · AL-1 · Assumption · The live server was read before the form was designed

**Decision**: Tasks 0.1–0.3 ran against the live account before any design work.

**Impacted files**: `findings-agents.md`, `design.md` D-B through D-F.

**Reason**: An authoring form is entirely determined by what the platform will
accept. Designing it from documentation and correcting later means correcting
after the shape of the code has hardened around wrong assumptions.

**Outcome**: four of nine design decisions changed. The documentation was wrong
about the preset list (F-3), silent about the bounds registry (F-2), and gave no
hint that `capabilities.canDelete` reports an action MCP cannot perform (F-1).

**Approved by**: owner (full autonomy granted 2026-07-27).

---

### 2026-07-27 · AL-2 · Constraint · `canDelete` is true and there is no delete tool

**Decision**: Ignore `capabilities.canDelete` entirely — do not map it, do not
store it, never render an affordance from it.

**Impacted files**: `agent-mapper.ts`, `agent-actions.tsx`.

**Reason**: F-1. The flag is `true` on a live agent, and the MCP surface offers
only archive and activate; the tool description itself says permanent delete is
not available over MCP. `capabilities` describes what BattleGrid's first-party
app can do. A client that mapped the flag set to buttons mechanically would ship
a delete button that cannot work, and would learn that from a user.

**Consequence carried forward**: the requirement *Retiring An Agent Is Reversible
And Described As Such* has a scenario for the user who goes looking for permanent
deletion. Answering it honestly — "we can't; here's where you can" — is better
than hiding the question.

**Approved by**: owner.

---

### 2026-07-27 · AL-3 · Constraint · Bounds have two sources and neither is complete

**Decision**: Read bounds from `tradingDefaults.bounds` where the registry
speaks, from the tool's input schema where it does not, and mark a field governed
by neither as unvalidatable rather than treating it as free.

**Impacted files**: `catalog.ts`, `trading-config.ts`.

**Reason**: F-2. The registry carries sixteen limits and is silent on
`positionSizePresets.*Pct` (schema: 0.5–100), `signalTimeoutMinutes` (enum
5/10/15), and the monotonic ordering of the three size presets, which exists only
in prose.

**Known unknown**: whether the server enforces monotonic ordering. Establishing
it requires creating a real agent on an account with one slot remaining. Not
attempted. The client enforces it either way — if the server does not, we are the
only guard; if it does, we fail earlier and more kindly.

**Approved by**: owner.

---

### 2026-07-27 · AL-4 · Design · `brain` is a union, `tradingConfig` is atomic

**Decision**: Model `Brain` as a discriminated union (preset XOR custom). Treat
`tradingConfig` as read-modify-write, always sending the whole object.

**Impacted files**: `brain.ts`, `update-agent.command.ts`.

**Reason**: F-5 and F-6. The server rejects a brain carrying both variants, and
requires every `tradingConfig` field once the object is present. An
optional-fields brain makes the invalid state representable until submission; a
partial config does not error, it *resets* the omitted fields to defaults. A user
who changed `maxLeverage` would silently lose their `maxDailyLossUsd`.

**Approved by**: owner.

---

### 2026-07-27 · AL-5 · Design · Nothing about an agent is stored locally

**Decision**: No `agents` table. The roster is read live on every view.

**Impacted files**: schema (unchanged, deliberately), `list-agents.query.ts`.

**Reason**: BattleGrid owns agent state and it changes without us — the user's own
app, automations, the agent's own activity. A cache would be a second truth that
is wrong most of the time, and optimistic concurrency needs the revision just
read, not the one remembered.

**Accepted cost**: every roster view is a round trip; there is no offline mode.

**Approved by**: owner.

---

### 2026-07-27 · AL-6 · Design · The rebind confirmation binds to a pair, not to a verb

**Decision**: The `ConfirmationToken` is issued against (agent id, target strategy
id). A token issued for a different pair is refused.

**Impacted files**: `rebind.ts`, `rebind-agent.command.ts`, `describe-rebind.query.ts`.

**Reason**: Rebind replaces context modules, signal rules, prose and timeframe
wholesale — it is not a merge. What the user agrees to is specific to one agent
and one target. A token meaning only "a rebind was confirmed" would let that
agreement be applied to a different agent, which is the exact failure DL-5's
token design exists to prevent. This is its first real use.

**Approved by**: owner.

---

### 2026-07-27 · AL-7 · Sequencing · The scope debt closes before the first agent write

**Decision**: Phase 1 of `tasks.md` replaces `scopesFor()` before any mutating
agent code lands.

**Impacted files**: `mcp-adapter.ts`, `connection-repository.ts`.

**Reason**: PG-004 / DL-14. The stub fails *open* — it reports `mcp:read` held
whether or not the grant says so. Change 1 could carry it because nothing it did
mutated a user's account. This change's first new behaviour does. Stacking writes
on a scope check that over-reports authority is the wrong order.

**Approved by**: owner.

---

### 2026-07-27 · AL-8 · Executor handoff

**Decision**: Execution may begin.

**Handoff notes**:
- Build `catalog.ts` and `field-ownership.ts` before any use case. Both are pure
  data plus predicates, both are exhaustively testable, and every rule that
  matters depends on one of them.
- The three-state roster result (D-H) should be the type from the start.
  Retrofitting it means finding every `length === 0` and judging which meaning
  was intended.
- Do not add an `agents` table "just for caching".
- Do not read `canDelete`, even to assert on it.
- Write the test per scenario as each requirement lands.

**Next action**: executor.
