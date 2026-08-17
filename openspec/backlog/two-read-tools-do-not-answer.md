---
id: two-read-tools-do-not-answer
title: get_market_context is refused for omitting an argument its own schema does not require
type: question
status: blocked
priority: p3
created: 2026-07-29
updated: 2026-08-17
change: ""
capability: battlegrid-connection
github: "114"
blocked_by: [upstream:battlegrid]
tags: [battlegrid, probe, declared-vs-observed]
---

# get_market_context refuses the call its own schema permits

> **Narrowed to one tool 2026-08-13.** Filed as two; the `get_open_orders` half
> is finished twice over — the platform stopped erroring, and this product now
> calls it. Original title: *"Two argument-free read tools refuse or error when
> actually called"*. The narrowing is recorded below rather than edited away.

## What

The probe calls a tool only when `readOnlyHint` is true **and** its input schema
declares no required arguments. On 2026-07-29 that set was 21 tools. Nineteen
answered. Two did not:

```
get_market_context   VALIDATION_ERROR   Provide sessionId or primaryTimeframe
get_open_orders      INTERNAL_ERROR     Internal server error
```

Both had answered on the previous probe (2026-07-28), when all 21 succeeded and
declared output matched observed output exactly.

## Why it matters

They are different failures and only one of them is BattleGrid's to explain.

**`get_market_context` is a declared-vs-observed divergence.** Its schema says
nothing is required. Calling it with `{}` — exactly what the schema permits —
is refused for omitting an argument. So `required` does not capture the real
precondition: it is "one of `sessionId` or `primaryTimeframe`", a constraint the
JSON Schema could express with `anyOf` and does not.

This is the same class of gap that let this change's defect through, one level
out: the schema is the product's source of truth about what a call needs, and
here it is incomplete. Anything that builds a call to this tool from `required`
alone will build one the server rejects.

**`get_open_orders` is a server error**, not a refusal — a 500 on a read tool
with no arguments. It coincided with the recovery from the MCP outage that day,
so it may simply be residue. Or it may not.

Neither tool is called by this product today, so nothing is broken. Both are on
the roadmap: `get_open_orders` belongs to the nine unused positions/orders tools.

> **No longer true of `get_open_orders`, as of 2026-08-13.** It is called —
> `positions-adapter.ts:16` maps it as `TOOLS.resting`, `readRestingOrders`
> consumes it, and `read-exposure.query.ts:212` reads it in the exposure
> fan-out. That landed in `#128` and this paragraph was never revisited. The
> sentence is left standing because it is what the item argued from; see the
> 2026-08-13 section at the bottom.

## Fix

1. **Re-probe and see whether `get_open_orders` still 500s.** If it does, it is
   worth reporting to BattleGrid — a read with no arguments should not be able
   to fail that way.
2. **Record `get_market_context`'s real precondition** wherever the product
   would build the call, and do not trust `required` alone for it.
3. **Consider whether the probe should distinguish the two.** It records both as
   `call_failed` with the message, which is honest but flattens a schema bug and
   a server bug into one bucket. A refusal carrying a `code` (`VALIDATION_ERROR`)
   is a different finding from `INTERNAL_ERROR`, and the adapter already parses
   that code — see `ToolRefusedError`.

## Related

- change `every-value-sent-is-one-the-platform-accepts` — found these while
  re-probing after the outage
- `confirm-agent-write-response-shape` — the other open declared-vs-observed
  question

## Re-observed 2026-07-31

One of the two recovered: `get_open_orders` answered normally (its INTERNAL_ERROR was transient). `get_market_context` failed identically again — `VALIDATION_ERROR: Provide sessionId or primaryTimeframe` — so its declared schema (no required arguments) persistently understates what the live server demands. A platform-side declared-vs-actual mismatch; the product does not call this tool. Narrowed to one tool, kept open as the record of it.

## Re-observed 2026-08-06

Third measurement, both tools called with `{}`:

```
get_market_context   VALIDATION_ERROR   Provide sessionId or primaryTimeframe
get_open_orders      OK                 → { orders: … }
```

Unchanged from 2026-07-31 in both directions. `get_open_orders` has now
answered on two consecutive probes and its `INTERNAL_ERROR` should be read as
firmly transient — the surface map's failure list must not carry it.

`get_market_context` has now been refused for omitting an argument its own
schema does not require, on three separate days across two BattleGrid major
versions (v5 and v11). It is not a deployment artefact. The declared schema
persistently understates the precondition, which is `anyOf(sessionId,
primaryTimeframe)` and is expressible in JSON Schema.

