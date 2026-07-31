# Tasks

## 1. The record — probe derivations

- [x] 1.1 Add a local `$ref` resolver to `tools/probe_mcp_surface.py`:
      resolves `#/`-rooted JSON pointers within one tool's schema document,
      with a seen-set cycle guard; wire the existing `input_constants` walk
      through it so constants behind refs stop being invisible.
- [x] 1.2 Add `input_required_paths(tool)`: every required field as a dotted
      path (`[]` for array items), walking `properties`/`items` and into union
      branches only where a field is required in every branch reaching that
      path; branch-conditional requireds are carried by 1.3's variant records
      instead.
- [x] 1.3 Add `input_accepts(tool)`: per object path with
      `additionalProperties: false`, the sorted accepted property names and
      `closed: true`; a union-of-objects path records `variants`, each keyed by
      its discriminator const (e.g. `operation=UPDATE`, `kind=PRESET`) with its
      own accepted set, closed flag, and required paths.
- [x] 1.4 Add `--refresh-declared`: load `docs/battlegrid-mcp-capabilities.json`,
      recompute all declared fields (`input_required`, `input_optional`,
      `input_constants`, `declared_output`, plus the two new ones) into
      `docs/battlegrid-mcp-surface.json`; observed fields byte-untouched;
      refuse with a named error if the two files' tool sets differ; no network,
      no key.
- [x] 1.5 Run the refresh and commit the regenerated artifact; confirm in the
      diff that only declared fields changed.

## 2. The guard — tests

- [x] 2.1 `tests/test_probe_declared_fields.py` (stdlib-only): pin the
      derivations on constructed schemas — nested required path, array-items
      path, closed object, open object absent from `input_accepts`, union
      variants keyed by const, ref resolution, ref cycle termination — and the
      refresh mode's refusal on mismatched tool sets and preservation of
      observed fields.
- [x] 2.2 `tests/architecture/payload-conformance.test.ts`: build the create
      payload (preset and custom brains) via the product's builders and assert
      every `input_required_paths` entry present and no key outside any closed
      accepted set, selecting union variants by discriminator.
- [x] 2.3 Same for the update payload: `applyEdit` fed a 23-field read (the
      three non-writable fields included), checked against
      `update_intelligence_agent` — top level and `tradingConfig` are both
      closed.
- [x] 2.4 Same for the compile `UPDATE` request as the edit page builds it,
      selected against the `operation=UPDATE` variant.
- [x] 2.5 Pass-through: a named allowlist mapping `apply_strategy_plan` →
      `request.plan`; assert the allowlist contains exactly what is claimed and
      that the check skips only those subtrees.
- [x] 2.6 The guard that guards the guard: the raw 23-field read passed
      straight through as `tradingConfig` MUST fail the accepted-set check,
      naming the three dropped fields' paths; and an anti-vacuity assertion
      that the artifact carries nested required paths and closed sets at all
      (update `tradingConfig` closed with 20 accepts; nested paths non-empty).

## 3. Verification

- [x] 3.1 `pnpm typecheck`, `pnpm lint`, `pnpm test` — all green, new guard
      included.
- [x] 3.2 The Python harness suite passes on a clean checkout with no packages
      installed (`./scripts/check.sh` gates).
- [x] 3.3 `python3 .claude/tools/openspec.py validate
      conformance-sweep-for-required-and-accepted-params` — zero errors.
- [x] 3.4 Backlog item updated: `status: in-progress → done` at archive,
      `change:` linked.
