# A drafted condition can be tried

## Why

Two changes landed the reading half of the condition layer.
`the-condition-layer-is-legible` (2026-08-05) renders what a condition *says* on
`/strategies/[id]`. `the-condition-outcomes-are-legible` (2026-08-06) renders
what it *did*, per coin, on `/strategies/[id]/preview`.

Both surfaces answer questions about conditions that already exist. Neither lets
an operator ask the question that comes next: **what would happen if I wrote a
different one?**

That gap is not cosmetic. Conditions decide *direction* — a strategy's signals
produce a score, and a condition decides whether the score is consulted at all.
An operator looking at Berlin's `FULL_SEND_DOWN` can read that it fires when 3
of 6 members hold, and can read that it came back `FALSE` on BTC with the
clause-level reason. What they cannot do is ask *would 2 of 6 have fired?* —
which is the question that turns reading into authoring.

## What this change does, and what it deliberately does not

**It builds compose-and-try. It does not build save.**

A new surface, `/strategies/[id]/conditions`, lets an operator compose a
condition from the platform's own grammar and have **BattleGrid resolve it**
against live market state, beside the strategy's existing conditions, on coins
the operator picks. The answer comes back with the same clause-level evidence,
the same provisional marking and the same three-state counts the preview surface
already renders — because it is the same payload from the same tool.

Nothing is saved. Nothing can be saved from this surface. That is stated on the
page, not merely true of it.

### Why the write is not in this change

`preview_strategy_report` and `compile_strategy_plan` accept the **same**
condition grammar — checked against the probed record of 2026-08-06, where both
declare `conditions[]` as `{conditionKey, name, definition, verdict}` over the
same recursive `definition` union. So a draft this surface resolves is
structurally a draft the compiler would accept. The write is one step away.

It is one step away, and the step is not safe to take yet, for three reasons
that are facts about the platform rather than about our appetite:

1. **There is no per-condition tool.** The probed surface carries 110 tools and
   none of them writes a condition. The only path is `compile_strategy_plan`
   (UPDATE) → `apply_strategy_plan`, which submits the strategy's *whole*
   `conditions` array as part of a post-state that also carries its sections, its
   thresholds and its tagline. Editing one condition means resubmitting all of
   them inside a plan that reconfigures every bound agent atomically.
2. **Whether an UPDATE that omits `conditions` preserves them is unobserved.**
   `conditions` is optional on the compile request and *required* on the apply
   plan; `toApplyPlan` copies it out of `postState`. What the compiler puts in
   `postState.conditions` when the request omitted the field — the strategy's
   existing conditions, or an empty array — decides whether today's edit page is
   safe or is silently clearing conditions on every tagline change. **No capture
   in this repo answers it** and it is not answerable from the schema. Filed as
   `an-update-that-omits-conditions-is-unobserved`, with the exact call.
3. **The offline conformance guard is blind here.** The probed record flattens
   the recursive `definition` union to its outer object's keys, so
   `conditions[].definition` records `accepts: [kind, members, n, op]` — the
   group branch only. A clause's `column` and `label`, and a reference's
   `conditionKey`, read as violations of a closed set the live schema does not
   close. `strategy-adapter.ts` already says so where it sends conditions to the
   preview. The consequence for this change is concrete: the guard that caught
   the sixth dead write path cannot check a composed condition payload. Filed as
   `the-record-flattens-the-condition-union`.

A write built on three unknowns, one of them destructive and fleet-wide, is
exactly the shape of the dead write paths this product has already paid for six
times. So the honest deliverable is the half that is coherent on its own — and
this half **retires one unknown for free**, because a draft the preview resolves
is a draft whose serialisation the platform has accepted.

### What the write will need when it is taken

Recorded here so the next change does not rediscover it. The ceremony is not
optional and not novel: `describe → confirm → perform`, with the confirmation
bound to the exact values it was formed against. `retune-rule.command.ts` is the
closest precedent — it binds
`strategy:<id>@r<revision>/rule:<signalId>#<digest of the values>` so that an
agreement about allocation 1 cannot authorise allocation 3. A condition write
binds the same way over the whole composed condition list, because the platform
takes the list whole; `confirmationTarget` is the only place that string may be
built, and `strategyPlan(strategyId, intentDigest)` already exists for exactly
this pipeline. None of that is built here.

## What changes