The product still calls neither tool, so nothing is broken. Item stays open as
the standing record of one platform-side declared-vs-actual mismatch, and as
the reason nothing may build a call to `get_market_context` from `required`
alone.

## Re-observed 2026-08-12 — fourth measurement, third major (v17.2.0)

`get_market_context({})` refused identically again: `VALIDATION_ERROR:
Provide sessionId or primaryTimeframe`. Now observed across v5, v11 and
v17. One movement worth recording: the v17 tool **description** now says
the precondition in prose — "Provide sessionId for session-scoped
context, or primaryTimeframe … — exactly one of the two" — so the
platform documents the constraint for humans while the JSON Schema still
declares nothing required. The machine-readable contract remains wrong;
the prose caught up. `anyOf` remains unexpressed.

The linked change `every-value-sent-is-one-the-platform-accepts` shipped
and archived; the `change:` link is cleared — this item was filed *by*
that change as a deferred finding, not tracked by it. What remains open
is upstream's schema, plus the optional probe refinement in Fix #3.

**Fix #3 landed the same day** (`a-refusal-and-an-outage-stop-reading-alike`,
lite, archived 2026-08-12): the probe now records `call_failed_code` beside
`call_failed` — the platform's structured code on a refusal, null on prose
and transport failures — mirroring the adapter's `codeOf`. The key is
additive; it takes effect in the artifact on the next probe run. Fix #2 was
already honored (`get_market_context`'s real precondition is recorded here
and in the reference). What keeps this open is Fix-#1 territory only:
upstream's declared schema still understates the precondition.

## 2026-08-12 (v18.2.0) — one healed, one is now four majors old

**`get_open_orders` answers.** Today's probe called it and got `{"orders": []}`
— no `INTERNAL_ERROR`. That half of this item is closed by the platform. It was
an outage, not a contract, and it has cleared.

**`get_market_context` still refuses the call its own schema permits.** Called
bare, by hand, at v18.2.0:

    get_market_context({}) → {"code":"VALIDATION_ERROR",
                              "message":"Provide sessionId or primaryTimeframe"}

