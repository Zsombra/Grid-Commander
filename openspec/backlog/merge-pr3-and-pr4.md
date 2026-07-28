---
id: merge-pr3-and-pr4
title: Land PR #3 then PR #4 — merge verified, test-side patch ready
type: chore
status: done
priority: p1
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: ""
blocked_by: []
tags: [merge, harness]
---

# Land PR #3 then PR #4 — merge verified, test-side patch ready

## What

Nothing has shipped. `main` holds 74 files of pipeline scaffolding; the entire
product (PR #3, 310 files, 40,589 insertions) and the harness fixes (PR #4, 14
files, 2,613) both sit unmerged on the same base. Every day that persists, the
merge cost grows and the verified state gets staler.

The merge has now been performed and verified in a scratch worktree. This item
carries the result so nobody has to rediscover it.

## Why the verification was needed

`.claude/tools/openspec.py` is edited by both branches and **auto-merges with
zero conflict hunks**. That is exactly the situation where a clean merge reads
as a safe one. It was not: the merged tree failed **16 of PR #3's 124 harness
tests**.

Textually clean is not semantically correct, and this repository has been
bitten by that shape three times already (the `??` coercion scan,
`drizzle-kit check`, the `next build` gap).

## Result

Merged tree: **192 tests, all passing.** `validate --all` exits 0 (2 warnings:
the design-system placeholder and a journal-staleness note).
`./scripts/check.sh --matrix` green on 3.10, 3.11, 3.12 and 3.13.

Getting there took three things.

**1. A real defect in PR #4, fixed on that branch (`e23ca0d`).**
`archive_change` returned as soon as `tasks_incomplete` fired, so
`merge_conflict` and `archive_target_exists` — detected further down — never
surfaced while a checklist was unfinished. Two stacked problems took two rounds
to learn about, and the second is the more serious one. The gate is now
collected and returned alongside the plan-building findings. Fixed 4 of the 16.

**2. One line in PR #3's fixture helper.** `tests/support.py` defaults to
`tasks: str = "- [ ] 1.1 do the thing"`. Those tests exercise merge mechanics,
not task policy, and the unchecked box now trips the new archive gate. Changing
the default to `- [x]` fixes 11 of the remaining 12.

