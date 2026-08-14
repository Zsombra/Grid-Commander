# DRAFT — Three deterministic INTERNAL_ERRORs on the BattleGrid MCP surface

> **Status: draft for operator review. Not sent.** Intended recipient:
> BattleGrid (battlegrid.trade) — whichever channel the operator chooses.
> Sources: backlog items #102 (`forking-a-name-that-exists-is-a-500`),
> #100 (`battlegrid-is-returning-internal-errors`),
> #204 (`refresh-rejection-is-indistinguishable-from-an-outage`).
> Every claim below is a live measurement with dates; nothing is inferred
> from documentation.

---

We build and operate Grid-Commander, a third-party client for your MCP surface
at `https://mcp.battlegrid.trade/mcp`. Across several weeks of live use we have
isolated three failures that share one shape: **a refusal or an ordinary data
condition is answered with `INTERNAL_ERROR` (or HTTP 500), where the server
demonstrably has a better answer available and uses it elsewhere.** All three
are deterministic — none is load, flap, or outage — and each was re-confirmed
on v18.x.

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

## 2. `list_gate_blocks`: specific rows 500 the whole page — newest first

**Observed** (2026-08-12 → 2026-08-13, v18.2.0): `list_gate_blocks` answers
`INTERNAL_ERROR` for recent rows while serving older history cleanly. Bisected
with `limit: 1, page: N`:

- Agent A (5,437 rows): pages 1–~100 fail; ~105 onward read cleanly. Agent B
  (617 rows): pages 1–~18 fail; 22 onward read. The boundary is per-agent —
  hours apart on the same day — not a global cutoff.
- The failing head *grows*: a row readable on the first bisection was inside
  the failing head a day later.
- It is not only the head: at least one isolated row (row 287 at the time of
  measurement, agent A) fails deterministically with readable rows on both
  sides. A page fails iff it *contains* a poisoned row, which is why larger
  `limit`s fail more often.
- An unknown agent id answers `{"entries": [], "total": 0}` cleanly — the
  query path, pagination, and empty-result serialization are all fine.

**A hypothesis, offered as such**: every readable row predates v18; v18 added
`gateStage: EVALUATION` and `reasonCode: EVALUATION_FAULTED`. The unreadable
rows are exactly the ones written since. Consistent with a serialization
failure on the new enum values — unproven, because the failing rows cannot be
read to check.

**Why it costs something real**: your own tool description says this is "the
first place to look when an agent isn't trading". The failure is dense at the
head, so the tool breaks precisely on the rows that would answer that
question, while serving history from before the question arose.

## 3. OAuth token endpoint: every rejected refresh is a 500

**Observed** (2026-08-13): `POST /token` with `grant_type=refresh_token`:

| token | answer |
|---|---|
| valid | 200, new access + refresh token |
| replayed after rotation | 500 `server_error` (3/3, deterministic) |
| random 64-char string | 500 `server_error` |
| the literal `"nope"` | 500 `server_error` |

There is no `400 invalid_grant` path. RFC 6749 §5.2 requires one.

**Why it costs something real**: the two cases behind that 500 demand opposite
client responses — a revoked/rotated token means *stop retrying and
re-authorize*; a transient server fault means *leave the connection alone and
back off*. The information needed to choose is absent from the response, so
every client must guess. Ours guesses "reconnect", which wastes an OAuth
round-trip whenever the truth was "bad minute".

## The pattern, and the ask

All three are refusals or data conditions wearing a crash. The server clearly
distinguishes these cases internally — it validates fork names enough to fail
on duplicates, reads gate rows enough to fail on specific ones, and rejects
bad refresh tokens reliably — it just answers all three with the code reserved
for "something unexpected broke".

The ask, in order of value to operators:

1. `fork_strategy` duplicate name → `VALIDATION_ERROR` or `CONFLICT`, naming
   the collision; ideally accept `idempotencyKey` here as the agent writes do.
2. `list_gate_blocks` unreadable rows → skip-and-flag or repair, so the recent
   window answers; at minimum, a row-level error rather than failing the page.
3. `POST /token` invalid refresh → `400 invalid_grant` per RFC 6749 §5.2.

We are happy to provide exact timestamps, account, request payloads, and the
full bisection tables for any of the three.

— Grid-Commander (operator: rafaelmorel809@gmail.com)