That is **v14, v15, v16, v17 and now v18** — five major versions in which the
input schema declares nothing required, no `oneOf`, no `anyOf`, and the server
refuses anyway. v18 kept the precondition in the *description* ("provide
sessionId … or primaryTimeframe … — exactly one of the two") and still does not
express it in the schema, so a client that reads the contract rather than the
prose composes a call that cannot succeed.

This has now outlived enough deployments to be treated as the platform's
settled shape rather than a defect awaiting a fix. The product already handles
it — the call sites pass one of the two — so nothing here is broken. What the
item is worth keeping for is the *lesson*, which the ceremony pages proved
again today: **a JSON Schema is not the whole contract on this platform, and
the prose is sometimes the only place a requirement is written down.**

Recommend: keep open, stop expecting it to change, and re-read only when the
description changes again.


## 2026-08-13 — one tool left, and it is no longer "the product calls neither"

Re-verified in the same read-only sweep that checked every open issue.

**`get_market_context({})` refuses, sixth measurement, unchanged.**

    get_market_context({}) → {"code":"VALIDATION_ERROR",
                              "message":"Provide sessionId or primaryTimeframe"}

The v18.2.0 tool description still states the precondition in prose — *"exactly
one of the two"* — while the input schema still declares no `required`, no
`anyOf`, no `oneOf`. Five majors of the same divergence.

**`get_open_orders` answers, and this product now calls it.** Two things, and
the second is the correction:

    get_open_orders({}) → {"orders": []}

`positions-adapter.ts:16` maps it as `TOOLS.resting`; `readRestingOrders`
consumes it and `read-exposure.query.ts:212` reads it alongside the active
positions, funnel and decisions in one `Promise.all`. It landed with `#128`
("The protection that actually rests"), and `mapOrder` models fourteen fields
of a resting order.

So this item's standing sentence — *"the product still calls neither tool"* —
has been false since #128 and was repeated through three subsequent
re-observations. **The half of this item that was about `get_open_orders` is
finished twice over**: the platform stopped erroring, and the product started
calling it.

### What the item is now

One tool, one defect, and it is upstream's: **`get_market_context`'s schema
understates its own precondition.** The product does not call it and has no
reason to until the market-context reads are taken up (see
[[trading-telemetry-is-unread]], #116).

The standing value is unchanged and worth restating, because it is the reason
to keep this open rather than close it: **nothing may build a call to
`get_market_context` from `required` alone.** That is a rule about how this
product reads a schema, and it is one live counter-example away from being
forgotten.

### Why the correction was reachable

The item re-measured the *platform* five times and never re-measured the
*product*. Every re-observation section reads `get_market_context` and
`get_open_orders` against the live server; none re-ran `grep get_open_orders
src/`. A claim about our own code aged out precisely because it looked like the
settled half.

## 2026-08-14 — seventh measurement, unchanged

    get_market_context({}) → {"code":"VALIDATION_ERROR",
                              "message":"Provide sessionId or primaryTimeframe"}

The tool description still carries the precondition in prose ("exactly one of
the two"); the input schema still declares no `required`, no `anyOf`, no
`oneOf`. The item's own recommendation stands: keep open as the standing rule —
nothing may build a call to this tool from `required` alone — and re-read only
when the description changes.

## 2026-08-16 — eighth measurement, and the mechanism is finally visible

Read live at v19.1.0 over the authenticated MCP connector.
`get_market_context` called with no arguments:

```
{ "code": "VALIDATION_ERROR", "message": "Provide sessionId or primaryTimeframe" }
```

Unchanged across eight measurements and five majors.

**What is new is why.** The tool's own description now states the constraint in
words — *"Provide sessionId for session-scoped context, or primaryTimeframe
(5m, 15m, 1h, 4h, 1d) for general market research — exactly one of the two"* —
while its `inputSchema` still carries **no `required` array** and marks both
properties optional.

That resolves the item's third question. This is **not a server bug and never
was**: it is a documented XOR precondition that JSON Schema `required` cannot
express, so the schema under-declares it and the description carries it instead.

Consequences:

1. Fix (2) — record the real precondition where the product would build the call
   — is the whole of the item. The precondition can now be **quoted from the
   description** rather than inferred from a refusal.
2. The probe's selection rule (`readOnlyHint` and no required arguments) is
   sound. This tool is simply outside what its schema can say.
3. If the probe is taught to distinguish a schema bug from a server bug, this
   case classifies as **neither** — a correctly-behaving server enforcing a
   constraint its schema cannot carry. That is a third category, and worth
   naming as one.

`get_open_orders` answered on the same sweep — six live resting legs — so the
2026-08-13 healing holds at v19.1.0.


## 2026-08-16 (v19.2.0) — the trigger condition was checked, and it did not fire

This item's standing recommendation is *"keep open, stop expecting it to change,
and re-read only when the description changes again."* v19 is a new major and
moved 34 output schemas (#301), so the description was checked. **It has not
changed in substance.**

The tool description at v19.2.0 still carries the precondition in prose —
*"Provide sessionId for session-scoped context, or primaryTimeframe (5m, 15m,
1h, 4h, 1d) for general market research — exactly one of the two"* — and the
input schema still declares **no `required`, no `anyOf`, no `oneOf`**. The bare
call refuses identically:

```
get_market_context({}) -> {"code":"VALIDATION_ERROR",
                           "message":"Provide sessionId or primaryTimeframe"}
```

Seventh measurement, now spanning **v5, v11, v14, v15, v16, v17, v18 and v19**.
Nothing to do; recorded so the next reader can see the trigger was tested rather
than assumed. The lesson this item is kept for is unchanged and was reinforced
by v19: a JSON Schema is not the whole contract on this platform, and the prose
is sometimes the only place a requirement is written down.

### One thing worth carrying to #300

`primaryTimeframe`'s enum at v19.2.0 is `["5m","15m","1h","4h","1d"]` — **`1d`
is still offered here, and `1m` is absent.** #300 asks what v19's retirement of
`1m` and `1d` from the authorable categories means. This is evidence that the
retirement is scoped to *authorable* surfaces: a read parameter on the same
platform version still accepts `1d`. Read there, not concluded here.

## Re-statused 2026-08-17 — `blocked`, on BattleGrid

Seven measurements spanning v5, v11, v14, v15, v16, v17, v18 and v19, all
identical: the input schema declares no `required`, no `anyOf` and no `oneOf`,
the prose carries the real precondition, and the bare call is refused. The item
says of itself *"Nothing to do"* and is kept as a standing record. That is a
wait on BattleGrid, and the frontmatter now says so instead of reading `open`.

**Tripwire:** the input schema gains `anyOf`/`oneOf` expressing "exactly one of
`sessionId` or `primaryTimeframe`", **or** the bare `{}` call stops being
refused. Either makes the declaration match the behaviour.

Do not re-measure on a schedule. The trigger this item already sets — re-read
when the tool description changes — is the right one, and it was honoured at v19.
