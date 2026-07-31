# Proposal: Check Every Payload Against Required And Accepted Params, Not Just Top-Level Names

## Why

The conformance harness checks that every *top-level* required argument is built
(`mcp-conformance.test.ts`) and that every pinned *value* is one the platform
permits (`wire-values.test.ts`). Neither checks nested required fields, and
neither checks accepted property sets — and the accepted-set dimension is
exactly how `update_intelligence_agent` came to be impossible for the life of
the product: `tradingConfig` reads back with 23 keys, the write accepts 20 and
declares `additionalProperties: false`, so passing the read back rejected the
whole payload. The defect class is now fixed in code (`applyEdit` projects onto
the writable set) but nothing gates it: the record the checks read from does not
carry accepted sets or nested required paths at all, so the next regression
ships silently.

The dump this derives from confirms the gap is real surface-wide: across the
110 tools, 17 carry required fields below the top level and 19 close at least
one object to an enumerated property set (88 closed paths).

## What Changes

- `tools/probe_mcp_surface.py` records two new declared fields per tool, both
  derived from the input schema alone (no live call):
  - `input_required_paths` — every required field as a dotted path from the
    argument root, not just top-level names.
  - `input_accepts` — for every object path the schema closes
    (`additionalProperties: false`), the accepted property set. Union-typed
    object paths (`compile_strategy_plan`'s `request`, `create` `brain`) are
    recorded per branch, keyed by their discriminator const, so a check can
    select the branch the payload actually uses.
- The schema walk resolves intra-document `$ref` pointers (the committed dump
  carries 370 of them; `apply_strategy_plan`'s `request.plan` subtree is
  reachable only through them) with a cycle guard.
- A refresh mode regenerates the declared-only fields of
  `docs/battlegrid-mcp-surface.json` from the committed
  `docs/battlegrid-mcp-capabilities.json`, leaving every observed field
  untouched — this environment holds no `BATTLEGRID_API_KEY`, and none is
  needed for facts the server declares.
- `docs/battlegrid-mcp-surface.json` is regenerated with the new fields.
- A new guard, `tests/architecture/payload-conformance.test.ts`, builds each
  payload the product constructs — through the same domain builders the product
  uses — and fails a change when a required path is missing at any depth or a
  key falls outside a closed accepted set. Server-round-tripped objects
  (`apply_strategy_plan` `request.plan`) are marked pass-through explicitly,
  not skipped silently.
- Python tests pin the two derivations (nested required, closed objects, union
  branches, arrays, ref resolution), stdlib-only per the harness rules.

## Capabilities

**New**: none
**Modified**: `battlegrid-connection` — two ADDED requirements: the record
carries required paths and accepted sets at every depth; product-constructed
payloads are checked against both by a check that gates a change.

## Out of Scope

- **Calling anything new on the live server.** The probe's safety rule — only
  read-annotated tools are ever called — is untouched. This change adds no
  calls at all; both new fields derive from declared schemas.
- **Refreshing observed responses.** That requires the operator's key and is
  the standing re-probe instruction, not this change.
- **`two-read-tools-do-not-answer`** — the other declared-vs-actual gap;
  already filed as its own backlog item.
- **Full JSON-Schema validation of payloads (types, ranges, patterns).** Cut
  deliberately, not deferred: every dimension the record carries traces to a
  defect that actually shipped (envelope, constants, required names, accepted
  sets). No observed defect motivates type/range checking, and a generic
  validator would duplicate the platform's own validation without its
  authority. If such a defect ever surfaces, it earns its own item with
  evidence.

## Impact

- `tools/probe_mcp_surface.py` — new derivations + refresh mode.
- `docs/battlegrid-mcp-surface.json` — regenerated declared fields; observed
  data byte-identical.
- `tests/architecture/payload-conformance.test.ts` — new guard.
- `tests/test_probe_declared_fields.py` — new derivation tests.
- `openspec/backlog/conformance-sweep-for-required-and-accepted-params.md` —
  linked to this change.
- No runtime product code changes; no schema/DB impact; no new dependencies.
