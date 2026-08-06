# Tasks

## 1. Settle what the platform actually accepts, before composing anything

- [x] 1.1 Establish the write-side grammar from the declared schema rather than
      from the flattened record. `docs/battlegrid-mcp-capabilities.json`,
      `compile_strategy_plan` → `request.anyOf[*].properties.conditions`:
      item `{conditionKey, name, definition, verdict}`, all four required,
      `additionalProperties: false`; `conditionKey` matches
      `^[A-Z][A-Z0-9_]{1,39}$`; `name` 1–80; `verdict` is
      `UP|DOWN|NEITHER|null`; `definition` is an `anyOf` over four clause
      shapes, `conditionRef`, and `group` whose `members` `$ref`s the definition
      itself (1–64, `n` 1–64)
- [x] 1.2 Establish that `preview_strategy_report` takes the **same** grammar —
      same four required item paths, same closed sets — so a draft the preview
      resolves is structurally a draft the compiler would accept. This is what
      makes compose-and-try worth shipping without save
- [x] 1.3 Establish that `members` are nested definitions, not keys or signal
      ids. The backlog item could not answer this from the schema
      (`array<?>`); the capabilities dump shows a `$ref` back to `definition`,
      and `the-condition-layer-is-legible` observed it live in Berlin's
      `N_OF 3 of: ref, ref, NOT(ref), clause, clause, clause`. Question closed
- [x] 1.4 Record why the write is not in this change: no per-condition tool
      among the 110; `postState.conditions` behaviour on an UPDATE that omits
      `conditions` is unobserved; the record cannot check a composed condition
      payload. All three named in the proposal, two filed as backlog items

## 2. The domain — serialising back, and only what can be expressed

- [x] 2.1 A serialiser from `ConditionDefinition` to the platform's declared
      wire shape, one branch per form the mapper reads
      (`src/domain/strategy/condition-draft.ts`)
- [x] 2.2 An `unrecognised` part refuses the whole draft and names itself.
      Nothing is dropped, nothing is substituted; `serialiseDefinition`'s
      unreachable branch throws rather than emitting a placeholder
- [x] 2.3 Nothing else is checked locally — an illegal key, an unknown column
      and an out-of-range threshold all go to the platform, whose refusal is the
      content (`CheckColumnQuery` precedent)
- [x] 2.4 Compose the list that is sent: the strategy's conditions with the
      draft standing in place of a matching key, or appended when it matches
      none. The result says which it did, so the surface does not re-derive it
- [x] 2.5 A key never appears twice in the composed list
- [x] 2.6 The columns a strategy's own conditions already read, harvested from
      its definitions, so the composer can offer them without inventing a
      vocabulary
- [x] 2.7 The domain imports no MCP client; the draft reaches BattleGrid through
      the strategies port like everything else

## 3. The application

- [x] 3.1 `TryConditionQuery` reads the strategy fresh, serialises the draft,
      sends the composed list to `preview_strategy_report`, returns the outcomes
- [x] 3.2 The strategy's own conditions travel as `conditionsAsGiven` — the
      platform's objects, whole — so no existing condition is re-serialised
      through a shape that could drop an unrecognised form
- [x] 3.3 A draft that cannot be expressed is its own result, never an error and
      never dressed as a platform refusal
- [x] 3.4 A refused preview is its own result, in the platform's words
- [x] 3.5 Nothing in this path compiles or applies
- [x] 3.6 **Added during execution.** A draft may be seeded from a condition the
      strategy already carries, taking the definition whole at any depth with
      the identity from the form. Two reasons: it is the only way to ask a
      question about a condition too deeply nested for the composer to build,
      and without it the refusal in 3.3 had no reachable caller — a guard no
      path can reach is the vacuity this repo's checks exist to catch. A seed
      naming a condition the strategy does not carry is its own result

## 4. Composing and rendering

- [x] 4.1 `/strategies/[id]/conditions` composes a draft: key, name, verdict,
      and a definition that is one clause, one reference, or one group over up
      to six members that are clauses or references. Six because the largest
      group observed in real data has six (Berlin's `FULL_SEND_DOWN`)
- [x] 4.2 The page states that trying a draft saves nothing — at the top, and
      again beside the button — and that the composer builds one level of
      grouping while the strategy page reads any depth
- [x] 4.3 The draft renders through `ConditionStructure`, the same component
      `/strategies/[id]` draws a saved condition with. Exported rather than
      reimplemented: two readings of the grammar would disagree about a
      negation eventually
- [x] 4.4 The outcomes render through the existing `ConditionOutcomes`, so
      evidence, provisional marking and the three-state counts are the ones
      already specified. Its `conditionsDefined` prop became `conditionsAsked`
      with a caller-supplied subject — on this surface the number is what was
      *sent*, and the old name would have made the empty state say a strategy
      defines a condition nobody has saved
- [x] 4.5 The page says what was sent: alongside the strategy's conditions, or
      in place of one of them, naming which
- [x] 4.6 Reachable from `/strategies/[id]`, offered whether or not the strategy
      defines conditions, and offers a way back to it

## 5. Guards

- [x] 5.1 The serialiser is held against BattleGrid's **declared** schema, read
      from `docs/battlegrid-mcp-capabilities.json` at test time — every branch,
      including the clause and reference branches the probed record flattens
      away. Four anti-vacuity cases prove the walker sees a bad key, a missing
      required field, an unknown key in a closed object, and a definition
      matching no branch
- [x] 5.2 Round trip: Berlin's real `FULL_SEND_DOWN` and every clause form map
      into the domain and back to a payload identical to the one they arrived
      in. The fixture moved to `tests/support/strategy-fakes.ts` so the mapper's
      suite and the serialiser's cannot drift apart — a round trip checked
      against a second copy of the fixture would pass while the copies diverged
- [x] 5.3 An `unrecognised` part refuses, at any depth, reporting every part
      rather than the first
- [x] 5.4 A structural check over all five files of the surface: no
      `compilePlan`, no `applyPlan`, no `updateSignalRule`, no `'use server'`,
      and none of the platform's outcome vocabulary — plus a sweep asserting
      that vocabulary appears nowhere in `src/` outside the two files that
      render it
- [x] 5.5 Rendering: the blank composer, a draft resolved, a draft refused by
      the platform, a draft that cannot be expressed, a stale seed link, a
      half-filled row, and both composed-list cases
- [x] 5.6 No conformance case added for the preview's condition payload — the
      record's flattened union would fail correct code. Said in the test file,
      and asserted: the check fails if a re-probe fixes the record, so the
      conformance case gets added rather than the gap closing unnoticed

## 6. Deferrals, filed

- [x] 6.1 `an-update-that-omits-conditions-is-unobserved` — whether an UPDATE
      compile that omits `conditions` preserves them, with the call that settles
      it and what it means for today's edit page
- [x] 6.2 `the-record-flattens-the-condition-union` — why the offline
      conformance guard cannot see a composed condition payload, and what
      fixing the probe would take
- [x] 6.3 `a-drafted-condition-cannot-be-saved` — the write path, its ceremony,
      and what must be observed before it is built
- [x] 6.4 `conditions-are-an-unmodelled-authoring-layer` links this change and
      records which of its questions are now answered, without restating tasks

## 7. Gates

- [x] 7.1 `npx tsc --noEmit -p tsconfig.json`
- [x] 7.2 `npx eslint .`
- [x] 7.3 `npx vitest run tests/strategy/ tests/rendering/ tests/architecture/`
- [x] 7.4 `python3 .claude/tools/openspec.py validate a-drafted-condition-can-be-tried`
- [x] 7.5 No credential in the diff
