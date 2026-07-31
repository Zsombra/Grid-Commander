---
id: restore-has-never-been-walked
type: risk
status: in-progress
priority: P2
capability: strategy-authoring
created: 2026-07-29
---

# Restoring a strategy has never been observed

`/strategies/[id]/restore` is built, guarded and unverified against a real
archived strategy. Both live accounts have **zero** archived strategies — 37 on
one (25 owned, 12 platform) and all of them active — so the `!isActive` branch
that offers `Restore` has never rendered, and `restore_strategy` has never been
called by this product.

Filed from `the-strategies-walk`, which walked list, detail, edit, fork and
archive against a live account and could not walk this.

## What is known

- The affordance is wired in both places that offer it: `strategy-list.tsx:127`
  gates on `!strategy.isActive`, and `read-strategy.query.ts` returns
  `restorable: isRestorable(summary)` — `PRIVATE && !isActive`.
- The page handles four states, and `repair-required` is the one it was built
  carefully for: BattleGrid saying the stored configuration no longer matches
  what the platform accepts, so the way forward is the RESTORE arm of the compile
  pipeline rather than a retry. `REPAIR_REQUIRED_GUIDANCE` says so.
- `setActive` sends `expectedRevision`, which archive/restore needed and lacked
  before `four-dead-write-paths`.
- The `isActive` branch and the `repair-required` branch were both rendered live
  during the walk — by requesting the route directly for an *active* strategy,
  which is the state that produces "Cannot restore". Both now return to the
  strategy.

## What is not known

1. **Whether `list_strategies` returns archived strategies at all.** If it does
   not, `Restore` can never appear on the roster and the route is unreachable in
   the same way `/thinking` and `/limits` were — reachable by address only. The
   guard cannot see this: it reads source text, and the `!isActive` branch exists.
   `readStrategy` retries with `includeInactive: true`, which is evidence the
   *detail* call needs a flag to see archived strategies; nothing establishes what
   the list call does.
2. Whether `repair-required` is the common answer or the rare one. If BattleGrid
   usually refuses a restore, the page's careful state is the main path and the
   plain confirm is the exception.

## How to close it

Archive a throwaway private strategy on the older account, then walk the roster
and the restore page. Creating one first is a fork, which needs a free slot —
that account is at 25/25, so archive one of its own first and restore it at the
end. **Never archive a strategy an active agent is bound to**: the roster prints
the bound-agent count on every row, and the walk found one with nine.

Until then the honest statement is that restore is implemented and unobserved,
which is what `the-strategies-walk` put in its Out of Scope section rather than
claiming coverage.

## The walk is built and armed (2026-07-31)

`tests/live/restore-probe.test.ts` (key-gated, committed): fork a SYSTEM
strategy → archive the fork through describe→confirm→perform → **assert the
roster still lists it** (the reachability question this item turned on — the
restore action looks the strategy up in `list_strategies` before calling
anything; note the adapter already passes `includeInactive: true`) → restore
through the product command → read back active → archive again in the
finally.

It did not run to completion today: BattleGrid's MCP endpoint began hanging
on every call (~17:10Z) — even `tools/list` times out at 35s while the OAuth
discovery document answers in ~1s. Same-day earlier probes (radar walk,
15:2xZ) worked, so this is a platform stall, not the probe. Run it when the
platform answers:

    BATTLEGRID_API_KEY=bg_live_… npx vitest run tests/live/restore-probe.test.ts

Also armed in the same file's territory: `repair-required-can-actually-fire`
moved REPAIR_REQUIRED detection to the refusal channel, so if the platform
answers a restore that way, this walk is where it shows.
