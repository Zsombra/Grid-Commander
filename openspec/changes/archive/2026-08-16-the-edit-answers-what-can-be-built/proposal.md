# The edit answers with what can still be built

## Why

`update_intelligence_agent` returns two things. This product reads one of them.

`src/infrastructure/battlegrid/agent-adapter.ts:300` is `return mapAgent(payload['agent'])`.
The other declared output — `feasibilityAdvisory` — is dropped on the floor of
that line, and `grep -rn feasibilityAdvisory src/ app/ tests/` returns **0**
matches on this tree. Backlog item `the-feasibility-advisory-is-unread`
(issue #291).

What is being dropped, per the v19.1.0 record
(`docs/battlegrid-mcp-capabilities.json`, `update_intelligence_agent`):

- `counts` — `{ total, evaluated, buildable, volatilityUnavailable }`, already
  aggregated by the platform.
- `minStopLossAtrMultiple`, `maxStopLossPct`, `minRiskRewardRatio` — the three
  dials the answer was computed under.
- `coins[]` — a **two-arm union**. One arm is `{ coinTicker, status:
  ATR_UNAVAILABLE }` and carries no numbers at all. The other carries
  `atrPct`, the constructible band (`reachableMinPct`/`reachableMaxPct`),
  what the strategy asked for, **`responsibleBound`** naming which dial
  blocked it (`MIN_STOP_LOSS_PCT` · `MAX_STOP_LOSS_PCT` · `null`), and
  `shortfallPct`.

This is the only surface on the platform — one tool, checked across all 114 at
v19.1.0 — that answers *"given today's volatility, which of my armed coins can
this strategy actually build a stop for, and which dial is stopping the rest?"*
It is already computed. Every agent edit this product has ever performed threw
it away.

`The Outcome Of A Write Reaches The Person Who Asked For It`
(`openspec/specs/agent-authoring/spec.md:478`) already says a surface must not
discard the result of a write. It was written about refusals. The advisory is
the same discard on the success path: the write succeeded, the platform said
something material about what that agent can now do, and the product redirected
as though it had said only "ok".

## What

Read the advisory, and render it as **opportunity language** on the surface the
operator lands on after an edit.

The platform speaks in bands — *"reachable stops span 0.76–2.27% on SOL"*. An
operator reads in counts: *"at today's volatility, 9 of 12 armed coins can
construct under this ceiling; at 2.00% that drops to 4."* The second sentence is
the first one aggregated, and both halves are already in the payload — the
counts block gives the first, the per-coin bands give the curve. **No new
platform call, and no new call of any kind.**

### In scope

1. Map `feasibilityAdvisory` through its declared union at the adapter boundary.
2. Carry it on the update result, from port through command to action.
3. Survive the post-write redirect on a **signed, short-lived, agent-keyed**
   cookie (D-2 below).
4. A panel on `/agents/[id]` stating, in opportunity language: how many armed
   coins can construct, how many cannot and which dial stopped them, how many
   the platform could not evaluate at all, and how the count moves against a
   candidate ceiling.
5. Dial-direction copy: **Max Stop Loss limits opportunity when turned down,
   not up.** A high ceiling never blocks anything; its warning is risk-side.

### Not in scope

- No new read. The advisory arrives on the update response or not at all.
- No edit affordance for the three dials. They moved off the agent and onto the
  strategy at v15, and `strategy-detail.tsx` already says the compiler does not
  process changes to them. This change adds no way to set them.
- No persistence. The advisory is the reply to one write at one instant; a
  stored copy would be a stale claim about live volatility within minutes.

## Decisions

**D-1 — Absent is not zero.** `feasibilityAdvisory` is **not** in the output
schema's `required` list (only `agent` is), and the tool is classified
destructive so the surface record has never observed one
(`"observed": null`). The journal's standing warning applies exactly here:
declared and observed disagree in both directions, and a `=== true` on a v19
read turned platform silence into a confident `false` once already. An absent
advisory maps to `null` and the panel does not render. It never maps to zero
coins, and the panel never says "0 of 0".

**D-2 — The reply travels on a signed cookie, not on the URL.** The apply
action redirects (post/redirect/get, as every write in this product does), and
the surface holds no client state — `agent-edit`'s manifest names that as a
constraint, not a preference. So the reply has to survive a redirect. A query
parameter was rejected: it would let anyone type `?buildable=12` and have the
product render invented platform figures as fact, which is the failure mode this
codebase refuses everywhere else ("a parameter added to the URL by hand is
rejected here rather than sent to BattleGrid"). The cookie is HMAC-signed with
the same server secret and idiom `CookieSession` already uses, is `httpOnly`,
carries the agent id and the instant it was issued, and expires in minutes. A
payload that fails its signature, names a different agent, or has gone stale
renders nothing — not a guess.

**D-3 — `ATR_UNAVAILABLE` is a third answer, never a "no".** It carries no
numeric fields at all. A coin the platform could not price is not a coin that
cannot be built; folding the two together would report a data gap as a trading
constraint. It is counted and named separately, the same `unreadable`-vs-`empty`
distinction this product draws everywhere.

**D-4 — The ceiling curve is arithmetic over what was returned.** "At 2.00% that
drops to 4" is a count of the returned per-coin bands against a candidate
ceiling. It is derived, it says it is derived, and it is computed in the domain
rather than in a component — the rule `AgainstDefault` and `CapAgainstBalance`
already state: a surface that works out a ratio for itself will one day work it
out upside down, and on this figure upside down reads as headroom.

## Capabilities

- `agent-authoring` — ADDED: the advisory is read and rendered; ADDED: the
  reply to a write survives the redirect without becoming forgeable.

## Track

`standard`. It widens a port's return type and adds a signed cookie, which
argues for `full` — but it migrates nothing, touches no auth decision, commits
no funds, adds no platform call, and is reversible by deleting a panel. The
confirmation and revision machinery it sits beside is untouched.
