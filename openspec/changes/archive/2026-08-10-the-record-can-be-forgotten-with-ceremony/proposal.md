# Proposal: The Record Can Be Forgotten, With Ceremony

## Why

The signal record accumulates by design and cannot be trimmed at all — no
age-based retention, no deletion, nothing. That was the right v1
(`nothing-records-what-the-signals-said` deferred it on purpose: deletion of a
record whose loss is permanent is destructive in exactly the sense this product
treats with ceremony, and v1 must not ship a casual version). #112 is the
deferral coming due.

Two facts shape the design:

1. **A trimmed record re-widens every gap it covered.** The platform serves
   current readings only; nothing trimmed can ever be re-recorded. So the
   describe must state what becomes unknowable — counts, coins, and the span —
   not merely that rows will go.
2. **The record's unit is the run.** Captures, failures and readings hang off
   the run that made them, and coverage derives gaps from runs. Deleting rows
   out from under a surviving run would leave the record claiming attempts
   that covered something now invisible — so the trim boundary is the run:
   everything from runs started before the chosen moment goes together.

## What Changes

- The store can preview and perform an age-based trim, scoped to the acting
  account in the WHERE like every other method.
- A describe→confirm→perform ceremony over it: the describe states the
  consequence in unknowability terms and mints a confirmation bound to the
  boundary and the described counts; the perform refuses without it, spends it
  once, and reports what went.
- `/recorder/trim`, linked from the record's own page: choose the boundary,
  read the consequence, type the confirmation. The perform happens only on the
  submitted form — never on render.

## What is deliberately not here

- **Raw-only trimming** (keep normalised rows, drop `raw`) — the item's own
  middle option, deferred with its reason: `raw` is `null` exactly when the
  outcome is `failed` today, so a trimmed raw needs a tombstone column and a
  three-state `rawAnswer` contract, rippling into every consumer. Build it
  when growth actually hurts; the schema cost is not worth paying
  speculatively. Recorded on #112 at close.
- **Per-coin purge** — declined, not deferred. No surface asks for it, and a
  coin's record is exactly the history a purge re-widens; add it only when a
  concrete need names itself, with its own item then.
- **No MCP exposure.** The describe stays out of the tool table —
  `proposals-are-inert` holds that a model can never reach a confirmation, and
  this change adds the first destructive act against the product's own store,
  which is precisely what must stay behind a human.

## Capabilities

**Modified**: `signal-recording` — one ADDED requirement.
