# Proposal: Quality Gates Are Real

## Why

`openspec/config.yaml` still carries the template's bracketed example
`quality_gates`, so every audit falls through to the checklist — which names
`pnpm` while the project is npm (`package-lock.json`, `npm ci` in CI, no pnpm
lockfile). The documented gates are wrong in one place and absent in the
other; the real set is six commands, not three, and two of the six (`build`,
the schema check) exist precisely because their absence shipped real defects.
Backlog: `config-quality-gates-are-placeholders` (P2) and
`checklist-says-pnpm` (P3) — the same inconsistency seen from two directions,
whose items prescribe fixing both together. A third instance found on the way:
config.yaml's own context block says "Package manager: pnpm".

## What Changes

- `openspec/config.yaml`: `quality_gates` becomes the real six npm commands;
  the context line names npm as the package manager.
- `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md` Quality Gate row and
  `docs/specs/UI_COMPONENT_REVIEW_CHECKLIST.md` gate line: `pnpm` → `npm run`,
  with the architecture row pointing at config.yaml as the authoritative list.
  (Checklists are checklist-generator territory; these are the two factual
  corrections the backlog items specify, nothing structural.)
- Both backlog items closed.

## Out of Scope

- Any change to what the gates check — this states the existing gates, it
  does not add or remove one.

## Impact

`openspec/config.yaml`, two checklist lines, two backlog items. No code.
