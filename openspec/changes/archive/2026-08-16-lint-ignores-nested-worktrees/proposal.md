# Lint ignores the checkouts that are not this one

## Why

`npm run lint` from the repository root returned **63,337 errors across 1,208
files**, and took long enough to time out a two-minute run. Every one of the
1,208 was under `.claude/worktrees/`.

Git worktrees live *inside* the repository here, so an open worktree is a second
full checkout — its own `src/`, its own `node_modules`, its own `.next` — under
the directory `eslint .` is pointed at. `eslint.config.mjs` ignores `.next/**`,
`node_modules/**`, `drizzle/**` and `tests/**/fixtures/**` at the root, and none
of those patterns reach a copy nested two levels down.

**This is the reason already written in that file, with a different trigger.**
The comment above `next-env.d.ts` says:

> Without this, lint's result depends on whether a build has run — it passes on
> a fresh checkout and fails afterwards, which is a worse property for a gate
> than simply failing.

Lint's result depended on whether a *worktree* existed. A gate whose answer
changes with the state of an unrelated directory is not a gate.

It also cost time twice in one session: both times the failure looked like the
change under test, and both times the reflex was to go looking for what the
change had broken. The second one came with a `SyntaxError` in a file
`git status` reported as unmodified.

## What

One pattern — `.claude/worktrees/**` — added to the existing `ignores` array,
with the reasoning beside it.

## Verified

- Before: `npm run lint` — 63,337 errors, 1,208 files, exceeded 2 minutes.
- After: `npm run lint` — **exit 0, 20.6 seconds**.
- **The ignore is not over-broad.** Fed the violation it must still catch: an
  unused `const` planted in `src/domain/agent/feasibility.ts` fails lint with
  the offending name reported, and lint returns to green when it is removed.
  This is the discipline `boundaries.test.ts` states about its own matchers —
  a rule that has never been shown to catch anything is a rule nobody knows is
  alive.

## Not in scope

The other half of the same environment trap is **324 tracked files sitting
CRLF** in that checkout, from `core.autocrlf=true`, despite `.gitattributes`
declaring `eol=lf`. That one broke `npm test` with a `SyntaxError` on a file
`git status` called unmodified. It is a property of one local checkout rather
than of the repository, so it is documented in `openspec/JOURNAL.md` rather than
changed here — repairing someone's working copy is not a commit.

## Track

`lite`, `skip_specs: true`. Tooling configuration; no observable product
behavior changes and no spec describes it.
