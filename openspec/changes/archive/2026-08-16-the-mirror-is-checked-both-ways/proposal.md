# The mirror is checked both ways

## Why

`validate` enforces that an open backlog item **has** a `github:` number and has
never compared the item's `status:` against the issue's state. So an item could
read `status: open, priority: p2` while its issue was CLOSED and every check in
the repository passed.

That is not hypothetical. `a-completed-change-set-is-stranded-on-a-draft-pr`
(#289) read `status: open, priority: p2` on `main` for a day while its issue was
CLOSED, and the board — which computes `NEXT:` from the item — spent that day
recommending work GitHub already considered finished. Three sessions read it.

#309 filed it, measured a zero-state on `8e9e4c2` to regress against, and
concluded that the noisy third direction is worth building **provided the check
tolerates in-flight branches**.

## What Changes

- A new `openspec.py mirror` subcommand comparing every mirrored item's status
  against its issue's state, in three directions.
- Two directions are drift and fail: item open-ish with a CLOSED issue, and item
  `done` with an OPEN issue.
- The third — an OPEN issue with no item — reports and does **not** fail unless
  `--strict`. Every session's tracking lands as a PR whose issues close
  immediately, so between filing and merge an issue legitimately has no item on
  `main`; failing on it would make the check useless exactly when sessions are
  in flight.
- `.claude/references/tracking.md` §7 documents it beside the presence rule it
  complements.

## Capabilities

**New**: none — pipeline tooling, no product behavior.
**Modified**: none.

## Out of Scope

- **Folding it into `validate`.** `validate` is offline and must stay offline:
  it runs in CI, in hooks, and on a laptop with no `gh` credential. A
  network-dependent check there would either fail in those places or teach
  everyone to skim the warning block — which is the exact failure `tracking.md`
  already records from the pre-backfill scoping. `mirror` is a separate command
  and exits 2 when `gh` is absent rather than reporting a false clean.
- **Fixing any drift automatically.** It reports; a human decides which side is
  right.

## Impact

- `.claude/tools/openspec.py` — one function, one subparser, one dispatch branch,
  and an `import subprocess`.
- `.claude/references/tracking.md` — §7 gains "The other direction".
- No `src/`, `app/`, or `openspec/specs/` change. No delta spec.
