# Proposal: A taken name is refused before it is sent

## Why

Forking a strategy into a name that already exists on the account is answered
by BattleGrid with `{"code":"INTERNAL_ERROR"}` — measured eight times across
five platform majors, twice on 2026-08-14 alone (#102), on both arms: the
default `"<parent> (fork)"` name and a user-chosen name. The operator has
decided the defect will not be reported upstream
(`docs/UPSTREAM_REPORT_INTERNAL_ERRORS.md`, closed unsent 2026-08-14), so the
product is the only place the experience can improve. The product cannot fix
the platform's answer, but it can stop walking into it: the fork action
already re-reads the full strategy listing at submit time — the names are in
hand at the moment of the click, and the page's own principle ("before the
work, not after submitting it", the quota pre-check) already exists for
exactly this shape.

## What Changes

- The fork action gains a name pre-flight: when the name the copy would
  receive — chosen, or the default `"<parent> (fork)"` — exactly matches one
  of the user's own (PRIVATE) strategies in the same listing the action just
  re-read, the fork is refused **before anything is sent**, with a reason
  naming the collision and the typed name kept.
- The pre-flight claims only what the product read itself: the name exists on
  the account. It covers PRIVATE names only — a collision with a SYSTEM
  strategy's name has never been measured and stays the platform's to answer.
- The platform backstop is untouched: a fork that passes the pre-flight and is
  still refused (a name taken by another session between read and send, or
  territory the pre-flight does not cover) renders the platform's answer whole
  and unglossed, exactly as today.

## Capabilities

**New**: none
**Modified**: `strategy-authoring` — one ADDED requirement on the fork flow.

## Out of Scope

- **Interpreting a platform `INTERNAL_ERROR` after it happens.** Ruled out
  three times by #102's own record; nothing here diagnoses a response. The
  pre-flight refuses on the product's own read, before any response exists.
- **Case-insensitive or fuzzy matching.** Only the exact-name collision is
  measured; the pre-flight matches exactly and lets the platform answer the
  rest.
- **Pre-refusing SYSTEM-name collisions.** Unmeasured; refusing them could
  block a fork the platform would accept.
- **The token-500 mitigation (#204).** Its own change, next.

## Impact

- `app/(app)/strategies/[id]/fork/page.tsx` — the `forkStrategy` server
  action gains the pre-flight branch; page markup unchanged.
- `openspec/specs/strategy-authoring/spec.md` — one requirement added.
- Tests: new cases in the fork suite. No adapter, domain, or schema changes;
  no new platform reads (the listing read already happens).
- Backlog: `forking-a-name-that-exists-is-a-500` (#102) → `in-progress`,
  linked here; closes when this lands.
