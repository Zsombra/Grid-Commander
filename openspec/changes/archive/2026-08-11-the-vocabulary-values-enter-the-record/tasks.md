# Tasks

## 1. The record

- [x] 1.1 Probe: `fetch_authoring_vocabulary` — categories, then vocabulary
      per category, verbatim payload + sha256; per-category `fetch_failed`
- [x] 1.2 Probe: `authoring_vocabulary` block written beside the prose
      surfaces; the exception and its reason stated in the block's note

## 2. Guards

- [x] 2.1 Offline: block present, every category's digest verifies, no
      `fetch_failed`, budgets are numbers, timeframes a non-empty string list
- [x] 2.2 Live: per-category digest compare + category-set compare; failure
      names the category; skips without a credential

## 3. Docs

- [x] 3.1 REPORT_TABLE_GRAMMAR.md budget list: the seven declared budgets
      with their v17.2 values, sourced from the record

## 4. Verification

- [x] 4.1 Live re-probe regenerates the record with the vocabulary block
- [x] 4.2 Offline gates: validate, typecheck, lint, vitest
- [x] 4.3 Keyed live surface-freshness run green against the new record
- [x] 4.4 Backlog p1 closed against this change
