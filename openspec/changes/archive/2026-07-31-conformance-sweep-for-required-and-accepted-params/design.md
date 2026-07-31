# Design: Conformance Sweep For Required And Accepted Params

## Technical Approach

Two new declared-only fields per tool in `docs/battlegrid-mcp-surface.json`,
derived by `tools/probe_mcp_surface.py` from the input schema alone:
`input_required_paths` (nested required as dotted paths, `[]` for array items —
the same path grammar `input_constants` already uses) and `input_accepts` (per
closed-object path: accepted property names + `closed: true`; union paths carry
per-branch records keyed by discriminator const). A refresh mode recomputes
every declared field from the committed `docs/battlegrid-mcp-capabilities.json`
without touching observed data. A new architecture test builds the payloads the
product actually constructs — via the same domain builders — and holds them
against both fields.

## Decisions

### Decision: Union object paths are recorded per branch, keyed by discriminator const
`compile_strategy_plan.request` is a three-branch union discriminated by
`operation` (`CREATE`/`UPDATE`/`RESTORE`); `create_intelligence_agent.brain` is
two branches on `kind`. Chosen because the check must hold a payload against
the branch it uses: merging branches either under-demands (intersection loses
`UPDATE`'s `strategyId`/`expectedRevision` — the edit path, the one this sweep
exists for) or over-demands (union of requireds would demand `CREATE` fields of
an `UPDATE` payload). Rejected: naive merge (silently under-checks the edit
path); rejected: mangled path keys like `request{operation=UPDATE}.strategyId`
(unreadable, and every consumer needs a parser for the key grammar).

### Decision: The declared fields are refreshed offline, from the committed capabilities dump
Both new fields derive from `tools/list` content, and
`docs/battlegrid-mcp-capabilities.json` *is* committed `tools/list` content —
the same source the artifact's declared fields were built from. Chosen because
this environment holds no `BATTLEGRID_API_KEY` and facts the server declares
need no credential. The refresh MUST leave observed fields byte-identical and
MUST refuse to run if the two files' tool sets differ (that means the pair is
from different deployments and a re-probe is due). Rejected: hand-editing the
artifact (no provenance, invites drift); rejected: blocking on the operator's
key for data that needs no key.

### Decision: The schema walk resolves intra-document `$ref` pointers, with a cycle guard
The committed dump carries 370 `$ref`s, all local JSON pointers
(`#/properties/...`) — zod's dedup output. `apply_strategy_plan`'s
`request.plan` subtree is reachable only through them. A walk that ignores refs
silently records nothing where a ref stands. Cycle guard: a seen-set of
resolved pointer strings per walk path; a revisited pointer terminates that
branch. (The existing `input_constants` walk does not resolve refs — it is
extended to use the same resolver, since a constant behind a ref is currently
invisible to it.)

### Decision: The guard builds payloads through the product's own builders
`payload-conformance.test.ts` assembles the create payload via
`buildTradingConfig`/`brainToArgument`, the update payload via `applyEdit` fed
a 23-field read, and the compile `UPDATE` request the way the edit page builds
it — the same reasoning as `wire-values.test.ts`: a fixture payload conforms by
construction and checks nothing. Pass-through is a named allowlist
(`apply_strategy_plan` → `request.plan`) asserted to stay small. The guard also
includes a deliberate-defect case: the raw 23-field read passed straight
through MUST fail the accepted-set check — the test that guards the guard.

### Decision: The domain stays clear of the MCP client
The guard imports domain builders and reads a JSON artifact; it imports no MCP
client, and no production import edge changes. The probe remains a stdlib-only
Python tool per the harness rules.

## Data Flow

1. `battlegrid-mcp-capabilities.json` (committed `tools/list`) → refresh mode →
   declared fields of `battlegrid-mcp-surface.json` (observed fields untouched).
2. `battlegrid-mcp-surface.json` → `payload-conformance.test.ts` ← payloads
   built by `trading-config.ts` / `brain.ts` builders.
3. Live re-probe (operator-run, out of scope here) continues to regenerate the
   whole artifact including observed data.

## File Changes

- `tools/probe_mcp_surface.py` (modified) — ref resolver, `input_required_paths`,
  `input_accepts`, `--refresh-declared` mode
- `docs/battlegrid-mcp-surface.json` (regenerated) — new declared fields
- `tests/test_probe_declared_fields.py` (new) — derivation + refresh-mode tests
- `tests/architecture/payload-conformance.test.ts` (new) — the gating guard
- `openspec/backlog/conformance-sweep-for-required-and-accepted-params.md`
  (modified) — status link
