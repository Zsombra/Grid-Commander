# Proposal: Brain Presets Are Read, Not Remembered

## Why

`agent-adapter.ts` carries a hand-written list of ten brain presets. The live
`create_intelligence_agent` schema pins eleven. Backlog item
`brain-presets-are-hardcoded-and-short-one` filed that on 2026-07-29; it is
still open on 2026-08-06.

The constant carries this comment:

> Kept here at the boundary, next to the tool names, rather than in the domain:
> if BattleGrid adds one, this is where the surprise lands.

Two facts about that argument, both checkable in this repository:

1. **The surprise had already landed before the comment was written.** The
   repo's first capabilities dump — `docs/battlegrid-mcp-capabilities.json`,
   committed 2026-07-27 against server v3.0.0 — records the `brain.preset`
   enum with eleven values. The constant was written on 2026-07-29 with ten.
   The ten are exactly the names in the field's *description* prose, which
   enumerates ten and is not the constraint; the `enum` beside it is. So this
   was never a list that went stale. It was wrong on the day it was written,
   and being the designated landing place for the surprise did not make anyone
   look at it for eight days.
2. **The declaration moves constantly and the tool count never does.** The
   surface record was probed against server v11.0.0 on 2026-08-06; the
   capabilities dump answers v9.0.0; the first dump answered v3.0.0 ten days
   earlier. `tool_count` has been 110 throughout. The record's own note says
   it: enums, required arguments and semantics moved underneath a number that
   did not.

Nothing is broken today — the ten offered are all valid and creation works. The
cost is that the one vocabulary this product still writes down is the one whose
correctness nobody can check without reading someone else's schema by hand.

## The decision, argued

**Read the enum live.** `RadarPort.deploymentTimeframes` and
`MarketPort.rankingVocabulary` already do exactly this: they pull the `enum` out
of the tool schema the session discovered, return empty when the declaration
cannot answer, and their callers refuse to compose rather than guess. Brain
presets are the same problem — a closed enum with no catalog endpoint — and were
left out on the reasoning, recorded in the comment, that no tool lists them.
`tools/list` lists them. It always did.

The alternative the backlog offers is cheaper: keep the constant and add a
conformance check against
`input_constants["create_intelligence_agent"]["brain.preset"]`, the way
`wire-values.test.ts` checks values. It was rejected for one reason: it binds
correctness to a **recorded artifact and a CI run**, so what the product offers
is right only as often as someone re-probes. The freshness gate exists for that
and this list still went eight days wrong. Reading the declaration at the time
of use removes the class instead of instrumenting it, and costs one `tools/list`
per catalog read — the same discovery the guard sequence already performs on
every call.

The boundary argument survives intact: the list is still resolved in the
adapter, next to the tool names, and the domain still receives a
`Catalog.brainPresets` it does not know the origin of. What changes is that the
adapter reads it instead of remembering it.

## What `{kind: "PRESET", preset: "CUSTOM"}` means is not established

The eleventh declared value sits in the *preset* branch of the union while also
naming the union's other branch. This change establishes nothing about it and
records no theory about it.

What it does instead is state a rule the product can defend: **a declared value
that is ambiguous inside the declaration itself is not offered.** The offered
set is the `brain.preset` enum minus every value that also appears as a
`brain.kind` discriminator — derived from the two enums at runtime, not named in
source, so it stays true if either moves. A user is never asked to pick
something this product cannot describe, and no sentence anywhere explains a
value nobody has established.

Establishing what it does remains open, filed as
`preset-custom-in-the-preset-branch-is-unestablished`.

## What Changes

- The brain presets come from the discovered `create_intelligence_agent`
  schema, at the time of use. A preset BattleGrid adds is offerable with no
  release of this product; one it stops declaring stops being offered.
- A generic reader for "the values this discovered tool's schema permits at this
  argument path", matching the walk `tools/probe_mcp_surface.py` uses to build
  `input_constants` — union branches merged onto the same path, local `$ref`s
  followed, cycles ended. The two existing readers stay as they are: their paths
  are top-level, and the union walk buys them nothing.
- An empty set means *the declaration did not answer*, never *there are none*.
  The create form says so and keeps the model route open; a preset submitted
  anyway is refused with that reason instead of being called invalid.
- A test that fails if any declared preset name is ever written into `src/`
  again — with the names taken from the platform's own recorded declaration, so
  the guard's vocabulary is not hand-written either.

## Out of scope

- What `{kind: "PRESET", preset: "CUSTOM"}` does. Not guessed, not offered,
  filed.
- Migrating `deploymentTimeframes` and `rankingVocabulary` onto the new reader.
- Displaying a preset's temperament. The declaration names presets and does not
  describe them, and this product does not write descriptions for someone
  else's vocabulary.

## Capabilities

**Modified**: `agent-authoring` — one MODIFIED requirement
(*Agent Fields Are Offered Only From Values The Platform Confirms*).
