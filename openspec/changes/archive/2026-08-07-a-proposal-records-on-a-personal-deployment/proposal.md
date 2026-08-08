# Proposal: A Proposal Records On A Personal Deployment

## Why

Proven live today: on a personal-key deployment — the mode the operator
actually runs — `propose_agent_change` fails every time with
`insert or update on table "proposals" violates foreign key constraint
"proposals_user_id_users_id_fk"`. The `users` table is written by exactly one
path, the OAuth callback, and a personal deployment acts as `owner` with no
such row. The headline behavior of `the-model-can-propose-and-only-a-human-
agrees` has therefore never worked on the deployment mode it was most built
for. Backlog: `a-proposal-cannot-be-recorded-on-a-personal-deployment` (p2).

## What Changes

- Drop the foreign key from `proposals.user_id` (additive-in-reverse
  migration; no data transformed). Ownership stays where it already is
  enforced — in the WHERE of every read and the resolve — matching
  `audit_entries` and the recorder tables, whose schemas were designed
  around exactly this trap.
- The proposals db suite records as `owner` with **no** `users` row, the same
  load-bearing test the recorder's tables carry, so the FK cannot return in a
  migration without failing a test that says why.
- One MODIFIED requirement in `mcp-control`: the record-a-proposal behavior
  gains the personal-deployment scenario the regression would have failed.

## Capabilities

**New**: none.
**Modified**: `mcp-control` — one MODIFIED requirement (scenario added to
"A Model Can Record A Proposal And Nothing More").

## Out of Scope

- Inserting a `users` row at personal boot — the rejected alternative: it
  gives personal mode an identity row at the cost of inventing a
  `battlegrid_subject` when the account read fails, and it leaves the FK as
  a trap for the next headless writer.
- Any change to proposal semantics, staleness, or the agree/decline flow.

## Impact

- `src/infrastructure/db/schema/index.ts` (drop the reference), one
  generated migration, `tests/db/proposals.test.ts` (personal-mode test;
  the fixture users-rows become optional), the mcp-control main spec at
  archive. No API or DTO changes.