**3. Fixtures for eight new codes.** PR #3's `test_every_emitted_code_has_a_
fixture` reads the codes out of the tool with `ast` and fails on any without a
fixture. PR #4 adds eight: `requirement_multiple_operations`,
`duplicate_requirement_in_delta`, `duplicate_requirement_in_spec`,
`invalid_track`, `track_not_declared`, `change_meta_missing`,
`delta_without_capability`, `tasks_incomplete`. That meta-test doing its job is
the reason this was caught rather than shipped.

Both test-side changes are saved as `docs/merge/pr3-test-side.patch`
(`git apply` it on the merged tree).

## Conflicts, and how they resolve

Only two files conflict. `openspec.py` does not.

| file | resolution |
|---|---|
| `.github/workflows/validate.yml` | keep PR #3's file (it has the `app` job), add PR #4's `matrix` job, keep `workflow_dispatch` |
| `openspec/JOURNAL.md` | keep both sides, newest first — the journal's own rule |

**Use `actions/checkout@v4` and `actions/setup-python@v5` throughout.** PR #3
pins `@v5`/`@v6` in a job that has never executed; `@v4`/`@v5` is the only pair
this repository has ever run green (run 30241139011). Do not "fix" this without
a passing run to point at.

## Order

**PR #3 first.** It is 310 files and rebasing it later is expensive; PR #4 is 14
files and rebases trivially either way.

## Note

CI cannot verify any of this — see `ci-creates-no-runs`. Everything above is
from `./scripts/check.sh --matrix` on the merged tree.

## Also lands with this merge: the first UI surfaces

`docs/merge/surfaces/` holds two `UISurface` manifests surveyed from the merged
tree — `strategy-catalog` and `strategy-editor`. Copy both into
`openspec/design/surfaces/` when the merge lands.

They are **not** committed to `openspec/design/surfaces/` on the PR #4 branch on
purpose: they reference `app/` and `src/` files that only exist on PR #3, so
`validate --all` there reports `design_source_file_missing` — 2 errors. On the
merged tree the same manifests validate clean, with every component id
traceable.

`generated_at_commit` is `52ea2b5` (PR #3's head at survey time). If PR #3 moves
before the merge lands, `validate` will report `design_surface_stale` and the
survey needs re-running rather than re-stamping.

## Design tickets, also landing with this merge

`docs/merge/tickets/` holds `DT-0001` and `DT-0002`. Copy into
`openspec/design/tickets/` alongside the surfaces.

Same reason as the surfaces: a ticket names a `surface`, and with no manifest
present `validate --all` reports `design_ticket_unknown_surface` — 2 errors.

`openspec/design/system.json` is **already committed on the PR #4 branch**,
because it references no source files and validates clean there. It is now
`status: designed` with three product-specific colour roles (`quiet`, `notice`,
`consequence`) and five added principles. Take PR #4's copy at merge; it is
strictly newer than PR #3's placeholder.

Implementation order once merged: **DT-0001 before DT-0002.** Nothing in
DT-0002 can be verified until the tokens actually render.

## DT-0001 is implemented, and the product renders

`docs/merge/dt-0001-implementation.patch` (7 files, +260/-7). Apply on the
merged tree, then `pnpm install && pnpm build`.

What it adds:

- `tools/generate-theme.mjs` — reads `system.json`, writes `app/tokens.css`
  (CSS custom properties, light plus a `prefers-color-scheme: dark` block) and
  `tailwind.theme.json`. **Errors and exits non-zero if any colour role lacks a
  dark counterpart**, because inheriting a light value into dark is how contrast
  failures ship.
- `tailwind.config.mjs` — consumes the generated theme. Uses `extend`, never a
  replacement: the 28 existing components use stock utilities (`p-3`, `text-sm`,
  `max-w-2xl`) and replacing the theme would break every one.
- `app/globals.css` — the only hand-written stylesheet. Imports the generated
  tokens, declares the focus ring once so it cannot be forgotten on the next
  control someone adds.
- `app/layout.tsx` — one import line, and the DL-007 comment updated: that
  deferral has now resolved rather than being quietly contradicted.
- `package.json` — `prebuild`/`predev` run the generator, so the theme cannot
  drift from the design system.

**Verified**: `pnpm build` green across all 16 routes; `/connect` served and
screenshotted in both colour schemes — `docs/merge/proof/`. Token custom
properties confirmed present in the served CSS bundle, dark override included.

This is the first time this product has rendered as anything other than browser
defaults.

Closes `tailwind-classes-with-no-tailwind` (P2, on PR #3's branch) — mark it
done when the merge lands.

## Landed (2026-07-28)

PR #3 merged to `main` as `15baafc`. PR #4 integrated on top: both conflicts
resolved as planned (workflow — main's file plus the `matrix` job, pins at
`@v4`/`@v5`; journal — both entries, newest first), the test-side patch applied,
surfaces and tickets moved into `openspec/design/`, and DT-0001's implementation
applied.

**One thing the plan did not anticipate.** `main` carries `package-lock.json`
and the `app` job runs `npm ci`, but DT-0001 was developed with pnpm. Adding
tailwind/postcss/autoprefixer to `package.json` without regenerating the npm
lockfile would have failed `npm ci` on the first real CI run. Regenerated with
`npm install --package-lock-only`; the stray `pnpm-lock.yaml` was removed.

**A second, also mine.** `pnpm lint` failed on `tools/generate-theme.mjs` —
a Node program under the app's browser rules, where `no-console` is a
project-wide error. Fixed with a scoped override for `tools/**/*.mjs` and root
`*.config.mjs` rather than inline disables, placed last because ESLint flat
config is order-dependent.

Verified on the integrated branch with `npm ci`, mirroring CI exactly:
typecheck, lint, 394 TypeScript tests, `next build`, 192 python harness tests,
and `openspec validate --all` with zero errors.

The applied patches were deleted; `docs/merge/proof/` keeps the screenshots.
