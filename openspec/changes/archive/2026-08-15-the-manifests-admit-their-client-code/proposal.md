# Proposal: The manifests admit their client code

## Why

Fourteen of the 24 surface manifests claim "No client JS" while their own
`source_digest` lists `src/presentation/components/perform-button.tsx`, which
opens with `'use client'`. A surface constraint is what the design agent is
told it must not break: the next design round either honours a falsehood
(refusing a legitimate treatment) or notices the contradiction and learns that
constraints in these manifests are unreliable — which is worse, because the
reliable ones are what stop a design ticket changing behavior. The class was
measured on 2026-08-15 (backlog `a-surface-forbids-client-js-while-rendering-it`,
issue #243): two instances were known; the sweep found fourteen, including one
manifest (`agent-edit`) whose constraint was already corrected while its notes
still carry the denial.

## What Changes

- **Correct the fourteen manifests.** Every "No client JS" claim in a manifest
  whose recorded sources carry `'use client'` code is rewritten to state the
  truth, using `agent-edit`'s corrected constraint as the template: full
  navigation and no client state stay asserted, `PerformButton` (`'use client'`,
  `useFormStatus`) is named as the one exception, and the design veto (no
  client state, no optimistic rendering, no partial update) is kept. The claim
  lives in up to four fields per manifest (`constraints`, `notes`,
  `current_implementation`, per-component descriptions); every site is
  corrected, not just `constraints`. Source files and digests are untouched —
  this corrects record prose, not what was surveyed.
- **Add a validation diagnostic** (`openspec.py validate`): a surface manifest
  whose text claims the absence of client JS while a file in its own
  `source_digest` declares `'use client'` is reported as a warning naming the
  manifest and the file. The six manifests whose claim is true stay silent.
- **Prove the diagnostic before trusting it**: it must be observed firing on
  the fourteen uncorrected manifests before they are corrected, and it gains
  harness-suite fixtures in both directions (a lying pair fires, a truthful
  pair and the corrected wording stay silent) — which the existing
  fixture-coverage requirement then enforces permanently.

## Capabilities

**New**: none
**Modified**: `harness-integrity` — one ADDED requirement (the validation
diagnostic; correcting the fourteen manifests is record repair, not behavior)

## Out of Scope

- **Other assertable-but-checkable constraint kinds** (ARIA-role claims, focus
  ring claims). This change guards the one class measured false; whether other
  asserted constraints should be derived is filed separately
  (`asserted-constraints-that-could-be-derived`).
- **Re-surveying any surface.** No source file changed; digests and pins stay
  valid. The stale `agent-roster` manifest (#237) and the missing `agent-form`
  manifest (#250) remain their own items.
- **Transitive client-code detection.** The check reads the manifest's own
  `source_digest` list; a client component reached through an import chain the
  manifest does not record is the import cross-check's job, not this one's.
- **The six truthful claims.** explorer-competitor, explorer-evaluation,
  explorer-field, pending-queue, pipeline-evaluation, pipeline-stages keep
  their wording; the guard confirms it.

## Impact

- `.claude/tools/openspec.py` — new warning-severity diagnostic in the design
  validation pass.
- The harness tool's Python test suite — fixtures for the new code (required
  by "Every Validation Code Is Covered By A Fixture").
- `openspec/design/surfaces/*.json` — prose corrections in fourteen manifests:
  agent-archive-confirm, agent-deploy-confirm, agent-edit,
  agent-reactivate-confirm, agent-rebind-confirm, agent-undeploy-confirm,
  connect, pending-proposal, recorder-trim, strategy-archive-confirm,
  strategy-conditions-save, strategy-fork-confirm, strategy-restore-confirm,
  strategy-rule-editor.
- No production `src/` or `app/` code changes. No schema changes.
- Consumers affected: the design-director (reads constraints), `validate --all`
  output (14 transient warnings while the check lands, back to the standing
  baseline after the corrections).
