---
id: the-mirror-is-checked-one-way
title: An item and its GitHub issue can disagree about state, and nothing checks it
type: debt
status: open
priority: p3
created: 2026-08-16
updated: 2026-08-16
change: ""
capability: harness-integrity
github: "309"
blocked_by: []
tags: [openspec, tracking, validate, board]
---

# The mirror is checked one way

## What

`validate` enforces that an open backlog item **has** a `github:` number — it
warns on a missing value, errors on a malformed one, warns on an unexplained
`none` (`.claude/references/tracking.md` §7, "Enforced, not documented"). It
never compares the item's `status:` against the issue's state.

So an item can read `status: open, priority: p2` while its mirrored issue is
CLOSED, and every check in the repository passes. The board computes its
`NEXT:` line from the item, so the divergence surfaces as a recommendation to
start work that GitHub already considers finished.

## Why it matters

It happened, and it cost a session's opening move.

`a-completed-change-set-is-stranded-on-a-draft-pr` (issue #289) read
`status: open, priority: p2` on `main` from 2026-08-15 until 2026-08-16, while
issue #289 had been closed manually as COMPLETED at 2026-08-15T10:15:34Z. For
that whole window the board's top line was:

```
NEXT: P2 a-completed-change-set-is-stranded-on-a-draft-pr — /propose it
```

Three sessions read that. Nothing was wrong with the data on either side —
the item's `status: done` had been written, in `cd4b5a1`, and was sitting on
an unmerged branch (PR #295). The board reads `main`, so it could not see it.

That is the general shape and it is not rare in this repo: **every session's
tracking output lands as a PR, and the issues close immediately.** Any session
that closes an issue and does not get its branch merged the same day leaves
exactly this divergence behind. `git` and GitHub disagree by design during that
window; nothing measures how long it lasts or notices when it becomes stale.

Priced p3 rather than higher because the failure mode is a wasted orientation,
not a wrong write — and because the merge that resolves it is usually going to
happen anyway. It earns a filing because the cost lands on the one surface every
session starts at, and because it is invisible from inside the repository.

## Evidence

- `.claude/references/tracking.md:243` — "`validate` warns on **any** open item
  with no `github:` value, errors on a malformed one, and warns on an
  unexplained opt-out." No state comparison is listed, and none is implemented.
- `grep -n github .claude/references/tracking.md` returns only the
  presence/format rules (lines 88, 208, 216, 243).
- Observed 2026-08-16: `gh issue view 289 --json state,closedAt` →
  `CLOSED / 2026-08-15T10:15:34Z / stateReason COMPLETED`, against
  `openspec/backlog/a-completed-change-set-is-stranded-on-a-draft-pr.md`
  reading `status: open` on `main` at `2e59622`.
- Resolved incidentally at `fe6d2f6` when PR #295 merged and carried the
  item's own `status: done`. The gap that allowed it is untouched.

## What would settle it

A check that reads the issue state for every open item and warns where the two
disagree. The awkward part is that it needs the network, and `validate` is
offline by construction — `tests/architecture/surface-freshness.test.ts` splits
exactly this problem, keeping the offline half in the main suite and the live
comparison in `tests/live/`, with a header saying why an offline check that
implied it could know is "the same lie in a new place". The same split fits
here: `validate` stays offline, and a `gh`-backed check runs where the network
is allowed.

Cheapest useful version: a `--github` flag on `openspec.py backlog list` that
batches one `gh issue list --state all --json number,state` and prints the
disagreements. One call, no per-item round trip.

## Notes

- **Direction matters.** The common case is *issue closed, item open* — a
  session closed the issue on the spot and its branch has not landed. The
  reverse (*item done, issue open*) is the one that leaves real work looking
  finished, and is worth warning about more loudly.
- **A window is not a defect.** Between a session closing an issue and its PR
  merging, the two legitimately disagree. Any check needs to say "this has been
  divergent since X" rather than "this is wrong", or it will fire on every
  in-flight session and be tuned out — which is the failure
  `.claude/references/tracking.md` §7 describes about scoping the mirror rule to
  a date, and then unscoping it.
- Related: [[a-completed-change-set-is-stranded-on-a-draft-pr]] is the incident,
  now done. The item→issue link rule it exercised is §7 of
  `.claude/references/tracking.md`.

---

## Three live instances, measured 2026-08-16

Found while settling #293, which was itself one of them. Diffing every open
item's `github:` against `gh issue list --state open`:

| issue | state | item | item state |
|---|---|---|---|
| #293 | closed 2026-08-15 | `write-probe-thinking-pagination-assertion-too-strict` | **was open** — reconciled 2026-08-16 |
| #283 | closed | `the-analysis-is-not-on-the-models-surface` | **still open** |
| #294 | closed | `the-prose-record-carries-lists-where-the-platform-declares-bodies` | **still open** |

All three are the same direction: **the issue closed and the canonical record
did not.** That is the direction this item names, and it is the one that costs
board time — #293 sat on the board for a day as work that was already done, and
a session picking the next item off it would have opened a change against a
fixed defect.

`#283` and `#294` are **left as found, deliberately.** Whether each is a stale
item or a prematurely closed issue needs the work checked, not the states
compared, and doing that inside a bookkeeping pass is how a wrong close gets
laundered into a right one. They are recorded here so the fix this item
eventually gets has real cases to run against.

**The other direction is noisier and mostly not drift.** Five issues are open
with no item on `main` (#299, #304, #305, #317, #318) — but three PRs are open
(#307, #313, #319) and an item filed on an unmerged branch is invisible here.
**Any check this item produces has to be run against `origin/main` plus open
branches, or it will report every parallel session as drift.** That is probably
the hardest part of building it.

Reproduction: compare `github:` in every `openspec/backlog/*.md` with
`status: open|in-progress` against `gh issue list --state open`, both ways.

## All three settled 2026-08-16 (reconcile), and the noise was noise

The two left as found are resolved — each by checking the work rather than
comparing the states, which is what this item asked for:

- **#283 self-corrected.** PR #313 carried the item update in the same commit
  that shipped `read_forward_returns`, so the item read `done` the moment the
  work landed. **That is the cheapest fix this item could get**: the PR that
  settles the issue also moves the item, and no separate sweep is needed.
- **#294 did not**, and was verified against code rather than its closed issue —
  `capture_mcp_dump.py:101,105` fetch `prompts/get` / `resources/read`,
  `generate_mcp_reference.py:271` emits `## Server instructions`
  (`BATTLEGRID_MCP_REFERENCE.md:109`), `surface-freshness.test.ts:317` digests
  the instructions against the live server. All three residual gaps genuinely
  closed, delivering change 6/6. Marked `done` against
  `the-prose-record-carries-bodies`.

**This item now has no live cases.** A fix built after today has to reconstruct
one from the table above rather than run against the board.

**The part called hardest got easier.** The caveat was that any check must run
against `origin/main` *plus open branches*, or every parallel session reads as
drift. Those three PRs merged (#307, #313, #319), and the check ran clean for
the first time, on `8e9e4c2`:

| direction | count |
|---|---|
| item `open`/`in-progress` + issue `CLOSED` | 0 |
| item `done` + issue `OPEN` | 0 |
| issue `OPEN` with no item on `main` | 0 |

26 open issues, 26 matching items. **The five "open issue, no item" entries
named above were exactly the branch-invisibility artifact predicted, and none
was drift** — #299, #304, #305 arrived with #307; #317, #318 with #319; all five
now sit on `main` as `status: open` against open issues. So the noisy direction
is worth building after all, provided the check tolerates in-flight branches —
and there is now a measured zero-state on a known SHA to regress against.
