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

---

## Phase 2 — Execution

### 2026-07-27 · AL-9 · Deviation · Routes were not wired, and the reason predates this change

**Decision**: Ship the presentational components; add no `page.tsx`.

**Impacted files**: `app/` (unchanged), master plan inventory items #19–#21.

**Reason**: nothing can construct them. Every use case takes
`{ userId, accessToken }`, and the product has no session — no request can
answer which user or which token. `connect-battlegrid-account` has exactly the
same gap, which is why it also shipped components and no routes.

Building a session inside this change would mean designing identity persistence
against no requirement, in a change whose delta spec is about agents.

**Filed as**: backlog `no-composition-root`, **P1** — it blocks the MVP rather
than this change, and it is now named rather than left to be discovered.

**Worth recording**: both delta specs are fully satisfied by code no user can
reach. A requirement set that never says *reachable* can be delivered completely
and still not be a product. The next spec should say it.

**Approved by**: owner (full autonomy).

---

### 2026-07-27 · AL-10 · Deviation · `TradingConfig` is an opaque field map

**Decision**: Model the trading config as `{ fields: Record<string, unknown> }`
rather than a twenty-five field interface.

**Reason**: BattleGrid requires every field whenever the object is present
(F-6), the set grows, and no rule in the domain reasons about any individual
limit — the rules are "validate against the registry" and "never send a partial
one". A typed struct would be a second schema to keep in sync with the server's,
bought with nothing.

**Accepted cost**: a typo in a field name is not a compile error. Mitigated by
the fact that the fields come from a read of the agent, not from a literal.

**Approved by**: owner.

---

### 2026-07-27 · AL-11 · Planned exception · One hard-coded list, at the boundary

**Decision**: The ten brain presets are listed in `agent-adapter.ts`.

**Reason**: constraint "no value is offered that the platform did not confirm"
would otherwise forbid it. They are a closed enum in the create tool's schema
and there is no endpoint that lists them — there is nothing to read at runtime.
Kept at the adapter boundary, beside the tool names, so a schema surprise lands
in one place.

**Auditor note**: the AL-1 scan in `boundaries.test.ts` exempts
`infrastructure/battlegrid/` and would fail if this list moved inward. Verify
the exemption is still that narrow.

**Approved by**: owner.

---

### 2026-07-27 · AL-12 · Executor handoff

**Decision**: Execution complete. 220 tests (up from 104), typecheck, lint and
strict validation green.

**Mutation-checked**, each reverting to a named failure:
- ownership split permitting strategy-owned fields → 4 failures
- read-modify-write sending only the changed trading-config field → 1 failure
- `scopesFor` restored to the constant → 4 failures
- `expectedRevision ?? -1` restored → 1 failure

**Next action**: verifier, then the production gate.