1. **A condition can be composed against a strategy.** Key, name, verdict, and a
   definition built from the platform's grammar: one clause, one reference to
   another condition, or one group over members that are themselves clauses or
   references. Deeper nesting is **read** but not composed here — said on the
   page rather than implied by an absent control.
2. **Or started from one the strategy already has**, taking that condition's
   definition whole at any depth and giving it a different key or a different
   direction. Without this, the conditions most worth asking a question about —
   the deeply nested ones — would be exactly the ones no question could be asked
   about, and the composer's one-level limit would be a wall rather than a
   default.
3. **The draft is resolved by BattleGrid, never here.** The composed condition is
   serialised into the platform's declared shape and sent to
   `preview_strategy_report` alongside the strategy's own conditions, so a
   reference in the draft has something to resolve against. Every outcome shown
   is the platform's. `Grid-Commander Never Decides Whether A Condition Holds`
   already forbids the alternative and has a test; this change adds a second one
   over the draft path.
4. **A draft that cannot be expressed is refused before it is sent, and says
   which part.** The one thing this product will not do is serialise a form it
   read as `unrecognised` — that would mean inventing a shape for a grammar the
   platform is still extending. Everything else goes to BattleGrid as composed:
   an illegal key, an unknown column, an out-of-range threshold. The platform's
   refusal is the content, in its words. This is the `CheckColumnQuery`
   precedent — pre-filtering locally replaces the platform's teaching with our
   guess.
5. **A draft whose key matches an existing condition stands in its place.** The
   preview resolves only the conditions it is given, so what is sent is a
   composed list. A draft named `FLOW_UP` on a strategy that already defines
   `FLOW_UP` is an operator asking *what if this one were different*, and the
   surface says which of the two it did — replaced, or added — rather than
   sending an array with a duplicated key and hoping.
6. **The serialiser is held against BattleGrid's own declared schema.** Read from
   `docs/battlegrid-mcp-capabilities.json` at test time — the real `anyOf`
   branches, not the flattened record — so every branch the composer can produce
   is checked against the union the platform actually declares. This is the check
   the record's flattening makes impossible in `payload-conformance.test.ts`,
   done where the full declaration still exists.

## What is explicitly out of scope

- **Saving.** No compile, no apply, no write of any kind. See above for why, and
  for what the write will need.
- **Deleting a condition, or renaming one.** Both are writes.
- **Composing nesting deeper than one group.** The grammar recurses to 64 members
  and this product reads it to depth 32; the composer builds one level. A
  strategy carrying deeper nesting still renders in full — the composer simply
  cannot author it, and says so.
- **Deriving whether the draft is "better".** The platform resolves; this product
  shows. Comparing a draft's outcome against the existing condition's and calling
  one an improvement would be a judgement about market data this product does not
  hold.
- **The per-ticker `verdict` field.** Still declared, still never observed, still
  filed as `preview-per-ticker-verdict-is-unobserved`. A draft's own verdict
  (`UP`/`DOWN`/`NEITHER`/none) is composed and sent because the *input* schema
  requires it; the platform's per-ticker call is not read, because nothing has
  seen it.

## Capabilities

- `strategy-authoring` — three ADDED requirements, one per property a future edit
  could quietly remove: that a draft can be composed and resolved without being
  saved, that a form this product cannot express is refused rather than guessed,
  and that the list the platform is sent is the one the operator sees described.

No MODIFIED requirement. `A Composition Can Be Previewed As The Agent Reads It`
promises a preview of the strategy's **current** composition and continues to do
exactly that — `/strategies/[id]/preview` is untouched. A draft is not the
strategy's composition, and widening that requirement to cover both would blur
the one distinction this change most needs to keep: what is saved versus what is
merely asked about.

No `mcp-control` delta. `The Product Is Reachable As An MCP Server` already
requires each tool to call the same use case the web surface calls, so no new
promise is made to a model by adding one.

## Track

`standard`. Read-only throughout: the only platform call is
`preview_strategy_report`, annotated `readOnlyHint: true`,
`destructiveHint: false`, and it is already the call this surface's sibling
makes. No scope change, no schema, nothing to migrate, and no confirmation
minted because nothing is confirmed. It touches one capability, has one intent,
and reverts by removing one route.

Not `full`: no contract this product owns, no money, no autonomous authority,
and nothing hard to reverse — the surface cannot change anything to reverse.
