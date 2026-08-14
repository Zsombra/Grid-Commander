# Design: The manifests admit their client code

## Technical Approach

One new diagnostic in `openspec.py`'s design validation pass, plus prose
surgery on fourteen manifests. The diagnostic scans each surface manifest's
raw text for the claim (`/no client js/i`), and — only when the claim is
present — reads the head of every file named by that manifest's
`source_digest` for a `'use client'` directive. Claim plus declaration is a
warning (`design_surface_denies_client_js`) naming the manifest and the file.
The corrections rewrite every claim site in the fourteen lying manifests so
the claim phrase is gone and the truth is stated instead.

## Decisions

### Decision: the check lives in `openspec.py` validate, not in the vitest architecture suite
Chosen because the design layer's sibling record checks
(`design_surface_stale`, the import cross-check, uncovered routes) already
live there, the inputs are the same files that pass already parses, and —
decisively — the existing requirement "Every Validation Code Is Covered By A
Fixture" makes the harness suite fail if the new code has no fixture, so the
planted-defect proof is enforced by machinery that already exists. Rejected:
a vitest architecture guard, because it would re-parse the manifests in a
second language and its matcher proof would have to be built by hand.

### Decision: warning severity, not error
Chosen because the design layer's record diagnostics are warnings
(`design_surface_stale` is the precedent) — manifests are records, and a
record that has drifted should not block archiving an unrelated change.
After the corrections land the baseline is unchanged, so any new lie moves
the warning count and is visible. Rejected: error severity, because a
mid-change manifest drift would block `/archive` on work that did not cause
it.

### Decision: the matcher is the claim phrase, not a semantic model
The check fires on raw-text `/no client js/i` anywhere in the manifest.
Chosen because every one of the fourteen measured falsehoods contains that
literal substring, and the corrected wording ("the only client code is …")
deliberately does not — so the fix and the guard cannot disagree. Rejected:
per-field JSON walking with a claims vocabulary, because it hardens a schema
this check does not own and misses the same claim appearing in a field added
later; the claim is prose, so the matcher is prose.

### Decision: `'use client'` is read from the file head
A directive is only a directive before any statement, and every observed
client source opens with it on line 1. The check reads the first few lines
and matches a bare quoted `use client` line. A file absent from the tree is
skipped (the staleness and import checks own missing-file findings).

### Decision: hand-editing the manifests is legitimate here
The ui-surveyor owns manifests, but this change edits record prose only —
no `source_digest` entry, digest value, or pin moves, so nothing claims a
survey that did not happen. Precedent: `agent-edit`'s constraint was
corrected the same way during the PR #235 review. Rejected: re-surveying all
fourteen surfaces, which would re-describe code nobody re-read and stale
nothing.

## File Changes

- `.claude/tools/openspec.py` (modified) — the diagnostic
- harness suite (modified) — fixtures: lying pair fires; truthful pair
  silent; corrected wording silent; absent source skipped
- `openspec/design/surfaces/<fourteen>.json` (modified) — claim-site prose
  corrections, template `agent-edit` constraints[] line ("Every state change
  is a full navigation — … The only client code is `PerformButton` … the
  exception the rule is stated around … A design may not introduce client
  state, optimistic rendering, or a partial update.")
