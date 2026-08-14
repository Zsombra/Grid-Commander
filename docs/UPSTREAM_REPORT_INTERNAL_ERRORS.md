# DRAFT — Two deterministic INTERNAL_ERRORs on the BattleGrid MCP surface

> **Status: draft for operator review, re-verified live 2026-08-14. Not sent.**
> Intended recipient: BattleGrid (battlegrid.trade) — whichever channel the
> operator chooses. Sources: backlog items #102
> (`forking-a-name-that-exists-is-a-500`) and #204
> (`refresh-rejection-is-indistinguishable-from-an-outage`).
> Every claim below is a live measurement with dates; nothing is inferred from
> documentation.
>
> **A third issue was drafted here and withdrawn.** The `list_gate_blocks`
> row-level 500s (#100) were re-tested on 2026-08-14 and found **fixed** —
> details at the bottom, kept so the team can confirm the fix is the one they
> shipped.

---

We build and operate Grid-Commander, a third-party client for your MCP surface
at `https://mcp.battlegrid.trade/mcp`. Across several weeks of live use we have
isolated two failures that share one shape: **a refusal is answered with
`INTERNAL_ERROR` (or HTTP 500), where the server demonstrably has a better
answer available and uses it elsewhere.** Both are deterministic — neither is
load, flap, or outage — and both were re-confirmed on 2026-08-14.

A client can classify what a server *says*; it cannot improve on it without
guessing. In each case below we render your answer as given, so your wording is
what our users see. That is why the distinction between "declined" and "broke"
matters to us at the level of the error code.

## 1. `fork_strategy`: a duplicate strategy name is a 500, not a refusal

**Observed**: forking a strategy whose resulting name already exists on the
account answers `{"code":"INTERNAL_ERROR","message":"Internal server error"}`.

- 2026-08-06: source with 22 same-named forks on the account →
  `INTERNAL_ERROR`, twice, minutes apart. Two sources with zero collisions →
  both fork cleanly, same session. Quota deliberately freed first (the quota
  refusal itself is clean — see below).
- 2026-08-13 (v18.2.0): first fork of `Bastogne` succeeds; second and third,
  now colliding with the first, both `INTERNAL_ERROR`.
- 2026-08-14: the *submitted-name* arm — `fork_strategy` with `name` set to an
  existing strategy's name — answers the same `INTERNAL_ERROR`. So the
  condition is "resulting name already exists", whether defaulted
  (`<parent> (fork)`) or user-chosen.

**Why the wrong code costs something real**: `fork_strategy` accepts no
`idempotencyKey` (your agent creates do), so a fork whose response is lost in
transit cannot be retried safely. We hit exactly this on 2026-08-13: a fork
request died with a transport error *after* the server committed it; the
natural retry was answered `INTERNAL_ERROR`. The operator's true situation was
"that already exists" — the one wording that would have let them recover — and
the wording they got was "the server broke".

**What good looks like, from your own surface**: the quota refusal is
`VALIDATION_ERROR — Strategy limit reached…`, and the revision check answers
`CONFLICT` with `{expectedRevision, actualRevision}`. A duplicate-name refusal
in either of those shapes would be complete. Accepting an `idempotencyKey` on
`fork_strategy` would close the lost-response case as well.

Your own `rebind_intelligence_agent` is the model here: its description warns
that the operation is destructive and not a merge, it demands `confirm: true`,
and it accepts an `idempotencyKey` for safe retries. `fork_strategy` — the
tool that deterministically 500s on a name collision — carries none of that:
no name rules in the description, no collision behavior documented, no retry
key. We are not asking for new machinery; we are asking for this tool to get
the same care its sibling already has.

(Re-reproduced 2026-08-14, second time that day: fork of `Bastogne` rev 6
with `name` set to an existing strategy's name → `INTERNAL_ERROR`; the
strategy list re-read immediately after confirms no artifact was created and
the quota count did not move — so the failure is clean, it is only *named*
as a crash.)

## 2. OAuth token endpoint: every rejected refresh is a 500

**Observed** (2026-08-13, re-confirmed 2026-08-14): `POST /token` with
`grant_type=refresh_token` and a valid `client_id`:

| token | answer |
|---|---|
| valid | 200, new access + refresh token |
| replayed after rotation | 500 `server_error` (3/3, deterministic, 2026-08-13) |
| random 64-char string | 500 `server_error` (both dates) |
| the literal `"nope"` | 500 `server_error` (both dates) |

There is no `400 invalid_grant` path. RFC 6749 §5.2 requires one.

**The 4xx machinery demonstrably exists**: the same endpoint, called on
2026-08-14 *without* a `client_id`, answers a well-formed
`400 {"error":"invalid_request"}` with a structured validation detail. So
request-shape errors are classified correctly; only the invalid-*grant* case
falls through to 500.

**Why it costs something real**: the two cases behind that 500 demand opposite
client responses — a revoked/rotated token means *stop retrying and
re-authorize*; a transient server fault means *leave the connection alone and
back off*. The information needed to choose is absent from the response, so
every client must guess. Ours guesses "reconnect", which wastes an OAuth
round-trip whenever the truth was "bad minute".

## The pattern, and the ask

Both are refusals wearing a crash. The server clearly distinguishes these
cases internally — it validates fork names enough to fail on duplicates, and
rejects bad refresh tokens reliably — it just answers both with the code
reserved for "something unexpected broke".

The ask, in order of value to operators:

1. `fork_strategy` duplicate name → `VALIDATION_ERROR` or `CONFLICT`, naming
   the collision; ideally accept `idempotencyKey` here as the agent writes do.
2. `POST /token` invalid refresh → `400 invalid_grant` per RFC 6749 §5.2.

We are happy to provide exact timestamps, account, request payloads, and full
measurement tables for either.

## Withdrawn: `list_gate_blocks` — fixed, and confirmed fixed

Drafted here as issue 2 of 3: between 2026-08-12 and 2026-08-13 (v18.2.0),
`list_gate_blocks` answered `INTERNAL_ERROR` for recent rows while serving
older history cleanly — bisected to per-row poisoning, dense at the head,
consistent with a serialization failure on the v18 `gateStage: EVALUATION`
rows.

Re-tested 2026-08-14: **fixed everywhere we can measure.** Page 1 reads
cleanly on both affected agents (5,520 and 649 rows), 100-row pages read
cleanly, the previously-poisoned isolated row reads cleanly, and the
`EVALUATION` rows now arrive with a structured
`reasonDetail.evaluationFaultDetail` — plus a new `summary` roll-up on the
envelope. Whatever you shipped, it took. Withdrawn from the asks; recorded
here only so you can match it to the fix you made.

— Grid-Commander (operator: rafaelmorel809@gmail.com)
