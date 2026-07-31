# Proposal: The Binding Guard That Was Claimed Exists

## Why

Re-triaging `confirmation-is-not-bound-to-values` (P2 risk) found the risk
itself resolved — every flow that carries agreed values now binds them into
the confirmation target (edit: intent digest; rebind: agent→strategy pair;
apply: plan digest; the two lifecycle flows are identity-only by documented
design), and `edit-binding.test.ts` replays the item's headline scenario
($25 agreed, $25,000 submitted → refused). But the doc comment in
`confirmation.ts` cites `confirmation-binds-values.test.ts` — a file that
does not exist — for a guard nobody wrote: that no caller composes a target
string inline, bypassing the builders. A claimed guard that is missing is
the decay this project keeps finding; the claim should be made true.

## What Changes

- A source scan in `edit-binding.test.ts`: no file outside
  `confirmation.ts` composes a target-shaped string
  (`agent:…#…`, `agent:…->strategy:…`, `strategy:…#…`) inline.
- The `confirmation.ts` comment points at the file that actually holds its
  guards.
- `confirmation-is-not-bound-to-values` closed with per-flow evidence.

## Out of Scope

- The lifecycle flows' identity-only targets — deliberate design, documented
  in the builders; `rebind-is-not-bound-to-the-revision-it-read` (P3) already
  tracks the one residual revision shard.

## Impact

One test file, one comment, one backlog closure. No behavior change.
