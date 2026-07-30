# Architecture Review: a-confirmation-binds-to-what-was-agreed

## Dependency direction

The new code sits where the rule belongs and points inward only.

- `src/domain/capability/digest.ts` — imports `node:crypto` and nothing local.
- `src/domain/capability/confirmation.ts` — imports its sibling `digest.js`.
  `confirmationTarget` is a domain rule about what an agreement covers.
- `src/ports/{agents,strategies}.ts` — import `Confirmation` from the domain.
  Ports already import domain types; nothing new in kind.
- `src/infrastructure/battlegrid/{agent,strategy}-adapter.ts` — import
  `Confirmation` as a type and no longer construct targets.
- `src/presentation/form.ts` — `editIntent` and `MONEY_FIELDS`. Presentation, and
  the page imports them rather than defining its own.

**`digestOf` moved because the boundary forced it.** It lived in
`compile-plan.command.ts`, an application use case; `confirmationTarget` needs it
and the domain may not import `src/application/`. `boundaries.test.ts` enforces
the direction, so leaving it would have failed the architecture check rather than
merely reading oddly. Confirmed: `compile-plan.command.ts` now imports it.

**`app/` still does not import the domain.** The page reads
`editIntent`/`MONEY_FIELDS` from `src/presentation/`, which is the layer routes
may use. `detail.test.ts` already asserts this for the strategy page and
`boundaries.test.ts` for all of `app/`; both pass.

## No runtime dual-path

The central property. There must not be a bound way and an unbound way to confirm.

- One construction: `confirmationTarget`, five named cases, no free-form path.
  `tests/architecture/confirmation-binds-values.test.ts` asserts no target is
  composed anywhere else, in either direction.
- One mapping onto the wire: the `call` helper in each adapter splits the pair
  into `target` and `confirmationToken`. Previously each write method did its own.
- One reader for the edit intent: `editIntent`, called twice. `pick` and
  `numberish` are deleted, and their absence is asserted.
- `rebindTarget` is deleted rather than repointed. Two functions producing one
  string is the dual path in miniature, and it is what this change exists to
  remove.

The two flows whose confirmation is conditional —
`confirmation: token === undefined ? undefined : { … }` — are not a dual path:
restoring a strategy and reactivating an agent are not destructive, so no token
exists to bind. The *shape* is uniform; only its presence varies, and the guard
reads the pairing rather than the surrounding expression precisely so a ternary
cannot hide one.

## No defensive fallback masking a contract

- `confirmation?: Confirmation | undefined` on the two non-destructive writes is
  the contract, not a fallback: `enforce()` requires a token only when the tool
  classifies destructive, and it already refuses a destructive call arriving
  without one.
- `extras.confirmation?.target` in the `call` helpers is optional-chaining over an
  optional parameter, resolving to `undefined` — which `enforce()` treats as "no
  confirmation supplied" and refuses for a destructive tool. Fails closed.
- Nothing catches a consume failure and proceeds. The refusal is
  `ConfirmationRequiredError` from `enforce()`, before the audit entry and before
  any HTTP.

## No stale or redundant runtime code

- `rebindTarget` — removed. Call site and tests repointed to
  `confirmationTarget.agentRebind`; the reasoning that justified it is kept in a
  comment where it stood.
- `pick`, `numberish` in the edit page — removed, replaced by one reader.
- `digestOf` — **this line claimed "moved, not duplicated. One definition" and was
  false when written.** The function was added to the domain and left in place in
  `compile-plan.command.ts`: two definitions of `digestOf` and two of
  `canonicalise`, through 770 green tests and every gate command. The production
  gate found it by reading the plan's file inventory against
  `git diff --name-status` (PG-001) — the one check no command runs.

  Now true, and verified rather than asserted:
  `grep -rn 'function digestOf\|function canonicalise' src/` returns one each, in
  `src/domain/capability/digest.ts`. `compile-plan.command.ts` and
  `apply-plan.command.ts` import it; the key-ordering tests stay where they are.
  `confirmation-binds-values.test.ts` now asserts the uniqueness and fails when a
  second copy is re-injected (PG-005).

  Kept as a correction rather than rewritten, because a review artifact that
  quietly starts being right teaches nothing. This is the third artifact in this
  project to state a rule and describe its opposite.
- `mustForkToEdit` — untouched and still used by `DescribeArchiveStrategyQuery`.
  Checked rather than assumed, because an earlier change nearly un-exported it.

`rg 'TODO|FIXME|HACK|XXX'` over the touched paths: none.

## Contract consistency

`Confirmation` is declared once, in the domain, and imported by both ports, both
adapters and the fakes. An earlier draft of this change declared it twice — once
per port file — which would have been the same duplication one layer up; caught
and collapsed before anything used it.

Field names and types agree across layers: `token` and `target`, both `string`,
`readonly` on the interface.

## What this review flags

**One finding, and it is recorded rather than fixed.** The digest anchors on the
submitted intent, so the guarantee is *"the values the user agreed to are the
values the command was given"* — not *"the object sent to BattleGrid is the object
described"*. The merge between them is deterministic given the agent's current
config, and `expectedRevision` refuses the call if that config moved. So the gap
is closed by a different mechanism rather than by this one, which is worth stating
plainly because the requirement's wording ("the change performed is the change
described") is stronger than what a digest over the intent can prove on its own.

DL-1 records the stored-changes alternative that would close it structurally, and
the condition under which to take it.
