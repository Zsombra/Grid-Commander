# Proposal: Returned with an explanation

## Why

The OAuth callback redirects a decline to `/connect?declined=<error>` and its
failures to `/connect?error=incomplete|untrusted` — and the connect page reads
none of them. Someone who declines at BattleGrid lands back on the consent
page with zero acknowledgment, though the spec scenario *The user declines*
(battlegrid-connection) promises "they are returned with an explanation and
the option to retry", and the callback's own comment claims "they are told
why". The retry half is there; the explanation half was dropped on the floor.

## What Changes

- `/connect` (delegated branch) reads `declined` and `error` off the query
  string and says what happened above the consent summary: a decline in the
  notice role with `role="status"` (the user chose; nothing failed), a
  callback failure in the danger role with `role="alert"`, unknown error
  values named verbatim, every message stating nothing was stored and that
  starting again below is safe. The retry is the consent form already on the
  page.

## Capabilities

None modified — this implements the existing scenario *The user declines*;
the contract is unchanged (`skip_specs: true`).

## Out of Scope

- The personal branch (`NothingToConnect`) — no OAuth happens there.
- Changing the callback route's redirect vocabulary.

## Impact

`app/connect/page.tsx`; new `tests/rendering/connect.test.ts`.
