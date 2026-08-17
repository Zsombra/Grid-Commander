# Tasks

## 1. The resolver

- [x] 1.1 `openspec.py`: read `compilerOptions.paths` from `tsconfig.json`
      (JSONC comment-stripped, string-aware), cached per root; no hard-coded
      alias
- [x] 1.2 `IMPORT_RE` captures any specifier; classification happens at
      resolution (relative → as today, alias-prefixed → through the map,
      bare package → ignored)
- [x] 1.3 `_resolve_import`: extension-rewrite resolution — a `.js`/`.jsx`
      specifier tries the toolchain's substitutes (`.ts`/`.tsx`, `.tsx`/
      `.jsx`) before the append-an-extension fallbacks
- [x] 1.4 Degradation: no tsconfig / no paths / unparseable → relative
      resolution unchanged, no crash

## 2. The route-coverage diagnostic

- [x] 2.1 New aggregate INFO `design_routes_uncovered`: walk
      `app/**/page.tsx`, derive routes (route groups stripped), compare
      against manifests' `route` fields; one diagnostic with count and a
      truncated list
- [x] 2.2 `openspec.py design` output gains the coverage line and the full
      uncovered-route list

## 3. Fixtures — the part that matters more than the fix

- [x] 3.1 `test_design_imports.py`: alias import of unlisted UI file fires
      the warning (fixture writes its own tsconfig)
- [x] 3.2 `.js`-specifier import of a `.ts`/`.tsx` UI file fires
- [x] 3.3 Degradation fixtures: missing tsconfig, missing paths, malformed
      tsconfig — relative check still fires, alias silently skipped
- [x] 3.4 Alias import of a non-UI file stays ignored; bare package stays
      ignored (extend existing negatives)
- [x] 3.5 Fixture for `design_routes_uncovered` (fires + coverage-complete
      silence); `test_validation_codes.py` must pass with the new code
      covered

## 4. The manifests the honest run names

- [x] 4.1 Add the six missing files to the five manifests
      (`carried-problem.tsx` ×4, `why-not-loaded.tsx` on strategy-editor,
      `binding.tsx` on agent-roster), digests pinned for the ADDED files
- [x] 4.2 agent-roster: add `binding.tsx` WITHOUT refreshing
      `agent-roster.tsx`'s recorded digest — its staleness is deliberate
      (#237) and this change must not silently clear it

## 5. Verification

- [x] 5.1 Python suite green (`python3 -m unittest discover -s tests`)
- [x] 5.2 `validate --all`: incomplete-sources quiet (the five fixed), the
      new INFO reports 22 of 46, #237's agent-roster staleness still
      standing
- [x] 5.3 JS gates unaffected (typecheck, lint, vitest, build) — tool-only
      change plus JSON manifests
- [x] 5.4 Backlog item #230 → in-progress at propose, done at archive, with
      the second hole (extension rewrite) recorded on it
